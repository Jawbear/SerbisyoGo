import { inboxRows, readThrough } from './conversations';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createClient, processLock } from '@supabase/supabase-js';
import snackConfig from '../../snack.config';
import { validateRequest, withProviderNames } from '../domain';
import { createNativeSessionStorage } from './sessionStorage';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || snackConfig.supabaseUrl;
export const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || snackConfig.supabasePublishableKey;
export const websiteUrl = (process.env.EXPO_PUBLIC_SITE_URL || 'https://serbisyogo.sg-team.workers.dev').replace(/\/$/, '');
export const liveAvailable = Boolean(supabaseUrl && publishableKey && !publishableKey.startsWith('sb_secret_'));
export async function boundedFetch(input, init = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (init.signal?.aborted) abort();
  else init.signal?.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; abort(); }, timeoutMs);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  catch (error) {
    if (timedOut) throw new Error('The connection took too long. Please check your connection and try again.');
    throw error;
  } finally { clearTimeout(timeout); init.signal?.removeEventListener('abort', abort); }
}

export const supabase = liveAvailable ? createClient(supabaseUrl, publishableKey, {
  global: { fetch: boundedFetch },
  auth: {
    storage: Platform.OS === 'web' ? AsyncStorage : createNativeSessionStorage(SecureStore, AsyncStorage),
    persistSession: true, autoRefreshToken: true, detectSessionInUrl: Platform.OS === 'web', lock: processLock
  }
}) : null;

