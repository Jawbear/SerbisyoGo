export function money(centavos = 0) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(centavos) / 100);
}

export function manilaDay(date = new Date(), offset = 0) {
  return new Date(date.getTime() + 8 * 3600000 + offset * 86400000).toISOString().slice(0, 10);
}

export function appointment(value) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short'
  }).format(new Date(value));
}

export function timeLabel(value) {
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export function dayLabel(day) {
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${day}T12:00:00+08:00`));
}

export function validateRequest(form, now = new Date()) {
  if (String(form.description || '').trim().length < 10) throw new Error('Describe the task using at least 10 characters.');
  if (String(form.description).trim().length > 3000) throw new Error('Keep the task description within 3,000 characters.');
  if (!String(form.label || '').trim()) throw new Error('Enter an address label, such as Home.');
  if (String(form.line1 || '').trim().length < 5) throw new Error('Enter your complete service address.');
  if (String(form.city || '').trim().length < 2) throw new Error('Enter your city or municipality.');
  if (!/^\d{4}$/.test(String(form.postal_code || ''))) throw new Error('Enter a four-digit Philippine postal code.');
  const start = new Date(form.starts_at);
  if (!form.starts_at || !Number.isFinite(start.getTime()) || start <= now) throw new Error('Choose an available future appointment.');
  if (manilaDay(start) > manilaDay(now, 89)) throw new Error('Choose an appointment within the next 90 days.');
  return {
    description: String(form.description).trim(), starts_at: start.toISOString(),
    address: {
      label: String(form.label).trim(), line1: String(form.line1).trim(),
      city: String(form.city).trim(), postal_code: String(form.postal_code)
    }
  };
}

export function findService(catalog, providerId, serviceId) {
  const provider = catalog.providers.find(item => item.id === providerId);
  const service = catalog.services.find(item => item.id === serviceId && item.provider_id === providerId);
  return provider && service ? { provider, service } : null;
}

export function filterProviders(catalog, search = '', categoryId = '') {
  const term = search.trim().toLowerCase();
  return catalog.providers.filter(provider => {
    const services = catalog.services.filter(service => service.provider_id === provider.id);
    if (categoryId && !services.some(service => service.category_id === categoryId)) return false;
    const text = [provider.display_name, provider.headline, provider.city, ...services.map(service => service.title)].join(' ').toLowerCase();
    return !term || text.includes(term);
  });
}
