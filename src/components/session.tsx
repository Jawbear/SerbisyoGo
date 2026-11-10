'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { db, rpc } from '@/lib/backend';
import { backendConfigured } from '@/lib/config';
import type { Profile } from '@/lib/types';
type Context = {
  user: User | null;
  profile: Profile | null;
  role: string;
  loading: boolean;
  error: string;
  revision: number;
  refresh: () => void;
  signOut: () => Promise<void>;
};
const SessionContext = createContext<Context>({
  user: null,
  profile: null,
  role: '',
  loading: true,
  error: '',
  revision: 0,
  refresh: () => {},
  signOut: async () => {}
});
export function SessionProvider({
  children
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null),
    [profile, setProfile] = useState<Profile | null>(null),
    [role, setRole] = useState(''),
    [loading, setLoading] = useState(backendConfigured),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0),
    [authTick, setAuthTick] = useState(0);
  const refresh = useCallback(() => setRevision(n => n + 1), []);
  useEffect(() => {
    if (!db) return;
    const {
      data: {
        subscription
      }
    } = db.auth.onAuthStateChange(() => {
      setAuthTick(n => n + 1);
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let alive = true;
    if (!db) return;
    const load = async () => {
      try {
        const {
          data: {
            user: verified
          },
          error: authError
        } = await db!.auth.getUser();
        if (!alive) return;
        if (authError || !verified) {
          setUser(null);
          setProfile(null);
          setRole('');
          return;
        }
        const context = await rpc<{
          profile: Profile;
          role: string;
        }>('user_context');
        if (!alive) return;
        setUser(verified);
        setProfile(context?.profile || null);
        setRole(context?.role || '');
        setError('');
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Account unavailable');
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [authTick, revision]);
  async function signOut() {
    if (db) {
      await db.removeAllChannels();
      const {
        error
      } = await db.auth.signOut();
      if (error) throw error;
    }
    setUser(null);
    setProfile(null);
    setRole('');
    refresh();
  }
  return <SessionContext.Provider value={{
    user,
    profile,
    role,
    loading,
    error,
    revision,
    refresh,
    signOut
  }}>{children}</SessionContext.Provider>;
}
export const useSession = () => useContext(SessionContext);
