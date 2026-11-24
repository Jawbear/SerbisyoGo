// Offline only. Inventory, archive and optional restore download are private.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

async function inventoryTree(root, expected) {
  const seen = new Map();
  if (!(await lstat(root)).isDirectory()) throw Error('Expected a real archive directory.');
  const folders = await readdir(root, { withFileTypes: true });
  if (folders.length !== expected.size) throw Error('Bucket inventory differs.');
  async function walk(dir, prefix, bucket) {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      const file = join(dir, item.name);
      const key = prefix + item.name;
      if (item.isDirectory()) {
        await walk(file, key + '/', bucket);
      } else {
        const size = expected.get(bucket).get(key);
        if (!item.isFile() || size === undefined || (await lstat(file)).size !== size) {
          throw Error('Object type, key or byte length differs.');
        }
        const hash = createHash('sha256');
        for await (const chunk of createReadStream(file)) hash.update(chunk);
        seen.set(bucket + '/' + key, hash.digest('hex'));
      }
    }
  }
  for (const folder of folders) {
    if (!folder.isDirectory() || !expected.has(folder.name)) throw Error('Unexpected bucket directory.');
    await walk(join(root, folder.name), '', folder.name);
  }
  const count = [...expected.values()].reduce((total, objects) => total + objects.size, 0);
  if (seen.size !== count) throw Error('Object missing from archive.');
  return seen;
}

async function main() {
  const [inventory, source, restored] = process.argv.slice(2);
  if (!inventory || !source || process.argv.length > 5) throw Error('Expected inventory, archive directory and optional restore directory.');
  const expected = new Map();
  for (const { bucket, objects } of JSON.parse(await readFile(inventory, 'utf8'))) {
    if (!bucket || expected.has(bucket) || !Array.isArray(objects)) throw Error('Invalid bucket inventory.');
    const entries = new Map();
    for (const { key, bytes } of objects) {
      if (!key || entries.has(key) || !Number.isSafeInteger(bytes) || bytes < 0) throw Error('Invalid object inventory.');
      entries.set(key, bytes);
    }
    expected.set(bucket, entries);
  }
  const original = await inventoryTree(source, expected);
  if (restored) {
    if (resolve(source) === resolve(restored)) throw Error('Use a separate download from the restored service.');
    const recovered = await inventoryTree(restored, expected);
    for (const [key, hash] of original) if (recovered.get(key) !== hash) throw Error('Restored object SHA-256 differs.');
  }
  console.log(`Verified ${expected.size} buckets and ${original.size} objects${restored ? ' including restored SHA-256 values' : ' against the database inventory'}.`);
}

main().catch(() => {
  console.error('Storage verification failed. Check the private inventory, bucket directories, keys, sizes and restored contents.');
  process.exitCode = 1;
});
