export type BookingStatus = 'requested' | 'confirmed' | 'en_route' | 'in_progress' | 'completed' | 'declined' | 'cancelled';
export type Actor = 'customer' | 'provider' | 'admin';
export const transitions: Record<Actor, Partial<Record<BookingStatus, BookingStatus[]>>> = {
  customer: {
    requested: ['cancelled'],
    confirmed: ['cancelled']
  },
  provider: {
    requested: ['confirmed', 'declined'],
    confirmed: ['en_route', 'cancelled'],
    en_route: ['in_progress'],
    in_progress: ['completed']
  },
  admin: {
    requested: ['cancelled', 'declined'],
    confirmed: ['cancelled'],
    en_route: ['cancelled'],
    in_progress: ['cancelled']
  }
};
export function canTransition(actor: Actor, from: BookingStatus, to: BookingStatus) {
  return transitions[actor][from]?.includes(to) ?? false;
}
export function calculatePrice(labor: number, fee: number, bps: number) {
  if (![labor, fee, bps].every(Number.isSafeInteger) || labor < 0 || fee < 0 || bps < 0 || bps > 10000) throw new Error('Invalid integer price configuration');
  const commission = Number((BigInt(labor) * BigInt(bps) + 5000n) / 10000n);
  const total = labor + fee;
  if (!Number.isSafeInteger(total)) throw new Error('Amount exceeds supported range');
  return {
    labor_centavos: labor,
    fee_centavos: fee,
    commission_centavos: commission,
    total_centavos: total,
    provider_net_centavos: labor - commission
  };
}
export function money(centavos: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(centavos / 100);
}
export function pesosToCentavos(value: string) {
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(value.trim())) throw new Error('Enter a positive peso amount with at most two decimal places');
  const [whole, fraction = ''] = value.trim().split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result)) throw new Error('Amount is too large');
  return result;
}
export function manilaDate(value: string, dateOnly = false) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    ...(!dateOnly ? {
      timeStyle: 'short' as const
    } : {})
  }).format(new Date(value));
}
export function normalizePhone(value: string) {
  const n = value.replace(/[\s()-]/g, '');
  if (/^09\d{9}$/.test(n)) return '+63' + n.slice(1);
  if (/^\+639\d{9}$/.test(n)) return n;
  throw new Error('Enter a Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX');
}
export function safeRedirect(value: string | null | undefined, fallback = '/dashboard/') {
  return value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\') && !/[\r\n]/.test(value) ? value : fallback;
}
export function escapeCsv(value: unknown) {
  const s = String(value ?? '');
  return '"' + (/^[=+@\-\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"';
}
export function validateUpload(kind: string, size: number, mime: string, name: string, maximum = 10485760) {
  const apk = kind === 'apk';
  const allowed = apk ? ['application/vnd.android.package-archive', 'application/octet-stream', 'application/zip'] : kind === 'avatar' ? ['image/jpeg', 'image/png', 'image/webp'] : ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (size <= 0 || size > maximum) throw new Error(`File must be between 1 byte and ${Math.floor(maximum / 1048576)} MB`);
  if (!allowed.includes(mime) || !new RegExp(apk ? '\\.apk$' : kind === 'avatar' ? '\\.(jpg|jpeg|png|webp)$' : '\\.(jpg|jpeg|png|webp|pdf)$', 'i').test(name)) throw new Error('Unsupported file type');
}
export function eligibleReview(booking: {
  status: string;
  customer_id: string;
}, userId: string, existing: boolean) {
  return booking.status === 'completed' && booking.customer_id === userId && !existing;
}
export function overlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}
