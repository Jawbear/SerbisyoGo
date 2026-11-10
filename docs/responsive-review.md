# Functionality and responsive review — 11 November 2026

## Changes implemented

- Responsive layouts at 320, 375, 768, 1024, 1440 and 1920 CSS pixels: one-column phone forms/cards, two-column tablet cards, desktop grids, and a collapsed sidebar below 1100px.
- Readable phone form controls (16px text), minimum 44px main touch controls, safe-area padding, wrapping statistics and headings, and scrollable tables with keyboard access.
- Mobile navigation includes account/sign-out controls; dialog naming, background scroll locking, Escape dismissal and restored keyboard focus.
- A direct dashboard navigation link and correct active navigation for the invoice view.
- Search price/rating/sort/list-map preferences and pagination restore from the URL.
- Network request time limits and a retry action for query failures. File uploads get a longer limit. Failed account-context reads clear stale identity state.
- Bunawan's satellite view stays inside the website. The test checks the iframe source and switching, not Google's remote imagery availability.

## Evidence

15 Node tests pass, including money, transitions, duplicate-payment safeguards, seed targeting and HTTP timeout/cancellation behavior. TypeScript and full ESLint pass.

34 distinct browser test/project cases passed across a full run and targeted reruns in installed Chrome, using desktop and Pixel 7 touch emulation. The first full run passed 30 of 32 cases. Its two failures were in a simulated error test: React development Strict Mode issued a second request that prematurely reset the simulated error. Keeping the simulated failure until the user retries fixed the test setup. The subsequent six-case run passed, covering both corrected retry cases, both new mobile button-height cases, and the two repeated 375px layout checks.

The browser tests use intercepted Supabase responses. They verify public navigation, provider-to-booking navigation, anonymous denial for all admin sections and selected private routes, search/table behavior, no-APK handling, retry behavior, embedded satellite switching, and overflow/control sizing over nine representative routes at six widths. These are UI checks, not live RLS or database-persistence tests. Mobile and desktop landing screenshots were inspected; an oversized vertical CTA found during visual review was corrected and covered by height assertions.

The static production export with `/SerbisyoGo` was built in `.cache/responsive-build` without credentials, so the running development server and its build output were preserved. The static-export headers warning is expected; operational hosting must configure headers.

## Still unverified

- The read-only development integration command was attempted but could not connect (`fetch failed`) from this environment. This does not establish whether the hosted backend passes or fails.
- Actual customer registration/email delivery, booking persistence/provider transitions, member messaging, invoices/reviews, complaint resolution, admin mutations, upload authorization and SQL/RLS regression checks still require the configured backend suites.
- No physical iPhone/Safari/WebKit test, physical Android test, or exhaustive browser/device compatibility certification was performed. Test real devices, keyboard navigation and browser zoom before launch. Responsive layouts cannot guarantee every possible device/browser combination.
- No APK or online gateway exists to validate. Development financial fixtures are not actual settlement evidence.

## Next checks on the owner's machine

The read-only smoke check needs the public URL/key and ignored seeded credentials, **not** the secret key. It signs into five sample accounts and reads scoped records without creating or editing application records:

```sh
npm run check:development -- --development-project qkopbbxmeqqzomrawltf
```

For the public/browser layout tests with installed Chrome in Git Bash:

```sh
E2E_BROWSER_CHANNEL=chrome npm run test:e2e -- tests/e2e/public.spec.ts tests/e2e/responsive.spec.ts
```

The existing workflow suite in `tests/e2e/workflows.spec.ts` intentionally requires an isolated local Supabase environment, its own local seed, and `TEST_*` settings. Do not point it at a live production database. Run SQL tests using `npm run test:db` after starting/resetting local Supabase, or run the repository's backend-check workflow against its disposable local instance.

Before a real launch, prioritize completing backend integration/negative-access tests, verification-email delivery, production-compatible hosting, approved pricing/terms/privacy copy, and actual-device review. GitHub Pages remains an unconfigured public preview.
