'use client';

import { createClient } from '@supabase/supabase-js';
import { backendConfigured, config } from './config';
import { fetchWithTimeout } from './http';
export const db = backendConfigured ? createClient(config.supabaseUrl, config.supabaseKey, {
  global: { fetch: fetchWithTimeout },
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    // The dedicated callback exchanges a single-use link and verifies the
    // resulting account before redirecting. Let it own that exchange.
    detectSessionInUrl: typeof window === 'undefined' ||
      !window.location.pathname.replace(/\/$/, '').endsWith('/auth/callback')
  }
}) : null;
export function requireDb() {
  if (!db) throw new Error('Supabase is not configured. See the setup guide.');
  return db;
}
export async function result<T>(query: PromiseLike<{
  data: T;
  error: {
    message: string;
  } | null;
}>): Promise<T> {
  const r = await query;
  if (r.error) throw new Error(r.error.message);
  return r.data;
}
export async function rpc<T = unknown>(name: string, args: Record<string, unknown> = {}) {
  return result(requireDb().rpc(name, args)) as Promise<T>;
}
export async function edge<T>(name: string, body?: FormData | Blob, query = '', options?: { method?: string }): Promise<T> {
  const client = requireDb();
  const {
    data: {
      session
    }
  } = await client.auth.getSession();
  const method = options?.method || (body ? 'POST' : 'GET');
  const res = await fetchWithTimeout(`${config.supabaseUrl}/functions/v1/${name}${query}`, {
    method,
    headers: {
      apikey: config.supabaseKey,
      ...(body instanceof Blob ? { 'Content-Type': body.type || 'application/octet-stream' } : {}),
      ...(session ? {
        Authorization: `Bearer ${session.access_token}`
      } : {})
    },
    body
  }, body ? 120000 : 15000);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
export function avatarUrl(providerId: string, version = '') {
  return `${config.supabaseUrl}/functions/v1/files?avatar=${encodeURIComponent(providerId)}&v=${encodeURIComponent(version)}`;
}
