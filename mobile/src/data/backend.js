import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient, processLock } from '@supabase/supabase-js';
import snackConfig from '../../snack.config';
import { validateRequest } from '../domain';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || snackConfig.supabaseUrl;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || snackConfig.supabasePublishableKey;
export const liveAvailable = Boolean(supabaseUrl && publishableKey && !publishableKey.startsWith('sb_secret_'));
async function boundedFetch(input, init = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (init.signal?.aborted) abort();
  else init.signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 15000);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  catch (error) {
    if (controller.signal.aborted) throw new Error('The connection took too long. Please check your connection and try again.');
    throw error;
  } finally { clearTimeout(timeout); init.signal?.removeEventListener('abort', abort); }
}

export const supabase = liveAvailable ? createClient(supabaseUrl, publishableKey, {
  global: { fetch: boundedFetch },
  auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: Platform.OS === 'web', lock: processLock }
}) : null;

async function result(query) {
  const response = await query;
  if (response.error) throw new Error(response.error.message);
  return response.data;
}
function db() {
  if (!supabase) throw new Error('Live services are unavailable in this build. You can use the lab demo.');
  return supabase;
}
async function serviceContext(serviceId) {
  const service = await result(db().from('provider_services').select('*').eq('id', serviceId).eq('active', true).maybeSingle());
  if (!service) return null;
  const provider = await result(db().from('public_providers').select('*').eq('id', service.provider_id).maybeSingle());
  return provider ? { provider, service } : null;
}
export const liveApi = {
  catalog: async () => {
    const [categories, providers, services] = await Promise.all([
      result(db().from('categories').select('*').eq('active', true).order('name')),
      result(db().from('public_providers').select('*').order('display_name').limit(50)),
      result(db().from('provider_services').select('*').eq('active', true).limit(500))
    ]);
    return { categories, providers, services };
  },
  provider: async id => {
    if (!id) return null;
    const provider = await result(db().from('public_providers').select('*').eq('id', id).maybeSingle());
    const services = provider ? await result(db().from('provider_services').select('*').eq('provider_id', id).eq('active', true)) : [];
    return provider ? { provider, services } : null;
  },
  form: async (providerId, serviceId, draftId) => {
    if (!providerId || !serviceId) return null;
    const selected = await serviceContext(serviceId);
    if (!selected || selected.provider.id !== providerId) return null;
    const draft = draftId ? await result(db().from('booking_drafts').select('*').eq('id', draftId).maybeSingle()) : null;
    if (draft && draft.provider_service_id !== serviceId) return null;
    return { ...selected, draft };
  },
  slots: (serviceId, day) => result(db().rpc('available_slots', { p_service: serviceId, p_day: day })),
  saveDraft: async (providerId, serviceId, form, draftId) => {
    const selected = await serviceContext(serviceId);
    if (!selected || selected.provider.id !== providerId) throw new Error('This provider/service selection is no longer available.');
    const data = validateRequest(form);
    return result(db().rpc('save_booking_draft', {
      p_id: draftId || null, p_service: serviceId, p_description: data.description,
      p_address: data.address, p_starts_at: data.starts_at
    }));
  },
  review: async id => {
    if (!id) return null;
    const draft = await result(db().from('booking_drafts').select('*').eq('id', id).maybeSingle());
    if (!draft) return null;
    const selected = await serviceContext(draft.provider_service_id);
    if (!selected) return null;
    const price = await result(db().rpc('draft_price', { p_draft: id }));
    return { ...selected, draft, price };
  },
  submit: (draftId, expectedTotal) => result(db().rpc('confirm_booking', { p_draft: draftId, p_expected_total: expectedTotal })),
  bookings: async (userId, role) => {
    if (!userId) return [];
    return result(db().from('bookings').select('*').eq(role === 'provider' ? 'provider_id' : 'customer_id', userId).order('created_at', { ascending: false }));
  },
  booking: id => id ? result(db().from('bookings').select('*').eq('id', id).maybeSingle()) : null
};
