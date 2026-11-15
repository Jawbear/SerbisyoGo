import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient, processLock } from '@supabase/supabase-js';
import snackConfig from '../../snack.config';
import { validateRequest } from '../domain';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || snackConfig.supabaseUrl;
export const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || snackConfig.supabasePublishableKey;
export const websiteUrl = (process.env.EXPO_PUBLIC_SITE_URL || 'https://serbisyogo.sg-team.workers.dev').replace(/\/$/, '');
export const liveAvailable = Boolean(supabaseUrl && publishableKey && !publishableKey.startsWith('sb_secret_'));
export async function boundedFetch(input, init = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (init.signal?.aborted) abort();
  else init.signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, timeoutMs);
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
  // Screens offer an explicit retry action; avoid extending the request timeout
  // through repeated automatic retries when the service is unavailable.
  const response = await query.retry(false);
  if (response.error) throw new Error(response.error.message);
  return response.data;
}
export async function fileRequest(body, query = '') {
  const { data: { session }, error } = await db().auth.getSession();
  if (error || !session) throw new Error('Sign in to access your private files.');
  const response = await boundedFetch(`${supabaseUrl}/functions/v1/files${query}`, {
    method: body ? 'POST' : 'GET', headers: { apikey: publishableKey, Authorization: `Bearer ${session.access_token}` }, body
  }, body ? 120000 : 15000);
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'The file operation failed.');
  return value;
}
function db() {
  if (!supabase) throw new Error('The service connection is not configured. Please contact support.');
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
    if (draftId && (!draft || draft.provider_service_id !== serviceId)) return null;
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
  booking: id => id ? result(db().from('bookings').select('*').eq('id', id).maybeSingle()) : null,
  transition: (id, status, reason = '') => result(db().rpc('transition_booking', { p_booking: id, p_status: status, p_reason: reason })),
  quote: (id, labor, accept = false) => result(db().rpc('booking_quote', { p_booking: id, p_labor: labor, p_accept: accept })),
  gcash: async bookingId => {
    const [settings, payment] = await Promise.all([
      result(db().from('gcash_settings').select('*').maybeSingle()),
      result(db().from('payments').select('*').eq('booking_id', bookingId).maybeSingle())
    ]);
    const submissions = payment ? await result(db().from('gcash_submissions').select('*').eq('payment_id', payment.id).order('created_at', { ascending: false })) : [];
    return { settings, payment, submissions };
  },
  submitReceipt: (bookingId, reference, receiptId, amount, recipient) => result(db().rpc('submit_gcash_receipt', {
    p_booking: bookingId, p_reference: reference.trim(), p_receipt: receiptId, p_expected_amount: amount, p_recipient_phone: recipient
  })),
  saveProfile: (name, phone) => result(db().rpc('save_profile', { p_name: name.trim(), p_phone: phone })),
  messages: async bookingId => {
    const conversation = await result(db().from('conversations').select('*').eq('booking_id', bookingId).maybeSingle());
    const messages = conversation ? await result(db().from('messages').select('*').eq('conversation_id', conversation.id).order('created_at')) : [];
    return { conversation, messages };
  },
  sendMessage: (conversationId, body, nonce) => result(db().rpc('send_message', { p_conversation: conversationId, p_body: body.trim(), p_nonce: nonce }))
};
