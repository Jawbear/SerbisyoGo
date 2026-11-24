<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SerbisyoGo Persistent Agent Instructions & Development Rules

## 1. Mandatory Session Startup Protocol
Before making any code, configuration, or documentation changes in a new session (including after context compaction, terminal restarts, or account/model switches):
1. Read these root continuation files in order:
   - `AGENTS.md` (this file)
   - `HANDOVER.md` (exact checkpoint & next unfinished task)
   - `PROGRESS.md` (verified completed work)
   - `TASKS.md` (remaining tasks, blockers, and priorities)
   - `TEST_RESULTS.md` (actual observed test & verification evidence)
   - `RELEASE_CHECKLIST.md` (mandatory production release gates)
   - `MASTER_PROMPT.md` (original requirements and architectural constraints)
2. Run `git status --short --branch` to verify the working tree matches `HANDOVER.md`.
3. Continue directly from the exact next unfinished task in `HANDOVER.md` / `TASKS.md`. **Never restart the project from scratch and never duplicate completed work.**

## 2. Mandatory Update Protocol
After every significant task, verification run, or before ending a session:
- Update `PROGRESS.md` with newly verified completed items.
- Update `TASKS.md` to mark completed items, add newly discovered tasks, and update blockers.
- Update `HANDOVER.md` with the exact current git branch/commit, uncommitted file state, and the next concrete task.
- Update `TEST_RESULTS.md` with **only directly observed** command outputs, counts, and failures (never fabricate, extrapolate, or hide failures).
- Update `RELEASE_CHECKLIST.md` when any release gate status changes.

## 3. Core Architecture & Non-Negotiable Rules
- **Static Web Export + Supabase Backend**: Next.js 16 (`src/`) exports static files to `out/` (`next build --webpack`, `output: "export"`). There is no Next.js runtime server. Record identifiers use query parameters (e.g., `/providers/profile/?id=...`).
- **Mobile App**: Expo SDK 55 / React Native 0.83 (`mobile/`) sharing the same Supabase project (`qkopbbxmeqqzomrawltf`) and domain rules.
- **Security & Authorization**:
  - UI session state is **never** an authorization boundary; PostgreSQL RLS and server-side RPCs/Edge Functions enforce roles, ownership, and active account status.
  - Never place `SUPABASE_SECRET_KEY`, service-role keys, signing keys, or private credentials in `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`, Git, screenshots, or chat.
  - Keep `.env.local`, `.env.production.local`, `.cache/`, and `mobile/credentials/` private and untracked.
  - All three Storage buckets (`private-files`, `avatars`, `android-releases`) remain private; uploads and signed URLs go through the `files` / `releases` Edge Functions.
- **Money, Booking & Payments**:
  - Money is integer centavos; commission uses basis points and integer rounding.
  - Draft UUID is the booking idempotency key; server recomputes pricing and rejects stale totals.
  - Cash/manual settlements and operator-verified GCash receipts only—never claim automatic online payments, escrow, or payouts exist.
  - Timezone display is `Asia/Manila`; timestamps persist as UTC.
- **Release & Approval Discipline**:
  - Never bypass security checks, policy approval gates (`src/lib/policy-approval.ts`), or manual GitHub/Cloudflare/Supabase production approvals.
  - Never push to production DB (`supabase db push --linked`), deploy production Cloudflare Worker, or publish a production Android APK without explicit operator approval and closed release gates.
  - Exclude `fixly/`, `deliverables/`, videos, `.cache/`, credentials, and local builds from application commits and lint scope.
