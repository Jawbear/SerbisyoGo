// Both clients apply these rules to the same published service and profile IDs.
export function matchProfessionals(catalog, options = {}) {
  const { search = '', city = '', category = '', maximum = '', rating = 0, sort = 'rating', available = null } = options;
  const term = search.trim().toLowerCase();
  const location = city.trim().toLowerCase().replace(/^city of | city$/g, '');
  const categories = new Map(catalog.categories.filter(row => row.active !== false).map(row => [row.id, row.name]));
  const qualifying = new Map();
  const eligible = available === null ? null : new Set(available);
  for (const service of catalog.services) {
    if (service.active === false || !categories.has(service.category_id)) continue;
    if (category && service.category_id !== category) continue;
    if (maximum !== '' && !(service.rate_centavos <= Number(maximum) * 100)) continue;
    if (eligible && !eligible.has(service.id)) continue;
    const offers = qualifying.get(service.provider_id) || [];
    offers.push(service);
    qualifying.set(service.provider_id, offers);
  }
  const rows = [];
  for (const provider of catalog.providers) {
    if (Number(provider.rating) < Number(rating)) continue;
    const areas = [provider.city, ...(provider.service_areas || [])].join(' ').toLowerCase();
    if (location && !areas.includes(location)) continue;
    const profile = [provider.display_name, provider.headline, provider.bio, areas].join(' ').toLowerCase();
    const services = (qualifying.get(provider.id) || []).filter(service =>
      profile.includes(term) || [service.title, categories.get(service.category_id)].join(' ').toLowerCase().includes(term));
    if (services.length) rows.push({ ...provider, min_rate: Math.min(...services.map(s => s.rate_centavos)) });
  }
  return rows.sort((a, b) => (sort === 'price' ? a.min_rate - b.min_rate : b.rating - a.rating)
    || a.display_name.localeCompare(b.display_name) || a.id.localeCompare(b.id));
}

export async function availableServiceIds(services, day, loadBatch) {
  const ids = services.map(service => service.id);
  const matches = [];
  for (let start = 0; start < ids.length; start += 50) {
    matches.push(...await loadBatch(day, ids.slice(start, start + 50)));
  }
  return matches;
}

export function hasServicePin(provider) {
  return Number.isFinite(provider.service_latitude) && Math.abs(provider.service_latitude) <= 85
    && Number.isFinite(provider.service_longitude) && Math.abs(provider.service_longitude) <= 180;
}
