# SerbisyoGo marketplace delivery

## Deliverables

The website exports to `out/`. The Android test package is **[SerbisyoGo 0.5.6](../mobile/builds/local-test/SerbisyoGo-0.5.6.apk)**, version code 14, package `com.serbisyogo.mobile`. The local artifact is outside source control. Its SHA-256 is `d87cf99d70a5e3d8a1322a9bd81a5428a0c91e309b0efd7c083e417f6409c1c4`. Its verified size is 55,488,980 bytes. The APK contains the standalone JS bundle and ARMv7, ARM64 and x86-64 libraries. It requires Android 7.0 or later and targets API 36.

The new clients and two additive migrations are local delivery artifacts. The public website still uses its existing distribution channel. Its bundled fallback release is 0.5.4. Desktop and mobile-browser checks matched the GitHub release's size and digest and initiated the actual APK download. No new public release or production schema change was made.

## Codebase audit

| Area | Existing implementation and delivery changes |
| --- | --- |
| Web and hosting | Next.js 16 App Router, React 19, TypeScript, Tailwind, Plus Jakarta Sans, Lucide and Leaflet. Cloudflare Workers serves the static export. The route inventory covers 51 page entrypoints. Supabase handles authenticated writes server-side. |
| Android | Existing Expo SDK 55 and React Native 0.83 app with React Navigation, safe-area handling, branded native splash, private document picker and Android update module. The app uses native controls and shares Supabase Auth and domain records with the website. |
| Design references | The live Figma canvas contains 20 web, 19 Android and 12 admin screen concepts. Web profile frame 1:1078 places pricing and scheduling together. Android frame 1:406 groups professional details, rates, reviews and booking. The web profile now groups the service selector, actual price, duration, date and appointment times in the booking panel. Android offers per-service pricing and availability within the native profile. Sample licenses, ratings, on-time percentages and testimonials in the reference are excluded from live profiles. The design includes phone-number verification, while the configured account flow uses email verification. This comparison covers the frame inventory and both profile designs, without asserting pixel-level parity across all 51 screens. |
| Catalog and discovery | Categories relate to provider services and provider profiles. Both clients now match the same active offering against service text, category, budget and available date. The display price reflects the matching services. The web list pairs with Leaflet. Android has a list/map switch, municipality selection, saved searches and zoom. Filters use public service-area pins when a provider has published one. No location permission is required for manual search. |
| Profiles and trust | Public profiles use approved providers, active services, actual reviews, available slots and independently reviewed credential badges. Public pins are optional, coarsely rounded and separate from authorized active-booking locations. Provider documents, booking photos and receipts use private file access. |
| Booking | Both clients use the existing save-draft, availability, pricing, confirmation and transition RPCs. PostgreSQL guards ownership, accepted-slot conflicts and duplicate confirmation. Philippine dates, peso amounts and quote/fixed pricing are maintained. Android gained draft job-photo uploads, booking timelines, completed-job invoices and customer reviews. New quotation acceptance checks the labor amount the customer saw under a row lock. |
| Payment | Cash/manual settlement and operator-verified GCash receipt submission are the supported flows. Job completion, proof submission, admin acceptance and payment status are distinct. Checkout explains that payment is due according to the options shown on the booking. Card and Maya processing, automatic GCash settlement and digital-wallet authorization are unavailable. No money was moved during validation. |
| Messaging | Conversations belong to bookings and have participant membership. Both clients use paginated inboxes and chronological message pages with timestamps. The migrated database supplies unread counts and records the latest message read. A compatibility path keeps membership-scoped conversations accessible on the hosted pre-migration schema. |
| Accounts and notifications | Supabase supplies identity and database roles. Android session storage now uses Expo SecureStore with migration of existing sessions, password visibility controls, a native profile editor and account notifications. Recovery still uses the configured email link and web password-reset page. Supabase change subscriptions and foreground refresh update eligible screens. Android operating-system push delivery has no configured integration. |
| Provider | The native provider home separates incoming requests, active work and upcoming appointments. Providers can open assigned jobs, message customers, adjust service rates and weekly hours, update coverage/profile for review, manage credentials and see settled earnings. Both provider editors support split shifts and shifts ending at midnight. The web provider workspace also supports the optional public map pin. |
| Admin | Existing web modules cover accounts, verification, categories/services, bookings, settlements/payouts, reports, complaints, announcements, settings and audit logs. Changes bound date-filtered queries to the appropriate records, load reports and records concurrently and show booking references. Server-side authorization and RLS continue to govern operations. |
| Mobile usability | First-run Android onboarding supports Skip and Get Started, authenticated users route to the appropriate home, and the bottom navigation provides role-specific destinations. The customer home has service and location inputs, upcoming booking details, categories, featured profiles and support. Requests and replies use the shared support-case backend. |
| Other local work | The pre-existing untracked `fixly/` application and `deliverables/` were outside the SerbisyoGo implementation. The SerbisyoGo lint configuration excludes these directories. |

