export function normalizeMobile(value) {
  const digits = String(value || '').replace(/[\s()-]/g, '');
  const phone = digits.startsWith('09') ? '+63' + digits.slice(1) : digits;
  if (!/^\+639\d{9}$/.test(phone)) throw new Error('Enter a Philippine mobile number: 09xxxxxxxxx or +639xxxxxxxxx.');
  return phone;
}

export function registration(values) {
  const full_name = values.name.trim();
  const email = values.email.trim();
  if (full_name.length < 2 || full_name.length > 100) throw new Error('Enter your full name (2–100 characters).');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (values.password.length < 12 || values.password.length > 128) throw new Error('Use a password with 12–128 characters.');
  if (values.password !== values.confirm) throw new Error('Passwords must match.');
  if (!values.consent) throw new Error('Accept the privacy notice and service terms to continue.');
  return { email, password: values.password, data: { full_name, phone: normalizeMobile(values.phone), consent: true } };
}
