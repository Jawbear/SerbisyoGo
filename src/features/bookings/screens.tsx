'use client';

import { CustomerDrafts } from './drafts';
import { AnnouncementFeed } from '@/features/admin/announcements';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Check, Download, MapPin, Star } from 'lucide-react';
import { rpc, requireDb, result } from '@/lib/backend';
import { list, one } from '@/lib/data';
import { canTransition, manilaDate, money, pesosToCentavos, type Actor, type BookingStatus } from '@/lib/domain';
import type { Booking } from '@/lib/types';
import { reviewSchema } from '@/lib/schemas';
import { useSession } from '@/components/session';
import { ActionButton, Badge, ButtonLink, Card, DataTable, Empty, Field, MutationForm, Notice, PageHeading, QueryState, RealtimeRefresh, Select, Stats, Textarea, useQuery } from '@/components/ui';
import { ServiceMap } from '@/features/providers/map';
import { BookingConfirmed } from './flow';
import { settlementLabel } from '@/features/payments/adapter';
import { FileList, UploadForm } from '@/features/support/files';
export function BookingList({
  dashboard = false
}: {
  dashboard?: boolean;
}) {
  const session = useSession();
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get('status') || '');
  const q = useQuery('my-bookings-' + session.user?.id, () => list<Booking>('bookings', {
    customer_id: session.user!.id
  }), !!session.user);
  const rows = (q.data || []).filter(b => (!status || b.status === status) && (params.get('view') !== 'invoices' || b.status === 'completed'));
  return <><PageHeading eyebrow={dashboard ? 'Your workspace' : 'My bookings'} title={dashboard ? `Welcome back, ${String(session.profile?.full_name || 'neighbor').split(' ')[0]}.` : 'A record of care for your home.'} description={dashboard ? 'A little less to worry about. Your appointments and recent activity, together.' : 'Find upcoming appointments and revisit completed repairs.'} action={<ButtonLink href="/find/">+ Book a service</ButtonLink>} /><RealtimeRefresh tables={['bookings', 'notifications']} /><AnnouncementFeed /><QueryState {...q}>{dashboard && <Stats items={[{
        label: 'Upcoming & active',
        value: q.data?.filter(b => ['requested', 'confirmed', 'en_route', 'in_progress'].includes(b.status)).length || 0
      }, {
        label: 'Completed services',
        value: q.data?.filter(b => b.status === 'completed').length || 0
      }, {
        label: 'Booking requests',
        value: q.data?.filter(b => b.status === 'requested').length || 0
      }, {
        label: 'Your community',
        value: <Link href="/download/" className="small">Android app →</Link>,
        note: 'Website access is available today'
      }]} />}<Card><div className="row between" style={{
          marginBottom: 24
        }}><h2>{dashboard ? 'Your service records' : 'Service bookings'}</h2><Select label="Booking status" value={status} onChange={e => {
            setStatus(e.target.value);
            const url = new URL(window.location.href);
            if (e.target.value) {
              url.searchParams.set('status', e.target.value);
            } else {
              url.searchParams.delete('status');
            }
            window.history.replaceState(null, '', url);
          }}><option value="">All statuses</option>{['requested', 'confirmed', 'en_route', 'in_progress', 'completed', 'cancelled', 'declined'].map(s => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}</Select></div><DataTable rows={rows as unknown as Record<string, unknown>[]} columns={[{
          key: 'service_title',
          label: 'Service',
          render: r => <div><strong>{String(r.service_title)}</strong><p className="muted">{String(r.reference)}</p></div>
        }, {
          key: 'starts_at',
          label: 'Schedule',
          render: r => manilaDate(String(r.starts_at))
        }, {
          key: 'status',
          label: 'Status',
          render: r => <Badge>{String(r.status)}</Badge>
        }, {
          key: 'total_centavos',
          label: 'Total',
          render: r => money(Number(r.total_centavos))
        }]} actions={r => <Link href={`/bookings/detail/?id=${r.id}`}>View details →</Link>} /></Card>{dashboard && <CustomerDrafts />}{dashboard && <div className="cta-panel"><div><h2>Everything you need for your next visit.</h2><p>Keep your address current and find help when you need it.</p></div><div className="row"><ButtonLink href="/account/" secondary>My account</ButtonLink><ButtonLink href="/support/" secondary>Get support</ButtonLink></div></div>}</QueryState></>;
}
export function BookingRecord({
  view = 'detail'
}: {
  view?: 'detail' | 'confirmed' | 'track' | 'invoice' | 'review';
}) {
  const id = useSearchParams().get('id') || '';
  const q = useQuery('booking-' + id, () => one<Booking>('bookings', id));
  return <><RealtimeRefresh tables={['bookings']} filter={`id=eq.${id}`} /><QueryState {...q}>{q.data ? view === 'confirmed' ? <BookingConfirmed booking={q.data} /> : view === 'track' ? <Tracking booking={q.data} /> : view === 'invoice' ? <Invoice booking={q.data} /> : view === 'review' ? <Review booking={q.data} /> : <BookingDetail booking={q.data} /> : <Empty title="Booking not found" description="This record may not belong to your account." action={<ButtonLink href="/bookings/">My bookings</ButtonLink>} />}</QueryState></>;
}
export function BookingDetail({
  booking: b,
  admin = false
}: {
  booking: Booking;
  admin?: boolean;
}) {
  const session = useSession();
  const actor: Actor = admin ? 'admin' : session.user?.id === b.provider_id ? 'provider' : 'customer';
  const events = useQuery('booking-events-' + b.id, () => list('booking_events', {
    booking_id: b.id
  }));
  return <><PageHeading eyebrow={b.reference} title={b.service_title} description={`Requested for ${manilaDate(b.starts_at)} · Asia/Manila`} action={<Badge>{b.status}</Badge>} /><div className="split"><div className="stack"><Card><h2>Service details</h2><p style={{
            whiteSpace: 'pre-wrap'
          }}>{b.description}</p><p className="row muted small" style={{
            marginTop: 20
          }}><MapPin size={16} />{b.address_snapshot.line1}, {b.address_snapshot.city} {b.address_snapshot.postal_code}</p><div className="row" style={{
            marginTop: 24
          }}><ButtonLink href={`/bookings/track/?id=${b.id}`}>Track booking</ButtonLink><ButtonLink secondary href={`/messages/?booking=${b.id}`}>Open messages</ButtonLink>{b.status === 'completed' && <><ButtonLink href={`/bookings/invoice/?id=${b.id}`} secondary>View invoice</ButtonLink>{actor === 'customer' && <ButtonLink href={`/bookings/review/?id=${b.id}`} secondary>Write a review</ButtonLink>}</>}</div></Card><Card><h2>Booking timeline</h2><QueryState {...events}>{events.data?.slice().reverse().map(e => <div key={String(e.id)} className="faq"><div className="row between"><Badge>{String(e.to_status)}</Badge><span className="small muted">{manilaDate(String(e.created_at))}</span></div>{e.reason ? <p>{String(e.reason)}</p> : null}</div>)}</QueryState></Card><Card><h2>Photos & evidence</h2><FileList bookingId={b.id} /><UploadForm kind="booking" bookingId={b.id} /></Card></div><div className="stack"><Card><h2>Agreed charges</h2><dl className="definition-list"><div><dt>Labor {b.is_estimate && !b.quote_accepted ? 'estimate' : ''}</dt><dd>{money(b.labor_centavos)}</dd></div><div><dt>Booking fee</dt><dd>{money(b.fee_centavos)}</dd></div><div className="total"><dt>{b.is_estimate && !b.quote_accepted ? 'Estimated total' : 'Total'}</dt><dd>{money(b.total_centavos)}</dd></div></dl>{b.is_estimate && b.status === 'requested' && <div style={{
            marginTop: 24
          }}>{b.quoted_labor_centavos !== null && <Notice>Proposed labor: {money(b.quoted_labor_centavos)}. {b.quote_accepted ? 'Accepted by customer.' : 'Awaiting customer approval.'}</Notice>}{actor === 'provider' && <MutationForm submit="Send labor quotation" onSubmit={async f => {
              await rpc('booking_quote', {
                p_booking: b.id,
                p_labor: pesosToCentavos(String(f.get('labor'))),
                p_accept: false
              });
            }}><Field label="Final labor quotation (₱)" name="labor" inputMode="decimal" required placeholder="0.00" /><p className="small muted">Agree on the full scope, including materials, in the conversation before sending the quotation.</p></MutationForm>}{actor === 'customer' && b.quoted_labor_centavos !== null && !b.quote_accepted && <ActionButton action={() => rpc('booking_quote', {
              p_booking: b.id,
              p_labor: null,
              p_accept: true
            })} confirm="Accept this labor quotation and the snapshotted booking fee?">Accept quotation</ActionButton>}</div>}</Card><Card><h2>Next steps</h2><div className="stack">{(['confirmed', 'en_route', 'in_progress', 'completed'] as BookingStatus[]).filter(next => canTransition(actor, b.status, next)).map(next => <ActionButton key={next} action={() => rpc('transition_booking', {
              p_booking: b.id,
              p_status: next,
              p_reason: ''
            })} confirm={next === 'completed' ? 'Mark the agreed service as completed and issue the invoice?' : undefined}>{next === 'confirmed' ? 'Accept booking' : next === 'en_route' ? 'I’m on my way' : next === 'in_progress' ? 'Start service' : 'Complete service'}</ActionButton>)}{(['declined', 'cancelled'] as BookingStatus[]).some(next => canTransition(actor, b.status, next)) && <MutationForm submit="Submit status change" onSubmit={async f => {
              const status = String(f.get('status'));
              if (!window.confirm(`Set this booking to ${status}? This change is recorded.`)) return false;
              await rpc('transition_booking', {
                p_booking: b.id,
                p_status: status,
                p_reason: String(f.get('reason'))
              });
            }}><Select label="Change booking status" name="status">{(['declined', 'cancelled'] as BookingStatus[]).filter(next => canTransition(actor, b.status, next)).map(next => <option key={next}>{next}</option>)}</Select><Textarea label="Reason" name="reason" minLength={5} maxLength={1000} required /></MutationForm>}<ButtonLink href={`/support/?booking=${b.id}`} secondary>Report a concern</ButtonLink></div></Card>{actor === 'customer' && <Card><h2>Settlement or refund concern</h2><p className="small muted" style={{
            marginBottom: 16
          }}>A request initiates review. It does not automatically return funds or establish a cancellation policy.</p><MutationForm submit="Request refund review" onSubmit={async f => {
            await rpc('request_refund', {
              p_booking: b.id,
              p_reason: String(f.get('reason'))
            });
          }}><Textarea label="Reason for refund request" name="reason" required minLength={5} maxLength={2000} /></MutationForm></Card>}</div></div></>;
}
function Tracking({
  booking: b
}: {
  booking: Booking;
}) {
  const session = useSession();
  const location = useQuery('location-' + b.id, async () => result(requireDb().from('booking_locations').select('*').eq('booking_id', b.id).maybeSingle()) as Promise<{
    latitude: number;
    longitude: number;
    updated_at: string;
  } | null>);
  const timeline = ['requested', 'confirmed', 'en_route', 'in_progress', 'completed'];
  const active = timeline.indexOf(b.status);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const fresh = location.data && now - new Date(location.data.updated_at).getTime() < 15 * 60000;
  return <><RealtimeRefresh tables={['booking_locations']} filter={`booking_id=eq.${b.id}`} /><PageHeading eyebrow={b.reference} title="Know what happens next." description="Appointment updates and your conversation, together in one place." action={<Badge>{b.status}</Badge>} /><div className="split"><div className="stack"><Card><h2>{b.service_title}</h2><ol className="timeline">{timeline.map((s, i) => <li className={i <= active ? 'done' : ''} key={s}><span className="timeline-mark">{i <= active ? <Check size={16} /> : i + 1}</span><div><h3>{s === 'requested' ? 'Request received' : s === 'confirmed' ? 'Appointment confirmed' : s === 'en_route' ? 'Provider en route' : s === 'in_progress' ? 'Service in progress' : 'Completed'}</h3><p>{s === b.status ? 'Current recorded booking status.' : i < active ? 'Recorded in the booking timeline.' : 'Awaiting provider update.'}</p></div></li>)}</ol>{['cancelled', 'declined'].includes(b.status) && <Notice>This booking is {b.status}. See its details for the recorded reason.</Notice>}<div className="row"><ButtonLink href={`/messages/?booking=${b.id}`}>Contact provider</ButtonLink><ButtonLink href={`/bookings/detail/?id=${b.id}`} secondary>Booking details</ButtonLink></div></Card>{session.user?.id === b.provider_id && ['en_route', 'in_progress'].includes(b.status) && <Card><h2>Share your current location</h2><p className="small muted" style={{
            marginBottom: 16
          }}>Only this booking’s participants can view the coordinate you supply. Location sharing is optional and ends when the job closes.</p><ActionButton action={async () => {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0
            }));
            await rpc('update_location', {
              p_booking: b.id,
              p_lat: pos.coords.latitude,
              p_lng: pos.coords.longitude
            });
          }}>Share my current location</ActionButton></Card>}</div><div className="stack">{location.error && <Notice error>{location.error}</Notice>}<ServiceMap position={fresh ? location.data! : undefined} caption={fresh ? `Provider last shared a position at ${manilaDate(location.data!.updated_at)}. No arrival estimate is generated.` : 'No current provider location has been shared. Use the timeline and messages for updates.'} /></div></div></>;
}
function Invoice({
  booking: b
}: {
  booking: Booking;
}) {
  const query = useQuery('invoice-' + b.id, async () => ({
    invoice: await result(requireDb().from('invoices').select('*').eq('booking_id', b.id).maybeSingle()),
    payment: await result(requireDb().from('payments').select('*').eq('booking_id', b.id).maybeSingle())
  }));
  return <QueryState {...query}>{query.data?.invoice ? <div className="invoice-page"><PageHeading eyebrow="Service record" title="Every detail, clearly accounted for." action={<button className="button secondary no-print" onClick={() => window.print()}><Download size={16} />Print / save PDF</button>} /><Card className="form-width"><div className="row between" style={{
          marginBottom: 32
        }}><h2>SerbisyoGo</h2><Badge>{query.data.payment?.status || 'pending'}</Badge></div><h2>Service invoice</h2><p className="muted small" style={{
          marginBottom: 24
        }}>{String(query.data.invoice.invoice_number)}<br />{manilaDate(String(query.data.invoice.issued_at))} · Asia/Manila</p><h3>{b.service_title}</h3><p className="small muted" style={{
          marginBottom: 28
        }}>{b.reference}<br />{b.address_snapshot.line1}, {b.address_snapshot.city}</p><dl className="definition-list"><div><dt>Labor</dt><dd>{money(Number(query.data.invoice.labor_centavos))}</dd></div><div><dt>Booking fee</dt><dd>{money(Number(query.data.invoice.fee_centavos))}</dd></div><div className="total"><dt>Total agreed charge</dt><dd>{money(Number(query.data.invoice.total_centavos))}</dd></div><div><dt>Settlement status</dt><dd>{settlementLabel(query.data.payment?.status || 'pending')}</dd></div></dl><p className="small muted" style={{
          marginTop: 28
        }}>Amounts are preserved from the booking. This service record does not claim to be a tax-compliant official receipt. Contact support for settlement questions.</p><div className="row no-print" style={{
          marginTop: 28
        }}><ButtonLink href={`/bookings/review/?id=${b.id}`}>Rate your service</ButtonLink><ButtonLink href={`/support/?booking=${b.id}`} secondary>Report a concern</ButtonLink></div></Card></div> : <Empty title="Invoice not issued yet" description="The invoice becomes available when the assigned provider completes the service." action={<ButtonLink href={`/bookings/detail/?id=${b.id}`}>Booking details</ButtonLink>} />}</QueryState>;
}
function Review({
  booking: b
}: {
  booking: Booking;
}) {
  const session = useSession();
  const query = useQuery('review-' + b.id, () => list('reviews', {
    booking_id: b.id
  }));
  return <><PageHeading eyebrow="Your feedback matters" title="How did your service go?" description="Help your neighbors choose with confidence and give your provider useful feedback." /><QueryState {...query}>{b.customer_id !== session.user?.id || b.status !== 'completed' ? <Notice error>Reviews are available only to the customer of a completed booking.</Notice> : query.data?.length ? <Card><h2>Thank you for sharing your experience.</h2><Badge>{`★ ${query.data[0].rating} / 5`}</Badge><p style={{
          marginTop: 20
        }}>{String(query.data[0].body)}</p></Card> : <Card className="form-width"><h2>{b.service_title}</h2><p className="small muted" style={{
          marginBottom: 24
        }}>{b.reference}</p><MutationForm submit="Publish review" success="Your review has been published. Thank you." onSubmit={async f => {
          const data = reviewSchema.parse({
            booking_id: b.id,
            rating: f.get('rating'),
            body: f.get('body')
          });
          await rpc('submit_review', {
            p_booking: data.booking_id,
            p_rating: data.rating,
            p_body: data.body
          });
        }}><fieldset style={{
            border: 0,
            padding: 0
          }}><legend style={{
              marginBottom: 12
            }}>Rate your experience</legend><div className="rating-field">{[1, 2, 3, 4, 5].map(n => <label key={n}><input name="rating" type="radio" value={n} required /><Star size={16} />{n}</label>)}</div></fieldset><Textarea label="Your review" name="body" required minLength={10} maxLength={2000} placeholder="What went well? What could be improved?" /><Notice>Your review will be public on the provider’s profile. Avoid personal contact, payment or other private information. One review is allowed per completed booking.</Notice></MutationForm></Card>}</QueryState></>;
}
