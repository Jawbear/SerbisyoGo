# Alpha/beta change: mobile accounts and manual GCash

This change is source code, not a deployed website or a newly signed APK. It does not establish that every product feature is production ready.

## What changed

- Mobile administration screens, admin API client and admin deep links are removed. Website `/admin/accounts/` retains account creation, reads/search, editing and confirmed permanent deletion. Other website admin workflows remain available.
- Mobile registration uses the same Supabase Auth project and profile trigger as the website. Users provide a name, email, Philippine number, matching password of at least 12 characters, and consent. Only the server assigns roles.
- Mobile users can request another confirmation email and request password recovery. Email links open the configured website; users then return to mobile to sign in. `EXPO_PUBLIC_SITE_URL` must point to the correct deployed website. Website registration retains the submitted email on its verification page and handles immediate sessions when email confirmation is disabled.
- Mobile booking participants have booking conversations. Providers can accept/decline, progress and complete their assigned jobs and send quotations; customers can accept quotations and cancel eligible requests. Server authorization and transition rules still apply.
- Customers can submit a GCash reference and private JPG/PNG/WebP/PDF receipt after service completion on either platform. The amount comes from the payment record. The recipient comes from website admin settings. Receipt submission never marks a payment paid.
- Admins inspect receipts in `/admin/transactions/`, independently check their GCash wallet, then approve or reject with a reason. Approval uses the existing payment events and commission ledger. A refund still requires an actual external refund and its recorded verification.
- Receipt RLS allows only the submitting customer and active administrators. Providers cannot read wallet receipts. Pending receipts prevent repeated submissions; duplicate active references are rejected; retrying the same request or review does not duplicate settlement. A rejected receipt can be replaced with a new image, including a corrected receipt with the same transfer reference.

## Required setup before testers use it

1. Run the database suite against a disposable local Supabase instance (`supabase start`, `supabase db reset`, `npm run test:db`). The new tests are `supabase/tests/gcash.test.sql`. Never reset a hosted database for these tests.
2. Apply migration `202611150012_gcash_testing.sql` to the intended backend with the normal reviewed migration process. Deploy the updated `files` Edge Function. Both the database and function must be updated before clients use receipt upload. Regenerate database types with `npm run db:types` against the migrated local instance.
3. Configure Supabase SMTP, email confirmation, Site URL and the exact website `/auth/callback/` redirect. Verify delivery to real tester inboxes. For password recovery also test `/reset-password/`. Website and mobile must use the same Supabase project.
4. Set the recipient name and `09xxxxxxxxx` number in website `/admin/settings/` and enable GCash. No personal number is embedded in source. Use a small, agreed test amount and tell testers when real money is being sent. Use a gateway sandbox instead when no real transfer is intended. This flow performs no automatic wallet validation or fund transfer and makes no claim about account eligibility for public merchant operations.
5. Deploy the website, rebuild/sign the Android APK with the existing signing key and install it on a physical device. The previous downloadable APK retains its old features until replaced by a separately verified release.
6. Complete a real cross-platform registration/confirmation/login test, a provider job through completion, and a customer GCash transfer. Verify the exact recipient, amount and reference inside the wallet, approve in web admin, then refresh mobile and confirm paid status and one ledger/payment event. Also reject a receipt and submit a replacement. Check that another customer/provider cannot view it.

## Validation limits

The website production build and Android Hermes export pass. Node tests pass for 20 website cases and 14 mobile cases; both linters pass. The mobile browser suite passes 17 checks, with 3 opt-in live-account checks skipped. Eight website authentication/registration checks pass across desktop and phone projects. Existing website account CRUD checks pass on both projects. Responsive checks exercised widths from 320 to 1920 pixels; a stale Android-download button selector was corrected and its focused checks pass. Browser tests use intercepted backend responses; they verify UI behavior, request wiring, navigation and layout, not SMTP delivery or real money movement. Database tests were attempted but local PostgreSQL at `127.0.0.1:54322` was unavailable. SQL runtime/security validation, actual SMTP, hosted rollout, native receipt selection, physical-device checks and real transfer verification remain outstanding.

Provider onboarding/availability management, mobile profile editing, reviews, support and refund requests still use the website. These changes do not claim full mobile parity or completion of all alpha/beta acceptance criteria. Operator-approved terms, privacy contact, retention and refund policy still need review before public launch.
