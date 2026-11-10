'use client';

import { requireDb, result } from './backend';
import type { Provider, Service } from './types';
export const demoCategories = [{
  id: '10000000-0000-4000-8000-000000000001',
  slug: 'electrical',
  name: 'Electrical',
  description: 'Breakers, wiring & lighting',
  icon: 'zap'
}, {
  id: '10000000-0000-4000-8000-000000000002',
  slug: 'plumbing',
  name: 'Plumbing',
  description: 'Leaks, drains & fixtures',
  icon: 'droplets'
}, {
  id: '10000000-0000-4000-8000-000000000003',
  slug: 'carpentry',
  name: 'Carpentry',
  description: 'Doors, cabinets & repairs',
  icon: 'hammer'
}, {
  id: '10000000-0000-4000-8000-000000000004',
  slug: 'appliance-repair',
  name: 'Appliance repair',
  description: 'Diagnose everyday appliances',
  icon: 'plug'
}, {
  id: '10000000-0000-4000-8000-000000000005',
  slug: 'air-conditioning',
  name: 'Air-conditioning',
  description: 'Cleaning & maintenance',
  icon: 'wind'
}, {
  id: '10000000-0000-4000-8000-000000000006',
  slug: 'maintenance',
  name: 'General maintenance',
  description: 'Everyday home care',
  icon: 'wrench'
}];
export const demoProviders: Provider[] = [{
  id: '20000000-0000-4000-8000-000000000001',
  display_name: 'Art Ecleo',
  headline: 'Electrical service professional',
  bio: 'Circuit breaker troubleshooting, lighting installation and residential electrical maintenance.',
  city: 'Bunawan',
  avatar_path: null,
  status: 'approved',
  service_areas: ['Bunawan, Agusan del Sur'],
  rating: 4.9,
  review_count: 12,
  min_rate: 45000
}, {
  id: '20000000-0000-4000-8000-000000000002',
  display_name: 'Francis Romay',
  headline: 'Plumbing service professional',
  bio: 'Water fixture installation, leak repairs and household drainage maintenance.',
  city: 'Bunawan',
  avatar_path: null,
  status: 'approved',
  service_areas: ['Bunawan, Agusan del Sur'],
  rating: 4.8,
  review_count: 8,
  min_rate: 40000
}, {
  id: '20000000-0000-4000-8000-000000000003',
  display_name: 'Wilfredo Rivera',
  headline: 'Carpentry and home maintenance',
  bio: 'Cabinet repairs, door fitting and practical woodwork for everyday home care.',
  city: 'Bunawan',
  avatar_path: null,
  status: 'approved',
  service_areas: ['Bunawan, Agusan del Sur'],
  rating: 4.9,
  review_count: 10,
  min_rate: 48000
}, {
  id: '20000000-0000-4000-8000-000000000004',
  display_name: 'Moreno JunDave',
  headline: 'Appliance diagnostics and repair',
  bio: 'Troubleshooting and repairs for household appliances in Bunawan, Agusan del Sur.',
  city: 'Bunawan',
  avatar_path: null,
  status: 'approved',
  service_areas: ['Bunawan, Agusan del Sur'],
  rating: 0,
  review_count: 0,
  min_rate: 55000
}, {
  id: '20000000-0000-4000-8000-000000000005',
  display_name: 'Jonthan Jabs',
  headline: 'Air-conditioning cleaning and maintenance',
  bio: 'Air-conditioning cleaning, diagnostics, and routine maintenance in Bunawan, Agusan del Sur.',
  city: 'Bunawan',
  avatar_path: null,
  status: 'approved',
  service_areas: ['Bunawan, Agusan del Sur'],
  rating: 0,
  review_count: 0,
  min_rate: 65000
}];
export const demoServices: Service[] = demoProviders.map((p, i) => ({
  id: `30000000-0000-4000-8000-00000000000${i + 1}`,
  provider_id: p.id,
  category_id: demoCategories[i].id,
  title: ['Electrical diagnostics', 'Kitchen plumbing inspection', 'Door and cabinet repair', 'Appliance diagnostics', 'Air-conditioning cleaning'][i],
  rate_centavos: p.min_rate,
  duration_minutes: 60,
  pricing_mode: 'quote',
  active: true
}));
export async function list<T = Record<string, unknown>>(table: string, filters: Record<string, string | boolean> = {}, dates?: {
  from: string;
  to: string;
}): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0;; offset += 500) {
    let query = requireDb().from(table).select('*').order('created_at', {
      ascending: false
    }).range(offset, offset + 499);
    for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
    if (dates) query = query.gte('created_at', dates.from).lt('created_at', dates.to);
    const batch = (await result(query)) ?? [];
    rows.push(...(batch as T[]));
    if (batch.length < 500) break;
    if (offset >= 49500) throw new Error('Too many records. Narrow the date range.');
  }
  return rows;
}
export async function one<T>(table: string, id: string) {
  if (!id) throw new Error('Choose a record first.');
  return result(requireDb().from(table).select('*').eq('id', id).maybeSingle()) as Promise<T | null>;
}