async function result(query) {
  // Screens offer an explicit retry action; avoid extending the request timeout
  // through repeated automatic retries when the service is unavailable.
  const response = await query.retry(false);
  if (response.error) throw new Error(response.error.message);
  return response.data;
}
export async function fileRequest(body, query = '', options = {}) {
  const { data: { session }, error } = await db().auth.getSession();
  if (error || !session) throw new Error('Sign in to access your private files.');
  const method = options.method || (body ? 'POST' : 'GET');
  const response = await boundedFetch(`${supabaseUrl}/functions/v1/files${query}`, {
    method, headers: { apikey: publishableKey, Authorization: `Bearer ${session.access_token}` }, body
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
async function catalogPages(table, activeOnly = false) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    let query = db().from(table).select('*').order('id').range(offset, offset + 499);
    if (activeOnly) query = query.eq('active', true);
    const batch = await result(query);
    rows.push(...batch);
    if (batch.length < 500) return rows;
  }
}
export const liveApi = {
  publicContact: () => result(db().rpc('public_settings')),
  catalog: async () => {
    const [categories, providers, services] = await Promise.all([
      catalogPages('categories', true), catalogPages('public_providers'), catalogPages('provider_services', true)
    ]);
    categories.sort((a, b) => a.name.localeCompare(b.name));
    providers.sort((a, b) => a.display_name.localeCompare(b.display_name));
    return { categories, providers, services };
  },
  availableServices: (day, ids) => result(db().rpc('discovery_available_services', { p_day: day, p_services: ids })),
  provider: async id => {
    if (!id) return null;
    const provider = await result(db().from('public_providers').select('*').eq('id', id).maybeSingle());
    if (!provider) return null;
    const [services, reviews, categories] = await Promise.all([
      result(db().from('provider_services').select('*').eq('provider_id', id).eq('active', true).order('title')),
      result(db().from('reviews').select('id,rating,body,created_at').eq('provider_id', id).eq('visible', true).order('created_at', { ascending: false }).limit(20)),
      catalogPages('categories', true)
    ]);
    const activeCategories = new Set(categories.map(category => category.id));
    return { provider, reviews, services: services.filter(service => activeCategories.has(service.category_id)) };
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
  draftPhotos: id => result(db().from('files').select('id,original_name').eq('draft_id', id)
    .eq('kind', 'booking').order('created_at')),
  uploadJobPhoto: async (draftId, asset) => {
    const body = new FormData();
    body.append('kind', 'booking');
    body.append('draft_id', draftId);
    body.append('file', Platform.OS === 'web' ? asset.file : { uri: asset.uri, name: asset.name, type: asset.mimeType });
    return fileRequest(body);
  },
  bookingEvents: id => result(db().from('booking_events').select('id,to_status,created_at,reason')
    .eq('booking_id', id).order('created_at', { ascending: false })),
  completedRecord: async id => {
    const [invoice, payment, review] = await Promise.all([
      result(db().from('invoices').select('invoice_number,issued_at,labor_centavos,fee_centavos,total_centavos').eq('booking_id', id).maybeSingle()),
      result(db().from('payments').select('status').eq('booking_id', id).maybeSingle()),
      result(db().from('reviews').select('rating,body').eq('booking_id', id).maybeSingle())
    ]);
    return { invoice, payment, review };
  },
  reviewBooking: (id, rating, body) => result(db().rpc('submit_review', { p_booking: id, p_rating: rating, p_body: body.trim() })),
  nextAppointment: userId => result(db().from('bookings').select('id,service_title,starts_at,status').eq('customer_id',userId).in('status',['requested','confirmed','en_route','in_progress']).gte('starts_at',new Date().toISOString()).order('starts_at').limit(1).maybeSingle()),
  bookings: async (userId, role) => {
    if (!userId) return [];
    const rows = await result(db().from('bookings').select('*').eq(role === 'provider' ? 'provider_id' : 'customer_id', userId).order('created_at', { ascending: false }));
    const providerIds = [...new Set(rows.map(row => row.provider_id).filter(Boolean))];
    const providers = providerIds.length ? await result(db().from('provider_profiles').select('id,display_name').in('id', providerIds)) : [];
    return withProviderNames(rows, providers);
  },
  booking: async id => {
    if (!id) return null;
    const row = await result(db().from('bookings').select('*').eq('id', id).maybeSingle());
    if (!row) return null;
    const provider = await result(db().from('provider_profiles').select('id,display_name').eq('id', row.provider_id).maybeSingle());
    return withProviderNames([row], provider ? [provider] : [])[0];
  },
  transition: (id, status, reason = '') => result(db().rpc('transition_booking', { p_booking: id, p_status: status, p_reason: reason })),
  quote: (id, labor) => result(db().rpc('booking_quote', { p_booking: id, p_labor: labor, p_accept: false })),
  acceptQuote: (id, labor) => result(db().rpc('accept_booking_quote', { p_booking: id, p_expected_labor: labor })),
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
  saveProfile: (name, phone, preferences) => result(db().rpc('save_profile', { p_name: name.trim(), p_phone: phone, p_preferences: preferences || {} })),
  supportCases: id => result(db().from('support_cases').select('id,subject,body,status,resolution,created_at').eq('owner_id', id).order('created_at', { ascending:false })),
  caseMessages: id => result(db().from('case_messages').select('id,body,created_at').eq('case_id',id).order('created_at')),
  openCase: (booking, subject, body) => result(db().rpc('open_case', { p_booking:booking || null,p_subject:subject.trim(),p_body:body.trim() })),
  replyCase: (id, body) => result(db().rpc('case_reply', { p_case:id,p_body:body.trim() })),
  notifications: userId => result(db().from('notifications').select('id,title,body,read_at,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(40)),
  readNotifications: () => result(db().rpc('mark_read', { p_conversation: null })),
  providerEarnings: (id, page) => result(db().from('commission_ledger').select('id,booking_id,labor_centavos,commission_centavos,created_at').eq('provider_id', id).is('reversed_at',null).order('created_at',{ascending:false}).order('id').range(page*15,page*15+15)),
  providerSettings: async userId => {
    const [profile, services, week, categories] = await Promise.all([
      result(db().from('provider_profiles').select('id,status').eq('id', userId).maybeSingle()),
      result(db().from('provider_services').select('*').eq('provider_id', userId).order('title')),
      result(db().from('weekly_availability').select('weekday,starts_minute,ends_minute').eq('provider_id', userId).order('weekday').order('starts_minute')),
      result(db().from('categories').select('id,name').eq('active', true).order('name'))
    ]);
    return { profile, services, week, categories };
  },
  saveHours: week => result(db().rpc('save_availability', { p_week: week })),
  saveService: values => result(db().rpc('save_provider_service', values)),
  inbox: (page, userId) => inboxRows(db(), userId, page),
  messages: async (bookingId, before) => {
    const conversation = await result(db().from('conversations').select('*').eq('booking_id', bookingId).maybeSingle());
    if (!conversation) return { conversation: null, messages: [], hasOlder: false };
    let query = db().from('messages').select('id,body,sender_id,created_at')
      .eq('conversation_id', conversation.id).order('created_at', { ascending: false }).order('id', { ascending: false });
    if (before) query = query.or(`created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`);
    const rows = await result(query.limit(51));
    return { conversation, messages: rows.slice(0, 50).reverse(), hasOlder: rows.length > 50 };
  },
  readMessage: (id, conversationId, latest) => readThrough(db(), id, conversationId, latest),
  sendMessage: (conversationId, body, nonce) => result(db().rpc('send_message', { p_conversation: conversationId, p_body: body.trim(), p_nonce: nonce })),
  providerVerification: async userId => {
    if (!userId) return null;
    const [profile, applications, files, credentialReviews] = await Promise.all([
      result(db().from('provider_profiles').select('*').eq('id', userId).maybeSingle()),
      result(db().from('provider_applications').select('*').eq('provider_id', userId).order('created_at', { ascending: false })),
      result(db().from('files').select('*').eq('owner_id', userId).eq('kind', 'verification').order('created_at', { ascending: false })),
      result(db().from('provider_credential_reviews').select('kind,file_id,reviewed_at').eq('provider_id', userId))
    ]);
    return { profile, applications: applications || [], files: files || [], credentialReviews: credentialReviews || [] };
  },
  submitProviderApplication: profile => result(db().rpc('submit_provider', { p_profile: profile })),
  uploadVerificationDoc: async (asset, formattedName, category) => {
    const form = new FormData();
    form.append('kind', 'verification');
    form.append('verification_category', category);
    form.append('file', Platform.OS === 'web' ? asset.file : {
      uri: asset.uri,
      name: formattedName,
      type: asset.mimeType || (formattedName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
    });
    return fileRequest(form);
  },
  deleteVerificationDoc: fileId => fileRequest(null, `?id=${fileId}`, { method: 'DELETE' }),
  getFileUrl: (fileId, inline = true) => fileRequest(null, `?id=${fileId}&inline=${inline}`)
};
