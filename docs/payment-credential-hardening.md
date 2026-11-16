# Payment and provider credential hardening — 17 November 2026

Staging follow-up: real Supabase testing required replacing migration 17's Auth
table index with a private application-owned email reservation table and trigger.
The current schema has 21 migrations and 170 pgTAP assertions. The private APK
path now supports a bounded 64 MiB upload with streamed request/read-back handling;
the project's global Storage limit must also permit that size. See the
[staging validation record](staging-validation-2026-11-17.md) for the final
full-service outcome and the tested Android APK.

The source now requires recorded recipient verification before enabling GCash,
and all three credential groups before provider approval or reactivation.
These changes have not been applied to the hosted database or deployed clients.

## Payment recipient verification

Migration `202611170018_verified_payment_recipient.sql` adds the verification
timestamp and administering account. It disables existing GCash settings during
upgrade so an administrator can confirm the actual wallet. Historical payments,
references and receipts remain intact.

In Administration → Settings, an administrator checks the recipient name and
number in GCash, tests any supplied QR, selects the verification confirmation,
and enables payments. Verification is an administrator attestation; this system
does not query GCash to establish ownership or move money.

Changing the name, number or QR invalidates prior verification. Saving those
changes while payments remain enabled is rejected until verification is recorded
again. Instructions can change without invalidating the wallet. Both older RPC
signatures route through the same checks. The database rejects enabled settings
without a verification timestamp, and web/mobile payment screens also withhold
payment instructions when that timestamp is absent.

## Provider credentials

Migration `202611170019_provider_credential_requirements.sql` adds a constrained
`verification_category` to private file metadata. New web/mobile uploads send the
category explicitly; the files Edge Function validates it before storage upload.
Filename prefixes are display labels and cannot satisfy the checklist.

Every administrator approval/reactivation requires the applicant's own:

- Government ID.
- Profession evidence: TESDA NC I/II, COC, PRC license, training/employment
  evidence, or another supported profession-evidence category.
- Clearance.
- Active service and availability.

A database trigger checks updates that assign approved status, including assigning
it again during a later application review. Client roles cannot directly insert
or update provider profiles. Trusted service fixtures can still initialize records;
those are outside the browser approval path.

Categories declare the type of evidence submitted. The administrator must inspect
the actual files and record a review reason before approval. Historical uploads
stay readable but need resubmission with a category to count toward requirements.
Web and mobile show “Category required — upload again” for those files. An older
APK sending uploads without a category receives an update/category error.

Existing approved providers are not automatically suspended by this migration;
the operator should review their documents. Future approvals/reactivations must
pass the checks. File retention after approval remains a separate operational
policy; the trigger checks the evidence at approval time.

Migration `202611170020_admin_review_reason.sql` also fixes an existing ambiguous
`reason` SQL reference that prevented successful provider review. The same
variable was disambiguated in customer restrictions and payout review.

## Isolated SQL validation without Docker

```sh
npm run test:db:embedded
```

The new PGlite runner applies all 20 migrations and the catalog seed to a fresh,
in-memory PostgreSQL database, then runs the actual pgTAP files in
`supabase/tests/`. It never reads environment files, accepts a hosted connection,
or contacts an existing database. Tests roll back their fixtures.

It emulates the Supabase Auth/Storage SQL schemas and roles needed by these tests.
It exercises PostgreSQL functions, triggers, grants, constraints and RLS. Real
Auth HTTP, signed Storage URLs, Edge requests, Realtime transport, and concurrent
client sessions require the full Supabase integration workflow. PGlite's engine
version can differ from the configured Supabase PostgreSQL 15 instance.

All **168 pgTAP assertions passed** locally. These include 43 payment-recipient
and credential regressions plus the existing identity, account deletion,
authorization, booking, quotation, scheduling and payment cases.

Additional checks passed: web TypeScript, web/mobile lint, 25 web Node tests,
16 mobile Node tests, production static export, and Deno type checks for all
three Edge Functions. Six focused web browser checks passed across desktop and
mobile; three focused Expo browser checks passed for receipt submission,
unverified-wallet blocking and categorized credential upload. Authentication and
mobile navigation regressions also passed during this continuation. Browser
requests are intercepted; they do not certify hosted Storage/Auth integration.
The updated Android JavaScript/Hermes export also passed; a signed APK and
physical-device validation are separate rollout steps.

The source/import checkers now skip dependency directories installed by Deno.
The new Edge lockfile records the dependency versions that passed type checking.

The backend CI now runs the embedded suite before starting its disposable
Supabase stack. Its existing SQL, Edge type, and persisted HTTP/browser checks
remain in place.

## Rollout

1. Rehearse all pending migrations on an isolated Supabase instance. Validate the
   migration history and resolve any identity conflicts reported by migration 17.
2. Schedule the payment pause: migration 18 deliberately disables the current
   recipient until an administrator verifies it.
3. Apply pending migrations in sequence and deploy the updated `files` and
   `admin-accounts` and `releases` Edge Functions. New files metadata needs migration 19.
4. Publish the updated web/mobile clients together with clear instructions for
   resubmitting historical credentials. Repair public APK access before relying
   on the mobile update path.
5. Independently verify the real payment recipient, then enable payments through
   the updated administrator form.
6. Complete live-origin email/OAuth, private upload/deletion, provider review and
   physical-device checks before opening the service to real transactions.

Do not run database resets or fictional seeds against a hosted project.
