'use client';

import { AnnouncementFeed } from '@/features/admin/announcements';
import Link from 'next/link';
import { useSession } from '@/components/session';
import { Badge, ButtonLink, Card, DataTable, Field, MutationForm, Notice, PageHeading, QueryState, RealtimeRefresh, Select, Stats, Textarea, useQuery, ActionButton } from '@/components/ui';
import { list, one } from '@/lib/data';
import { rpc } from '@/lib/backend';
import { manilaDate, money, pesosToCentavos } from '@/lib/domain';
import { providerSchema, serviceSchema } from '@/lib/schemas';
import type { Booking, Service } from '@/lib/types';
import { FileList, UploadForm } from '@/features/support/files';
export function ProviderDashboard() {
  const s = useSession();
  const q = useQuery('provider-dashboard-' + s.user?.id, async () => ({
    bookings: await list<Booking>('bookings', {
      provider_id: s.user!.id
    }),
    ledger: (await list('commission_ledger', {
      provider_id: s.user!.id
    })).filter(l => !l.reversed_at),
    payouts: await list('payout_requests', {
      provider_id: s.user!.id
    })
  }), !!s.user);
  const held = q.data?.ledger.reduce((n, r) => n + Number(r.held_net_centavos), 0) || 0;
  const allocated = q.data?.payouts.filter(p => p.status !== 'rejected').reduce((n, r) => n + Number(r.amount_centavos), 0) || 0;
  return <><PageHeading eyebrow="Provider workspace" title="Good work starts here." description="Manage your assigned requests, service schedule and recorded earnings." action={<ButtonLink href="/provider/profile/" secondary>Edit profile & services</ButtonLink>} /><RealtimeRefresh tables={['bookings', 'notifications']} /><AnnouncementFeed /><QueryState {...q}><Stats items={[{
        label: 'Recorded net earnings',
        value: money(q.data?.ledger.reduce((n, r) => n + Number(r.labor_centavos) - Number(r.commission_centavos), 0) || 0),
        note: 'Authorized settled jobs, all time'
      }, {
        label: 'Completed jobs',
        value: q.data?.bookings.filter(b => b.status === 'completed').length || 0,
        note: 'All recorded completed bookings'
      }, {
        label: 'Awaiting your response',
        value: q.data?.bookings.filter(b => b.status === 'requested').length || 0
      }, {
        label: 'Available held balance',
        value: money(Math.max(0, held - allocated)),
        note: 'Cash jobs are collected directly'
      }]} /><div className="split"><Card><h2>Assigned service requests</h2><DataTable rows={(q.data?.bookings || []) as unknown as Record<string, unknown>[]} columns={[{
            key: 'service_title',
            label: 'Service'
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
            label: 'Value',
            render: r => money(Number(r.total_centavos))
          }]} actions={r => <Link href={`/bookings/detail/?id=${r.id}`}>Manage job →</Link>} /></Card><div className="stack"><Card><h2>Your schedule</h2><p className="small muted" style={{
              marginBottom: 20
            }}>Keep your weekly hours and unavailable dates up to date. Accepted bookings reserve the provider’s time.</p><ButtonLink href="/provider/availability/">Manage availability</ButtonLink></Card><Card><h2>Payout requests</h2><p className="small muted" style={{
              marginBottom: 20
            }}>Only verified funds held by the platform are eligible. Payout approval is a review record; an actual transfer needs a recorded external reference.</p><ActionButton action={() => rpc('request_payout')}>Request available balance</ActionButton><div className="stack" style={{
              marginTop: 24
            }}>{q.data?.payouts.map(p => <div key={String(p.id)} className="row between"><strong>{money(Number(p.amount_centavos))}</strong><Badge>{String(p.status)}</Badge></div>)}</div></Card></div></div></QueryState></>;
}
export function ProviderProfileEditor() {
  const s = useSession();
  const q = useQuery('own-provider-' + s.user?.id, async () => ({
    profile: await one<Record<string, unknown>>('provider_profiles', s.user!.id),
    applications: await list('provider_applications', {
      provider_id: s.user!.id
    }),
    services: await list<Service>('provider_services', {
      provider_id: s.user!.id
    }),
    categories: await list<{
      id: string;
      name: string;
    }>('categories')
  }), !!s.user);
  const p = q.data?.profile;
  const pending = q.data?.applications.find(a => a.status === 'pending');
  return <><PageHeading eyebrow="Offer your skills" title={p ? 'Your professional profile' : 'Join your local service community.'} description="Complete your profile, services, availability and private verification documents. Applications stay pending until an administrator reviews them." /><QueryState {...q}>{p && <div className="row" style={{
        marginBottom: 24
      }}><Badge>{String(p.status)}</Badge><ButtonLink href="/provider/availability/" secondary>Set availability</ButtonLink>{q.data?.applications[0]?.reason ? <Notice>Review feedback: {String(q.data.applications[0].reason)}</Notice> : null}</div>}<div className="grid-2"><div className="stack"><Card><h2>Public profile application</h2>{pending ? <Notice>Your application is waiting for review. You can still complete services, availability and verification documents below.</Notice> : <MutationForm submit={p ? 'Submit profile changes for review' : 'Submit provider application'} success="Application submitted. Complete services, availability and verification documents next." onSubmit={async f => {
              const data = providerSchema.parse({
                display_name: f.get('display_name'),
                headline: f.get('headline'),
                bio: f.get('bio'),
                city: f.get('city'),
                service_areas: String(f.get('areas')).split(',').map(v => v.trim()).filter(Boolean)
              });
              await rpc('submit_provider', {
                p_profile: data
              });
            }}><Field label="Public display name" name="display_name" defaultValue={String(p?.display_name || s.profile?.full_name || '')} required minLength={2} maxLength={100} /><Field label="Professional headline" name="headline" defaultValue={String(p?.headline || '')} placeholder="Your main specialty" required minLength={5} maxLength={160} /><Textarea label="Experience & expertise" name="bio" defaultValue={String(p?.bio || '')} required minLength={20} maxLength={2000} /><Field label="Primary city" name="city" defaultValue={String(p?.city || '')} required minLength={2} /><Field label="Service areas (cities, separated by commas)" name="areas" defaultValue={Array.isArray(p?.service_areas) ? p.service_areas.join(', ') : ''} required /><Notice>Approved public details remain visible while proposed profile changes are reviewed. Account roles and provider approval cannot be edited here.</Notice></MutationForm>}</Card>{p && <Card><h2>Private verification documents</h2><p className="small muted" style={{
              marginBottom: 20
            }}>Upload the verification documents requested by the review team. These files are accessible only to you and authorized administrators.</p><FileList ownerId={s.user!.id} kind="verification" /><div style={{
              marginTop: 24
            }}><UploadForm kind="verification" /></div></Card>}</div><div className="stack">{p ? <><Card><h2>Your services</h2><div className="stack">{q.data?.services.map(service => <div key={service.id} style={{
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: 20
                }}><h3>{service.title}</h3><p className="small muted">{money(service.rate_centavos)} • {service.pricing_mode} • {service.duration_minutes} minutes</p><ServiceForm categories={q.data.categories} service={service} /></div>)}</div></Card><Card><h2>Add a service</h2><ServiceForm categories={q.data?.categories || []} /></Card></> : <Card><h2>Your onboarding checklist</h2><ol className="stack small"><li>Submit a public profile application.</li><li>Add service categories and your rates.</li><li>Choose service areas and weekly availability.</li><li>Upload private verification documents.</li><li>Wait for an administrator’s recorded review.</li></ol></Card>}</div></div></QueryState></>;
}
function ServiceForm({
  categories,
  service
}: {
  categories: {
    id: string;
    name: string;
  }[];
  service?: Service;
}) {
  return <MutationForm submit={service ? 'Update service' : 'Add service'} onSubmit={async f => {
    const data = serviceSchema.parse({
      category_id: f.get('category'),
      title: f.get('title'),
      rate_centavos: pesosToCentavos(String(f.get('rate'))),
      duration_minutes: f.get('duration'),
      pricing_mode: f.get('mode')
    });
    await rpc('save_provider_service', {
      p_id: service?.id || null,
      p_category: data.category_id,
      p_title: data.title,
      p_rate: data.rate_centavos,
      p_duration: data.duration_minutes,
      p_mode: data.pricing_mode,
      p_active: f.get('active') === 'on'
    });
  }}><Field label="Service title" name="title" defaultValue={service?.title} required minLength={3} maxLength={120} /><Select label="Category" name="category" required defaultValue={service?.category_id}><option value="" disabled>Choose category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select><div className="grid-2"><Field label="Labor amount / starting estimate (₱)" name="rate" inputMode="decimal" placeholder="0.00" defaultValue={service ? (service.rate_centavos / 100).toFixed(2) : ''} required /><Field label="Appointment duration (minutes)" name="duration" type="number" min={30} max={480} step={30} defaultValue={service?.duration_minutes || 60} required /></div><Select label="Pricing type" name="mode" defaultValue={service?.pricing_mode || 'quote'}><option value="quote">Estimate — customer accepts final quote</option><option value="fixed">Fixed labor amount</option></Select><label className="check-field"><input name="active" type="checkbox" defaultChecked={service?.active ?? true} /><span>Offer this service</span></label></MutationForm>;
}
export function Availability() {
  const s = useSession();
  const q = useQuery('weekly-' + s.user?.id, async () => ({
    week: await list<{
      weekday: number;
      starts_minute: number;
      ends_minute: number;
    }>('weekly_availability', {
      provider_id: s.user!.id
    }),
    blocked: await list('unavailable_periods', {
      provider_id: s.user!.id
    })
  }), !!s.user);
  const fmt = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
  const minute = (v: FormDataEntryValue | null) => {
    const [h, m] = String(v).split(':').map(Number);
    return h * 60 + m;
  };
  return <><PageHeading title="Make room for good work." description="Weekly hours are in Asia/Manila (UTC+8). Existing accepted bookings keep their reserved time." action={<ButtonLink href="/provider/profile/" secondary>Profile & services</ButtonLink>} /><QueryState {...q}><div className="grid-2"><Card><h2>Weekly availability</h2><MutationForm key={JSON.stringify(q.data?.week)} submit="Save weekly hours" onSubmit={async f => {
            const week = [0, 1, 2, 3, 4, 5, 6].filter(i => f.get('day-' + i)).map(i => ({
              weekday: i,
              starts_minute: minute(f.get('start-' + i)),
              ends_minute: minute(f.get('end-' + i))
            }));
            await rpc('save_availability', {
              p_week: week
            });
          }}>{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => {
              const slot = q.data?.week.find(w => w.weekday === i);
              return <div key={day} className="stack" style={{
                gap: 10
              }}><label className="check-field"><input type="checkbox" name={'day-' + i} defaultChecked={!!slot} /><strong>{day}</strong></label><div className="grid-2"><Field label="From" name={'start-' + i} type="time" defaultValue={fmt(slot?.starts_minute || 480)} required /><Field label="Until" name={'end-' + i} type="time" defaultValue={fmt(slot?.ends_minute || 1020)} required /></div></div>;
            })}</MutationForm></Card><div className="stack"><Card><h2>Block an unavailable period</h2><MutationForm submit="Block dates" onSubmit={async f => {
              await rpc('set_unavailable', {
                p_id: null,
                p_start: new Date(String(f.get('start')) + ':00+08:00').toISOString(),
                p_end: new Date(String(f.get('end')) + ':00+08:00').toISOString(),
                p_reason: String(f.get('reason'))
              });
            }}><Field label="From · Manila time" name="start" type="datetime-local" required /><Field label="Until · Manila time" name="end" type="datetime-local" required /><Field label="Private reason (optional)" name="reason" maxLength={300} /></MutationForm></Card><Card><h2>Unavailable periods</h2><DataTable rows={q.data?.blocked || []} columns={[{
              key: 'starts_at',
              label: 'From',
              render: r => manilaDate(String(r.starts_at))
            }, {
              key: 'ends_at',
              label: 'Until',
              render: r => manilaDate(String(r.ends_at))
            }]} actions={r => <ActionButton secondary confirm="Remove this unavailable period?" action={() => rpc('set_unavailable', {
              p_id: r.id
            })}>Remove</ActionButton>} /></Card></div></div></QueryState></>;
}