## New database contracts

1. [Discovery migration](../supabase/migrations/202611190024_discovery.sql) adds nullable public service-area coordinates, the owner-scoped `set_service_area_pin` RPC, active-offering minimum rates and `discovery_available_services`. Existing profiles start without a pin. The public directory, service listings, rating aggregates and public review policy exclude records tied to the trusted development-fixture marker. Owners can still access their own records. The configured hosted database includes development fixtures, so apply this migration before displaying its catalog as a public marketplace. Available dates use actual scheduling rules.
2. [Communication and quote migration](../supabase/migrations/202611190025_booking_communications.sql) adds `accept_booking_quote`, an indexed participant inbox, `read_through_message`, booking-message notifications and payment-related Realtime publication membership. Existing booking IDs, payment records and membership relationships are retained.

Until deployment, the hosted backend supplies the legacy inbox and existing booking flows. The new available-date filter, public pin writes, exact-price acceptance RPC, read-through markers and new notification behavior need their respective migrations.

## Verification

| Check | Result |
| --- | --- |
| Web type-check, lint, production build and deployment readiness | Passed. The production export generated 54 pages including framework and special routes. |
| Web unit and database checks | 31 Node tests passed. All 25 migrations applied to embedded PostgreSQL and 229 SQL assertions passed. This includes ownership, file policies, payment authorization, booking conflicts, stale quotes, membership and public pins. |
| Web browser checks | 94 passed across desktop and mobile-browser projects, 28 isolated-service cases skipped. Responsive coverage includes 320, 375, 768, 1024, 1440 and 1920 px. Public fixtures cover reproducible discovery and layout. Read-only customer, provider and admin tests exercised configured Supabase accounts. |
| Mobile client checks | Lint passed and 33 Node tests passed. The exported mobile web client passed 30 browser cases with controlled responses, including service pricing, split-shift retention, support, booking, GCash evidence and registration. Three separate read-only mobile-client sign-in checks passed against Supabase. |
| Live synchronization | Independent sessions using the web and mobile SDKs returned matching accounts and profiles. The customer had one matching booking and one payment record. The provider had eight matching bookings, eight matching payment records and 14 matching messages. These were read comparisons of development-account records. The UI can advance a read receipt when it opens a conversation. A new production booking, payment, profile mutation or message was never created for a test. |
| Release artifact | Native Gradle release build passed. The Android Hermes export also passed. The package name, version, embedded bundle, architectures, certificate and hash were verified. The public 0.5.4 APK and local test APK have different distribution statuses. |

The signed APK installed on an Android 15 x86-64 emulator and cold-started without Metro. The native smoke run completed all three onboarding screens, restarted the app, verified onboarding persistence, opened discovery, rotated the device, used hardware Back and opened both public guide deep links. The emulator needed a lower rendering resolution after its system launcher stalled. [Native build and smoke metadata](../mobile/builds/local-test/build-metadata.json)

After adjusting the desktop header and phone search order, all 34 focused layout and responsive browser checks passed again. Two additional desktop and mobile-browser regression cases passed on the final production export. Editing the first Monday shift preserved the second shift, including midnight boundaries, in the schedule sent to Supabase. The final web build, type-check, lint and deployment-readiness checks also passed.

The older provider1 development credential was rejected. The verified provider2 fixture was used for the successful live role checks. An earlier Expo development-server run timed out during page loading. The equivalent suite passed against a fresh static Expo export. Delivered password-reset email, physical-device payment authorization, production push delivery and simultaneous device-to-device writes were not verified. The isolated HTTP/Storage/Auth/SMTP workflows need a disposable Supabase stack. This machine did not provide Docker for that run.

The continuation build exported 54 pages. Web and mobile lint, web type-check, deployment readiness, 31 web unit tests, 33 mobile unit tests and 229 embedded database assertions passed. All 36 focused desktop and mobile-browser layout checks passed, including switching service and carrying the chosen Philippine date through the booking sign-in link. Two further desktop and mobile-browser regression runs completed sign-in, saved a fixture draft and verified the chosen date in the authenticated schedule form. The public profile now shows all returned slots. The schedule step reloads availability for the selected service and date before the customer can save an appointment.

