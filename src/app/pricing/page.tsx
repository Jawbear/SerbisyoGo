import { Suspense } from 'react';
import { Screen } from '@/components/screens';
import { Skeleton } from '@/components/ui';
import { isPolicyApproved } from '@/lib/policy-approval';

export const metadata = {
  title: 'Pricing Policy',
  robots: isPolicyApproved() ? undefined : { index: false, follow: false }
};

export default function Page() {
  return <Suspense fallback={<Skeleton />}><Screen name="pricing" /></Suspense>;
}
