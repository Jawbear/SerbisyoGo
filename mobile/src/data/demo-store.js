import { demoCatalog } from './demo-data.js';
import { findService, validateRequest } from '../domain.js';

export const DEMO_STORAGE_KEY = '@serbisyogo/lab-navigation/v1';

export function createDemoStore(storage, clock = () => new Date()) {
  let writes = Promise.resolve();
  async function read() {
    const raw = await storage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return { version: 1, drafts: [], bookings: [] };
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error('Your sample data could not be read. Use Reset demo on Home to start again.'); }
    if (data.version !== 1 || !Array.isArray(data.drafts) || !Array.isArray(data.bookings)) throw new Error('Your sample data needs to be reset from Home.');
    return data;
  }
  function write(update) {
    const task = writes.then(async () => {
      const state = await read();
      const result = update(state);
      await storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
      return result;
    });
    writes = task.catch(() => {});
    return task;
  }
  const api = {
    catalog: async () => demoCatalog,
    provider: async id => {
      const provider = demoCatalog.providers.find(item => item.id === id);
      return provider ? { provider, services: demoCatalog.services.filter(item => item.provider_id === id) } : null;
    },
    form: async (providerId, serviceId, draftId) => {
      const selected = findService(demoCatalog, providerId, serviceId);
      if (!selected) return null;
      const draft = draftId ? (await read()).drafts.find(item => item.id === draftId && item.provider_service_id === serviceId) : null;
      return { ...selected, draft };
    },
    slots: async (_serviceId, day) => [8, 10, 13, 15].map(hour => ({
      starts_at: new Date(`${day}T${String(hour).padStart(2, '0')}:00:00+08:00`).toISOString(),
      ends_at: new Date(`${day}T${String(hour + 1).padStart(2, '0')}:00:00+08:00`).toISOString()
    })).filter(slot => new Date(slot.starts_at) > clock()),
    saveDraft: async (providerId, serviceId, form, draftId) => {
      if (!findService(demoCatalog, providerId, serviceId)) throw new Error('This service is no longer available.');
      const data = validateRequest(form, clock());
      return write(state => {
        const existing = draftId && state.drafts.find(item => item.id === draftId);
        if (draftId && !existing) throw new Error('This sample draft could not be found.');
        const id = existing?.id || `demo-${clock().getTime()}-${Math.random().toString(36).slice(2, 9)}`;
        const draft = { id, provider_id: providerId, provider_service_id: serviceId, ...data };
        state.drafts = [...state.drafts.filter(item => item.id !== id), draft];
        return id;
      });
    },
    review: async draftId => {
      const draft = (await read()).drafts.find(item => item.id === draftId);
      if (!draft) return null;
      const selected = findService(demoCatalog, draft.provider_id, draft.provider_service_id);
      if (!selected) return null;
      return { ...selected, draft, price: { labor_centavos: selected.service.rate_centavos, fee_centavos: 5000, total_centavos: selected.service.rate_centavos + 5000, is_estimate: false } };
    },
    submit: async (draftId, expectedTotal) => write(state => {
      const existing = state.bookings.find(item => item.idempotency_key === draftId);
      if (existing) return existing.id;
      const draft = state.drafts.find(item => item.id === draftId);
      if (!draft) throw new Error('This sample draft could not be found.');
      validateRequest({ ...draft.address, description: draft.description, starts_at: draft.starts_at }, clock());
      const selected = findService(demoCatalog, draft.provider_id, draft.provider_service_id);
      if (!selected) throw new Error('This sample service is no longer available.');
      const total = selected.service.rate_centavos + 5000;
      if (expectedTotal !== total) throw new Error('The price changed. Refresh your review before continuing.');
      const id = `booking-${draft.id}`;
      state.bookings.unshift({
        id, idempotency_key: draft.id, reference: `DEMO-${String(state.bookings.length + 1).padStart(4, '0')}`,
        provider_id: draft.provider_id, provider_name: selected.provider.display_name,
        provider_service_id: selected.service.id, service_title: selected.service.title,
        description: draft.description, address_snapshot: draft.address, starts_at: draft.starts_at,
        labor_centavos: selected.service.rate_centavos, fee_centavos: 5000, total_centavos: total,
        status: 'requested', created_at: clock().toISOString(), demo: true
      });
      return id;
    }),
    bookings: async () => (await read()).bookings,
    booking: async id => (await read()).bookings.find(item => item.id === id) || null,
    reset: () => storage.removeItem(DEMO_STORAGE_KEY)
  };
  return api;
}
