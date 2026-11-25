'use client';

import { useState } from 'react';
import { rpc } from '@/lib/backend';
import { money, todayManila } from '@/lib/domain';
import type { Service } from '@/lib/types';
import { Badge, ButtonLink, Card, Field, QueryState, Select, useQuery } from '@/components/ui';

const arrivalTime = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit'
});

export function AvailabilityPreview({ services }: { services: Service[] }) {
  const [selected, setSelected] = useState('');
  const [day, setDay] = useState(() => todayManila());
  const service = services.find(item => item.id === selected) ?? services[0];
  const min = todayManila();
  const max = todayManila(89);
  const validDay = !!day && day >= min && day <= max;
  const slots = useQuery(`public-slots-${service.id}-${day}`, () =>
    rpc<{ starts_at: string }[]>('available_slots', { p_service: service.id, p_day: day }), validDay);

  return <Card><h2>Service availability</h2><div className="stack">
    <Select label="Choose a service" value={service.id} onChange={event => setSelected(event.target.value)}>
      {services.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}
    </Select>
    <p>{money(service.rate_centavos)} {service.pricing_mode === 'quote' ? 'estimated labor' : 'fixed labor'} · {service.duration_minutes} minutes</p>
    <Field label="Check a date · Asia/Manila" type="date" value={day} min={min} max={max} onChange={event => setDay(event.target.value)} />
    {validDay ? <QueryState {...slots}>{slots.data?.length ? <>
      <div className="row">{slots.data.map(slot => <Badge key={slot.starts_at}>{arrivalTime.format(new Date(slot.starts_at))}</Badge>)}</div>
      <ButtonLink href={`/book/?provider=${service.provider_id}&service=${service.id}&day=${day}`}>Book a service</ButtonLink>
      <p className="small muted">Choose your arrival time after describing the job. Availability is checked again during booking.</p>
    </> : <p className="small muted">No available appointments on this date. Try another day.</p>}</QueryState>
      : <p className="small muted">Choose a date within the next 90 days.</p>}
  </div></Card>;
}
