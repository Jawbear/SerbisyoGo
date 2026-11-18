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

function parseGoogleCallback(value) {
  if (!value) return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'serbisyogo:' || url.hostname !== 'sign-in' || !['', '/'].includes(url.pathname)) return null;
  const query = new URLSearchParams(url.search);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const get = key => fragment.get(key) ?? query.get(key);
  const code = get('code');
  const accessToken = get('access_token');
  const refreshToken = get('refresh_token');
  const error = get('error') ?? get('error_code');
  return code || accessToken || refreshToken || error ? { code, accessToken, refreshToken, error } : null;
}

export function isGoogleAuthCallback(value) {
  return parseGoogleCallback(value) !== null;
}

// One handler serves initial links and links delivered while the app is running.
export function createGoogleCallbackHandler(client) {
  let lastCallback;
  let pending;
  return async value => {
    const callback = parseGoogleCallback(value);
    if (!callback) return false;
    const { code, accessToken, refreshToken, error } = callback;
    if (error) throw new Error('Google sign-in was cancelled or could not be completed. Please try again.');
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
