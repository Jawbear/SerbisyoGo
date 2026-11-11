'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
import { adminNav } from '@/components/shell';
import { ActionButton, Badge, ButtonLink, Card, DataTable, Dialog, Empty, ExportButton, Field, MutationForm, Notice, PageHeading, QueryState, Select, Stats, Textarea, useQuery } from '@/components/ui';
import { list } from '@/lib/data';
import { edge, rpc } from '@/lib/backend';
import { manilaDate, money, pesosToCentavos } from '@/lib/domain';
import { releaseSchema } from '@/lib/schemas';
import type { Booking } from '@/lib/types';
import { BookingDetail } from '@/features/bookings/screens';
import { CaseDetail } from '@/features/support/support';
import { FileList } from '@/features/support/files';
import { todayManila } from '@/features/bookings/flow';
type RecordRow = Record<string, unknown>;
type Report = {
  customers: number;
  providers: number;
  bookings: number;
  platform_fees_centavos: number;
  paid_volume_centavos: number;
  pending_providers: number;
  open_cases: number;
  requested_payouts: number;
  daily: {
    day: string;
    bookings: number;
    completed: number;
  }[];
  status: {
    status: string;
    count: number;
  }[];
};
export type AdminTab = 'dashboard' | 'providers' | 'customers' | 'bookings' | 'services' | 'payouts' | 'transactions' | 'reports' | 'complaints' | 'announcements' | 'settings';
const tableFor: Record<AdminTab, string> = {
  dashboard: 'bookings',
  providers: 'provider_profiles',
  customers: 'profiles',
  bookings: 'bookings',
  services: 'categories',
  payouts: 'payout_requests',
  transactions: 'payments',
  reports: 'bookings',
  complaints: 'support_cases',
  announcements: 'announcements',
  settings: 'audit_logs'
};
export function AdminWorkspace({
  tab
}: {
  tab: AdminTab;
}) {
  const [from, setFrom] = useState(() => new Date(Date.now() - 29 * 86400000 + 8 * 3600000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => todayManila());
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<RecordRow | null>(null);
  const [create, setCreate] = useState(false);
  const params = useSearchParams();
  const start = from + 'T00:00:00+08:00';
  const endTime = new Date(to + 'T00:00:00+08:00').getTime();
  const end = Number.isFinite(endTime) ? new Date(endTime + 86400000).toISOString() : '';
  const q = useQuery('admin-' + tab + '-' + from + '-' + to, async () => {
    if (!from || !to || !end || new Date(start) >= new Date(end)) throw new Error('Choose a valid date range.');
    const report = await rpc<Report>('admin_report', {
      p_from: start,
      p_to: end
    });
    let rows = await list(tableFor[tab], {}, ['bookings', 'payments', 'support_cases', 'audit_logs', 'payout_requests'].includes(tableFor[tab]) ? {
      from: start,
      to: end
    } : undefined);
    const roles = tab === 'customers' ? await list('role_assignments') : [];
    if (tab === 'customers') rows = rows.filter(r => roles.some(role => role.user_id === r.id && role.role === 'customer'));
    return {
      report,
      rows,
      applications: tab === 'providers' ? await list('provider_applications') : [],
      services: tab === 'services' ? await list('provider_services') : [],
      settings: tab === 'settings' || tab === 'payouts' ? await list('app_settings') : [],
      releases: tab === 'settings' ? await list('app_releases') : [],
      refunds: tab === 'transactions' ? await list('refund_requests') : [],
      ledger: tab === 'payouts' || tab === 'transactions' ? await list('commission_ledger', {}, {
        from: start,
        to: end
      }) : [],
      restrictions: tab === 'customers' ? await list('account_restrictions') : []
    };
  });
  const rows = (q.data?.rows || []).filter(r => !status || r.status === status);
  const statuses = [...new Set(q.data?.rows.map(r => String(r.status || '')).filter(Boolean) || [])];
  const title = tab === 'dashboard' ? 'Operations dashboard' : adminNav.find(n => n[0] === `/admin/${tab}/`)?.[1] || 'Administration';
  const metrics = q.data?.report;
  const selectedRow = selected ? q.data?.rows.find(r => r.id === selected.id) || selected : params.get('id') ? rows.find(r => r.id === params.get('id')) || null : null;
  const close = () => {
    setSelected(null);
    setCreate(false);
    if (params.get('id')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('id');
      window.history.replaceState(null, '', url);
    }
  };
  const onRow = (r: RecordRow) => {
    setSelected(r);
    const url = new URL(window.location.href);
    url.searchParams.set('id', String(r.id));
    window.history.replaceState(null, '', url);
  };
  return <><PageHeading title={title} description="Manage the SerbisyoGo community with clear records and accountable actions." action={<ExportButton rows={rows} name={`serbisyogo-${tab}-${from}-${to}`} />} /><div className="date-filters"><Field label="From · Manila date" type="date" value={from} onChange={e => setFrom(e.target.value)} required /><Field label="Through · Manila date" type="date" value={to} min={from} onChange={e => setTo(e.target.value)} required />{statuses.length > 0 && <Select label="Status" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{statuses.map(s => <option key={s}>{s}</option>)}</Select>}<p className="small muted">Bookings, settlement records, cases and logs use the selected dates. Provider and account lists show current records.</p></div><QueryState {...q}>{metrics && <Stats items={[{
        label: 'New active customers',
        value: metrics.customers,
        note: 'Created in selected date range'
      }, {
        label: 'Approved providers',
        value: metrics.providers,
        note: 'Current approved, active profiles'
      }, {
        label: 'Booking requests',
        value: metrics.bookings,
        note: 'Created in selected date range'
      }, {
        label: 'Recorded platform fees',
        value: money(metrics.platform_fees_centavos),
        note: 'Authorized settlements, less recorded refunds'
      }]} />}<div className={tab === 'dashboard' ? 'split' : 'stack'}><div className="stack">{tab === 'reports' ? <Reports report={metrics} /> : tab === 'settings' ? <><SettingsPanel settings={q.data?.settings || []} /><ReleaseManagement releases={q.data?.releases || []} /><Card><h2>Administrator activity</h2><AdminTable tab={tab} rows={rows} select={onRow} /></Card></> : <Card><div className="row between" style={{
              marginBottom: 20
            }}><h2>{tab === 'dashboard' ? 'Recent bookings' : title}</h2>{['services', 'announcements'].includes(tab) && <button className="button compact" onClick={() => setCreate(true)}>+ {tab === 'services' ? 'Add category' : 'Create announcement'}</button>}</div><AdminTable tab={tab} rows={rows} select={onRow} /></Card>}{tab === 'services' && <Card><h2>Provider service rates</h2><DataTable rows={q.data?.services || []} columns={[{
              key: 'title',
              label: 'Service'
            }, {
              key: 'rate_centavos',
              label: 'Labor / estimate',
              render: r => money(Number(r.rate_centavos))
            }, {
              key: 'pricing_mode',
              label: 'Pricing type'
            }, {
              key: 'active',
              label: 'Active'
            }]} actions={r => <ServicePricing row={r} />} /></Card>}{tab === 'payouts' && <><Card><h2>Commission & settlement ledger</h2><p className="small muted" style={{
                marginBottom: 24
              }}>Cash jobs are collected by providers. Their commission is receivable, not held funds. Only manual platform settlements produce a payout balance.</p><DataTable rows={q.data?.ledger || []} columns={[{
                key: 'booking_id',
                label: 'Booking'
              }, {
                key: 'labor_centavos',
                label: 'Labor',
                render: r => money(Number(r.labor_centavos))
              }, {
                key: 'commission_centavos',
                label: 'Commission',
                render: r => money(Number(r.commission_centavos))
              }, {
                key: 'held_net_centavos',
                label: 'Held net',
                render: r => money(Number(r.held_net_centavos))
              }, {
                key: 'cash_commission_due_centavos',
                label: 'Cash fees receivable',
                render: r => money(Number(r.cash_commission_due_centavos))
              }]} /></Card><SettingsPanel settings={q.data?.settings || []} /></>}{tab === 'transactions' && <Card><h2>Refund requests</h2><p className="small muted" style={{
              marginBottom: 24
            }}>A request or approval does not mean money was returned. Record a refund only after verifying the actual external settlement.</p><DataTable rows={q.data?.refunds || []} columns={[{
              key: 'booking_id',
              label: 'Booking'
            }, {
              key: 'reason',
              label: 'Reason'
            }, {
              key: 'status',
              label: 'Status',
              render: r => <Badge>{String(r.status)}</Badge>
            }]} actions={r => <RefundReview row={r} />} /></Card>}</div>{tab === 'dashboard' && metrics && <div className="stack"><Card><h2>Action center</h2><div className="stack"><Link href="/admin/providers/">{metrics.pending_providers} provider profiles to review →</Link><Link href="/admin/complaints/">{metrics.open_cases} open concerns →</Link><Link href="/admin/payouts/">{metrics.requested_payouts} payout requests →</Link></div></Card><Card><h2>Metric definitions</h2><p className="small muted">Platform fees are commissions plus booking fees from authorized settlement ledger entries in the date range. Reversed entries are excluded. These records are operational figures, not bank reconciliation or verified accounting revenue.</p><p className="small muted">The date range includes both selected Manila dates. No sample statistics are shown as live operations.</p><ButtonLink href="/admin/reports/" secondary className="compact">View reports</ButtonLink></Card></div>}</div>{(selectedRow || create) && <Dialog title={create ? tab === 'services' ? 'Create service category' : 'Create announcement' : 'Record details'} onClose={close}>{create ? tab === 'services' ? <CategoryEditor /> : <AnnouncementEditor /> : selectedRow && <AdminDetail tab={tab} row={selectedRow} applications={q.data?.applications || []} restrictions={q.data?.restrictions || []} />}</Dialog>}</QueryState></>;
}
function AdminTable({
  tab,
  rows,
  select
}: {
  tab: AdminTab;
  rows: RecordRow[];
  select: (r: RecordRow) => void;
}) {
  const columns = tab === 'providers' ? [{
    key: 'display_name',
    label: 'Provider'
  }, {
    key: 'city',
    label: 'City'
  }, {
    key: 'status',
    label: 'Verification',
    render: (r: RecordRow) => <Badge>{String(r.status)}</Badge>
  }] : tab === 'customers' ? [{
    key: 'full_name',
    label: 'Customer'
  }, {
    key: 'phone',
    label: 'Mobile'
  }, {
    key: 'status',
    label: 'Account',
    render: (r: RecordRow) => <Badge>{String(r.status)}</Badge>
  }] : ['dashboard', 'bookings', 'reports'].includes(tab) ? [{
    key: 'reference',
    label: 'Reference / service',
    render: (r: RecordRow) => <><strong>{String(r.reference)}</strong><p className="muted">{String(r.service_title)}</p></>
  }, {
    key: 'starts_at',
    label: 'Schedule',
    render: (r: RecordRow) => manilaDate(String(r.starts_at))
  }, {
    key: 'status',
    label: 'Status',
    render: (r: RecordRow) => <Badge>{String(r.status)}</Badge>
  }] : tab === 'services' ? [{
    key: 'name',
    label: 'Category'
  }, {
    key: 'slug',
    label: 'Identifier'
  }, {
    key: 'active',
    label: 'Active'
  }] : tab === 'transactions' ? [{
    key: 'booking_id',
    label: 'Booking'
  }, {
    key: 'amount_centavos',
    label: 'Amount',
    render: (r: RecordRow) => money(Number(r.amount_centavos))
  }, {
    key: 'method',
    label: 'Method'
  }, {
    key: 'status',
    label: 'Status',
    render: (r: RecordRow) => <Badge>{String(r.status)}</Badge>
  }] : tab === 'payouts' ? [{
    key: 'provider_id',
    label: 'Provider'
  }, {
    key: 'amount_centavos',
    label: 'Requested',
    render: (r: RecordRow) => money(Number(r.amount_centavos))
  }, {
    key: 'status',
    label: 'Status',
    render: (r: RecordRow) => <Badge>{String(r.status)}</Badge>
  }] : tab === 'complaints' ? [{
    key: 'subject',
    label: 'Concern'
  }, {
    key: 'priority',
    label: 'Priority'
  }, {
    key: 'status',
    label: 'Status',
    render: (r: RecordRow) => <Badge>{String(r.status)}</Badge>
  }] : tab === 'announcements' ? [{
    key: 'title',
    label: 'Title'
  }, {
    key: 'audience',
    label: 'Audience'
  }, {
    key: 'status',
    label: 'State',
    render: (r: RecordRow) => <Badge>{String(r.status)}</Badge>
  }, {
    key: 'publish_at',
    label: 'Publication',
    render: (r: RecordRow) => r.publish_at ? manilaDate(String(r.publish_at)) : 'Unscheduled'
  }] : [{
    key: 'created_at',
    label: 'Time',
    render: (r: RecordRow) => manilaDate(String(r.created_at))
  }, {
    key: 'actor_id',
    label: 'Actor'
  }, {
    key: 'action',
    label: 'Action'
  }, {
    key: 'entity',
    label: 'Entity'
  }];
  return <DataTable rows={rows} columns={columns} actions={r => <button className="button secondary compact" onClick={() => select(r)}>View / manage</button>} />;
}
function AdminDetail({
  tab,
  row,
  applications,
  restrictions
}: {
  tab: AdminTab;
  row: RecordRow;
  applications: RecordRow[];
  restrictions: RecordRow[];
}) {
  const id = String(row.id);
  if (tab === 'dashboard' || tab === 'bookings') return <BookingDetail booking={row as unknown as Booking} admin />;
  if (tab === 'services') return <CategoryEditor row={row} />;
  if (tab === 'announcements') return <AnnouncementEditor row={row} />;
  if (tab === 'complaints') return <div className="stack"><CaseDetail id={id} admin /><Card><h2>Review & resolution</h2><MutationForm submit="Update case" onSubmit={async f => {
        await rpc('admin_action', {
          p_entity: 'case',
          p_id: id,
          p_action: 'update',
          p_data: {
            priority: f.get('priority'),
            status: f.get('status'),
            resolution: f.get('resolution')
          }
        });
      }}><Select label="Priority" name="priority" defaultValue={String(row.priority)}>{['low', 'normal', 'high', 'urgent'].map(s => <option key={s}>{s}</option>)}</Select><Select label="Case status" name="status" defaultValue={String(row.status)}>{['open', 'reviewing', 'resolved', 'closed'].map(s => <option key={s}>{s}</option>)}</Select><Textarea label="Recorded resolution (visible to case owner)" name="resolution" defaultValue={String(row.resolution || '')} maxLength={5000} /></MutationForm></Card></div>;
  if (tab === 'providers') return <div className="stack"><ButtonLink href={`/admin/accounts/?id=${id}`} secondary>Edit or delete user account</ButtonLink><h2>{String(row.display_name)}</h2><Badge>{String(row.status)}</Badge><p className="muted">{String(row.headline)}</p><p>{String(row.bio)}</p><Card><h3>Verification documents · private</h3><FileList ownerId={id} kind="verification" /></Card><ProviderVerificationData id={id} />{applications.filter(a => a.provider_id === id).map(a => <Card key={String(a.id)}><div className="row between"><h3>Profile application</h3><Badge>{String(a.status)}</Badge></div><dl className="definition-list" style={{
        margin: '20px 0'
      }}>{Object.entries((a.proposed_profile || {}) as RecordRow).map(([k, v]) => <div key={k}><dt>{k.replaceAll('_', ' ')}</dt><dd>{Array.isArray(v) ? v.join(', ') : String(v)}</dd></div>)}</dl>{a.reason ? <p className="small muted">Review: {String(a.reason)}</p> : null}{a.status === 'pending' && <MutationForm submit="Record verification decision" onSubmit={async f => {
        const action = String(f.get('decision'));
        if (!window.confirm(`Record this provider review as ${action.replaceAll('_', ' ')}?`)) return false;
        await rpc('admin_action', {
          p_entity: 'provider',
          p_id: a.id,
          p_action: action,
          p_data: {
            reason: f.get('reason')
          }
        });
      }}><Select label="Decision" name="decision"><option value="request_changes">Request changes</option><option value="approve">Approve application</option></Select><Textarea label="Review reason" name="reason" minLength={5} maxLength={1000} required /><Notice>Approval requires private verification documents, at least one active service and weekly availability.</Notice></MutationForm>}</Card>)}{row.status !== 'suspended' && <ReasonAction entity="provider" id={id} actions={['suspend']} label="Suspend provider" />}</div>;
  if (tab === 'customers') return <div className="stack"><ButtonLink href={`/admin/accounts/?id=${id}`} secondary>Edit or delete user account</ButtonLink><h2>{String(row.full_name)}</h2><dl className="definition-list"><div><dt>Mobile</dt><dd>{String(row.phone || 'Not supplied')}</dd></div><div><dt>Status</dt><dd><Badge>{String(row.status)}</Badge></dd></div><div><dt>Registered</dt><dd>{manilaDate(String(row.created_at))}</dd></div></dl><ReasonAction entity="customer" id={id} actions={['restrict', 'activate', 'deactivate']} label="Record account action" /><Card><h3>Restriction history</h3>{restrictions.filter(r => r.user_id === id).map(r => <div className="faq" key={String(r.id)}><Badge>{String(r.status)}</Badge><p className="small">{String(r.reason)}</p><p className="small muted">{manilaDate(String(r.created_at))}</p></div>)}</Card></div>;
  if (tab === 'payouts') return <div className="stack"><h2>{money(Number(row.amount_centavos))} requested</h2><Notice>Approval does not initiate a bank or wallet transfer. Record an actual external transfer only after it has been independently completed.</Notice><MutationForm submit="Record payout review" onSubmit={async f => {
      const action = String(f.get('action'));
      if (!window.confirm('Record this payout decision? No automatic transfer is performed.')) return false;
      await rpc('admin_action', {
        p_entity: 'payout',
        p_id: id,
        p_action: action,
        p_data: {
          reason: f.get('reason'),
          transfer_reference: f.get('reference')
        }
      });
    }}><Badge>{String(row.status)}</Badge><Select label="Review action" name="action"><option value="approve">Approve request (no transfer)</option><option value="reject">Reject request</option><option value="record_transfer">Record completed external transfer</option></Select><Field label="External transfer reference (required for recorded transfer)" name="reference" /><Textarea label="Review reason / verification details" name="reason" minLength={5} required /></MutationForm></div>;
  if (tab === 'transactions') return <div className="stack"><h2>Payment settlement</h2><dl className="definition-list"><div><dt>Booking</dt><dd>{String(row.booking_id)}</dd></div><div><dt>Recorded amount</dt><dd>{money(Number(row.amount_centavos))}</dd></div><div><dt>State</dt><dd><Badge>{String(row.status)}</Badge></dd></div></dl><Notice>Use this only to record independently verified cash/manual settlement or an actual refund. This action does not collect money or return funds.</Notice><SettlementForm row={row} /><Link href={`/admin/bookings/?id=${row.booking_id}`}>Inspect booking →</Link></div>;
  return <dl className="definition-list">{Object.entries(row).map(([k, v]) => <div key={k}><dt>{k.replaceAll('_', ' ')}</dt><dd>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</dd></div>)}</dl>;
}
function ProviderVerificationData({
  id
}: {
  id: string;
}) {
  const q = useQuery('verification-data-' + id, async () => ({
    services: await list('provider_services', {
      provider_id: id
    }),
    week: await list('weekly_availability', {
      provider_id: id
    })
  }));
  return <QueryState {...q}><Card><h3>Services & availability</h3><DataTable rows={q.data?.services || []} columns={[{
        key: 'title',
        label: 'Service'
      }, {
        key: 'rate_centavos',
        label: 'Labor / estimate',
        render: r => money(Number(r.rate_centavos))
      }, {
        key: 'pricing_mode',
        label: 'Type'
      }, {
        key: 'active',
        label: 'Active'
      }]} /><div style={{
        marginTop: 20
      }}><DataTable rows={q.data?.week || []} columns={[{
          key: 'weekday',
          label: 'Day',
          render: r => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][Number(r.weekday)]
        }, {
          key: 'starts_minute',
          label: 'From (Manila)',
          render: r => `${String(Math.floor(Number(r.starts_minute) / 60)).padStart(2, '0')}:${String(Number(r.starts_minute) % 60).padStart(2, '0')}`
        }, {
          key: 'ends_minute',
          label: 'Until (Manila)',
          render: r => `${String(Math.floor(Number(r.ends_minute) / 60)).padStart(2, '0')}:${String(Number(r.ends_minute) % 60).padStart(2, '0')}`
        }]} /></div></Card></QueryState>;
}
function ReasonAction({
  entity,
  id,
  actions,
  label
}: {
  entity: string;
  id: string;
  actions: string[];
  label: string;
}) {
  return <MutationForm submit={label} onSubmit={async f => {
    if (!window.confirm('Apply this recorded administrative action?')) return false;
    await rpc('admin_action', {
      p_entity: entity,
      p_id: id,
      p_action: f.get('action'),
      p_data: {
        reason: f.get('reason')
      }
    });
  }}><Select label="Action" name="action">{actions.map(a => <option key={a}>{a}</option>)}</Select><Textarea label="Reason" name="reason" required minLength={5} maxLength={1000} /></MutationForm>;
}
function CategoryEditor({
  row
}: {
  row?: RecordRow;
}) {
  return <div className="stack"><MutationForm submit={row ? 'Save category' : 'Create category'} onSubmit={async f => {
      await rpc('admin_action', {
        p_entity: 'category',
        p_id: row?.id || null,
        p_action: 'save',
        p_data: {
          name: f.get('name'),
          slug: row?.slug || f.get('slug'),
          description: f.get('description'),
          icon: row?.icon || f.get('icon'),
          active: !!f.get('active')
        }
      });
    }}><Field label="Category name" name="name" required minLength={2} maxLength={100} defaultValue={String(row?.name || '')} /><Field label="URL identifier" name="slug" required pattern="[a-z0-9-]+" disabled={!!row} defaultValue={String(row?.slug || '')} /><Textarea label="Description" name="description" maxLength={1000} defaultValue={String(row?.description || '')} />{!row && <Select label="Service icon" name="icon">{['wrench', 'zap', 'droplets', 'hammer', 'plug', 'wind'].map(i => <option key={i}>{i}</option>)}</Select>}<label className="check-field"><input type="checkbox" name="active" defaultChecked={Boolean(row?.active ?? true)} /><span>Available for service discovery</span></label></MutationForm>{row && <ActionButton secondary confirm="Archive this category? Existing bookings and financial history will be retained." action={() => rpc('admin_action', {
      p_entity: 'category',
      p_id: row.id,
      p_action: 'archive'
    })}>Archive category</ActionButton>}</div>;
}
function ServicePricing({
  row
}: {
  row: RecordRow;
}) {
  const [open, setOpen] = useState(false);
  return <><button className="button secondary compact" onClick={() => setOpen(true)}>Edit pricing</button>{open && <Dialog title={String(row.title)} onClose={() => setOpen(false)}><MutationForm submit="Save future service pricing" onSubmit={async f => {
        await rpc('admin_action', {
          p_entity: 'service',
          p_id: row.id,
          p_action: 'save',
          p_data: {
            rate_centavos: pesosToCentavos(String(f.get('rate'))),
            duration_minutes: Number(f.get('duration')),
            pricing_mode: f.get('mode'),
            active: !!f.get('active')
          }
        });
      }}><Field label="Labor amount / estimate (₱)" name="rate" defaultValue={(Number(row.rate_centavos) / 100).toFixed(2)} required inputMode="decimal" /><Field label="Duration (minutes)" name="duration" type="number" min={30} max={480} defaultValue={Number(row.duration_minutes)} required /><Select label="Pricing model" name="mode" defaultValue={String(row.pricing_mode)}><option value="fixed">Fixed labor</option><option value="quote">Quotation required</option></Select><label className="check-field"><input type="checkbox" name="active" defaultChecked={Boolean(row.active)} /><span>Offer this service</span></label><Notice>Existing booking and invoice snapshots are preserved.</Notice></MutationForm></Dialog>}</>;
}
function AnnouncementEditor({
  row
}: {
  row?: RecordRow;
}) {
  return <div className="stack"><MutationForm submit="Save announcement" onSubmit={async f => {
      const date = String(f.get('date'));
      await rpc('admin_action', {
        p_entity: 'announcement',
        p_id: row?.id || null,
        p_action: 'save',
        p_data: {
          title: f.get('title'),
          body: f.get('body'),
          audience: f.get('audience'),
          status: f.get('status'),
          publish_at: date ? new Date(date + ':00+08:00').toISOString() : null
        }
      });
    }}><Field label="Title" name="title" required minLength={3} maxLength={160} defaultValue={String(row?.title || '')} /><Select label="Audience" name="audience" defaultValue={String(row?.audience || 'everyone')}><option value="everyone">Everyone, including visitors</option><option value="customers">Signed-in customers</option><option value="providers">Approved providers</option></Select><Textarea label="Announcement message" name="body" required minLength={5} maxLength={5000} defaultValue={String(row?.body || '')} /><Select label="Publication state" name="status" defaultValue={String(row?.status === 'published' ? 'published' : 'draft')}><option value="draft">Draft — private to administrators</option><option value="published">Publish at scheduled time</option></Select><Field label="Publication time · Asia/Manila" name="date" type="datetime-local" defaultValue={row?.publish_at ? new Date(new Date(String(row.publish_at)).getTime() + 8 * 3600000).toISOString().slice(0, 16) : ''} /></MutationForm>{row && <ActionButton secondary confirm="Archive this announcement?" action={() => rpc('admin_action', {
      p_entity: 'announcement',
      p_id: row.id,
      p_action: 'archive'
    })}>Archive announcement</ActionButton>}</div>;
}
function SettlementForm({
  row
}: {
  row: RecordRow;
}) {
  const [nonce] = useState(() => crypto.randomUUID());
  return <MutationForm submit="Record verified settlement" onSubmit={async f => {
    if (!window.confirm('Confirm that you have verified the actual payment or refund. This records an event without moving funds.')) return false;
    await rpc('settle_payment', {
      p_payment: row.id,
      p_event: nonce,
      p_status: f.get('status'),
      p_method: f.get('method'),
      p_reason: f.get('reason')
    });
  }}><Select label="Settlement event" name="status"><option value="paid">Payment received and verified</option><option value="refunded">Actual refund completed and verified</option></Select><Select label="Settlement method" name="method" defaultValue={String(row.method)}><option value="cash">Cash collected directly by provider</option><option value="manual_platform">Manual payment received by platform</option></Select><Textarea label="Verified external reference and explanation" name="reason" minLength={10} required maxLength={2000} /></MutationForm>;
}
function RefundReview({
  row
}: {
  row: RecordRow;
}) {
  const [open, setOpen] = useState(false);
  return <><button className="button secondary compact" onClick={() => setOpen(true)}>Review</button>{open && <Dialog title="Review refund request" onClose={() => setOpen(false)}><ReasonAction entity="refund" id={String(row.id)} actions={['reviewing', 'rejected']} label="Save refund review" /></Dialog>}</>;
}
function SettingsPanel({
  settings
}: {
  settings: RecordRow[];
}) {
  const current = settings.find(s => s.active) || settings[0];
  return <Card><h2>Versioned platform pricing</h2><p className="small muted" style={{
      marginBottom: 20
    }}>No fee or commission policy is assumed. Save a draft for review or explicitly activate new values for future bookings.</p><MutationForm key={String(current?.id || 'new')} submit="Save settings version" onSubmit={async f => {
      const action = String(f.get('action'));
      if (action === 'activate' && !window.confirm('Activate these fee and commission settings for future booking requests?')) return;
      await rpc('admin_action', {
        p_entity: 'settings',
        p_id: null,
        p_action: action,
        p_data: {
          fee_centavos: pesosToCentavos(String(f.get('fee'))),
          commission_bps: pesosToCentavos(String(f.get('commission'))),
          support_email: String(f.get('email')) || null
        }
      });
    }}><div className="grid-3"><Field label="Booking fee (₱)" name="fee" inputMode="decimal" placeholder="Explicit amount required" defaultValue={current?.fee_centavos !== null && current?.fee_centavos !== undefined ? (Number(current.fee_centavos) / 100).toFixed(2) : ''} required /><Field label="Commission on labor (%)" name="commission" inputMode="decimal" placeholder="0.00 – 100.00" defaultValue={current?.commission_bps !== null && current?.commission_bps !== undefined ? (Number(current.commission_bps) / 100).toFixed(2) : ''} required /><Field label="Support email" name="email" type="email" defaultValue={String(current?.support_email || '')} /></div><Select label="Save as" name="action"><option value="draft">Draft settings version</option><option value="activate">Activate settings version</option></Select><Notice>Provider verification, authorization and the append-only audit trail are mandatory and cannot be disabled.</Notice></MutationForm><div style={{
      marginTop: 24
    }}><DataTable rows={settings} columns={[{
        key: 'version',
        label: 'Version'
      }, {
        key: 'fee_centavos',
        label: 'Fee',
        render: r => r.fee_centavos === null ? 'Unconfigured' : money(Number(r.fee_centavos))
      }, {
        key: 'commission_bps',
        label: 'Commission',
        render: r => r.commission_bps === null ? 'Unconfigured' : (Number(r.commission_bps) / 100).toFixed(2) + '%'
      }, {
        key: 'active',
        label: 'Active'
      }]} /></div></Card>;
}
function ReleaseManagement({
  releases
}: {
  releases: RecordRow[];
}) {
  return <Card><h2>Android release management</h2><Notice>Supply the actual APK when it is ready. Upload creates a private verified draft. Publication is a separate, audited action. Files are versioned and cannot be overwritten.</Notice><div style={{
      marginTop: 24
    }}><MutationForm submit="Upload & verify draft APK" success="APK uploaded and verified. Review the draft before publishing." onSubmit={async f => {
        releaseSchema.parse({
          version_name: f.get('version_name'),
          version_code: f.get('version_code'),
          min_android: f.get('min_android'),
          release_notes: f.get('release_notes')
        });
        await edge('releases', f);
      }}><div className="grid-3"><Field label="APK version name" name="version_name" required placeholder="From your actual package" /><Field label="APK version code" name="version_code" type="number" min={1} required /><Field label="Minimum Android version" name="min_android" required placeholder="For example, 8.0" /></div><Textarea label="Release notes" name="release_notes" minLength={10} maxLength={10000} required /><Field label="Actual APK file (maximum 50 MB, subject to project limits)" name="file" type="file" accept=".apk,application/vnd.android.package-archive" required /></MutationForm></div><div style={{
      marginTop: 32
    }}><DataTable rows={releases} columns={[{
        key: 'version_name',
        label: 'Version'
      }, {
        key: 'version_code',
        label: 'Code'
      }, {
        key: 'status',
        label: 'State',
        render: r => <Badge>{String(r.status)}</Badge>
      }, {
        key: 'byte_size',
        label: 'Size',
        render: r => r.byte_size ? (Number(r.byte_size) / 1048576).toFixed(1) + ' MB' : 'Upload incomplete'
      }, {
        key: 'verified_at',
        label: 'Verification',
        render: r => r.verified_at ? 'Checksum verified' : 'Not verified'
      }]} actions={r => <div className="row"><ReleaseNotesEditor row={r} />{r.status === 'draft' && <ActionButton action={() => rpc('publish_release', {
          p_release: r.id,
          p_archive: false
        })} confirm={`Publish APK ${r.version_name} for public download? The stored artifact must pass backend verification.`}>Publish</ActionButton>}{r.status !== 'archived' && <ActionButton secondary confirm="Archive this release? It will no longer be offered for download." action={() => rpc('publish_release', {
          p_release: r.id,
          p_archive: true
        })}>Archive</ActionButton>}</div>} /></div><p className="small muted" style={{
      marginTop: 16
    }}>SHA-256 is computed from the uploaded bytes, checked against the stored artifact, and shown on the public download page. Published version metadata is compared with the Android manifest.</p></Card>;
}
function ReleaseNotesEditor({
  row
}: {
  row: RecordRow;
}) {
  const [open, setOpen] = useState(false);
  return <><button className="button secondary compact" onClick={() => setOpen(true)}>Details</button>{open && <Dialog title={`Android ${row.version_name}`} onClose={() => setOpen(false)}><div className="stack"><dl className="definition-list"><div><dt>Version code</dt><dd>{String(row.version_code)}</dd></div><div><dt>Compatibility</dt><dd>Android {String(row.min_android)}+</dd></div><div><dt>State</dt><dd><Badge>{String(row.status)}</Badge></dd></div></dl><p className="checksum">{String(row.sha256 || 'Artifact not verified')}</p>{row.status === 'draft' ? <MutationForm submit="Save draft release notes" onSubmit={async f => {
          await rpc('update_release_notes', {
            p_release: row.id,
            p_notes: f.get('notes')
          });
        }}><Textarea label="Release notes" name="notes" minLength={10} maxLength={10000} required defaultValue={String(row.release_notes)} /></MutationForm> : <p className="release-notes">{String(row.release_notes)}</p>}</div></Dialog>}</>;
}
function Reports({
  report
}: {
  report?: Report;
}) {
  if (!report) return null;
  return <><Card><h2>Booking activity</h2><p className="small muted" style={{
        marginBottom: 20
      }}>Bookings grouped by creation date in Asia/Manila. “Completed” is their current recorded status.</p>{report.daily.length ? <div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={report.daily}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="day" stroke="var(--muted)" tick={{
              fontSize: 10
            }} /><YAxis stroke="var(--muted)" allowDecimals={false} /><Tooltip contentStyle={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 8
            }} /><Area type="monotone" dataKey="bookings" stroke="var(--green)" fill="var(--soft)" /><Area type="monotone" dataKey="completed" stroke="var(--accent)" fill="transparent" /></AreaChart></ResponsiveContainer></div> : <Empty title="No bookings in this date range" />}<ExportButton rows={report.daily} name="booking-activity" /></Card><div className="grid-2"><Card><h2>Booking status distribution</h2>{report.status.length ? <div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={report.status}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="status" stroke="var(--muted)" tick={{
                fontSize: 9
              }} /><YAxis stroke="var(--muted)" allowDecimals={false} /><Tooltip contentStyle={{
                background: 'var(--panel)',
                border: '1px solid var(--border)'
              }} /><Bar dataKey="count" fill="var(--green)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <Empty title="No status data" />}</Card><Card><h2>Settlement definitions</h2><dl className="definition-list"><div><dt>Authorized paid volume</dt><dd>{money(report.paid_volume_centavos)}</dd></div><div><dt>Recorded platform fees</dt><dd>{money(report.platform_fees_centavos)}</dd></div></dl><p className="small muted" style={{
          marginTop: 24
        }}>Paid volume includes authorized paid records whose settlement time falls in the selected date range. Platform fees use the commission ledger’s creation time. Recorded refunds mark ledger entries as reversed and exclude them. Neither figure proves a bank transfer, cash remittance or tax revenue recognition.</p></Card></div></>;
}
