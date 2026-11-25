# SerbisyoGo 0.5.6 release execution

**Production decision on 20 November 2026: NO-GO.** The reviewed revision is `4f3d76628b625ced10bd457b033047a1e3d8407a` on `release/0.5.6-rc.1`. The release-branch push was verified in the preceding run. The production branch at that check was `0ef9745747084497269b74fddae99ed9ed9edefb`.

## Cloudflare

| Record | Verified result |
| --- | --- |
| Branch build | Cloudflare reported failure for build `33ddd961-1906-408e-b4ca-84b5d4d5d2dd` on the reviewed SHA. GitHub reported zero annotations and zero deployment records for the SHA. Cloudflare denied the current session access to the build log (HTTP 403), so the underlying build error is unknown. [Cloudflare build](https://dash.cloudflare.com/72e57f964d240f5587ff3466ad7c7f2f/workers/services/view/serbisyogo/production/builds/33ddd961-1906-408e-b4ca-84b5d4d5d2dd) |
| Preview | Cloudflare created Preview record `6b37263d5638429ca8a57565abdcb761` on 20 November at 11:46:24 UTC. Its deployment list was empty, its last-deployed field was null and the latest-deployment lookup returned 404. There is no Preview deployment ID. [Assigned Preview URL](https://release-0-5-6-rc-1-serbisyogo.sg-team.workers.dev) |
| Public checks | On the assigned URL, `/`, `/find/`, `/services/`, `/faq/`, `/contact/`, `/download/`, `/app-update.json` and `/brand/logo.png` each returned an HTML 404. No hosted frontend or backend tests passed there. |
| Production comparison | Deployment history identifies `d46c3d4a-5b5c-4cd8-9f22-6e49f3b8568e` as the active deployment before the branch push and at this check. It began on 18 November at 15:39:26 UTC and serves version `4a168544-c4af-408f-b81a-5b040972988d` at 100%. The earlier recorded 17 November **version** ID belongs to an older deployment. |
| Production HTTP | The home, Find, Download, update JSON and logo returned 200. The update feed still advertises 0.5.4, code 12, SHA-256 `cf9baff788ded72f82c0e4a542a32455614355e548f32c42d680189c4adbb506`. [Production feed](https://serbisyogo.sg-team.workers.dev/app-update.json) |

## Supabase staging

### 21 November 2026 capacity and readiness check

A fresh Supabase CLI inventory showed SerbisyoGo and MExam both `ACTIVE_HEALTHY` in the organization that owns SerbisyoGo. Its other three projects were inactive, and the inventory contained no `serbisyogo-staging`. The organization listing did not expose a billing tier. The latest verified tier was Free on 20 November. Both slots under that allowance are occupied. Provisioning stopped before a create request. [Supabase Free plan limits](https://supabase.com/docs/guides/platform/billing-on-supabase)

| Verification | Result |
| --- | --- |
| Embedded database, rerun 21 November | All 25 migrations and the catalog seed applied in memory. All 232 pgTAP assertions passed with synthetic fixtures. |
| Staging web build guards, rerun 21 November | Five offline assertions passed, including rejection of the production reference, a mismatched project link, the wrong project name and a secret key. |
| Hosted backend and website | Blocked on a free project slot. No staging project reference or credentials were issued. Hosted configuration, integration tests, cross-project isolation and website binding are pending. |

Production remains **NO-GO**. This check made no hosted changes. The local integration results below are from the earlier rehearsal.

### 20 November 2026 preparation

The owner approved a fresh `serbisyogo-staging` project in `ap-south-1` under the existing plan allowance. The organization that owns production reports the Free plan. Its two active projects are SerbisyoGo and MExam. Three other projects are inactive. A third active project exceeds the free allowance. Provisioning stopped before a create request. There is no hosted staging project reference, database password, API key or deployed function. [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase)

The local staging workspace at `.cache/hosted-staging-4f3d766/` contains an archive checkout of the reviewed commit. It excludes the production project link, dotenv files and credentials. The proposed web origin is `https://serbisyogo-staging.sg-team.workers.dev`. This is an intended deployment target.

| Component | Local preparation and verification |
| --- | --- |
| Database and Auth | All 25 migrations, the catalog-only seed and the confirmation, email change and recovery templates are present. The staged Auth configuration uses the staging site and web callback, the mobile sign-in scheme, email confirmation and an eight-character minimum password. Hosted mail and native callback delivery await an isolated project and test identities. |
| Storage and Realtime | On the local migrated schema, `private-files`, `avatars` and `android-releases` all had public access disabled. The publication contained bookings, booking locations, messages, notifications, payments and GCash submissions. |
| Edge Functions | The checkout contains `files`, `releases` and `admin-accounts`. The prepared Edge settings allow the staging web origin and set the APK size limit. The functions use the target project's injected Supabase credentials. A local CORS test accepted the staging origin and rejected the production origin. |
| Website | The staging build helper requires a creation receipt, a matching project link, a healthy staging project in the approved organization and region, and a publishable key from that project. It scans the compiled browser assets for the staging settings and other Supabase hosts before preparing the static assets for `serbisyogo-staging`. Five offline guard assertions passed. With no receipt, the helper stopped before contacting Supabase or producing deployable assets. |
| Hosted acceptance | Once capacity is available, record the returned staging ref, check it against the production ref, provision with the staging-only checkout, apply migrations and the catalog seed, configure Auth, then deploy the three functions with staging-only settings. Use synthetic customer, provider and administrator identities to verify Auth links, private receipts, tenant access controls, booking and payment transitions, and Realtime delivery. Hosted isolation and function behavior remain pending. |

## Migration, recovery and catalog

A read-only production query returned aggregate counts and no customer records. A disposable PostgreSQL 17.11 container used the cached Supabase Postgres image, an in-memory filesystem, a local Unix socket and disabled networking. The test used the committed migrations and synthetic Auth and Storage catalog tables from the project's test harness.

| Check | Observed result |
| --- | --- |
| Representative volume | Both the production count and the synthetic starting fixture had 10 provider profiles, 32 bookings, 32 payments, 58 messages and zero GCash submissions. |
| Uncontended migration | Database-side elapsed time was 6.24 ms for 024 and 8.44 ms for 025. The measurements include the commits on this test host. Hosted compute and concurrent production traffic can produce different timings. |
| Contention and retry | A second session held the message-table lock. A 250 ms lock timeout aborted 025. Its new quote function and index were absent after rollback. After releasing the blocker, retry succeeded. The 44-line historical manifest matched before and after the upgrade. |
| Database security | All 232 pgTAP assertions passed. Evidence is in `.cache/hosted-staging-4f3d766/migration-results.json`. The previous full local Supabase rehearsal also passed four cold runs of 15 integration workflows. [Prior integration evidence](release-056-staging-2026-11-20.md) |
| Production recovery | Managed inventory returned zero backup points, PITR disabled and WAL-G enabled. The earlier synthetic restore passed. A production-derived recovery point, private Storage byte recovery, isolated restore, measured recovery time and custodian sign-off are outstanding. [Recovery procedure](release-056-recovery.md) |
| Directory | The live public view exposed four providers. Applying the release's development-fixture exclusion to that view found zero eligible non-fixture profiles. A genuine eligible listing or explicit product approval for an empty launch remains outstanding. |

## Sign-offs

| Decision owner | Evidence needed before approval |
| --- | --- |
| Staging operator | An available project slot, verified staging project ref, healthy deployment and passing hosted isolation tests. The owner approved staging only within the existing allowance. |
| Recovery operator | Protected recovery point with recoverable Storage bytes, isolated restore, reconciliation and actual recovery objectives. |
| Product owner | A genuine eligible provider offering a service, or explicit approval of the empty directory. |
| Android release owner | A signing-authorized build of the reviewed commit, certificate verification, traceable digest and a signed upgrade test. The GitHub Android workflow was manually disabled and restricts signing to a reviewed main-branch dispatch with environment approval. |
| QA operator | Record the exact APK digest, two physical device models and Android versions. On staging, verify a fresh install, in-place upgrade, audible and muted cold starts, logo framing, Back and background behavior. Use separate customer and provider handsets for booking, receipt resubmission, message and notification delivery, reconnect and Wi-Fi/cellular handoff. Record pass/fail and evidence per device. No physical device was attached at inventory. [Device acceptance plan](physical-device-testing.md) |
| Release operator | At future rollout, recheck the active Worker version and APK feed. Worker rollback uses the previous verified version. An installed Android downgrade requires a higher-version signed correction. Database recovery requires reconciliation of writes after the recovery point. Production migrations, Worker deployment and APK publication each need their release decision. [Release and rollback procedure](release-056.md) |
