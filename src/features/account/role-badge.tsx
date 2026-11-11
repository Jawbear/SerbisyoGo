'use client';

import { useSession } from '@/components/session';

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  provider: 'Provider',
  customer: 'Customer'
};

export function AccountRoleBadge() {
  const { user, role } = useSession();
  const label = roleLabels[role];
  if (!user || !label) return null;
  return <span className="badge" aria-label={`Account role: ${label}`}>{label}</span>;
}
