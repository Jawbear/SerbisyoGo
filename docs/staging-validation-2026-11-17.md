# Staging validation — 17 November 2026

Validation used a disposable Supabase stack in GitHub Actions, including actual
Auth, PostgreSQL, Storage, Edge Functions and a local email inbox. Hosted user
accounts, payment settings and production data were not modified. No new public
APK release or website deployment was made.

The staging branch is `codex/staging-validation-20261116192237`. Backend source
under test is `e3aae1e5513b9e0cb5f1ad9ea0ce5f27f830fa09`:
[integration run](https://github.com/Jawbear/SerbisyoGo/actions/runs/43967668900).
Final result: passed. All 170 real PostgreSQL assertions passed, followed by
14 persisted desktop and 14 persisted mobile workflows with no skipped cases.
Desktop workflows took 52.4 seconds; mobile workflows took 29.3 seconds.

## Fixes found through real service testing

- Migration 17 no longer attempts to create an index on Supabase's managed
  `auth.users` table. A private application-owned reservation table and a
  transaction-scoped trigger enforce normalized email uniqueness. Client roles
  cannot read or write that table directly.
- The universal signed APK is larger than the former 50 MiB limit. Migration 21
  and the local Storage configuration permit 64 MiB. Hosted global Storage and
  plan limits must also support that size before production deployment.
- Large multipart APK requests exhausted the Edge runtime's allocation limit.
  The updated administrator uploader creates a draft, then sends bounded binary
  bytes. Storage upload and stored-file hash verification use streams. The
  function validates the Android manifest, version and minimum SDK before
  marking the private artifact verified. Legacy multipart is limited to 16 MiB.
- Returned signed Storage URLs now use the configured browser-accessible API
  address. Internal container addresses remain available for server read-back.
  `PUBLIC_SUPABASE_URL` is optional for hosted projects and explicit in local CI;
  no request host header controls the returned origin.
- The download manifest now references the actual public 0.3.1 release. The
  previously advertised 0.4.0 release did not exist. The new 0.4.0 build below is
  a separate test artifact and has not been publicly published.

## Verification evidence

| Check | Result |
| --- | --- |
| Root Node tests | 29 passed |
| Website lint, TypeScript and static export | Passed; 49 routes generated |
| Edge type checks: files, releases, admin-accounts | Passed |
| Focused payment/credential/APK retry UI | 8 passed across desktop and mobile browser projects, using controlled requests |
| Public download/fallback browser checks | 4 passed on desktop/mobile; actual GitHub release metadata and download initiation checked |
| Actual PostgreSQL security/business rules | 170 assertions; 21 migrations |
| Persisted desktop/mobile workflows | 28 passed (14 desktop and 14 mobile); no skipped cases |
| Expo/mobile CI | 16 Node tests and 24 browser tests passed; 3 optional hosted-read checks skipped; lint and Android/web exports passed |
| Signed native Android | Installed and launched without Metro on Android API 35 x86_64; discovery navigation and hardware Back passed |

The persisted workflow suite covers login/account persistence, email verification
and recovery, booking completion/invoices/reviews, member messages and outsider
denial, complaints/private notes, admin changes/audit, verified payment recipient
gating, categorized provider credentials and approval, private uploads/avatars,
and a real APK upload, private publication, signed download and archival. It uses
the complete verified public 0.3.1 APK rather than a fabricated ZIP fixture.

Mobile CI: [run 43938753000](https://github.com/Jawbear/SerbisyoGo/actions/runs/43938753000).
Native CI: [run 43938748313](https://github.com/Jawbear/SerbisyoGo/actions/runs/43938748313).
Both used commit `4d46cf781de44cce60db2d8f163c286ef4dbded7`; later functional
changes affect the server/web uploader, not mobile source.

## Tested Android artifact

Local test APK: `.cache/staging-android/SerbisyoGo-0.4.0.apk`.
Metadata and emulator screenshot are stored beside it.

- Package: `com.serbisyogo.mobile`; version 0.4.0, code 5.
- Size: 53,428,876 bytes; minimum SDK 24; target SDK 36.
- Architectures: arm64-v8a, armeabi-v7a, x86_64.
- SHA-256: `dfe8e5061ed3388b94327b87e1c3db03937e24b9a9983541ca8d78d464b33d46`.
- Signing certificate SHA-256: `671506d9e3247ef43ae8d77d17f0a59afc9ba9b26cde855e90456a2a3becfefa`.
- Nondebuggable, standalone bundle; signature/package checks passed.

The existing public 0.3.1 APK was separately downloaded in full and checked:
53,680,280 bytes, SHA-256
`eb1f522d2816985e414b73fb257f36ab8d66507972c0c08f699670e700e33f9d`,
version code 4, same package and signing certificate. Its local verification
record is `.cache/verified-public-apk/verification.json`.

## Remaining rollout checks

Physical-phone installation/update and authenticated native workflows remain
unverified. Browser mobile emulation and the Android startup smoke test do not
certify those flows. Production SMTP/OAuth callbacks, real GCash recipient
ownership/QR operation, hosted Storage limits, backup restore, load and alerting
also require deployment-specific evidence.

Pending migrations 17–21 and updated Edge Functions must be rolled out together
with the clients. Migration 18 deliberately pauses GCash until an administrator
independently verifies the recipient. Historical filename-only provider uploads
do not satisfy the new categorized credential checklist. Follow
[payment/credential rollout](payment-credential-hardening.md#rollout) and
[deployment instructions](deployment.md). Never reset or seed a hosted database
with the disposable test data.
