import test from 'node:test';
import assert from 'node:assert/strict';
import { signingCertificate } from '../scripts/apk-signature.mjs';

const expected = 'a'.repeat(64);
test('certificate verification accepts Android signer-label variants without changing the expected key', () => {
  for (const label of ['Signer #1', 'V2 Signer:', 'V3.0 Signer:', 'Signer (minSdkVersion=24, maxSdkVersion=2147483647)']) {
    assert.equal(signingCertificate(`${label} certificate SHA-256 digest: ${expected.toUpperCase()}\n`, expected), expected);
  }
});
test('duplicate scheme reports are accepted only when every reported certificate matches', () => {
  assert.equal(signingCertificate(`V2 Signer: certificate SHA-256 digest: ${expected}\nV3.0 Signer: certificate SHA-256 digest: ${expected}`, expected), expected);
  assert.throws(() => signingCertificate(`Signer #1 certificate SHA-256 digest: ${expected}\nSigner #2 certificate SHA-256 digest: ${'b'.repeat(64)}`, expected), /does not match/);
});
test('missing, unexpected or public-key-only digests cannot satisfy the release certificate check', () => {
  for (const output of ['', `Signer #1 certificate SHA-256 digest: ${'b'.repeat(64)}`, `Signer #1 public key SHA-256 digest: ${expected}`]) assert.throws(() => signingCertificate(output, expected), /does not match/);
});
