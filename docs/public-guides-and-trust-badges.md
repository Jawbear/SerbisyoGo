# Public guides and separate credential reviews

The public website includes How It Works, For Clients, For Workers, FAQ and
Contact pages, with navigation in the header/footer and links from Home and
Support. The Android app bundles the same guide/FAQ content and provides native
navigation, topic filters and search. Contact links to the existing support
case workflow and displays the configured support inbox when available.

The section structure was informed by the SkillMart reference. The prose,
branding and visual implementation are original to SerbisyoGo. Content describes
the existing appointment-request model and manual payment records; no PayMongo
integration, job-bidding feature, guaranteed arrival or automatic refund is
advertised.

## Document reviews

The one-accepted-document application rule remains unchanged. Identity and skills
badges are optional, independent administrative decisions:

- Identity: review a private upload categorized as a government ID.
- Skills: review TESDA NC I/II or COC, PRC, training or employment evidence. The
  public label identifies the reviewed category.
- Other uploads, profile approval and account roles never award badges by
  themselves. Public summaries appear only for approved, active profiles.

In Administration → Providers, open an application/profile and inspect its
private uploads. Under Identity & skills reviews, choose the badge decision,
eligible document and a review reason. Grant or revoke the badge explicitly.
Each action records its administrator, document, timestamp and reason. Replacing,
reclassifying or deleting the reviewed file invalidates that review.

Migration 23 stores the records in a private RLS-protected table. Only owners and
administrators can read them; direct client writes are denied. The public catalog
receives only two review flags and a category label, without document IDs, paths,
reviewer details or private reasons. Existing records are not auto-verified.

## Consistency and release

`src/content/public-information.json` is the canonical content source. Run
`node scripts/sync-public-information.mjs` to update the bundled mobile copy.
The root test suite checks that the two copies match. Android version metadata
is aligned across app.json, package.json and the lockfile at 0.5.0/code 8.

The Android workflow can publish the signed, installation-tested APK with
`verify_update=false`. Deploy the matching website update feed, then run the
workflow with the original `artifact_run_id`, `publish_release=true` and
`verify_update=true` to verify the real upgrade. This avoids depending on a
cached public release feed before the website has been updated. No different
APK is substituted during that second check.

The Windows production export disables the unreliable persistent Webpack cache;
the development cache and Linux build defaults are preserved. The anonymous
public APK verifier uses the system HTTP client with a bounded transfer deadline,
then checks the complete size, SHA-256 and binary manifest before using the file.

Validation currently includes 201 embedded PostgreSQL assertions and 22
desktop/mobile website browser checks, including configured-contact behavior.
Final real-service, mobile CI and release evidence will be added after rollout.

The continuation check on November 17 also passed TypeScript, web and mobile
lint, all 31 web and 17 mobile unit tests, all 201 embedded database assertions,
the production export (54 pages), and deployment readiness. A fresh run of the
public-information and public-navigation browser suites passed all 16 desktop
and phone-viewport checks against that export. The mobile public-guide browser
check also passed, and the Android production export generated its Hermes
bytecode bundle successfully. These local checks do not apply migration 23 to
the hosted database, install a signed APK, or publish Android 0.5.0.

## Production rollout: November 17, 2026

Migration 23 is applied to the linked production database. The public guides and
credential-review interface are deployed at
https://serbisyogo.sg-team.workers.dev. All 16 public-information and navigation
browser checks passed against the live website. Production HTTP checks also
confirmed all five guide routes, the public badge-summary contract and denied
anonymous access to private credential review records.

Android 0.5.0 (version code 8) is published at
https://github.com/Jawbear/SerbisyoGo/releases/tag/android-v0.5.0 and linked from
the website download page and update feed. The public APK is 53,442,288 bytes;
SHA-256: `a12ff57205e5cff28c30fe7139741260cce2595924a43dd86b4881142c02c7ad`.
An independent anonymous download matched the complete size, hash and binary
manifest. The CI release checks verified the persistent signing certificate.

Release build and native installation/navigation checks passed in GitHub run
[44022221063](https://github.com/Jawbear/SerbisyoGo/actions/runs/44022221063).
The identical signed APK passed the real in-app upgrade checks in run
[44026607497](https://github.com/Jawbear/SerbisyoGo/actions/runs/44026607497),
including the optional prompt, Later action, verified download, Android
installation permission and confirmation, version upgrade and retained private
app data. The full mobile browser suite and isolated Supabase integration suite
also passed. Physical-phone testing remains pending.

The final website deployment is Cloudflare version
`117e00a9-e387-4be6-a7fb-5f80a310ee70`, published using the renewed local OAuth
login. GitHub's separate Cloudflare deployment job still needs its Cloudflare
deployment secrets configured; it was not the publication path for this rollout.
