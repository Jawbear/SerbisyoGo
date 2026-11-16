export function money(centavos = 0) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(centavos) / 100);
}

export function manilaDay(date = new Date(), offset = 0) {
  return new Date(date.getTime() + 8 * 3600000 + offset * 86400000).toISOString().slice(0, 10);
}

export function appointment(value) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short'
  }).format(new Date(value));
}

export function timeLabel(value) {
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export function dayLabel(day) {
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${day}T12:00:00+08:00`));
}

export function validateRequest(form, now = new Date()) {
  if (String(form.description || '').trim().length < 10) throw new Error('Describe the task using at least 10 characters.');
  if (String(form.description).trim().length > 3000) throw new Error('Keep the task description within 3,000 characters.');
  if (!String(form.label || '').trim()) throw new Error('Enter an address label, such as Home.');
  if (String(form.line1 || '').trim().length < 5) throw new Error('Enter your complete service address.');
  if (String(form.city || '').trim().length < 2) throw new Error('Enter your city or municipality.');
  if (!/^\d{4}$/.test(String(form.postal_code || ''))) throw new Error('Enter a four-digit Philippine postal code.');
  const start = new Date(form.starts_at);
  if (!form.starts_at || !Number.isFinite(start.getTime()) || start <= now) throw new Error('Choose an available future appointment.');
  if (manilaDay(start) > manilaDay(now, 89)) throw new Error('Choose an appointment within the next 90 days.');
  return {
    description: String(form.description).trim(), starts_at: start.toISOString(),
    address: {
      label: String(form.label).trim(), line1: String(form.line1).trim(),
      city: String(form.city).trim(), postal_code: String(form.postal_code)
    }
  };
}

export function findService(catalog, providerId, serviceId) {
  const provider = catalog.providers.find(item => item.id === providerId);
  const service = catalog.services.find(item => item.id === serviceId && item.provider_id === providerId);
  return provider && service ? { provider, service } : null;
}

export function filterProviders(catalog, search = '', categoryId = '') {
  const term = search.trim().toLowerCase();
  return catalog.providers.filter(provider => {
    const services = catalog.services.filter(service => service.provider_id === provider.id);
    if (categoryId && !services.some(service => service.category_id === categoryId)) return false;
    const text = [provider.display_name, provider.headline, provider.city, ...services.map(service => service.title)].join(' ').toLowerCase();
    return !term || text.includes(term);
  });
}

// Booking rows store the provider id, not the display name. Resolve the
// approved public profile names in one lookup instead of showing a blank card.
export function withProviderNames(bookings = [], providers = []) {
  const names = new Map((providers || []).map(provider => [provider.id, provider.display_name]));
  return (bookings || []).map(booking => ({
    ...booking,
    provider_name: names.get(booking.provider_id) || booking.provider_name || ''
  }));
}

export const VERIFICATION_DOC_CATEGORIES = [
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
];

export function parseDocInfo(fileName) {
  const match = String(fileName || '').match(/^\[(.*?)\]\s*(.*)$/);
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
    title: String(fileName || ''),
    category: undefined,
    isCategorized: false
  };
}

export function formatVerificationFileName(categoryBadge, title, originalFileName) {
  const raw = String(originalFileName || 'document.pdf');
  const lastDot = raw.lastIndexOf('.');
  const ext = lastDot !== -1 ? raw.substring(lastDot) : '.pdf';
  const cleanTitle = (title || raw.replace(/\.[^/.]+$/, ''))
    .replace(/[^\w\s-]/g, '')
    .trim()
    .slice(0, 60);
  return `[${categoryBadge}] ${cleanTitle || 'document'}${ext}`;
}

export function checkVerificationCompleteness(files = []) {
  const categories = files.map(file => VERIFICATION_DOC_CATEGORIES.find(category => category.id === file.verification_category));
  const hasGovId = categories.some(category => category?.id === 'gov_id');
  const hasProfProof = categories.some(category => category?.isProfessionalProof);
  const hasClearance = categories.some(category => category?.id === 'clearance');

  const totalUploaded = files.length;
  const isComplete = hasGovId && hasProfProof && hasClearance;

  const missing = [];
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