The complete continuation browser run passed 92 cases with 34 gated cases skipped. Six of those gated cases then passed against the hosted development backend on desktop and mobile browsers using the current provider fixture. The exported mobile client passed 30 controlled browser cases with the Expo single-page routing fallback. A test server configured for Next.js static routes initially returned 404 for direct Expo routes. The standalone APK also passed customer and provider authentication on the emulator, cold-start session restoration and local sign-out for both roles. With airplane mode enabled, discovery displayed a retry action. After networking was restored, tapping Retry reloaded the catalog on the installed APK. Independent SDK reads again matched customer and provider records. An HTTP GET to the existing public homepage returned 200. The enhanced search markup is present in the local export only.

## Local operation

Use Node 22.19 or later. The web app reads the public project URL and publishable key from the existing root environment. Android reads its matching `EXPO_PUBLIC_*` settings from `mobile/.env.local`. Use the example files for a new checkout and keep the actual environment and signing credentials outside Git.

```powershell
# From the repository root
npm.cmd ci
npm.cmd run dev

# In a second terminal, from the repository root
npm.cmd --prefix mobile ci
npm.cmd --prefix mobile run android
```

For an existing installed development build, start Metro with `npm.cmd --prefix mobile start`. For standalone APK testing, install the delivered file on a connected test device with `adb install -r mobile/builds/local-test/SerbisyoGo-0.5.6.apk`. The signed package starts without Metro.

## Deployment and release

1. Rehearse the migrations on a disposable Supabase stack. The [backend workflow](../.github/workflows/backend-checks.yml) runs the HTTP, Auth, mail, storage and persisted workflow checks. Regenerate SQL types with `npm.cmd run db:types` against the migrated local database if schema changes are made.
2. Check the linked target and review `npx.cmd supabase db push --dry-run`. During the approved rollout, apply the two pending migrations in order with `npx.cmd supabase db push`. Preserve the existing Auth redirects, SMTP, Storage policies and deployed Edge Functions. These changes add no new Edge Function.
3. With the intended public configuration, run `npm.cmd run build` and `npm.cmd run deploy:check`. Deploy the resulting `out/` through the configured Cloudflare workflow or `npm.cmd run deploy:cloudflare -- --confirm` during the release. Hosting supplies static headers through `public/_headers`. [Website deployment guide](deployment.md)
4. For distribution, build the approved source with the persistent signing identity in the existing Android workflow. Verify signature, SHA-256, installation, update behavior and physical-device acceptance before publishing the release. Sync the website release manifest from that approved artifact and redeploy the site. The local test build is uncommitted and has no release source commit attached. [Android build instructions](../mobile/ANDROID_BUILD.md) · [APK release guide](android-apk-release.md)


## Changed files

