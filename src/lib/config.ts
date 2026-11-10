function googleEmbedUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'www.google.com' &&
      /^\/maps\/embed\/?$/.test(url.pathname) && url.searchParams.has('pb')
      ? url.href : '';
  } catch { return ''; }
}
// Public Google Maps satellite embed supplied by the project owner for Bunawan.
const bunawanSatelliteEmbed = 'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d15467.913225540564!2d125.9964983429393!3d8.177102692576652!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x32fdd7493afdb86b%3A0xc8c5ccc582b01f5!2sAgusan%20Del%20Sur%20State%20University!5e1!3m2!1sen!2sph!4v1794341886166!5m2!1sen!2sph';
export const config = {
  googleMapsEmbedUrl: googleEmbedUrl(process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL || bunawanSatelliteEmbed),
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
