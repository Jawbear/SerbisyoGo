export function serviceCover(name: string) {
  const value = name.toLowerCase();
  if (/plumb|water/.test(value)) return { file: 'plumbing', alt: 'Plumber repairing a kitchen sink' };
  if (/appliance|washing/.test(value)) return { file: 'appliance', alt: 'Technician inspecting a washing machine' };
  if (/air.?con|cooling/.test(value)) return { file: 'aircon', alt: 'Technician inspecting an air conditioner filter' };
  if (/carpent|wood|furniture/.test(value)) return { file: 'carpentry', alt: 'Craftsman assembling a wooden shelf' };
  return null;
}
