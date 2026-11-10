/** Minimal bounded Android binary XML reader. Reads package identity, never executes package content. */
export function readAndroidManifest(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (p: number) => view.getUint16(p, true),
    u32 = (p: number) => view.getUint32(p, true);
  if (bytes.length < 8 || u16(0) !== 3 || u32(4) !== bytes.length) throw new Error('Invalid Android binary manifest');
  let strings: string[] = [];
  const result: {
    version_name?: string;
    version_code?: number;
    min_sdk?: number;
  } = {};
  for (let start = u16(2); start < bytes.length;) {
    if (start + 8 > bytes.length) throw new Error('Truncated manifest');
    const kind = u16(start),
      header = u16(start + 2),
      size = u32(start + 4);
    if (size < header || header < 8 || start + size > bytes.length) throw new Error('Invalid manifest chunk');
    if (kind === 1) {
      const count = u32(start + 8),
        flags = u32(start + 16),
        data = start + u32(start + 20);
      if (count > 50000 || header + count * 4 > size) throw new Error('Manifest string pool too large');
      const utf8 = Boolean(flags & 256);
      strings = [];
      for (let i = 0; i < count; i++) {
        let p = data + u32(start + header + i * 4);
        if (p >= start + size) throw new Error('Invalid manifest string');
        const len8 = () => {
          const x = bytes[p++];
          return x & 128 ? (x & 127) << 8 | bytes[p++] : x;
        };
        let length: number;
        if (utf8) {
          len8();
          length = len8();
        } else {
          length = u16(p);
          p += 2;
          if (length & 32768) {
            length = (length & 32767) << 16 | u16(p);
            p += 2;
          }
          length *= 2;
        }
        if (length > 1048576 || p + length > start + size) throw new Error('Invalid manifest string length');
        strings.push(new TextDecoder(utf8 ? 'utf-8' : 'utf-16le', {
          fatal: true
        }).decode(bytes.slice(p, p + length)));
      }
    }
    if (kind === 258) {
      const tag = strings[u32(start + 20)];
      const attrOffset = u16(start + 24),
        attrSize = u16(start + 26),
        count = u16(start + 28);
      if (attrSize < 20 || count > 1024) throw new Error('Invalid manifest attributes');
      for (let i = 0; i < count; i++) {
        const p = start + 16 + attrOffset + i * attrSize;
        if (p + 20 > start + size) throw new Error('Truncated manifest attribute');
        const name = strings[u32(p + 4)],
          raw = u32(p + 8),
          type = bytes[p + 15],
          value = u32(p + 16);
        const parsed = raw !== 0xffffffff ? strings[raw] : type === 3 ? strings[value] : String(value);
        if (tag === 'manifest' && name === 'versionName') result.version_name = parsed;
        if (tag === 'manifest' && name === 'versionCode') result.version_code = Number(parsed);
        if (tag === 'uses-sdk' && name === 'minSdkVersion') result.min_sdk = Number(parsed);
      }
    }
    start += size;
  }
  if (!result.version_name || !result.version_code || !result.min_sdk) throw new Error('APK version and minimum Android SDK must be declared explicitly');
  return result as {
    version_name: string;
    version_code: number;
    min_sdk: number;
  };
}
export const androidVersions: Record<number, string> = {
  21: '5.0',
  22: '5.1',
  23: '6.0',
  24: '7.0',
  25: '7.1',
  26: '8.0',
  27: '8.1',
  28: '9',
  29: '10',
  30: '11',
  31: '12',
  32: '12.1',
  33: '13',
  34: '14',
  35: '15',
  36: '16'
};
