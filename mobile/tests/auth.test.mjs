import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMobile, registration, validatePassword } from '../src/auth.js';
import { createNativeSessionStorage } from '../src/data/sessionStorage.js';
import { createGoogleCallbackHandler, isGoogleAuthCallback, startGoogleAuth, mobileAuthRedirect } from '../src/googleAuth.js';

function sessionStores() {
  const old = new Map();
  const encrypted = new Map();
  const native = {
    getItemAsync: async key => encrypted.get(key) ?? null,
    setItemAsync: async (key, value) => { encrypted.set(key, value); },
    deleteItemAsync: async key => { encrypted.delete(key); },
  };
  const legacy = {
    getItem: async key => old.get(key) ?? null,
    removeItem: async key => { old.delete(key); },
  };
  return { storage: createNativeSessionStorage(native, legacy), native, old, encrypted };
}

test('native auth migrates an existing session once and removes stale plaintext after a refresh', async () => {
  const { storage, old, encrypted } = sessionStores();
  old.set('auth', 'existing session');
  assert.equal(await storage.getItem('auth'), 'existing session');
  assert.equal(encrypted.get('auth'), 'existing session');
  assert.equal(old.size, 0);
  old.set('auth', 'outdated session');
  await storage.setItem('auth', 'refreshed session');
  assert.equal(await storage.getItem('auth'), 'refreshed session');
  assert.equal(old.size, 0);
});

test('a failed native migration surfaces an error and can retry without losing the session', async () => {
  const { storage, native, old, encrypted } = sessionStores();
  old.set('auth', 'existing session');
  const write = native.setItemAsync;
  native.setItemAsync = async () => { throw new Error('Keystore unavailable'); };
  await assert.rejects(storage.getItem('auth'), /Keystore unavailable/);
  await assert.rejects(storage.setItem('new-auth', 'new session'), /Keystore unavailable/);
  assert.equal(old.get('auth'), 'existing session');
  assert.equal(old.has('new-auth'), false);
  native.setItemAsync = write;
  assert.equal(await storage.getItem('auth'), 'existing session');
  assert.equal(encrypted.get('auth'), 'existing session');
});

test('a concurrent migration and sign-out clear both copies and cannot restore the session', async () => {
  const { storage, old, encrypted } = sessionStores();
  old.set('auth', 'outdated session');
  encrypted.set('auth', 'current session');
  const read = storage.getItem('auth');
  const signOut = storage.removeItem('auth');
  assert.equal(await read, 'current session');
  await signOut;
  assert.equal(await storage.getItem('auth'), null);
  assert.equal(old.size + encrypted.size, 0);
});

test('Google sign-in opens the provider with the native app as its return address', async () => {
  let options;
  const opened = [];
  const client = { auth: { signInWithOAuth: async value => {
    options = value;
    return { data: { url: 'https://accounts.google.com/test' }, error: null };
  } } };
  await startGoogleAuth(client, 'android', url => opened.push(url), 'https://website.test');
  assert.equal(options.options.redirectTo, mobileAuthRedirect);
  assert.equal(options.options.skipBrowserRedirect, true);
  assert.deepEqual(opened, ['https://accounts.google.com/test']);
  await startGoogleAuth(client, 'web', () => assert.fail('web should use the browser redirect'), 'https://mobile-preview.test');
  assert.equal(options.options.redirectTo, 'https://mobile-preview.test');
  assert.equal(options.options.skipBrowserRedirect, false);
});

test('Google callback exchanges a code once even if Android delivers the link twice', async () => {
  const exchanged = [];
  const complete = createGoogleCallbackHandler({ auth: { exchangeCodeForSession: async code => {
    exchanged.push(code);
    return { error: null };
  } } });
  assert.deepEqual(await Promise.all([
    complete('serbisyogo://sign-in?code=test-code'),
    complete('serbisyogo://sign-in?code=test-code')
  ]), [true, true]);
  assert.deepEqual(exchanged, ['test-code']);
  assert.equal(await complete('serbisyogo://sign-in/?code=another-code'), true);
  assert.deepEqual(exchanged, ['test-code', 'another-code']);
});

