# SerbisyoGo 0.5.6 staging validation, 20 November 2026

## Continuation rehearsal, 20 November

**Production NO-GO.** The release branch remains `release/0.5.6-rc.1` at `0ef9745747084497269b74fddae99ed9ed9edefb`. Read-only remote inspection confirmed the same SHA on `origin/main`. The working tree supplies the candidate. The index was empty. This continuation updates this report and creates private test evidence and build products. The earlier review below records a separate build.

| Check rerun | Outcome |
| --- | --- |
| Types, lint and units | Checked-in TypeScript and fresh migration-025 TypeScript both passed with incremental compilation disabled. Generated type SHA-256 was `54272d14033a185b539e4a2d929e180429e836b82880a62cd2d5366b4ac4a625`. Web and mobile ESLint, Deno lint (eight files), frozen checks on the three Edge entry points and actionlint on the three release/device workflows passed. Web units passed 33/33 and mobile units 37/37. |
| Website | Next.js webpack export completed 54/54 static generation steps. The intercepted desktop and mobile browser suite passed 90/90. All 155 compared web, fixture and configuration inputs matched the checkout. The 424-file export had zero missing local Next asset references and zero matches in the scoped private-value/host scan. Its file manifest digest is `062599106be07d140870eb52f06e6b20ef00019406e0ce246458709cadd8f941`. |
| Local integration | Four cold starts of a new Supabase project passed 15/15 workflows each, zero retries. Customer/provider PostgreSQL feed readiness times in ms were 2135/1544, 2774/2053, 2573/2523 and 2724/1929. Every run observed the first rejection and correction notice, resubmission and approval. The separate signed-receipt test passed for the customer-owner and administrator, denied access to the provider, unrelated customer and anonymous client, and confirmed owner cancellation and outsider denial. |
| Database | Docker pgTAP passed 232 assertions in nine files. Embedded PostgreSQL passed 232 assertions. The seeded 023 dry run selected only 024 and 025. The local apply command took 714 ms. Both 45-line manifests hashed to `5fbfc111ad993d43574b369ec03fc776e4aa37eb8f9aa797c742c9e196321900`. The independent synthetic restore preserved Auth identities and historical fields across 38 original tables, including a booking, payment and message. Production lock timings, backups and recovery remain open. |
| Website staging | Wrangler 4.165.0 successfully dry-ran the freshly copied fixture export with `wrangler.staging.jsonc`. The configured Workers are `serbisyogo-staging` and production `serbisyogo`. There was no hosted deployment or staging URL. The fixture export requires a rebuild for the approved isolated backend before deployment. |
| Android build | Offline Gradle debug assembly succeeded in 2m 54s. Output copied to `mobile/builds/local-test/SerbisyoGo-0.5.6-continuation-debug.apk`, **92,315,529 bytes**, SHA-256 `a3135d69756a39834d5e33990583392c945f38e7fd45bb091c791958a7ee70cf`. Android SDK verified a single v2 Android Debug signer with certificate digest `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. Package `com.serbisyogo.mobile.introdebug`, version 0.5.6 (14), min SDK 24, target 36, ARM64 and x86_64. The bundled API is loopback. The earlier fit-debug APK and this build have matching Hermes and movie bytes. Among 1,230 extracted entries only `resources.arsc` differed. The complete APKs have different hashes. |
| Opening and navigation | Media inspection confirmed the original 10.00 s, 1080 × 1920, 24 fps H.264/AAC stereo 48 kHz master (3,005,078 bytes) and packaged 5.87 s, 720 × 1280, 30 fps H.264/AAC stereo 48 kHz derivative (1,569,447 bytes). The rebuilt APK installed on API 35. First run hit an Android System UI unresponsive dialog. The repeat passed natural completion, guest routing, ordinary navigation without replay, Back, foreground restoration and a cold Find link at 720 × 1600. At 1080 × 2400 the captured frame shows the whole green logo and wordmark centered on black. Decoder preparation to completion measured 7.012 s on this emulator. Physical startup timing and sound remain pending. |

### Final testing APK after the reproducibility fix

Use **`mobile/builds/local-test/SerbisyoGo-0.5.6-loopback-debug.apk`**, **92,315,525 bytes**, SHA-256 **`87df1b0492d017778cb7907899b252c2ef1f8cbfc10365e02af354e7797eccad`**. This supersedes the intermediate continuation-debug build in the table. Android's resource dump traced the earlier byte difference to `react_native_dev_server_ip`, which the React Native Gradle plugin derives from the build host. The standalone debug Gradle script now sets that resource to `127.0.0.1`. The Android guide points to the resulting APK. These two files and this report are the continuation's source changes.

Two successive offline assemblies using the same local toolchain and dependency caches completed in 2m 13s and 1m 36s and produced identical bytes. The SDK verified the v2 debug signer listed above. The installed base APK on API 35 also matched the digest. Release provenance still requires a clean build from an approved commit.

Both screen sizes passed on the final APK. The 1080 × 2400 emulator measured 7.324 s from decoder preparation to completion for the 5.87 s clip. The customer signed in, cold-started into Home, browsed the directory, opened a persisted booking, sent a unique message, signed out and cold-started into Sign in. The provider signed in separately, cold-started into the provider workspace and read that message. The account harness initially had a duplicate variable declaration, and a subsequent attempt encountered Android's first-use immersive-mode prompt. The final run used a syntax-checked harness and an emulator with the system prompt acknowledged. Tests used one emulator and synthetic accounts. Physical audio, cross-device delivery, handoff, full native booking creation and native receipt submission remain pending.

The fresh Expo web export also passed 30/30 phone browser tests. All test stacks and the emulator were stopped. Final inspection found zero containers and networks for the new staging project and zero listeners on the ten checked service, web and emulator ports. Docker retained the disposable volumes.

### Continuation evidence and commands

Final Android evidence is in `.cache/continuation-loopback-build-{1,2}.log`, the matching `.sha256` files, `continuation-loopback-signature.log`, `continuation-loopback-installed.log`, `continuation-loopback-{small,large}.log` and `continuation-loopback-account.log`. Both builds used `mobile/scripts/build-local-debug.ps1 -StagingDirectory .cache/serbisyogo-056-Bbut7P -Offline`. The fresh Expo export and browser results are in `.cache/continuation-expo-build.log` and `.cache/continuation-phone-fresh.log`. The release path list and scoped artifact scan are in `.cache/continuation-audit/`.

Private logs `.cache/continuation-0.log` through `continuation-5.log` correspond in order to `npm.cmd test`, `npm.cmd --prefix mobile test`, `node node_modules/typescript/bin/tsc --noEmit --incremental false`, `npm.cmd run lint`, `npm.cmd --prefix mobile run lint` and `npm.cmd run test:db:embedded`. Additional logs include `continuation-restore.log`, `continuation-web-build.log`, `continuation-web-browser.log`, `continuation-wrangler.log`, `continuation-apk.log`, `continuation-signature.log`, `continuation-badging.log` and `continuation-retry-{small,large}.log`. Android used `mobile/scripts/build-local-debug.ps1 -StagingDirectory .cache/serbisyogo-056-9e6CUr -Offline` with the local SDK/JDK.

The new disposable project is `.cache/serbisyogo-056-Bbut7P`. Its guarded Windows runner executed `node rc-trials.mjs desktop-1 mobile-1 desktop-2 mobile-2`. Its private `.cache` contains per-command logs, loopback Docker and Windows binding captures, `desktop-1-{before,after}.log`, `desktop-1-pgtap.log`, `generated-tsc.log` and `receipt-and-cancel.log`. The local browser fixtures used `npm.cmd run build` and `node node_modules/@playwright/test/cli.js test -c final.config.mjs --retries=0` with synthetic public settings and external browser DNS blocked. Publication, hosted-account and physical-device tests were excluded. Preserve the private directories locally because they contain synthetic credentials.

The release proposal still covers 123 paths. The changelog, exclusions, approval-dependent Git commands and owner checklist in the earlier review below apply. Read access to GitHub was verified. Commit, push, hosted staging, production migration, signing and publication still require their respective approvals.

## Release candidate review, 20 November

**Production remains NO-GO.** The local review branch is `release/0.5.6-rc.1`, based on `0ef9745747084497269b74fddae99ed9ed9edefb`. A read-only `git ls-remote --exit-code origin refs/heads/main` matched that SHA on `https://github.com/Jawbear/SerbisyoGo.git`. The candidate includes uncommitted files. No release commit, push, hosted deployment, production data operation or APK publication occurred. GitHub's workflow API returned `disabled_manually` for both Cloudflare and Android. Repository write permissions, environment reviewers and independent Cloudflare build triggers still require owner verification.

