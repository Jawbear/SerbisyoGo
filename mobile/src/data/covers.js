export const homeCover = require('../../assets/covers/home.jpg');
export function serviceCover(name = '') {
  if (/plumb|water/i.test(name)) return require('../../assets/covers/plumbing.jpg');
  if (/appliance|washing/i.test(name)) return require('../../assets/covers/appliance.jpg');
  if (/air.?con|cooling/i.test(name)) return require('../../assets/covers/aircon.jpg');
  if (/carpent|wood|furniture/i.test(name)) return require('../../assets/covers/carpentry.jpg');
  return null;
}