- [docs/marketplace-delivery.md](../docs/marketplace-delivery.md)
- [README.md](../README.md)
- [mobile/README.md](../mobile/README.md)
- [playwright.config.ts](../playwright.config.ts)
- [mobile/playwright.config.mjs](../mobile/playwright.config.mjs)
- [eslint.config.mjs](../eslint.config.mjs)
- [mobile/.env.example](../mobile/.env.example)
- [mobile/ANDROID_BUILD.md](../mobile/ANDROID_BUILD.md)
- [mobile/App.js](../mobile/App.js)
- [mobile/app.json](../mobile/app.json)
- [mobile/package-lock.json](../mobile/package-lock.json)
- [mobile/package.json](../mobile/package.json)
- [mobile/scripts/smoke-android.mjs](../mobile/scripts/smoke-android.mjs)
- [mobile/scripts/verify-apk.mjs](../mobile/scripts/verify-apk.mjs)
- [mobile/snack-dependencies.json](../mobile/snack-dependencies.json)
- [mobile/src/AppContext.js](../mobile/src/AppContext.js)
- [mobile/src/auth.js](../mobile/src/auth.js)
- [mobile/src/components/BookingActions.js](../mobile/src/components/BookingActions.js)
- [mobile/src/components/GCashPayment.js](../mobile/src/components/GCashPayment.js)
- [mobile/src/components/ServiceAreaMap.js](../mobile/src/components/ServiceAreaMap.js)
- [mobile/src/components/ui.js](../mobile/src/components/ui.js)
- [mobile/src/data/backend.js](../mobile/src/data/backend.js)
- [mobile/src/data/conversations.js](../mobile/src/data/conversations.js)
- [mobile/src/data/discovery.js](../mobile/src/data/discovery.js)
- [mobile/src/data/sessionStorage.js](../mobile/src/data/sessionStorage.js)
- [mobile/src/domain.js](../mobile/src/domain.js)
- [mobile/src/screens/BookingRecordScreen.js](../mobile/src/screens/BookingRecordScreen.js)
- [mobile/src/screens/BookingReviewScreen.js](../mobile/src/screens/BookingReviewScreen.js)
- [mobile/src/screens/FindScreen.js](../mobile/src/screens/FindScreen.js)
- [mobile/src/screens/HomeScreen.js](../mobile/src/screens/HomeScreen.js)
- [mobile/src/screens/MessagesScreen.js](../mobile/src/screens/MessagesScreen.js)
- [mobile/src/screens/MyBookingsScreen.js](../mobile/src/screens/MyBookingsScreen.js)
- [mobile/src/screens/ProfileScreen.js](../mobile/src/screens/ProfileScreen.js)
- [mobile/src/screens/ProviderScreen.js](../mobile/src/screens/ProviderScreen.js)
- [mobile/src/screens/ProviderVerificationScreen.js](../mobile/src/screens/ProviderVerificationScreen.js)
- [mobile/src/screens/ProviderWorkspace.js](../mobile/src/screens/ProviderWorkspace.js)
- [mobile/src/screens/SupportCases.js](../mobile/src/screens/SupportCases.js)
- [mobile/src/screens/WelcomeScreen.js](../mobile/src/screens/WelcomeScreen.js)
- [mobile/src/theme.js](../mobile/src/theme.js)
- [mobile/src/useLiveRows.js](../mobile/src/useLiveRows.js)
- [mobile/tests/auth.test.mjs](../mobile/tests/auth.test.mjs)
- [mobile/tests/domain.test.mjs](../mobile/tests/domain.test.mjs)
- [mobile/tests/e2e/gcash.spec.mjs](../mobile/tests/e2e/gcash.spec.mjs)
- [mobile/tests/e2e/lab4.spec.mjs](../mobile/tests/e2e/lab4.spec.mjs)
- [mobile/tests/e2e/live-readonly.spec.mjs](../mobile/tests/e2e/live-readonly.spec.mjs)
- [mobile/tests/e2e/marketplace.spec.mjs](../mobile/tests/e2e/marketplace.spec.mjs)
- [mobile/tests/e2e/updates.spec.mjs](../mobile/tests/e2e/updates.spec.mjs)
- [mobile/tests/fixtures/backend.mjs](../mobile/tests/fixtures/backend.mjs)
- [src/app/information.css](../src/app/information.css)
- [src/app/layout.tsx](../src/app/layout.tsx)
- [src/app/public-layout.css](../src/app/public-layout.css)
- [src/app/theme.css](../src/app/theme.css)
- [src/components/shell.tsx](../src/components/shell.tsx)
- [src/features/admin/workspace.tsx](../src/features/admin/workspace.tsx)
- [src/features/bookings/flow.tsx](../src/features/bookings/flow.tsx)
- [src/features/bookings/screens.tsx](../src/features/bookings/screens.tsx)
- [src/features/messaging/messages.tsx](../src/features/messaging/messages.tsx)
- [src/features/payments/gcash.tsx](../src/features/payments/gcash.tsx)
- [src/features/providers/availability-preview.tsx](../src/features/providers/availability-preview.tsx)
- [src/features/providers/map.tsx](../src/features/providers/map.tsx)
- [src/features/providers/workspace.tsx](../src/features/providers/workspace.tsx)
- [src/features/services/catalog.tsx](../src/features/services/catalog.tsx)
- [src/lib/config.ts](../src/lib/config.ts)
- [src/lib/data.ts](../src/lib/data.ts)
- [src/lib/database.types.ts](../src/lib/database.types.ts)
- [src/lib/domain.ts](../src/lib/domain.ts)
- [src/lib/types.ts](../src/lib/types.ts)
- [supabase/migrations/202611190024_discovery.sql](../supabase/migrations/202611190024_discovery.sql)
- [supabase/migrations/202611190025_booking_communications.sql](../supabase/migrations/202611190025_booking_communications.sql)
- [supabase/tests/discovery.test.sql](../supabase/tests/discovery.test.sql)
- [supabase/tests/security.test.sql](../supabase/tests/security.test.sql)
- [tests/e2e/auth-navigation.spec.ts](../tests/e2e/auth-navigation.spec.ts)
- [tests/e2e/development-readonly.spec.ts](../tests/e2e/development-readonly.spec.ts)
- [tests/e2e/payment-credentials.spec.ts](../tests/e2e/payment-credentials.spec.ts)
- [tests/e2e/public-layout.spec.ts](../tests/e2e/public-layout.spec.ts)
- [tests/e2e/responsive.spec.ts](../tests/e2e/responsive.spec.ts)
