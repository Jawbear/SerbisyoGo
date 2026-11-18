export function normalizeMobile(value) {
  const digits = String(value || '').replace(/[\s()-]/g, '');
  const phone = digits.startsWith('09') ? '+63' + digits.slice(1) : digits;
  if (!/^\+639\d{9}$/.test(phone)) throw new Error('Enter a Philippine mobile number: 09xxxxxxxxx or +639xxxxxxxxx.');
  return phone;
}

export function validatePassword(password) {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }
  if (password.length > 128) {
    throw new Error('Password must not exceed 128 characters.');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error('Password must contain at least one special character.');
  }
}

const signInDestinations = new Set(['Home', 'BookingForm', 'BookingReview', 'BookingRecord', 'MyBookings', 'Messages', 'ProviderVerification']);

export function signInDestination(role, params) {
  const requested = params?.returnTo;
  if (!signInDestinations.has(requested)) return 'Home';
  if (role !== 'customer' && ['BookingForm', 'BookingReview'].includes(requested)) return 'Home';
  return requested;
}

export function verificationCode(value) {
  const code = value.replace(/[\s-]/g, '');
  if (!/^\d{6,8}$/.test(code)) throw new Error('Enter the verification code from your email.');
  return code;
}

export function registration(values) {
  const full_name = (values.name || '').trim().replace(/\s+/g, ' ');
  const email = (values.email || '').trim().toLowerCase();
  if (full_name.length < 2 || full_name.length > 100) throw new Error('Enter your full name (2–100 characters).');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  validatePassword(values.password);
  if (values.password !== values.confirm) throw new Error('Passwords must match.');
  if (!values.consent) throw new Error('Accept the privacy notice and service terms to continue.');
  return { email, password: values.password, data: { full_name, phone: normalizeMobile(values.phone), consent: true } };
}
