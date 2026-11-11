'use client';
import { requireDb } from '@/lib/backend';
import { config } from '@/lib/config';
import { fetchWithTimeout } from '@/lib/http';

export type ManagedAccount = Record<string, unknown> & {
  id: string; full_name: string; email: string | null; phone: string | null;
  role: 'customer' | 'provider' | 'admin'; status: string; provider_status: string | null;
  created_at: string; updated_at: string | null; last_sign_in_at: string | null;
  email_confirmed_at: string | null; purge_id: string | null;
};
export type AccountPage = { rows: ManagedAccount[]; total: number; offset: number; limit: number };
export async function accountRequest<T>(body?: Record<string, unknown>, query = ''): Promise<T> {
  const { data: { session }, error } = await requireDb().auth.getSession();
  if (error || !session) throw new Error('Sign in with an active administrator account.');
  const response = await fetchWithTimeout(`${config.supabaseUrl}/functions/v1/admin-accounts${query}`, {
    method: body ? 'POST' : 'GET', headers: { apikey: config.supabaseKey, Authorization: `Bearer ${session.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  }, body?.action === 'delete' ? 120000 : 20000);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Account management is unavailable.');
  return data as T;
}
