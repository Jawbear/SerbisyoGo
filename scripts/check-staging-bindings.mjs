import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

// Check effective publications. HostConfig.PortBindings can omit the IP even
// when Docker publishes to both wildcard interfaces.
const project = basename(process.cwd()).toLowerCase();
if (!/^serbisyogo-056-[a-z0-9]{6}$/.test(project) ||
    !readFileSync('supabase/config.toml', 'utf8').split(/\r?\n/).includes(`project_id = "${project}"`)) {
  throw new Error('Expected a generated 0.5.6 staging project.');
}
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' }).trim();
const listing = docker('ps', '--filter', `label=com.supabase.cli.project=${project}`, '--format', '{{.ID}} {{.Ports}}');
// Edge serve replaces its unpublished runtime container during startup.
// Inspect every container with a published mapping in the same listing.
const containers = listing.split(/\r?\n/).filter(line => line.includes('->')).map(line => line.split(' ')[0]);
if (!containers.length) throw new Error('No published staging ports.');
const required = new Set(['54321', '54322', '54323', '54324']);
for (const id of containers) {
  const name = docker('inspect', '--format', '{{.Name}}', id);
  const ports = JSON.parse(docker('inspect', '--format', '{{json .NetworkSettings.Ports}}', id));
  for (const [port, bindings] of Object.entries(ports ?? {})) {
    for (const { HostIp, HostPort } of bindings ?? []) {
      console.log(`${name} ${port} -> [${HostIp}]:${HostPort}`);
      if (!['127.0.0.1', '::1'].includes(HostIp)) throw new Error('Non-loopback staging publication.');
      required.delete(HostPort);
    }
  }
}
if (required.size) throw new Error(`Missing staging publications on ${[...required].join(', ')}.`);
