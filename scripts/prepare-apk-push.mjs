// Legacy entry point for synchronizing a release that has already been published.
if (process.argv.length !== 3 || !/^\d+\.\d+\.\d+$/.test(process.argv[2])) {
  console.error('Supply the published Android version. Private candidates stay outside the public download feed.');
  process.exit(1);
}
await import('./sync-android-release.mjs');