### Checks rerun against this working tree

| Check | Current evidence |
| --- | --- |
| Checked-in and generated types | `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed in the checkout and in the isolated project after `node scripts/generate-types.mjs`. Generated 025 type SHA-256 was `54272d14033a185b539e4a2d929e180429e836b82880a62cd2d5366b4ac4a625`. The checkout retained its type snapshot. |
| Web, mobile and Edge | Root and mobile ESLint passed. Web unit tests passed 33/33 and final mobile unit tests passed 37/37, zero skipped. Deno lint checked eight files. Frozen Deno type checking passed for files, releases and admin-accounts. Actionlint passed the three release/device workflows. |
| Static site and browser fixtures | Next.js 16.4.6 App Router webpack export completed 54/54 static generation steps. Traced 424 files and checked local Next asset references in exported HTML. Fixture regression passed 90/90 on desktop and phone-sized Chrome, zero retries. A fresh Expo web export passed 30/30 on phone-sized Chrome. The controlled browser config blocked external DNS and excluded hosted-account and public APK download tests. |
| Supabase integration | Four fresh loopback Docker starts passed all 15 selected persisted workflows per start, zero retries and zero skips. Both Postgres feeds reported ready before the first receipt rejection. Desktop 1 customer/provider readiness was 1,625/2,854 ms, phone 1 was 2,450/1,219 ms, desktop 2 was 2,516/1,546 ms, and phone 2 was 2,353/1,398 ms. The APK publication test was excluded. |
| Auth and service flows | Local Mailpit verification and recovery links, password authentication, customer account writes, provider application and private credentials, admin authorization and account management, booking creation through completion, invoice and review, participant messaging, read cursor and recipient notification delivery all ran against synthetic data. Separate fixture tests covered navigation, role protection, directory filtering and responsive layouts. Owner cancellation persisted and an unrelated account's cancellation was denied in a supplemental local API test. |
| Payments and files | Each cold trial observed first rejection on the customer's socket and in the open booking, settlement after resubmission, the provider update and one paid ledger event. pgTAP exercised repeat approval. Supplemental Storage/Edge checks confirmed that customer-owner and admin could retrieve the exact receipt byte count through a signed URL. Anonymous, unrelated customer and booking provider were denied the receipt object and signed-link issuance. Direct bucket reads were also denied for the authorized users, who use Edge-issued URLs. |
| SQL security and recovery | Docker pgTAP and embedded PostgreSQL each passed 232 assertions across nine files. The seeded 023 dry run listed only 024 and 025. Applying the pair took **555 ms** on the small fixture. Before/after 45-line manifests both hashed to `94dbcf4d90ccc49f7bd55a738f476e80f6db33ae5895a3e3e7f748a3ba2a593e`. Separate embedded restore matched Auth identities and historical fields across 38 prior application tables, including one booking, one payment and one message. Production-scale lock waits, recovery time and Storage recovery remain open. |
| Isolation and cleanup | The local CLI used PostgreSQL 17, a dedicated Docker network, local mail capture and a distinct project with no hosted project link. Effective Docker and Windows host bindings were loopback on 54321–54324 and 54327 after setup and reset. Final host inspection found zero project containers, zero project networks and zero listeners across the ten inspected service/browser ports. Synthetic Docker volumes were retained. |
| Cloudflare | Production config names `serbisyogo`. Separate staging config names `serbisyogo-staging`, disables preview URLs and reads a separate asset directory. Wrangler 4.164.0 completed `deploy --config wrangler.staging.jsonc --dry-run` in the disposable checkout. No hosted staging URL was established. This export is built for intercepted fixtures. A real staging deploy needs an owner-approved isolated Supabase project, a new export using its public config, and explicit deployment approval. |

### Android testing

**Final local testing APK** — `mobile/builds/local-test/SerbisyoGo-0.5.6-fit-debug.apk`, **92,315,529 bytes**. SHA-256 `d4415c3993e35f2c5d53817c8cba938f1e6afd81d3db09ef4a7027f04184e96a`. Android SDK apksigner verified one v2 Android Debug signer, certificate SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. The installed base APK on API 35 had the same file digest. The final native player caps the video surface at the derivative's resolution, centering it within the available screen. Debug build, badging, signature, installation and playback evidence are the `fit-*` logs and `installed-digest.log` in the private evidence directory.

Final APK tests passed at 720 × 1600 and 1080 × 2400 on the host-graphics emulator. From decoder preparation to natural completion, the native log measured **6.381 s** and **6.409 s**, respectively. The large-screen capture shows the complete glossy logo and wordmark on black. The small-screen suite also verified guest browsing, ordinary navigation without replay, Back dismissal, background/resume and a cold Find link. A system UI unresponsive dialog blocked the first UI assertions even though the native log recorded playback completion. Both suites subsequently passed. Earlier software-rendered trials on the preceding build included timeouts and slower completion. Hardware acceptance and performance on low-end devices remain pending. The emulator was shut down after checksum verification.

The Android app uses Expo 55, React Native 0.83, Gradle and local Expo native modules. Its production identifier is `com.serbisyogo.mobile`. The standalone test build uses `com.serbisyogo.mobile.introdebug`, version 0.5.6, code 14, min SDK 24, target SDK 36, with ARM64 and x86_64 libraries. Debug manifest permissions include internet, vibration, biometrics/fingerprint, package installation for the updater, the app-specific receiver permission and the development overlay permission. The debug manifest permits cleartext for loopback testing. Production permission/signing review remains separate.

The original 3,005,078-byte film is 10.00 s, 1080 × 1920 H.264 High at 24 fps, AAC-LC stereo at 48 kHz. The packaged derivative is **5.87 s, 720 × 1280 H.264, 30 fps, AAC-LC stereo at 48 kHz, 1,569,447 bytes**. All portions of the reveal and fade are retained. Frame comparison against the same resized, retimed source gave SSIM 0.996578. The raw resource in the APK hashed to `099390c9721684f70e19162ce5feca575e9fcd2142d0278a2b016a88550185dd`. The supplied master hashed to `4a6de566532246b79f475938cdcb10d11fd01e1768b39187090dfb6e72efad8c`.

Android's native splash precedes the centered aspect-fit movie on black. Playback uses the media stream, mutes at startup in silent/vibrate mode, runs once per process and closes on completion, interruption, Back, decoder failure or the 15-second timeout. Authentication remains in the existing verified-user flow. The testing APK embeds the local API and its publishable key, with public release lookups disabled. The standard build retains its release feed. The older production-configured APK referenced below is a different artifact.

On the earlier 5.87-second debug build in this rehearsal, the API 35 emulator installed the APK, signed in as a seeded customer, restored customer Home after a cold launch, browsed Find, opened real bookings and a booking detail, and sent a persisted message. Sign-out reached the protected sign-in gate. A separate provider session restored its workspace after cold launch and read the customer's message. This was one emulator with two account sessions. Native receipt submission, full booking creation, physical-device sound, cross-device notification delivery and network handoff require device acceptance.

### Source, evidence and release controls

Git reported 86 modified tracked paths and 51 untracked entries, including a nested repository. The proposal contains 123 exact paths and the index is empty. Web/backend/test input comparison across 184 paths found zero discrepancies for the fixture build. The Docker copy used the same inputs with the intentionally generated database type file exempted from byte comparison. The final APK and its authenticated-flow predecessor contained the same Hermes bundle, SHA-256 `6dcbff99f5475120bee7f019a2bbc8f002e694d24706cacb1f92a42055a2497c`. The native sizing change was tested on the final APK.

The reviewed surface includes the Next.js web application in `src`, Expo client in `mobile`, Supabase Auth/Postgres/RLS, Storage, Realtime and Deno Edge Functions in `supabase`, GitHub workflows, Cloudflare static Workers configs and local staging scripts. The local Supabase CLI supplies the Docker stack from its TOML configuration. Edge file requests authenticate the user and check user-scoped file visibility before using a privileged Storage client. Admin account and release mutations check active-user and admin authorization. Neither client needs a service-role key. The known production private environment values and common credential markers scan found no matches in the proposed files or static export. The APK bundle scan checked the local API/key and absence of configured hosted backend hostnames and known private values. These are scoped checks.

Proposed changelog: provider discovery and availability, booking and messaging updates with unread state, payment review catch-up on Realtime readiness, migrations 024/025, mobile account/provider screens, optimized native opening, isolated standalone test builds, and production workflow approval controls. The intended source list is `.cache/rc056-current/commit-paths.txt`. Keep the separate untracked `fixly/` repository (including its own local environment), three unrelated guide videos and subtitles in `deliverables/`, and the classroom guide/screenshots out of this commit. Only the source and runtime MP4 exceeded 1 MiB in the proposed files. Local dotenv files, private credentials, keystores, backups, caches, generated native project, exports and APKs are ignored. Both animation files belong in the proposal because the test verifies both digests.

Private evidence lives under `.cache/rc056-current/`. The retained fixture export is in `.cache/serbisyogo-056-o5yMgF/out/`. The Docker logs, generated schema, readiness times and comparable manifests are in `.cache/serbisyogo-056-9e6CUr/.cache/`. Treat these staging directories as private because they include disposable credentials. The file inventories are `source.sha256` and `web.sha256`. They record local inputs and output bytes. A reviewed clean commit and a clean repeat build remain required for distributable provenance.

**Commands used:** `npm.cmd test`, `npm.cmd --prefix mobile test`, both package lint scripts, `npm.cmd run test:db:embedded`, and `node .cache/release-056-isolated-restore.mjs`. The two fresh checkouts came from `node scripts/prepare-staging-056.mjs`. Web used `npm.cmd run build` with explicit synthetic public variables, then `node node_modules/@playwright/test/cli.js test -c final.config.mjs --retries=0`. Expo used `node node_modules/expo/bin/cli export --platform web --max-workers 2` with dotenv disabled and an isolated output directory. Windows Docker ran `node rc-trials.mjs desktop-1 mobile-1 desktop-2 mobile-2` in the isolated checkout. That retained driver records each actual CLI command, project guard and cleanup step, including `db reset --local --version 202611170023`, local dry-run and upgrade, `test db --local`, type generation, and zero-retry Playwright workflow runs. The debug build command is documented in [Android build instructions](../mobile/ANDROID_BUILD.md).

**Trial exceptions:** The sandbox denied Hermes and Wrangler template access on first attempt. Both operations passed after scoped retries. The first Expo fixture test copy missed two imports. A web fixture attempt was interrupted, two sandboxed browser processes stalled during teardown, and another run skipped 34 tests because its test process lacked the fixture URL (56 passed). The final isolated suites above completed. The first supplemental receipt test incorrectly expected direct bucket access for the owner. A later test used a fixture password invalidated by the recovery workflow. The completed run used the supported signed URL path and a fresh unrelated customer. An emulator sign-out probe restarted the process before logout completed. Waiting for the signed-out UI verified persistence across cold restart.

**After source review and explicit Git approval only**, inspect and stage the enumerated files, review the index, then commit. Push only after push approval.

```powershell
git status --short --branch
git --literal-pathspecs add --pathspec-from-file=.cache/rc056-current/commit-paths.txt
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m "Prepare SerbisyoGo 0.5.6 release candidate"
git push -u origin release/0.5.6-rc.1
```

**Outstanding gates in order**

1. Release owner reviews the exact path list, names accountable reviewers, approves commit/push, and records the full reviewed SHA. Rebuild from a clean checkout and record web/APK digests, source SHA, CI run IDs and signing identity.
2. Platform owner provisions or approves a distinct hosted staging backend and confirms its Auth redirect URLs, mail sink, private Storage, Edge config and Realtime publication. Rebuild for it, obtain staging deploy approval, then test the actual hosted URL and devices against the same backend.
3. Database owner schedules an encrypted production backup and quarantined restore, including storage objects and Auth, and records recovery point/time. Time 024/025 at representative volume, including locks and the rollback decision point. The [recovery runbook](release-056-recovery.md) covers the operator procedure.
4. Product owner records an eligible genuine listing or explicitly accepts the empty public directory after fixture exclusion. QA signs off physical Android installation, audio, launch timing, booking and receipts, separate-device notifications, reconnect and network handoff.
5. Release owner and operators verify production config, environment protections, deploy triggers, previous known-good Worker/APK, database rollback compatibility, monitoring and rollback ownership. Obtain separate GO decisions for production migration, Worker deployment, release signing and APK publication. Keep the hold until all decisions and evidence are recorded.

## Historical staging evidence preceding this review

**Production decision remains NO-GO.** The two confirmed local failures are closed. Four cold starts passed the payment workflow and the complete affected persisted suites. TypeScript passed against the migrated schema. The candidate is still an uncommitted working tree based on `0ef9745747084497269b74fddae99ed9ed9edefb`.

## Follow-up validation on isolated staging

The original failure occurred in the interval between the Realtime socket join and activation of the PostgreSQL change feed. The payment test now registers its row handlers before subscribing and waits for the `postgres_changes` system event with status `ok` on **both** customer and provider channels. The web and mobile payment components re-read authorized receipt rows on feed readiness, including a rejoin, and on subsequent changes for that payment. A regression test covers a rejection committed before readiness, later changes, rejoin, and callbacks arriving after disposal.

| Cold stack and browser viewport | Customer feed ready | Provider feed ready | Persisted workflows |
| --- | ---: | ---: | ---: |
| Desktop 1 | 1,726 ms | 2,940 ms | 15/15 |
| Phone 1 | 1,823 ms | 2,732 ms | 15/15 |
| Desktop 2 | 1,327 ms | 2,881 ms | 15/15 |
| Phone 2 | 1,484 ms | 1,509 ms | 15/15 |

Each row used a newly started service stack and freshly initialized synthetic data. All four ran the full workflow file with zero Playwright retries and zero skips among selected tests. The APK publication test was excluded. Readiness times are elapsed observations from channel setup. Each run required the first rejection event on the customer's socket, the correction notice in the already-open booking, a pending payment after rejection, and provider denial of receipt access. Resubmission and approval then produced the customer approval event, the paid UI, the provider payment update, and one paid ledger event.

| Other local checks | Follow-up evidence |
| --- | --- |
| Nullable unread count | The generated inbox view exposes `unread` as `number \| null`. The badge compares `(t.unread ?? 0) > 0`, and the checked-in snapshot reflects nullability. Full TypeScript checks passed with the snapshot and with fresh local generation after migration 025. The latter used `tsc --noEmit --incremental false`. Generated file SHA-256 was `54272d14033a185b539e4a2d929e180429e836b82880a62cd2d5366b4ac4a625`. |
| Web and mobile | Both lint commands passed. Web unit tests passed 33/33 and mobile unit tests passed 34/34. The local web export built 54 pages. Intercepted browser regression passed 90/90 across desktop and phone-sized Chrome, and Expo web regression passed 30/30. |
| Database | Docker pgTAP passed 232 assertions across nine files. Embedded PostgreSQL also passed 232 assertions. A seeded 023 upgrade applied only 024 and 025. Both 45-line manifests had SHA-256 `89d0061f3d1e3b046cf68156e42ab26efdb99312df4a29ceb39f6fd300837199`. |

### Host port isolation

The Supabase CLI creates Docker port mappings without an explicit host address. The runner now pre-creates the project bridge with `com.docker.network.bridge.host_binding_ipv4=127.0.0.1`, passes its name to startup, and propagates it to CLI subprocesses that recreate containers. The staging check inspects effective Docker publications after startup, reset, and Edge setup. An unexpected published address or a missing required service port fails the run. [Docker bridge binding behavior](https://docs.docker.com/engine/network/drivers/bridge/)

| Published service | TCP host port | Docker and Windows listener addresses |
| --- | ---: | --- |
| API gateway | 54321 | `127.0.0.1`, `::1` |
| PostgreSQL | 54322 | `127.0.0.1`, `::1` |
| Studio | 54323 | `127.0.0.1`, `::1` |
| Mailpit | 54324 | `127.0.0.1`, `::1` |
| Analytics | 54327 | `127.0.0.1`, `::1` |

Docker Desktop's local Linux engine supplied the effective mappings. Windows `Get-NetTCPConnection -State Listen` independently confirmed the addresses. The first desktop trial omitted analytics and Vector. The other three included analytics and omitted the optional Vector collector. Final inspection found no staging containers or listeners on these ports or the three browser-server ports. The isolated database, Edge and Storage volumes were retained.

### Evidence and remaining gates

The Windows run used the local Docker named pipe and a loopback-served web export. Private evidence is under `.cache/serbisyogo-056-6fVr9I/.cache/`. The four viewport logs are `desktop-1.log`, `mobile-1.log`, `desktop-2.log`, and `mobile-2.log`. The same directory contains binding captures, migrated-schema TypeScript output, pgTAP results and upgrade manifests. The intercepted web suite is in `.cache/serbisyogo-056-Y53tyY/.cache/web-fixtures.log`. The repository's Linux runner passed shell syntax validation.

One setup run stopped before browser testing when the binding checker tried to inspect an unpublished Edge container during replacement. The checker now takes the project publication listing first and inspects every published container in it. Testing resumed from a stopped stack and fresh seed. A separate intercepted web run used a fixture hostname outside the suite's route pattern. Rebuilding with its matching synthetic hostname and external DNS blocked produced the 90/90 result. The web build also required passing staging variables to the build process directly, and the Expo test copy needed its local fixture imports.

**Open release gates** include a reviewed source commit and traceable builds, production recovery evidence and migration lock timing at representative scale, a genuine public listing or owner-approved empty-directory launch, and physical Android acceptance with a staging-configured client, including cross-device delivery and network handoff. The preserved APK still lacks source/build provenance. Hosted workflow approvals and separate production migration, deployment and publication decisions remain outstanding. [Release decision and acceptance steps](release-056-staging.md) · [Recovery runbook](release-056-recovery.md)

## Original validation before the repairs

The original fresh-stack payment event test failed on both viewports, and the CI TypeScript check failed with types generated from the migrated database. The tables below retain that baseline.

### Original test environment

The generated project was `serbisyogo-056-foncom` in `.cache/serbisyogo-056-foncoM`. It had its own Supabase project ID and no project link or copied application environment files. Docker Desktop reported Linux engine 29.9.3 on WSL 2. The Windows runner used the local `desktop-linux` named pipe, Node 22.19.0 and the lockfile's Supabase CLI 2.122.1. The repository runner expects a Unix socket. The staging copy also received the candidate's tracked Edge dependency lockfile, which the preparation script omits.

All integration clients used loopback addresses and synthetic accounts. Docker Desktop published ports 54321–54324 and 54327 on wildcard host addresses despite the dedicated bridge's loopback option. The optional Vector log collector also restarted repeatedly. The application checks below exercised the local API, Auth, Mailpit, PostgreSQL, Storage, Edge and Realtime services directly.

### Original Docker migration and database results

| Check | Result | Evidence |
| --- | --- | --- |
| Fresh startup | Passed | PostgreSQL 17.11 recorded 25 migrations through `202611190025`. |
| Seeded upgrade | Passed | Reset locally to `202611170023`, confirmed the baseline in migration history, seeded six accounts, then captured the pre-upgrade manifest. Both dry-run and actual push listed only `202611190024_discovery.sql` and `202611190025_booking_communications.sql`. The combined push command took 450 ms on this small fixture. Production-scale lock time remains unmeasured. |
| Historical data | Passed | All 45 manifest lines matched byte for byte. Both files had SHA-256 `db576797d74ffbe2936c29a35d04713725860b990f8ccc126bbf356eb3c325b9`. Three bookings and three payments totaled 145,000 centavos in each table. All three messages had sender membership. |
| Clean database pgTAP | Passed | After a full local reset, `supabase test db --local` reported nine files, 232 assertions and `Result: PASS`. |
| CI type check using the migrated schema | **Failed** | Local introspection succeeded. With those generated types, `tsc --noEmit` reported TS18047 at `src/features/messaging/messages.tsx:40` because `t.unread` can be null. The staging copy's original type file was restored after this check. |

### Original persisted desktop and phone-viewport workflows

Each viewport received a freshly initialized dataset. The candidate web export used the current local API and the browser tests used separate real Auth sessions, local Edge Functions, private Storage and Mailpit. Each run executed 15 tests with zero skips. The runner explicitly excluded the actual APK publication exercise.

| Result on both viewports | Workflow coverage |
| --- | --- |
| Passed | Registration through a captured confirmation email, customer password sign-in and persisted profile change, and recovery email through new-password sign-in. |
| Passed | Provider credential upload and admin review, private verification file ownership and outsider denial, and private avatars for all three account roles. |
| Passed | Admin account creation, edit and confirmed deletion of a disposable account, customer denial at the admin endpoint, admin category and announcement auditing, private complaint notes and draft-release controls. |
| Passed | Customer booking creation, provider transitions through completion, customer Realtime delivery, and the review flow. |
| Passed | Participant messaging, outsider read/write denial, recipient socket delivery for both message and notification, and the read cursor. |
| Passed | GCash recipient verification, customer configuration denial, and invalidation of verification when the recipient changes. |
| **Failed** | The combined GCash receipt and Realtime workflow. The customer socket missed the first rejection update within its 15-second window after each fresh reset. At that point the receipt upload, pending payment, customer review denial, provider privacy check and administrator rejection had succeeded. The assertion stopped the rest of this test on both viewports. |

**Original suite totals: 14 passed and one failed on desktop, 14 passed and one failed on the phone viewport.** Booking and message delivery passed on both. These counts exclude the following diagnostic runs.

The unchanged GCash workflow passed on a warm stack with fresh records. A separate API readback confirmed rejection kept the payment pending, resubmission followed by approval marked it paid, a repeated approval left exactly one paid event, and the private receipt remained hidden from the provider. The customer received both review events and the provider saw the paid update in this run.

On a newly reset stack, an instrumented copy ran the same payment assertions after waiting for each channel's PostgreSQL feed to report ready. Both channels reported `SUBSCRIBED` by 107 ms. The customer and provider feeds reported `postgres_changes: ok` at 1,741 ms and 2,100 ms respectively. All payment assertions then passed. This demonstrates a readiness gap in the original test and explains why a successful socket join alone is insufficient evidence of delivery. The candidate's unmodified fresh-stack gate remains red. Client catch-up after a missed event or network handoff remains unverified.

### Original independent local checks

| Check | Result | What ran |
| --- | --- | --- |
| Web and mobile unit suites | 33 + 33 passed, zero skips | Both package test commands. |
| Type checking, lint and workflow syntax | Passed | Web TypeScript using the candidate's checked-in type snapshot, both ESLint commands and actionlint. Deno 2 also type-checked the files, releases and admin-accounts Edge entry points with the frozen lockfile. |
| Embedded database | 232 assertions passed across nine SQL files | All 25 migrations. Coverage includes privileged operations, discovery and document privacy, booking ownership and transitions, server-calculated prices, overlapping appointments, stale quotes, idempotent writes and manual GCash review. |
| Embedded restore and upgrade | Passed | Restored a synthetic 023 archive, compared Auth fixture identities and historical fields of 38 existing application tables, applied 024 and 025, and compared the generated manifests. The sample included a booking, payment and message. |
| Web export and browser regression | 54 pages built, 90 tests passed | Desktop Chrome and phone-sized Chrome, using locally served pages and intercepted backend fixtures. |
| Expo web export and browser regression | 30 tests passed | Fresh Expo web export with dotenv loading disabled, synthetic client configuration and intercepted HTTP. |
| Preserved Android artifact | Offline verification passed | Version 0.5.6, code 14, v2 signature, approved certificate, launcher and splash resources, existing production backend configuration and SHA-256 `d87cf99d70a5e3d8a1322a9bd81a5428a0c91e309b0efd7c083e417f6409c1c4`. |

The browser fixture runs used installed Chrome with external DNS blocked. Hosted-account tests, the GitHub APK download and the local APK publication exercise were excluded. Physical Android and cross-device delivery require separate acceptance.

### Original local run notes

The initial npm offline install lacked a cached package, and Docker retried a registry DNS failure. Both downloads completed. The first local Next.js build passed the environment file as a Node flag that its build workers rejected. Passing the staging public variables through the process environment produced the successful export. A supplemental fixture seed hit a name collision on an already populated dataset, and another encountered a connection reset following a database restart. The supplementary diagnostics completed with fresh uniquely named accounts. The official desktop and phone runs each completed on their own fresh seed.

The test server and Edge process exited. Supabase stopped with its local Docker volumes retained, the empty staging network was removed, and no staging containers or test-port listeners remained. Private logs and synthetic credentials are in the ignored staging directory. No application, migration or production configuration change was made as part of validation.

### Release gates recorded in the original run

The release record requires a reviewed source commit and traceable build, production recovery evidence, a genuine public listing or an owner-approved empty-directory launch, and physical Android acceptance using a staging-configured client. The preserved APK's metadata lacks a source commit and build URL. Production backup and restore, external deployment approvals, real-provider availability and hosted workflow state were outside this local run. [Prior release decision](release-056-staging.md) · [Recovery runbook](release-056-recovery.md)
