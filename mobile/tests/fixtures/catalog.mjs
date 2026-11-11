const names = ['Art Ecleo', 'Francis Romay', 'Wilfredo Rivera', 'Moreno JunDave', 'Jonthan Jabs'];
const specialties = ['Electrical', 'Plumbing', 'Carpentry', 'Appliance repair', 'Air-conditioning'];
const icons = ['flash-outline', 'water-outline', 'hammer-outline', 'construct-outline', 'snow-outline'];
const rates = [45000, 40000, 48000, 35000, 55000];

// Controlled test records, never imported by application code.
export const fixtureCatalog = {
  categories: specialties.map((name, index) => ({ id: `category-${index + 1}`, name, icon: icons[index] })),
  providers: names.map((display_name, index) => ({
    id: `provider-${index + 1}`, display_name, headline: `${specialties[index]} professional`,
    bio: `Household ${specialties[index].toLowerCase()} repairs and scheduled maintenance. A controlled fixture for automated testing.`,
    city: 'Bunawan', service_areas: ['Bunawan, Agusan del Sur'], avatar_path: null,
    rating: [4.9, 4.8, 4.9, 4.7, 4.8][index], review_count: [12, 8, 10, 6, 9][index], min_rate: rates[index]
  })),
  services: specialties.map((name, index) => ({
    id: `service-${index + 1}`, provider_id: `provider-${index + 1}`, category_id: `category-${index + 1}`,
    title: `${name} home service`, rate_centavos: rates[index], duration_minutes: 60, pricing_mode: 'fixed', active: true
  }))
};
