# Provider document policy

An applicant needs **one accepted ID or credential**, chosen from the listed
alternatives. Government ID, TESDA NC I/II or COC, PRC license, clearance,
training certificate, employment/apprenticeship record and business permit are
alternatives; applicants do not need all groups. Additional uploads are optional.
Work photos/portfolio submissions are supporting evidence and do not satisfy the
document requirement by themselves.

The website, Android UI and administrator checklist use this rule. A document
being uploaded satisfies submission readiness only. An administrator must
inspect it and explicitly approve the application; uploads do not automatically
authenticate a person or change their role. Existing private-file access,
ownership, active-service and availability rules remain in place.

Migration `202611170022_one_provider_credential.sql` replaces migration 19's
three-group approval condition without changing historical migration files or
deleting uploads. Uncategorized historical files remain viewable and can be
resubmitted under an explicit category. Applicants may submit just one accepted
document when doing so.

Validation: 176 assertions passed in both embedded and actual Supabase PostgreSQL,
including each of the nine alternatives alone, missing/uncategorized/supporting-only
documents, ownership, approval/reactivation and self-approval denial. All 28
persisted desktop/mobile workflows passed, including a real single-ID upload,
remaining pending after upload, and explicit administrator approval. Eight local
web browser cases passed, and two live website cases confirmed the corrected
upload screen on desktop/mobile using controlled responses.

[Backend CI](https://github.com/Jawbear/SerbisyoGo/actions/runs/43981743732) and
[mobile CI](https://github.com/Jawbear/SerbisyoGo/actions/runs/43981743525) passed
on source `cc244d65cf0a4be3391396ab95450547ef84a74f`. Mobile CI includes the
credential upload screen, domain checks, lint and Android/web exports. The local
Windows mobile browser attempt stalled; CI supplied the completed mobile results.

Migration 22 was applied to the hosted backend without resetting or seeding data.
The corrected website screens were deployed using the existing Cloudflare login;
the repository's missing Cloudflare CI token remains a separate deployment setup
issue. Android 0.4.2 (code 7) contains the corrected screen. Its final release and
upgrade checks passed in [native CI](https://github.com/Jawbear/SerbisyoGo/actions/runs/43981989743).
The initial upgrade check did not observe an update prompt while the website
still advertised 0.4.1. After deploying the exact 0.4.2 feed, the repeated native
check passed: optional prompt/Later, real APK download verification, Android
permission/confirmation, upgrade from the signed code-6 fixture to published
code 7, retained private data and successful relaunch. No different APK replaced
the published file. Physical-phone testing remains pending.

The [live download](https://serbisyogo.sg-team.workers.dev/download/) and update
feed both advertise 0.4.2/code 7. All four real desktop/mobile download/fallback
browser checks passed. Worker version:
`ce49ac02-32ca-4b01-8253-b9be0fa8b5c1`.

- APK size: 53,427,652 bytes.
- APK SHA-256: `122e12f12488a80667d5640332b324ccaedbcb4dcf1b5fd8e6b22f268cb1e204`.
- Application source: `cc244d65cf0a4be3391396ab95450547ef84a74f`.
- Package and persistent signing certificate are unchanged from 0.4.1.
