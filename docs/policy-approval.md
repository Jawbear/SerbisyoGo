# Operator approval of terms, pricing and privacy policies

The public policy pages are implemented but **not approved**. The repository ships a
reviewable draft so the operator can make the business and legal decisions before a
real launch. This document records the approval gate; it is not legal advice.

## Where the policies live

| Content | Source | Public route |
| --- | --- | --- |
| Terms of Service | `src/lib/policies.ts` → `termsOfService` | `/terms/` |
| Privacy Policy | `src/lib/policies.ts` → `privacyPolicy` | `/privacy/` |
| Pricing Policy | `src/lib/policies.ts` → `pricingPolicy` | `/pricing/` |
| Approval record | `src/lib/policy-approval.ts` | Rendered banner and metadata |
| Renderer | `src/features/policies/policy-page.tsx` | All three routes |

While `policyApproval.status` is `draft`:

- Every policy page shows a **DRAFT — pending operator approval** banner.
- The pages emit `noindex, nofollow` metadata.
- `npm run policy:check` warns instead of claiming approval.
- `npm run deploy:check` and `npm run deploy:cloudflare -- --confirm` fail, so an
  unapproved draft cannot be published by the production path.

## Decisions the operator must make

Review and approve each item. Change the policy text when the answer differs from the
draft.

### Business identity and contacts

- [ ] Legal business name and registered address.
- [ ] Working support mailbox and response-time commitment.
- [ ] Data Protection Officer name/mailbox, or the operator's documented DPO
      arrangement. Do not publish a mailbox that does not receive mail.
- [ ] Whether NPC registration or other Philippine Data Privacy Act registrations
      apply to the operator.
- [ ] Governing-law venue and dispute-resolution process.

### Pricing

- [ ] Booking fee (centavos) and platform commission (basis points).
- [ ] Whether the booking fee is refundable and under which conditions.
- [ ] Refund review and actual money-return turnaround.
- [ ] Provider payout schedule, cash-remittance process and receivable treatment.
- [ ] Quotation acceptance rules and expiry.

The policy text renders the values from `policyApproval`, so changing the numbers in
one place updates every policy mention. The values must match the active row in
Supabase `app_settings`; `npm run policy:check:hosted` compares them when owner
credentials are present.

Current proposed values: **₱50 booking fee** and **10% commission**. The hosted
development project currently has those values and a placeholder support address
(`support@example.test`), which must be replaced before launch.

### Payments

- [ ] Confirm the exact GCash flow: customer sends manually after completion, uploads
      a receipt, and an administrator verifies the wallet transaction.
- [ ] Confirm that no automatic gateway, wallet callback or automatic refund is
      claimed. The draft deliberately avoids those claims.
- [ ] Decide the cash-dispute and lost-payment wording with legal review.

### Privacy and retention

- [ ] Categories of data collected and the lawful basis for each purpose.
- [ ] Retention periods for accounts, bookings, messages, receipts and audit logs.
- [ ] Whether analytics, cookies or third-party processors beyond Supabase, Google
      Maps and OpenStreetMap are used.
- [ ] Data-subject request process and breach-notification contact.
- [ ] Cross-border storage/processing disclosure for Supabase and email providers.

### Consumer terms

- [ ] Cancellation windows and any cancellation fees.
- [ ] Liability limits that are valid under Philippine consumer law.
- [ ] Provider verification wording; verification is not an endorsement.
- [ ] Prohibited-conduct and account-suspension rules.

## Approval procedure

1. **Review the rendered pages.** Run `npm run dev`, open `/terms/`, `/privacy/` and
   `/pricing/`, and read the draft with the operator and any legal reviewer.
2. **Edit the text** in `src/lib/policies.ts` for decisions that change the wording.
   Keep the implementation honest: do not claim automatic GCash processing, automatic
   refunds or money movement that the code does not perform.
3. **Edit the approval record** in `src/lib/policy-approval.ts`:

```ts
export const policyApproval: PolicyApproval = {
  status: 'approved',
  version: '1.0',
  effectiveDate: '2026-12-01',
  approvedBy: 'Owner name or role',
  approvedAt: '2026-11-20',
  businessName: 'Registered business name',
  businessAddress: 'Registered business address',
  supportEmail: 'support@your-domain.example',
  dpoEmail: 'dpo@your-domain.example',
  bookingFeeCentavos: 5000,
  commissionBps: 1000
};
```

4. **Match the live pricing.** In Admin → Settings, save and activate the same booking
   fee and commission. Set the real support mailbox.
5. **Run the checks:**

```powershell
npm.cmd run policy:check
npm.cmd run policy:check:hosted
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

6. **Record the approval** in the operator handoff: version, effective date, approver,
   date, reviewed documents and any open legal advice. Do not record passwords or
   private personal data.
7. **Deploy.** `npm run deploy:check` must pass before the production deploy.

## Changing an approved policy

1. Increment `version`, set a new `effectiveDate`, and record a new `approvedAt` after
   the operator reviews the change.
2. Re-run `policy:check`, `policy:check:hosted` and the build.
3. Notify registered users of material changes as the terms require.
4. Keep the previous approved version in the operator's records.

## What is still not verified

Approval in this file is an operator declaration, not proof that the text complies
with Philippine law, that the mailboxes work, or that the deployed site shows the new
build. Those remain separate launch checks.
