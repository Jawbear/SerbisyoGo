export const UPDATE_URL = 'https://serbisyogo.sg-team.workers.dev/app-update.json';
export const CERTIFICATE = '671506d9e3247ef43ae8d77d17f0a59afc9ba9b26cde855e90456a2a3becfefa';

export function validateRelease(value, installedCode, sdkInt = 999) {
  if (!value || value.package_name !== 'com.serbisyogo.mobile' || value.certificate_sha256 !== CERTIFICATE ||
      !Number.isSafeInteger(value.version_code) || value.version_code < 1 ||
      !/^\d+\.\d+\.\d+$/.test(value.version_name || '') ||
      !Number.isSafeInteger(value.byte_size) || value.byte_size < 1 || value.byte_size > 150 * 1048576 ||
      !/^[a-f0-9]{64}$/.test(value.sha256 || '') ||
      !Number.isSafeInteger(value.min_sdk) || value.min_sdk < 24) throw new Error('The update information could not be verified. Try again later.');
  const expected = `https://github.com/Jawbear/SerbisyoGo/releases/download/android-v${value.version_name}/SerbisyoGo-${value.version_name}.apk`;
  if (value.download_url !== expected) throw new Error('The update download address is not trusted.');
  if (value.version_code <= installedCode) return null;
  if (value.min_sdk > sdkInt) throw new Error('The new version needs a newer Android version. You can continue using this app.');
  return { ...value, release_notes: String(value.release_notes || '').slice(0, 10000) };
}

export function mayPrompt(saved, version, now = Date.now()) {
  return !saved || saved.version !== version || !Number.isFinite(saved.at) || now - saved.at >= 86400000;
}
