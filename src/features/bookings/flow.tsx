'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { rpc, edge } from '@/lib/backend';
import { list, one } from '@/lib/data';
import { money, manilaDate } from '@/lib/domain';
import { addressSchema, draftSchema } from '@/lib/schemas';
import type { Service, Booking } from '@/lib/types';
import { ButtonLink, Card, Empty, Field, MutationForm, Notice, PageHeading, QueryState, Select, Textarea, useQuery } from '@/components/ui';
type Draft = {
  id: string;
  provider_service_id: string;
  description: string;
  address: {
    label: string;
    line1: string;
    city: string;
    postal_code: string;
  };
  starts_at: string | null;
};
export const todayManila = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
export function BookingFlow({
  step
}: {
  step: 'details' | 'schedule' | 'payment';
}) {
  const params = useSearchParams();
  const router = useRouter();
  const provider = params.get('provider') || '';
  const draftParam = params.get('draft') || '';
  const [savedDraft, setSavedDraft] = useState(draftParam);
  const query = useQuery('booking-flow-' + provider + '-' + draftParam, async () => ({
    draft: draftParam ? await one<Draft>('booking_drafts', draftParam) : null,
    services: provider ? await list<Service>('provider_services', {
      provider_id: provider,
      active: true
    }) : await list<Service>('provider_services', {
      active: true
    })
  }));
  const draft = query.data?.draft;
  const draftLink = (to: string) => `/book/${to}/?draft=${draft?.id || savedDraft}&provider=${provider}`;
  return <><PageHeading title={step === 'details' ? 'Tell us what needs attention' : step === 'schedule' ? 'A time that works for you' : 'Review your booking request'} description="Your booking is sent to the professional for acceptance. All appointment times are shown in Asia/Manila (UTC+8)." /><nav className="steps" aria-label="Booking progress"><Link className={step === 'details' ? 'active' : ''} href={`/book/?provider=${provider}${savedDraft ? '&draft=' + savedDraft : ''}`}>01 · Issue details</Link><span className={step === 'schedule' ? 'active' : 'muted'}>02 · Schedule</span><span className={step === 'payment' ? 'active' : 'muted'}>03 · Review & payment</span></nav><QueryState {...query}>{step === 'details' ? <Card className="form-width"><h2>What can we help with?</h2><MutationForm key={draft?.id || 'new'} submit="Save & choose a schedule →" onSubmit={async f => {
          const address = addressSchema.parse({
            label: f.get('label'),
            line1: f.get('line1'),
            city: f.get('city'),
            postal_code: f.get('postal_code')
          });
          const data = draftSchema.parse({
            provider_service_id: f.get('service'),
            description: f.get('description'),
            address
          });
          const id = await rpc<string>('save_booking_draft', {
            p_id: savedDraft || null,
            p_service: data.provider_service_id,
            p_description: data.description,
            p_address: address,
            p_starts_at: draft?.starts_at || null
          });
          setSavedDraft(id);
          const savedUrl = new URL(window.location.href);
          savedUrl.searchParams.set('draft', id);
          window.history.replaceState(null, '', savedUrl);
          const file = f.get('photo');
          if (file instanceof File && file.size) {
            const upload = new FormData();
            upload.set('file', file);
            upload.set('kind', 'booking');
            upload.set('draft_id', id);
            await edge('files', upload);
          }
          router.push(`/book/schedule/?draft=${id}&provider=${provider}`);
        }}><Select label="Select service" name="service" required defaultValue={draft?.provider_service_id || params.get('service') || ''}><option value="" disabled>Choose a service</option>{query.data?.services.map(s => <option key={s.id} value={s.id}>{s.title} · {money(s.rate_centavos)} {s.pricing_mode === 'quote' ? 'estimate' : ''}</option>)}</Select><Textarea label="Describe the task" name="description" required minLength={10} maxLength={3000} defaultValue={draft?.description} placeholder="What is happening, and what would you like repaired?" /><div className="grid-2"><Field label="Address label" name="label" placeholder="Home" defaultValue={draft?.address.label || 'Home'} required maxLength={40} /><Field label="City / municipality" name="city" defaultValue={draft?.address.city} required minLength={2} /></div><Field label="Complete service address" name="line1" placeholder="House/unit, building, street, barangay" defaultValue={draft?.address.line1} required minLength={5} maxLength={250} /><Field label="Postal code" name="postal_code" inputMode="numeric" pattern="[0-9]{4}" defaultValue={draft?.address.postal_code} required /><Field label="Optional photo (JPG, PNG, WebP; up to 10 MB)" name="photo" type="file" accept="image/jpeg,image/png,image/webp" /><Notice>Your draft is saved to your account when you continue. Rates for quotation-based jobs remain estimates until you accept the provider’s quote.</Notice></MutationForm>{!query.data?.services.length && <Empty title="No active services available" action={<ButtonLink href="/find/">Find another professional</ButtonLink>} />}</Card> : !draft ? <Empty title="Start with your booking details" action={<ButtonLink href="/find/">Find a professional</ButtonLink>} /> : step === 'schedule' ? <Schedule draft={draft} next={draftLink('payment')} /> : <Payment draft={draft} back={draftLink('schedule')} />}</QueryState></>;
}
function Schedule({
  draft,
  next
}: {
  draft: Draft;
  next: string;
}) {
  const [day, setDay] = useState(() => draft.starts_at ? new Date(new Date(draft.starts_at).getTime() + 8 * 3600000).toISOString().slice(0, 10) : todayManila());
  const [bounds] = useState(() => ({
    min: todayManila(),
    max: new Date(Date.now() + 89 * 86400000 + 8 * 3600000).toISOString().slice(0, 10)
  }));
  const router = useRouter();
  const slots = useQuery('slots-' + draft.provider_service_id + '-' + day, () => rpc<{
    starts_at: string;
    ends_at: string;
  }[]>('available_slots', {
    p_service: draft.provider_service_id,
    p_day: day
  }));
  return <Card className="form-width"><h2>Choose an available appointment</h2><MutationForm submit="Save & review request →" onSubmit={async f => {
      const start = f.get('starts_at');
      if (!start) throw new Error('Choose an available appointment.');
      await rpc('save_booking_draft', {
        p_id: draft.id,
        p_service: draft.provider_service_id,
        p_description: draft.description,
        p_address: draft.address,
        p_starts_at: start
      });
      router.push(next);
    }}><Field label="Service date · Asia/Manila" type="date" value={day} min={bounds.min} max={bounds.max} onChange={e => setDay(e.target.value)} required /><QueryState {...slots}><fieldset style={{
          border: 0,
          padding: 0,
          margin: 0
        }}><legend className="small" style={{
            marginBottom: 12
          }}>Available arrival times (UTC+8)</legend><div className="slot-grid">{slots.data?.map(s => <label key={s.starts_at} className="slot-option"><input type="radio" name="starts_at" value={s.starts_at} defaultChecked={draft.starts_at === s.starts_at} required /><span>{new Intl.DateTimeFormat('en-PH', {
                  timeZone: 'Asia/Manila',
                  hour: 'numeric',
                  minute: '2-digit'
                }).format(new Date(s.starts_at))}</span></label>)}</div>{!slots.data?.length && <Empty title="No slots for this date" description="Choose another day. Availability is checked again when your request is submitted and when the provider accepts." />}</fieldset></QueryState><Notice>Scheduling is displayed in Philippine time. The database stores timestamps in UTC. Accepted appointments cannot overlap.</Notice></MutationForm></Card>;
}
function Payment({
  draft,
  back
}: {
  draft: Draft;
  back: string;
}) {
  const router = useRouter();
  const price = useQuery('draft-price-' + draft.id, () => rpc<{
    labor_centavos: number;
    fee_centavos: number;
    total_centavos: number;
    is_estimate: boolean;
  }>('draft_price', {
    p_draft: draft.id
  }));
  return <div className="grid-2 form-width" style={{
    maxWidth: 960
  }}><Card><h2>Payment method</h2><div className="row" style={{
        marginBottom: 20
      }}><ShieldCheck className="green" /><div><strong>Cash / manual settlement</strong><p className="small muted">Payment is pending until an authorized settlement is recorded.</p></div></div><Notice>Online GCash, Maya and card payments are not configured. No online charge is made by this request.</Notice><MutationForm submit="Submit booking request →" disabled={!price.data || !draft.starts_at} onSubmit={async f => {
        if (!f.get('acknowledge')) throw new Error('Please acknowledge the booking request.');
        const id = await rpc<string>('confirm_booking', {
          p_draft: draft.id,
          p_expected_total: price.data?.total_centavos
        });
        router.push(`/bookings/confirmed/?id=${id}`);
      }}><label className="check-field"><input type="checkbox" name="acknowledge" required /><span>I have checked the service, address and schedule. I understand this is a request awaiting provider acceptance.</span></label></MutationForm><ButtonLink href={back} secondary className="compact">Back to schedule</ButtonLink></Card><Card><h2>Request summary</h2><p className="small muted" style={{
        marginBottom: 20
      }}>{draft.starts_at ? manilaDate(draft.starts_at) + ' · Asia/Manila' : 'Choose a schedule first'}</p><p className="small" style={{
        marginBottom: 24
      }}>{draft.address.line1}, {draft.address.city} {draft.address.postal_code}</p><QueryState {...price}>{price.data && <><dl className="definition-list"><div><dt>Labor {price.data.is_estimate ? 'estimate' : ''}</dt><dd>{money(price.data.labor_centavos)}</dd></div><div><dt>Configured booking fee</dt><dd>{money(price.data.fee_centavos)}</dd></div><div className="total"><dt>{price.data.is_estimate ? 'Estimated total' : 'Total'}</dt><dd>{money(price.data.total_centavos)}</dd></div></dl>{price.data.is_estimate && <p className="small muted" style={{
            marginTop: 20
          }}>A final quotation requires your acceptance before the provider can confirm. Additional scope and materials must be agreed through a new quotation before acceptance.</p>}</>}</QueryState></Card></div>;
}
export function BookingConfirmed({
  booking
}: {
  booking: Booking;
}) {
  return <Card className="form-width"><div className="empty"><CheckCircle2 size={52} className="green" /><p className="eyebrow">{booking.reference}</p><h1>Booking request received.</h1><p className="muted">Your request has been saved and sent to the provider. Track this booking for acceptance and service updates.</p><dl className="definition-list" style={{
        width: '100%',
        margin: '16px 0'
      }}><div><dt>Service</dt><dd>{booking.service_title}</dd></div><div><dt>Requested schedule</dt><dd>{manilaDate(booking.starts_at)} · Manila</dd></div><div><dt>Address</dt><dd>{booking.address_snapshot.line1}, {booking.address_snapshot.city}</dd></div><div><dt>{booking.is_estimate ? 'Estimated total' : 'Total'}</dt><dd>{money(booking.total_centavos)}</dd></div></dl><div className="row"><ButtonLink href={`/bookings/track/?id=${booking.id}`}>Track request <ArrowRight size={16} /></ButtonLink><ButtonLink href={`/messages/?booking=${booking.id}`} secondary>Open conversation</ButtonLink></div><Link href="/dashboard/">Go to dashboard</Link></div></Card>;
}
