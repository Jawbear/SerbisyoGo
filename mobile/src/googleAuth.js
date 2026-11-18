export const mobileAuthRedirect = 'serbisyogo://sign-in';

export async function startGoogleAuth(client, platform, openURL, webOrigin) {
  const native = platform !== 'web';
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: native ? mobileAuthRedirect : webOrigin,
      skipBrowserRedirect: native
    }
  });
  if (error) throw error;
  if (native) {
    if (!data?.url) throw new Error('Google sign-in could not be opened. Please try again.');
    await openURL(data.url);
  }
}

// One handler serves initial links and links delivered while the app is running.
export function createGoogleCallbackHandler(client) {
  let lastCallback;
  let pending;
  return async value => {
    if (!value) return false;
    let url;
    try { url = new URL(value); } catch { return false; }
    if (url.protocol !== 'serbisyogo:' || url.hostname !== 'sign-in' || !['', '/'].includes(url.pathname)) return false;
    const params = new URLSearchParams(url.hash ? url.hash.slice(1) : url.search.slice(1));
    if (params.has('error')) throw new Error('Google sign-in was cancelled or could not be completed. Please try again.');
    const code = params.get('code');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (!code && !accessToken && !refreshToken) return false;
    if (!code && (!accessToken || !refreshToken)) throw new Error('The Google sign-in return link is incomplete. Please try again.');
    // Android may deliver the same callback as both an initial URL and an event.
    if (value !== lastCallback) {
      lastCallback = value;
      pending = (async () => {
        const { error } = code
          ? await client.auth.exchangeCodeForSession(code)
          : await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) throw new Error('Google sign-in could not be completed. Please try signing in again.');
        return true;
      })();
    }
    return pending;
  };
}
