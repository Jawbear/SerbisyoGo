# SerbisyoGo Finalization — Owner Approval Packet

Date: 2026-11-25
Target: official Android **0.5.7** (`com.serbisyogo.mobile`, versionCode `15`)
Live baseline: `https://serbisyogo.sg-team.workers.dev` (still official **0.5.4**, code `12`)

This packet consolidates every remaining production action. Nothing below has been executed on production yet.

---

## 1. What is already verified (no approval needed)

| Item | Result |
| --- | --- |
| Live download page baseline | Browser-rendered page still shows **Classroom demo v0.5.6** + official **0.5.4**; two APK buttons. |
| Live `app-update.json` | `0.5.4`, code `12`, SHA-256 `cf9baff788ded72f82c0e4a542a32455614355e548f32c42d680189c4adbb506`. |
| PR #3 | Head `0ffeee0`; mergeable; build/database/Copilot checks pass; `Workers Builds: serbisyogo` failed. No branch protection on `main`. |
| PR #3 local merge | Clean merge `1880e0a` on `phase1/cleanup-20261125`. Release-control tests `2/2` pass. |
| PR #2 local merge | One conflict in `download.tsx`, resolved in favor of PR #2; merge `11d1dc4` on `phase2/release-20261125`. Zero Classroom references in `src/`, `public/`, `mobile/src/`. |
| Signed 0.5.7 APK | `56,888,574` bytes; SHA-256 `ab1b16a43af427c09e810aa86cd5504a8cf6a4e6baaa3a6af51fd784e348c6bd`; package/version/cert verified; v2+v3 signatures; zipaligned. |
| Draft release `457415541` | Draft, tag `android-v0.5.7`, target `3e89d7ca1a82dc5658eb7abafde4f6c1c0db7bc6`; APK asset matches the signed APK. |
| Emulator install/launch | Passed on `serbisyogo-local` (API 35, x86_64): install, Home without Metro, onboarding/restart, discovery, hardware Back, rotation, public guides. |
| Cloudflare Worker history | All recorded deployments are `source: wrangler`; no Workers Builds deployment recorded. |
| Supabase production | Project `qkopbbxmeqqzomrawltf` is ACTIVE_HEALTHY; still on schema `023`; no managed backup/PITR. |

## 2. Mandatory owner approvals / inputs

### A. Cloudflare deploy guard (required before any `main` push)
- [ ] **Disconnect or suspend the Cloudflare Workers Builds GitHub integration** for `Jawbear/SerbisyoGo`, or confirm it is preview-only and cannot deploy `main`.
  - Why: the integration triggered `Workers Builds: serbisyogo` on PR #3. The guarded GitHub Actions workflow cannot stop an independent Cloudflare build.
  - Where: GitHub → Settings → Applications → **Cloudflare Workers and Pages** → Configure, or Cloudflare dashboard → Workers & Pages → `serbisyogo` → Settings → Builds.
- [ ] **Approve creation of the `cloudflare-production` environment** with `Jawbear` as required reviewer, a `main`-only branch policy, and the existing `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` secrets.
  - The environment currently does not exist, so the guarded workflow has no approval gate.
  - The agent can create the environment and branch policy via the GitHub API after approval. Secrets must be confirmed/added by the owner.

### B. Phase 1 — cleanup deployment
- [ ] Approve merging PR #3 (or `phase1/cleanup-20261125` at `1880e0a`) into `main`.
- [ ] Approve one guarded `workflow_dispatch` deploy with `publish=true` and `reviewed_sha=<full main SHA>`.
- [ ] Confirm the official **0.5.4** APK/manifest stays live while 0.5.7 gates are pending.

### C. Supabase production backup + migrations
- [ ] Provide database access **without pasting the password in chat**: set `SUPABASE_DB_PASSWORD` in the local environment or add it to the git-ignored `.env.local`, then say it is set.
- [ ] Approve a production logical backup (`supabase db dump` / `pg_dump`) and an isolated restore test.
- [ ] Approve applying migrations `024` and `025` after the backup/restore passes.
- [ ] Confirm preservation checks for accounts, bookings, providers, auth users, messages, payments and storage metadata.

### D. Physical Android device
- [ ] Connect at least one Android phone with USB debugging enabled (two preferred), **or** explicitly accept that physical-device acceptance remains unverified and emulator-only evidence is the limitation.

### E. Publish v0.5.7 and cut over the website
- [ ] Approve updating the draft release `build-metadata.json` with the verified emulator/update evidence and final release notes.
- [ ] Approve publishing draft release `457415541` (tag `android-v0.5.7`).
- [ ] Approve the controlled cutover sequence:
  1. Publish the release.
  2. Run the real in-app update check on the emulator against the public release.
  3. Read the **actual** GitHub `published_at`; update `android-release.json`.
  4. Merge PR #2 / `phase2/release-20261125` into `main`.
  5. Deploy through the guarded Cloudflare workflow.
  6. Verify live page, live `app-update.json`, actual APK SHA-256, one official button, zero Classroom references.

## 3. Proposed execution order

1. Owner resolves Cloudflare integration + environment (A).
2. Agent merges PR #3 and deploys cleanup (B); verifies live site still offers only official 0.5.4.
3. Agent creates/restores production backup; owner approves migrations 024/025 (C).
4. Owner connects phone(s) or accepts the limitation (D).
5. Agent publishes 0.5.7, runs the update check, updates the manifest with the real date, merges PR #2, deploys (E).
6. Agent performs live verification and reports final URL, APK URL, version, migration status, deployment commit, checksum, limitations.

## 4. Rollback plan

- **Website:** redeploy the last known-good `main` commit (`4e1f4bb`) through the same guarded workflow; the 0.5.4 manifest/APK remains intact.
- **Release:** if the update check fails immediately after publication, delete release `457415541`/tag `android-v0.5.7` and keep the 0.5.4 manifest live.
- **Database:** migrations `024`/`025` are additive; restore from the verified backup if any preservation check fails.
- **Cloudflare:** `wrangler rollback` to the last `wrangler` deployment if the new Worker misbehaves.

## 5. Security notes

- No credentials are printed or committed. The GitHub token is read from the existing Git credential helper; the Cloudflare OAuth token stays in Wrangler's config.
- The production database password, if provided, will only be read from the environment and never written to the repo or logs.
- The release is signed with the existing certificate `671506d9e3247ef43ae8d77d17f0a59afc9ba9b26cde855e90456a2a3becfefa`; no new signing key is created.
