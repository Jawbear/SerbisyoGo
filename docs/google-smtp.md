# Google SMTP for production authentication email

This runbook configures Supabase Auth to send confirmation, recovery and email-change
messages through Google. It supplements [deployment.md](deployment.md). No credential
belongs in this repository, the website bundle or the mobile bundle.

## Choose the Google account type

| Option | Use it when | Main limit |
| --- | --- | --- |
| Google Workspace | You have or will buy a domain for the business | About 2,000 recipients/day per user; domain authentication available |
| Free Gmail | Early alpha only, using the Gmail address as the sender | About 500 recipients/day; no custom-domain sending |

For a public launch, use **Google Workspace on a domain you control**. A free Gmail
account cannot send as an unrelated custom-domain address, and its limits are too low
for a marketplace's signup and recovery traffic.

## 1. Prepare the Google account

1. Sign in to the Google account that will send the mail.
2. Enable **2-Step Verification**:
   Google Account → Security → 2-Step Verification.
3. Create an **App Password**:
   Google Account → Security → App passwords → create “SerbisyoGo SMTP”.
   Copy the 16-character password once. This is the SMTP password, not the normal
   Google password.
4. If Google Workspace administration blocks App Passwords, the workspace admin must
   allow them for this account, or use a transactional provider instead.

Google documents App Passwords at
<https://support.google.com/accounts/answer/185833>.

## 2. Configure Supabase custom SMTP

Supabase Dashboard → **Authentication → Emails → SMTP Settings**:

| Field | Value |
| --- | --- |
| Enable custom SMTP | On |
| Host | `smtp.gmail.com` |
| Port | `465` with SSL, or `587` with STARTTLS |
| Username | Full Gmail/Workspace address |
| Password | The Google App Password |
| Sender email | The same verified address |
| Sender name | `SerbisyoGo` |

Save the settings. Supabase keeps the password server-side; it is not exposed to the
browser or the mobile app.

## 3. Authenticate the sending domain

For Google Workspace with a custom domain:

1. Add the domain to Google Workspace and verify ownership.
2. Publish Google's SPF record for the domain, for example
   `v=spf1 include:_spf.google.com ~all` (merge with any existing SPF record; do not
   create a second one).
3. Enable DKIM in the Google Admin console and publish the supplied DKIM record.
4. Publish a DMARC record, starting with monitoring and an operator-approved policy,
   for example `v=DMARC1; p=none; rua=mailto:dmarc@your-domain.example`.
5. Wait for DNS propagation and verify the records from the Google Admin console.

Free Gmail accounts do not let you authenticate an unrelated custom domain. Keep the
Gmail address as the visible sender if you use free Gmail.

## 4. Configure Auth URLs and templates

Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL:** the deployed HTTPS website, for example
  `https://serbisyogo.sg-team.workers.dev`.
- **Redirect URLs:** add the exact deployed callback and recovery routes:
  - `https://YOUR-SITE/auth/callback/`
  - `https://YOUR-SITE/reset-password/`
- Keep `http://localhost:3000/auth/callback/` only while local development needs it.

Copy the four files from `supabase/templates/` into the matching Supabase Auth email
templates:

| File | Supabase template |
| --- | --- |
| `confirmation.html` | Confirm signup |
| `recovery.html` | Reset password |
| `email_change.html` | Change email address |
| `magic_link.html` | Magic link |

Preserve `{{ .ConfirmationURL }}` and `{{ .SiteURL }}`. Keep confirmations enabled.

## 5. Test actual delivery

Local template check:

```powershell
npm.cmd run email:guide
```

Send one real recovery email through the configured project:

```powershell
npm.cmd run email:test -- your-real-inbox@example.com
```

The script calls Supabase Auth's recovery endpoint with the public key. It does not
print the key or password. A `200` response only means Auth accepted the request; it
does not prove the mailbox received it or that the account exists.

Then check:

- [ ] The message arrives in the inbox, not only spam.
- [ ] The sender is the verified Google address and the display name is correct.
- [ ] The confirmation link opens the deployed `/auth/callback/` route.
- [ ] The recovery link opens `/reset-password/` and the new password works on the
      website and the Android app.
- [ ] Resend confirmation and email change also deliver.
- [ ] An expired or reused link shows a recovery path instead of a blank error.
- [ ] Supabase Auth logs show the expected delivery result without exposing secrets.

## 6. Limits and operations

- Free Gmail: roughly 500 recipients/day; Workspace: roughly 2,000 per user per day.
- Supabase also applies its own Auth email rate limits. Do not loop delivery tests.
- Gmail is not a bulk marketing service. Use a transactional provider for announcements
  or high-volume notifications.
- Monitor bounces, complaints and Auth logs. A new sender has little reputation.
- Record the sender address, SMTP host/port, date, limits and test evidence in the
  operator handoff. Never record the App Password.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `535 Authentication failed` | Use the 16-character App Password, not the Google password; confirm 2-Step Verification is on |
| `534` or “less secure app” error | App Passwords are required; enable 2FA or ask the Workspace admin |
| Connection timeout | Try port 465/SSL, then 587/STARTTLS; confirm the network allows outbound SMTP |
| Sender rejected | The “From” address must match the authenticated Google account/domain |
| Mail lands in spam | Publish SPF, DKIM and DMARC; warm the sender; check message content and links |
| `429` from the test script | Supabase rate limit; wait before retrying |
| Link opens the wrong host | Fix Auth Site URL and the exact redirect allowlist, then rebuild if the website URL changed |

## What this does not prove

Configuring SMTP does not verify the deployed website, DNS propagation, inbox
placement, mobile deep links, Supabase Edge Function CORS or the operator-approved
privacy contact. Record those checks separately in
[physical-device-testing.md](physical-device-testing.md) and
[validation.md](validation.md).
