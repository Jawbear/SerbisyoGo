# Administrator account management

The website's **Administration → User accounts** and the mobile app's **Open administration → User accounts** use the same protected `admin-accounts` Edge Function. An active administrator can search accounts, create customer or administrator accounts, edit profile details and access, change a verified email address, confirm email ownership, and set a new password. Passwords are never returned. Provider approval remains a separate workflow requiring verification documents, services and availability.

Every operation checks the signed-in user on the server. Auth administration and Storage deletion use server credentials only. Client bundles contain the publishable Supabase key. An administrator cannot remove their own access or delete their own account; the last active administrator is also protected. Profile changes include an updated timestamp to reject stale edits.

## Permanent deletion

An administrator reviews the affected-record counts, types the selected account's email, supplies a reason and acknowledges irreversible removal. This removes the login and the related application records and files, including shared bookings, messages, reviews, support cases and financial records. Other people's accounts remain. Global settings remain with the deleted person's attribution removed. This deliberately removes financial history for the selected account, following the requested permanent-erasure behavior.

Deletion disables the account first and runs in resumable phases: remove stored files, erase the application record graph, hard-delete Auth, and verify completion. Interrupted operations remain visible as pending deletions. A retry can use the target account UUID once the original identity is gone. The UI reports success only after completion. Normal immutable financial-record protections remain in force outside the private purge transaction.

The final application audit receipt records the administering account, a random operation ID and deletion counts, without retaining the deleted account's ID, email, name or reason. Provider infrastructure logs and backups follow the infrastructure provider's lifecycle.

## Mobile workspace

In addition to accounts, the app exposes existing server-authorized tools for provider verification, bookings, category/service maintenance, support cases, announcements, settlement records, refunds, payouts, reports, settings, Android releases and audit review. Payment and payout actions record verified external events; they do not transfer funds. Private APK upload retains the backend's 50 MB limit; the CI release pipeline supports the separately hosted universal APK.

## Verification

The isolated Supabase workflow runs pgTAP security and related-record deletion tests, checks Edge Function types, and tests actual account creation/editing, credential changes, private avatar removal, Auth deletion, self-deletion denial and customer denial against disposable local accounts. No existing hosted user was deleted for validation. Mobile browser checks cover the selected account, confirmation safeguards, interrupted deletion retries and customer denial. Android compilation and the signed APK's native installation/navigation checks are separate from browser testing. Physical-phone testing requires an actual device.
