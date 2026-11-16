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

Local validation: 176 embedded PostgreSQL assertions passed, including each of
the nine alternatives alone, missing/uncategorized/supporting-only documents,
ownership, approval/reactivation and self-approval denial. Domain suites cover
the same readiness rule on both platforms. Browser and real-service results
are recorded after the rollout completes.
