'use client';

import Link from 'next/link';
import type { Policy } from '@/lib/policies';
import { isPolicyApproved, policyApproval } from '@/lib/policy-approval';
import { ButtonLink, Card, Notice, PageHeading } from '@/components/ui';

export type PolicyKind = 'terms' | 'privacy' | 'pricing';

const policyLinks: Array<{ href: string; label: string; kind: PolicyKind }> = [
  { href: '/terms/', label: 'Terms of Service', kind: 'terms' },
  { href: '/privacy/', label: 'Privacy Policy', kind: 'privacy' },
  { href: '/pricing/', label: 'Pricing Policy', kind: 'pricing' }
];

export function PolicyPage({ policy, current }: { policy: Policy; current: PolicyKind }) {
  const approved = isPolicyApproved();

  return (
    <>
      <PageHeading
        eyebrow="Policies"
        title={policy.title}
        description={approved
          ? `Version ${policyApproval.version}. Effective ${policyApproval.effectiveDate}.`
          : 'Draft for operator review. This text is not yet an approved agreement.'}
      />
      {approved ? (
        <Notice>
          Approved by {policyApproval.approvedBy} on {policyApproval.approvedAt}. This policy applies to
          {' '}{policyApproval.businessName} and is governed by Philippine law.
        </Notice>
      ) : (
        <Notice>
          DRAFT — pending operator approval. This page exists so the operator can review the proposed
          terms, privacy notice and pricing statements before launch. It is not a final legal agreement
          and it does not publish new fees. Approve the record in <code>src/lib/policy-approval.ts</code>
          {' '}after legal and business review, then rebuild the site.
        </Notice>
      )}

      <Card className="form-width">
        <div className="stack" style={{ marginTop: 8 }}>
          <p className="small muted">
            {policyApproval.businessName} · {policyApproval.businessAddress}
            {' '}· Version {policyApproval.version} · Effective {policyApproval.effectiveDate}
          </p>

          {policy.sections.map(section => (
            <section key={section.title} aria-labelledby={`policy-${section.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}>
              <h2 id={`policy-${section.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}>{section.title}</h2>
              <p className="muted" style={{ whiteSpace: 'pre-line', lineHeight: 1.75 }}>{section.content}</p>
            </section>
          ))}
        </div>
      </Card>

      <Card className="form-width" >
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
            {policyLinks.filter(link => link.kind !== current).map(link => (
              <Link key={link.href} href={link.href}>{link.label}</Link>
            ))}
          </div>
          <ButtonLink href="/support/" secondary>Contact support</ButtonLink>
        </div>
      </Card>
    </>
  );
}
