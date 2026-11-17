import { Badge } from '@/components/ui';
import type { Provider } from '@/lib/types';

export function ProviderTrustBadges({ provider }: { provider: Pick<Provider, 'trust_badges'> }) {
  const trust = provider.trust_badges;
  if (trust?.identity_reviewed !== true && trust?.skills_reviewed !== true) return null;
  return <div className="row trust-badges" aria-label="Reviewed credentials">
    {trust?.identity_reviewed === true && <Badge>Identity reviewed</Badge>}
    {trust?.skills_reviewed === true && <Badge>{trust.skills_label || 'Skills credential reviewed'}</Badge>}
  </div>;
}
