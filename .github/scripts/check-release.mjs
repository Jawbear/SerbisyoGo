import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function verifyRelease(operation, environment, env, sha, api) {
  if (!/^[0-9a-f]{40}$/.test(sha) || sha !== env.GITHUB_SHA) {
    throw new Error('The checkout must match the workflow commit.');
  }
  switch (operation) {
    case 'checkout':
      break;
    case 'approval': {
      if (!environment || env.GITHUB_EVENT_NAME !== 'workflow_dispatch' ||
          env.GITHUB_REF !== 'refs/heads/main' || env.REVIEWED_SHA !== sha) {
        throw new Error('Publish from main with the full reviewed checkout SHA.');
      }
      const reviews = api(`runs/${env.GITHUB_RUN_ID}/approvals`);
      const approved = reviews.some(review => review.state === 'approved' &&
        review.environments.some(item => item.name === environment));
      if (!approved) throw new Error(`Missing environment approval for ${environment} on this run.`);
      break;
    }
    case 'android-run': {
      if (!/^[1-9][0-9]*$/.test(env.ARTIFACT_RUN ?? '') || env.ARTIFACT_RUN === env.GITHUB_RUN_ID) {
        throw new Error('Select the run ID of a completed Android build.');
      }
      const run = api(`runs/${env.ARTIFACT_RUN}`);
      if (run.path !== '.github/workflows/android-apk.yml' || run.event !== 'workflow_dispatch' ||
          run.head_repository?.full_name !== env.GITHUB_REPOSITORY || run.head_sha !== sha ||
          run.status !== 'completed' || run.conclusion !== 'success') {
        throw new Error('The artifact must come from a successful Android workflow on this source commit.');
      }
      break;
    }
    default:
      throw new Error('Unknown release check.');
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const env = process.env;
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const api = path => JSON.parse(execFileSync('gh', ['api', `repos/${env.GITHUB_REPOSITORY}/actions/${path}`], { encoding: 'utf8' }));
  verifyRelease(process.argv[2], process.argv[3], env, sha, api);
  console.log(`Verified ${process.argv[2]} for ${sha}.`);
}
