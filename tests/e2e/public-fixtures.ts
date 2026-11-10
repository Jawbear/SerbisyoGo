import type { Page } from '@playwright/test';

// Deterministic UI fixtures only. This does not test a running Supabase backend.
export async function publicFixtures(page: Page) {
  const names = ['Art Ecleo', 'Francis Romay', 'Wilfredo Rivera', 'Moreno JunDave', 'Jonthan Jabs'];
  const categories = ['Electrical', 'Plumbing', 'Carpentry', 'Appliance repair', 'Air-conditioning'].map((name, i) => ({
    id: `10000000-0000-4000-8000-00000000000${i + 1}`, name, slug: name.toLowerCase().replaceAll(' ', '-'), description: `${name} services`, icon: 'wrench', active: true
  }));
  const providers = names.map((display_name, i) => ({
    id: `20000000-0000-4000-8000-00000000000${i + 1}`, display_name,
    headline: `${categories[i].name} professional`, bio: 'Household repairs and scheduled maintenance in Bunawan, Agusan del Sur.',
    city: 'Bunawan', status: 'approved', avatar_path: null, service_areas: ['Bunawan, Agusan del Sur'], rating: 4.5, review_count: 1, min_rate: 45000
  }));
  const services = providers.map((provider, i) => ({ id: `30000000-0000-4000-8000-00000000000${i + 1}`, provider_id: provider.id, category_id: categories[i].id, title: `${categories[i].name} service`, rate_centavos: 45000, duration_minutes: 60, pricing_mode: 'fixed', active: true }));
  await page.route('**/*.supabase.co/rest/v1/**', async route => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').pop();
    const records: Record<string, Record<string, unknown>[]> = { categories, public_providers: providers, provider_services: services, reviews: [], app_releases: [] };
    let rows = records[table || ''] || [];
    for (const [field, value] of url.searchParams) if (value.startsWith('eq.')) rows = rows.filter(row => String(row[field]) === value.slice(3));
    const body = route.request().headers().accept?.includes('vnd.pgrst.object') ? rows[0] || null : rows;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}
