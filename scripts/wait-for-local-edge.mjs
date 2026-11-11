const url = process.env.TEST_SUPABASE_URL;
if (!url || !['localhost', '127.0.0.1', '::1', '[::1]'].includes(new URL(url).hostname)) {
  throw new Error('The Edge readiness check is restricted to the isolated local stack.');
}
let ready = false;
for (let attempt = 0; attempt < 45; attempt++) {
  try {
    const response = await fetch(`${url}/functions/v1/releases`, {
      headers: { apikey: process.env.TEST_SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(3000)
    });
    // A ready empty test project has no published Android release.
    if (response.status === 404 && (await response.json()).error === 'Android app coming soon') {
      ready = true;
      break;
    }
  } catch { /* The local runtime may still be starting. */ }
  await new Promise(resolve => setTimeout(resolve, 2000));
}
if (!ready) throw new Error('The local releases Edge Function did not become ready. Check .cache/edge-test.log.');
console.log('The isolated local Edge Functions are ready.');