test('Google callback restores the returned native session once', async () => {
  const sessions = [];
  const complete = createGoogleCallbackHandler({ auth: { setSession: async session => {
    sessions.push(session);
    return { error: null };
  } } });
  const url = 'serbisyogo://sign-in#access_token=test-access&refresh_token=test-refresh';
  assert.deepEqual(await Promise.all([complete(url), complete(url)]), [true, true]);
  assert.deepEqual(sessions, [{ access_token: 'test-access', refresh_token: 'test-refresh' }]);
  await assert.rejects(complete('serbisyogo://sign-in#access_token=test-access'), /incomplete/);
  await assert.rejects(complete('serbisyogo://sign-in#error=access_denied'), /cancelled/);
});

test('Google callback ignores unrelated links and reports cancellation and exchange errors', async () => {
  const complete = createGoogleCallbackHandler({ auth: { exchangeCodeForSession: async () => ({ error: new Error('private server details') }) } });
  for (const url of [null, 'invalid', 'https://website.test/sign-in?code=x', 'serbisyogo://bookings?code=x', 'serbisyogo://sign-in/other?code=x', 'serbisyogo://sign-in']) {
    assert.equal(await complete(url), false);
  }
  await assert.rejects(complete('serbisyogo://sign-in?error=access_denied'), /cancelled/);
  await assert.rejects(complete('serbisyogo://sign-in?code=expired'), /Please try signing in again/);
});

test('Google return links are handled by auth without replacing the navigation route', async () => {
  assert.equal(isGoogleAuthCallback('serbisyogo://sign-in?returnTo=MyBookings'), false);
  assert.equal(isGoogleAuthCallback('serbisyogo://bookings?code=unrelated'), false);
  assert.equal(isGoogleAuthCallback('serbisyogo://sign-in?code=oauth#other=value'), true);
  const complete = createGoogleCallbackHandler({ auth: { exchangeCodeForSession: async code => {
    assert.equal(code, 'oauth');
    return { error: null };
  } } });
  assert.equal(await complete('serbisyogo://sign-in?code=oauth#other=value'), true);
  await assert.rejects(complete('serbisyogo://sign-in?error_code=access_denied'), /cancelled/);
});

test('Google sign-in surfaces provider and browser launch failures', async () => {
  await assert.rejects(startGoogleAuth({ auth: { signInWithOAuth: async () => ({ error: new Error('provider unavailable') }) } }, 'android', () => {}), /provider unavailable/);
  await assert.rejects(startGoogleAuth({ auth: { signInWithOAuth: async () => ({ data: {} }) } }, 'android', () => {}), /could not be opened/);
  await assert.rejects(startGoogleAuth({ auth: { signInWithOAuth: async () => ({ data: { url: 'https://example.test' } }) } }, 'android', async () => { throw new Error('browser unavailable'); }), /browser unavailable/);
});

test('registration normalizes shared account fields without accepting privileged roles', () => {
  const data = registration({ name: ' Test\t User ', email: ' TESTER@example.test ', phone: '09171234567', password: 'TestPassword123!', confirm: 'TestPassword123!', consent: true, role: 'admin' });
  assert.equal(data.email, 'tester@example.test');
  assert.deepEqual(data.data, { full_name: 'Test User', phone: '+639171234567', consent: true });
  assert.equal(normalizeMobile('+63 917 123 4567'), '+639171234567');
  assert.throws(() => normalizeMobile('+15551234567'), /Philippine/);
});

test('registration requires matching strong passwords, valid email and consent', () => {
  const valid = { name: 'Test User', email: 'tester@example.test', phone: '09171234567', password: 'TestPassword123!', confirm: 'TestPassword123!', consent: true };
  for (const patch of [{ name: 'A' }, { email: 'bad' }, { password: 'short' }, { confirm: 'other' }, { consent: false }, { phone: '123' }]) {
    assert.throws(() => registration({ ...valid, ...patch }));
  }
  // Enforces 8+ characters and at least one special character
  assert.throws(() => validatePassword('short!'), /at least 8 characters/);
  assert.throws(() => validatePassword('LongPasswordWithoutSpecial123'), /special character/);
  assert.doesNotThrow(() => validatePassword('Pass123!'));
});
