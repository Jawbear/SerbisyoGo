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
export function percentToBps(value: string) {
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(value.trim())) throw new Error('Enter a percentage with at most two decimal places');
  const [whole, fraction = ''] = value.trim().split('.');
  const bps = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(bps) || bps < 0 || bps > 10000) throw new Error('Commission must be between 0 and 100 percent');
  return bps;
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

export interface VerificationDocCategory {
  id: string;
  name: string;
  badge: string;
  description: string;
  isProfessionalProof?: boolean;
  isRequired?: boolean;
}

export const VERIFICATION_DOC_CATEGORIES: readonly VerificationDocCategory[] = [
  {
    id: 'gov_id',
    name: 'Government-Issued Valid ID',
    badge: 'Government ID',
    description: "PhilSys National ID, Driver's License, Passport, UMID, Postal ID, PRC ID, or Voter's ID.",
    isRequired: true,
  },
  {
    id: 'tesda_nc2',
    name: 'TESDA National Certificate II (NC II)',
    badge: 'TESDA NC II',
    description: 'National Certificate II certifying specialized technical/vocational trade skills.',
    isProfessionalProof: true,
  },
  {
    id: 'tesda_nc1',
    name: 'TESDA National Certificate I (NC I)',
    badge: 'TESDA NC I',
    description: 'National Certificate I certifying foundational technical competencies.',
    isProfessionalProof: true,
  },
  {
    id: 'tesda_coc',
    name: 'TESDA Certificate of Competency (COC)',
    badge: 'TESDA COC',
    description: 'Certificate of Competency in specific trade skills issued by TESDA.',
    isProfessionalProof: true,
  },
  {
    id: 'prc_license',
    name: 'PRC Professional License / Board Certificate',
    badge: 'PRC License',
    description: 'PRC License (e.g., Registered Master Electrician, Master Plumber, Electronics Tech).',
    isProfessionalProof: true,
  },
  {
    id: 'clearance',
    name: 'Barangay, Police, or NBI Clearance',
    badge: 'Clearance',
    description: 'Recent Barangay Clearance or Police/NBI Clearance certifying good standing.',
    isRequired: true,
  },
  {
    id: 'training_cert',
    name: 'Trade / Vocational Training Certificate',
    badge: 'Training Cert',
    description: 'Specialized training, seminar, or workshop certificate from an accredited institute.',
    isProfessionalProof: true,
  },
  {
    id: 'employment_proof',
    name: 'Certificate of Employment / Apprenticeship Record',
    badge: 'Employment Proof',
    description: 'Certificate from previous employer, contractor, or master artisan demonstrating trade experience.',
    isProfessionalProof: true,
  },
  {
    id: 'business_permit',
    name: "Mayor's Permit / DTI Business Registration",
    badge: 'Business Permit',
    description: 'Official DTI registration or local government business permit for service contractors.',
  },
  {
    id: 'other_proof',
    name: 'Other Proof of Profession / Portfolio',
    badge: 'Proof of Profession',
    description: 'Photos of past work, client endorsements, tool certifications, or relevant credentials.',
    isProfessionalProof: true,
  },
] as const;

export function parseDocInfo(fileName: string) {
  const match = fileName.match(/^\[(.*?)\]\s*(.*)$/);
  if (match) {
    const badge = match[1].trim();
    const rest = match[2].trim();
    const matchedCategory = VERIFICATION_DOC_CATEGORIES.find(
      c => c.badge.toLowerCase() === badge.toLowerCase()
    );
    return {
      badge,
      title: rest,
      category: matchedCategory,
      isCategorized: true
    };
  }
  return {
    badge: 'Document',
    title: fileName,
    category: undefined,
    isCategorized: false
  };
}

export function formatVerificationFileName(categoryBadge: string, title: string, originalFileName: string) {
  const lastDot = originalFileName.lastIndexOf('.');
  const ext = lastDot !== -1 ? originalFileName.substring(lastDot) : '.pdf';
  const cleanTitle = (title || originalFileName.replace(/\.[^/.]+$/, ''))
    .replace(/[^\w\s-]/g, '')
    .trim()
    .slice(0, 60);
  return `[${categoryBadge}] ${cleanTitle || 'document'}${ext}`;
}

export function checkVerificationCompleteness(files: { original_name: string; verification_category?: string | null }[]) {
  const categories = files.map(file => VERIFICATION_DOC_CATEGORIES.find(category => category.id === file.verification_category));
  const hasGovId = categories.some(category => category?.id === 'gov_id');
  const hasProfProof = categories.some(category => category?.isProfessionalProof);
  const hasClearance = categories.some(category => category?.id === 'clearance');

  const totalUploaded = files.length;
  const isComplete = hasGovId && hasProfProof && hasClearance;

  const missing: string[] = [];
  if (!hasGovId) missing.push('Government ID');
  if (!hasProfProof) missing.push('Proof of Profession (TESDA NC I/II, PRC License, or Trade Cert)');
  if (!hasClearance) missing.push('Barangay or Police Clearance');

  return {
    hasGovId,
    hasProfProof,
    hasClearance,
    totalUploaded,
    isComplete,
    missing
  };
}

