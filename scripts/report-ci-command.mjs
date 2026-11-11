import { spawnSync } from 'node:child_process';

const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error('Pass a check command and its arguments.');
const result = spawnSync(command, args, {
  encoding: 'utf8', shell: process.platform === 'win32',
  stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 20 * 1024 * 1024
});
const output = `${result.stdout || ''}\n${result.stderr || ''}`;
process.stdout.write(output);
if (result.error) console.error(result.error.message);
if (result.status !== 0 && process.env.GITHUB_ACTIONS === 'true') {
  // Action annotations remain readable when downloading raw logs requires login.
  // Keep the actual failing command's exit code; reporting never turns it green.
  const lines = output.split(/\r?\n/);
  const selected = new Set();
  for (let i = 0; i < lines.length; i++) {
    if (/not ok|ERROR:|Error:|error TS|FAIL|Test Summary|Dubious/i.test(lines[i])) {
      for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 12); j++) selected.add(j);
    }
  }
  let details = ([...selected].sort((a, b) => a - b).map(i => lines[i]).join('\n') || output.slice(-6000)).slice(0, 14000);
  details = details.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[token redacted]');
  for (const name of ['SUPABASE_SECRET_KEY', 'TEST_SUPABASE_SECRET_KEY']) {
    if (process.env[name]) details = details.replaceAll(process.env[name], '[local test key redacted]');
  }
  details = details.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
  console.log(`::error title=Isolated integration check failed::${details}`);
}
process.exit(result.status ?? 1);
