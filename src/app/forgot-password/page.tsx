import { Suspense } from 'react';
import { Screen } from '@/components/screens';
import { Skeleton } from '@/components/ui';
export default function Page() {
  return <Suspense fallback={<Skeleton />}><Screen name="forgot" /></Suspense>;
}
