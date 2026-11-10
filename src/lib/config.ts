export const config = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
  mapTiles: process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  mapAttribution: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '© OpenStreetMap contributors',
  mapAttributionUrl: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION_URL || 'https://www.openstreetmap.org/copyright',
  timezone: 'Asia/Manila',
  // Municipal center published by the Province of Agusan del Sur:
  // https://agusandelsur.gov.ph/municipalities/bunawan/
  mapDefault: {
    label: 'Bunawan, Agusan del Sur',
    latitude: 8.1781,
    longitude: 125.9935,
    zoom: 13
  },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || ''
};
export const backendConfigured = Boolean(config.supabaseUrl && config.supabaseKey);
