export function signingCertificate(output, expected) {
  const digests = [...new Set([...output.matchAll(/certificate SHA-256 digest:\s*([a-f0-9]{64})\b/gi)].map(match => match[1].toLowerCase()))];
  if (!/^[a-f0-9]{64}$/i.test(expected || '') || digests.length !== 1 || digests[0] !== expected.toLowerCase()) {
    throw new Error(`APK signing certificate does not match the persistent private release key. Found ${digests.length ? digests.join(', ') : 'no certificate digest in the Android tool output'}.`);
  }
  return digests[0];
}
