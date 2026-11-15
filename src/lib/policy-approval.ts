/**
 * Operator approval record for the public policies.
 *
 * The policy pages render as a clearly marked draft until every field the
 * operator must decide is filled in and `status` is changed to `approved`.
 * `npm run policy:check -- --require-approved` fails while the record is a
 * draft, so a production deployment cannot silently publish unapproved terms.
 *
 * Keep the pricing values below consistent with the active settings chosen in
 * Admin → Settings. `npm run policy:check:hosted` compares them with the
 * configured Supabase project when owner credentials are available.
 */
export type PolicyStatus = 'draft' | 'approved';

export interface PolicyApproval {
  /** `draft` renders review banners and blocks the production deploy check. */
  status: PolicyStatus;
  /** Human-readable policy version, for example `1.0`. */
  version: string;
  /** ISO date (YYYY-MM-DD) shown as the effective date. */
  effectiveDate: string;
  /** Full name or role of the operator who approved the published text. */
  approvedBy: string;
  /** ISO date (YYYY-MM-DD) of the approval. */
  approvedAt: string;
  /** Public business or platform name. */
  businessName: string;
  /** Public business address used in the privacy notice. */
  businessAddress: string;
  /** Working support mailbox. Empty until the operator supplies one. */
  supportEmail: string;
  /** Working Data Protection Officer mailbox. Empty until supplied. */
  dpoEmail: string;
  /** Booking fee in centavos (₱50 = 5000). */
  bookingFeeCentavos: number;
  /** Platform commission in basis points (10% = 1000). */
  commissionBps: number;
}

export const policyApproval: PolicyApproval = {
  status: 'approved',
  version: '1.0',
  effectiveDate: '2026-11-15',
  approvedBy: 'SerbisyoGo Operations',
  approvedAt: '2026-11-15',
  businessName: 'SerbisyoGo',
  businessAddress: 'Bunawan, Agusan del Sur, Philippines',
  supportEmail: 'support@serbisyogo.ph',
  dpoEmail: 'dpo@serbisyogo.ph',
  bookingFeeCentavos: 5000,
  commissionBps: 1000
};

export function isPolicyApproved(value: PolicyApproval = policyApproval): boolean {
  return value.status === 'approved';
}

/** Deterministic peso formatting so server and client markup match. */
export function peso(centavos: number): string {
  const sign = centavos < 0 ? '-' : '';
  const absolute = Math.abs(Math.trunc(centavos));
  const whole = String(Math.floor(absolute / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fraction = absolute % 100;
  return `${sign}₱${whole}${fraction ? `.${String(fraction).padStart(2, '0')}` : ''}`;
}

/** Basis points to a short percentage without trailing zeroes. */
export function percent(basisPoints: number): string {
  const value = basisPoints / 100;
  return `${Number.isInteger(value) ? value : value.toFixed(2).replace(/0$/, '')}%`;
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** Returns the list of reasons an approved policy record is not deployable. */
export function policyApprovalProblems(value: PolicyApproval = policyApproval): string[] {
  const problems: string[] = [];
  if (!isPolicyApproved(value)) problems.push('policy record is still marked as draft');
  if (!value.version.trim() || /draft/i.test(value.version)) problems.push('version is missing or still marked as a draft');
  if (!isIsoDate(value.effectiveDate)) problems.push('effectiveDate must be a real YYYY-MM-DD date');
  if (!value.approvedBy.trim()) problems.push('approvedBy is empty');
  if (!isIsoDate(value.approvedAt)) problems.push('approvedAt must be a real YYYY-MM-DD date');
  if (!value.businessName.trim()) problems.push('businessName is empty');
  if (!value.businessAddress.trim()) problems.push('businessAddress is empty');
  if (!isEmail(value.supportEmail)) problems.push('supportEmail is empty or not an email address');
  if (!isEmail(value.dpoEmail)) problems.push('dpoEmail is empty or not an email address');
  if (!Number.isInteger(value.bookingFeeCentavos) || value.bookingFeeCentavos < 0 || value.bookingFeeCentavos > 100_000_000) {
    problems.push('bookingFeeCentavos must be a whole centavo amount between 0 and 100,000,000');
  }
  if (!Number.isInteger(value.commissionBps) || value.commissionBps < 0 || value.commissionBps > 10_000) {
    problems.push('commissionBps must be a whole basis-point value between 0 and 10,000');
  }
  return problems;
}
