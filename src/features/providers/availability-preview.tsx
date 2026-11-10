'use client';

import { useState } from 'react';
import { backendConfigured } from '@/lib/config';
import { rpc } from '@/lib/backend';
import { todayManila } from '@/features/bookings/flow';
import { Badge, Card, Field, QueryState, useQuery } from '@/components/ui';
export function AvailabilityPreview({
  serviceId
}: {
  serviceId: string;
}) {
  const [day, setDay] = useState(() => todayManila());
  const q = useQuery('public-slots-' + serviceId + '-' + day, () => rpc<{
    starts_at: string;
    ends_at: string;
  }[]>('available_slots', {
    p_service: serviceId,
    p_day: day
  }), backendConfigured && !!serviceId && !!day);
  return <Card><h2>Service availability</h2>{backendConfigured ? <><Field label="Check a date · Asia/Manila" type="date" value={day} min={todayManila()} onChange={e => setDay(e.target.value)} /><div style={{
        marginTop: 20
      }}><QueryState {...q}><div className="row">{q.data?.slice(0, 8).map(s => <Badge key={s.starts_at}>{new Intl.DateTimeFormat('en-PH', {
                timeZone: 'Asia/Manila',
                hour: 'numeric',
                minute: '2-digit'
              }).format(new Date(s.starts_at))}</Badge>)}</div>{!q.data?.length && <p className="small muted">No available appointments on this date. Try another day.</p>}<p className="small muted" style={{
            marginTop: 16
          }}>Shown for the first listed service. Your chosen service’s duration is checked again during booking.</p></QueryState></div></> : <p className="small muted">Actual appointment availability will appear after the backend is configured.</p>}</Card>;
}
