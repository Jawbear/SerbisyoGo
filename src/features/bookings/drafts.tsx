'use client';

import Link from 'next/link';
import { useSession } from '@/components/session';
import { Card, DataTable, QueryState, useQuery } from '@/components/ui';
import { list } from '@/lib/data';
import { manilaDate } from '@/lib/domain';
export function CustomerDrafts() {
  const {
    user
  } = useSession();
  const q = useQuery('customer-drafts-' + user?.id, async () => {
    const drafts = await list('booking_drafts', {
      customer_id: user!.id
    });
    const bookings = await list<{
      idempotency_key: string;
    }>('bookings', {
      customer_id: user!.id
    });
    return drafts.filter(d => !bookings.some(b => b.idempotency_key === d.id));
  }, !!user);
  return <QueryState {...q}>{q.data?.length ? <Card><h2>Continue a saved request</h2><DataTable rows={q.data} columns={[{
        key: 'description',
        label: 'Task'
      }, {
        key: 'updated_at',
        label: 'Last saved',
        render: r => manilaDate(String(r.updated_at))
      }]} actions={r => <Link href={`/book/?draft=${r.id}`}>Resume draft →</Link>} /></Card> : null}</QueryState>;
}
