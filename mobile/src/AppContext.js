import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDemoStore } from './data/demo-store';
import { liveApi, liveAvailable, supabase } from './data/backend';

const Context = createContext(null);
const demoApi = createDemoStore(AsyncStorage);

export function AppProvider({ children }) {
  const [mode, setMode] = useState('demo');
  const [identity, setIdentity] = useState(null);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const authRequest = useRef(0);
  const invalidateAuth = useCallback(() => { authRequest.current++; }, []);
  const refresh = useCallback(() => setRevision(value => value + 1), []);

  const loadIdentity = useCallback(async () => {
    if (!supabase) return null;
    const request = ++authRequest.current;
    try {
      const { data: stored, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      let next = null;
      if (stored.session) {
        const verified = await supabase.auth.getUser();
        if (verified.error) throw verified.error;
        const context = await supabase.rpc('user_context');
        if (context.error) throw context.error;
        if (!context.data?.profile || !['customer', 'provider', 'admin'].includes(context.data.role)) throw new Error('Your account details could not be verified.');
        if (context.data.profile.status !== 'active') throw new Error('Your account is restricted. Please contact support through the website.');
        next = { user: verified.data.user, ...context.data };
      }
      if (request === authRequest.current) { setIdentity(next); setAuthError(''); setAuthLoading(false); }
      return next;
    } catch (error) {
      if (request === authRequest.current) { setIdentity(null); setAuthError(error.message); setAuthLoading(false); }
      throw error;
    }
  }, []);

  useEffect(() => {
    if (mode !== 'live' || !supabase) return;
    let alive = true;
    void loadIdentity().catch(() => {});
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Keep asynchronous RPC work outside Supabase's synchronous Auth callback.
      setTimeout(() => { if (alive) void loadIdentity().catch(() => {}); }, 0);
    });
    const appState = Platform.OS === 'web' ? null : AppState.addEventListener('change', state => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    if (Platform.OS !== 'web') supabase.auth.startAutoRefresh();
    return () => {
      alive = false;
      invalidateAuth();
      subscription.unsubscribe();
      appState?.remove();
      if (Platform.OS !== 'web') supabase.auth.stopAutoRefresh();
    };
  }, [mode, loadIdentity, invalidateAuth]);

  const chooseMode = useCallback(next => {
    if (next === 'live' && !liveAvailable) return;
    authRequest.current++;
    setIdentity(null); setAuthError(''); setAuthLoading(next === 'live'); setMode(next);
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) throw new Error('Live sign-in is unavailable in this build.');
    const response = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (response.error) throw new Error(response.error.message);
    return loadIdentity();
  }, [loadIdentity]);

  const signOut = useCallback(async () => {
    if (supabase) {
      const response = await supabase.auth.signOut({ scope: 'local' });
      if (response.error) throw response.error;
    }
    authRequest.current++;
    setIdentity(null); setAuthError(''); refresh();
  }, [refresh]);

  const value = useMemo(() => ({
    mode, chooseMode, identity, authError, authLoading, liveAvailable, signIn, signOut,
    api: mode === 'live' ? liveApi : demoApi, revision, refresh,
    resetDemo: async () => { await demoApi.reset(); refresh(); }
  }), [mode, chooseMode, identity, authError, authLoading, signIn, signOut, revision, refresh]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useApp() { return useContext(Context); }
