# Security implementation notes

## Trust boundary

The static website is untrusted. Route guards improve navigation but cannot authorize anything. All 34 exposed application tables have RLS enabled. The authenticated role has no general booking, role, financial, file, provider-approval, settings, audit or release writes. It can directly manage only its own saved addresses. Sensitive workflows use a narrow RPC allowlist; every security-definer function sets an empty search path and qualifies table names.

`new_user()` assigns customer role regardless of signup metadata. Provider role changes happen only in an authorized approval workflow. Initial admin provisioning is an owner-controlled script, with no signup password in source. Account status gates private functions. Public data is split from private account and verification information.

## Ownership

Customers can read their own profile, addresses, drafts, bookings, invoices, case threads and notifications. Providers can read their own application/documents, availability, assigned bookings, earnings and payouts. A provider receives only the booking task/address needed for an assigned service, not a directory of customer profiles. Conversations are created with the actual two participants; a user cannot add themselves to membership. Review eligibility is enforced by completed booking and customer identity, with a unique booking constraint.

Public reads return active categories, approved provider public details, visible eligible reviews, appropriately targeted published announcements and verified published release metadata. Public review rows do not expose private customer names or phone numbers. Internal support notes have an admin-only SELECT policy and no client writes. Verification files require owner/admin authorization.

## Integrity and audit

Booking confirmation serializes against the provider and draft, recomputes prices, compares the reviewed total and records snapshots. Accepted ranges have a PostgreSQL exclusion constraint. Transitions are explicit and transactional. Payment event keys are unique and duplicate events are checked before and after the payment lock. Browser callbacks never prove payment. Invoice/event/audit records are immutable; ledger amounts are immutable with a controlled reversal marker. Admin changes record actor/action/entity/time without private attachment contents or secrets.

## Edge Functions

The function gateway JWT switch is disabled for mixed public/protected endpoints. Protected branches manually validate tokens with `auth.getUser()` and then use protected database checks before calling a service-role client. CORS origins are explicitly configured, but CORS is not used as authorization. Uploads are buffered with a byte ceiling, checked for extension/MIME/signature and stored under generated owner-scoped paths. All buckets are private; clients cannot create/overwrite/remove objects. Private links expire in 60 seconds.

APK upload parses the binary manifest, checks actual version metadata, bounds decompression, calculates SHA-256 and verifies a stored readback. Publication checks artifact existence and size inside its transaction. Artifact writes are restricted to the authorized function, use immutable paths, and do not overwrite published binaries. Cryptographic APK certificate verification remains a required Android release-pipeline check; checksums alone are not a malware or signing guarantee.

## Operational limits to verify

Database/Edge/RLS tests have not executed in this environment. Before launch, run the local security suite and staging integration tests, regenerate types and use a resolved lockfile. Configure appropriate Auth rate limits/SMTP, Edge resource limits, hosting response headers/CSP, logging, backups and retention. Review actual operator policies and payment processing separately. GitHub Pages in this repository is an unconfigured preview, not an approved production business host.
