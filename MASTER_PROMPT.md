# SerbisyoGo — Master Prompt & Release Requirements

> Persistent reference distilled from the project's original architecture, Figma design sources, implementation logs, and release requirements so any session can continue seamlessly without re-pasting the original prompt.

## 1. Product Vision & Platform Scope
SerbisyoGo is a Philippine home-services marketplace (targeting provinces such as Bunawan, Agusan del Sur) consisting of:
1. **Web Application (`src/`)**: Next.js 16 (App Router, React 19, TypeScript, Tailwind CSS v4, Leaflet, Recharts, Lucide, Plus Jakarta Sans) exported as a static site (`out/`) and served on Cloudflare Workers (`https://serbisyogo.sg-team.workers.dev`).
2. **Native Android Application (`mobile/`)**: Expo SDK 55 / React Native 0.83 (`com.serbisyogo.mobile`, `minSdkVersion` 24 / Android 7.0+, `targetSdkVersion` 36) distributed via signed GitHub Releases APK and `/download/`.
3. **Shared Backend (`supabase/`)**: Supabase Auth, PostgreSQL with RLS & pgTAP tests, Realtime Postgres Changes, private Storage buckets (`private-files`, `avatars`, `android-releases`), and Edge Functions (`files`, `releases`, `admin-accounts`).

## 2. Design & Visual Requirements
- **Design Source**: Primary Figma file (`SERBISYOGO`, node `0-1`) — dark workspace structure, 216px sidebar, 72px header, Plus Jakarta Sans typography, forest/ivory/sage/gold palette (`src/app/theme.css`), responsive rules (`src/app/responsive.css`).
- **Branding**: Official 3D neon-green emblem on pure black (`public/brand/`, `mobile/assets/`), plus the 5.87s portrait startup animation (`logo/LOGO ANIMATION/SerbisyoGoAnimation.mp4` optimized to 720×1280 H.264/AAC) on Android cold launch.
- **Responsive**: Full support from 320px mobile browsers to 1920px desktop, no horizontal overflow, compact two-column mobile category tiles, light Leaflet map tiles with attribution.

## 3. Core Functional Requirements
- **Authentication & Accounts**:
  - Email/password sign-in, registration with 6-digit email verification / PKCE & `token_hash` callbacks, password recovery (`/reset-password/`), Google OAuth support, and SecureStore session persistence on Android.
  - Three roles: `customer`, `provider`, `admin`. Admin provisioning is CLI-only (`npm run admin:provision`), never public signup.
  - Profile photo management (`/account/` and mobile profile) via authenticated `files` Edge Function (JPG/PNG/WebP ≤ 5 MB).
- **Discovery & Catalog (including Lab 4)**:
  - Public categories, approved non-fixture provider directory, service listings, ratings/reviews, public guides, and optional rounded service-area map pins (`set_service_area_pin`).
  - Lab 4 mobile integration: Live PSGC municipality/province discovery, persistent saved searches (offline-capable), location refresh, and connection-error retry.
- **Booking, Messaging & Payments**:
  - Draft UUID idempotency, server-computed pricing (integer centavos, basis-point commission), PostgreSQL exclusion constraint preventing overlapping accepted jobs, `Asia/Manila` display / UTC storage.
  - Full lifecycle: `requested` → `confirmed` → `in_transit` → `in_progress` → `completed` (plus cancellation and quotation acceptance `accept_booking_quote` locking expected labor).
  - Participant-scoped booking messaging with unread counts (`read_through_message`), Realtime updates + 30s/focus fallback, and in-app notifications.
  - Cash/manual settlement and operator-verified GCash receipt submission (private Storage + admin verification). No online payment gateway or automated payout transfer.
- **Provider Workspace**:
  - Incoming requests, active jobs, split-shift & midnight-boundary weekly availability, service rate management, active-job live coordinate sharing (15-min freshness, auto-cleared on close), and 1-document verification credential upload + admin review.
- **Admin Workspace (Web)**:
  - 12+ admin views: login (`/admin/login/`), dashboard/reports, accounts, provider verification, categories/services, bookings, settlements/payouts/refunds, complaints (with separate internal notes), announcements, settings (including APK release management), and append-only audit logs.
- **Android APK & In-App Updates**:
  - Signed APK (`com.serbisyogo.mobile`), `/app-update.json` feed, in-app update detection/download/install, and `/download/` page with QR code and SHA-256 verification.

## 4. Mandatory Release & Quality Requirements
1. **All automated checks pass**: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:db:embedded`, `npm --prefix mobile test`, `npm --prefix mobile run lint`, `npm run deploy:check`, and `npm run test:e2e`.
2. **Production Database Safety**: Backup/recovery point verified and isolated restore tested (`docs/release-056-recovery.md`) before applying pending migrations (`024`, `025`).
3. **Isolated Staging Acceptance**: Hosted staging project (`serbisyogo-staging`) verified for Auth, Storage, Edge Functions, Realtime, and cross-device booking/GCash flows.
4. **Signed Official APK**: Built via protected signing workflow (`android-signing`) from reviewed commit, matching production keystore (`671506d9...`), verified with `apksigner`, and tested on physical Android devices (`docs/physical-device-testing.md`) including 0.5.4 → 0.5.6 in-place upgrade.
5. **Policy & Catalog Readiness**: Operator-approved `/terms/`, `/privacy/`, `/pricing/` (`src/lib/policy-approval.ts`) and genuine non-fixture provider listing (or explicit product sign-off for empty directory).
6. **Zero Fabricated Evidence**: Every claim, digest, and test count must come from directly observed execution.
