'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Guard, Card, PageHeading, Notice, ButtonLink, Badge, DataTable, Stats } from './ui';
import { Landing, Find, Services, ProviderProfile, ProviderCard } from '@/features/services/catalog';
import { AuthScreen, AuthCallback } from '@/features/auth/screens';
import { BookingFlow } from '@/features/bookings/flow';
import { BookingList, BookingRecord } from '@/features/bookings/screens';
import { Messages } from '@/features/messaging/messages';
import { ProviderDashboard, ProviderProfileEditor, Availability } from '@/features/providers/workspace';
import { Account, Notifications } from '@/features/account/account';
import { Support } from '@/features/support/support';
import { DownloadPage } from '@/features/app-releases/download';
import { AdminWorkspace, type AdminTab } from '@/features/admin/workspace';
import { demoProviders } from '@/lib/data';
export function Screen({
  name
}: {
  name: string;
}) {
  switch (name) {
    case 'home':
      return <Landing />;
    case 'find':
      return <Find />;
    case 'services':
      return <Services />;
    case 'provider-profile':
      return <ProviderProfile />;
    case 'login':
      return <AuthScreen />;
    case 'admin-login':
      return <AuthScreen mode="admin" />;
    case 'register':
      return <AuthScreen mode="register" />;
    case 'verify':
      return <AuthScreen mode="verify" />;
    case 'forgot':
      return <AuthScreen mode="forgot" />;
    case 'reset':
      return <AuthScreen mode="reset" />;
    case 'callback':
      return <AuthCallback />;
    case 'download':
      return <DownloadPage />;
    case 'support':
      return <Support />;
    case 'preview':
      return <Preview />;
    case 'terms':
    case 'privacy':
      return <PolicyPage mode={name} />;
    case 'book':
      return <Guard><BookingFlow step="details" /></Guard>;
    case 'schedule':
      return <Guard><BookingFlow step="schedule" /></Guard>;
    case 'payment':
      return <Guard><BookingFlow step="payment" /></Guard>;
    case 'confirmed':
    case 'track':
    case 'invoice':
    case 'review':
      return <Guard><BookingRecord view={name} /></Guard>;
    case 'booking-detail':
      return <Guard><BookingRecord /></Guard>;
    case 'dashboard':
      return <Guard><BookingList dashboard /></Guard>;
    case 'bookings':
      return <Guard><BookingList /></Guard>;
    case 'provider-dashboard':
      return <Guard provider><ProviderDashboard /></Guard>;
    case 'provider-apply':
      return <Guard><ProviderProfileEditor /></Guard>;
    case 'availability':
      return <Guard><Availability /></Guard>;
    case 'messages':
      return <Guard><Messages /></Guard>;
    case 'account':
      return <Guard><Account /></Guard>;
    case 'notifications':
      return <Guard><Notifications /></Guard>;
    default:
      if (name.startsWith('admin-')) return <Guard admin><AdminWorkspace tab={name.slice(6) as AdminTab} /></Guard>;
      return <Landing />;
  }
}
export const screenDirectory = [['01', 'Landing', '/'], ['02', 'Find a professional', '/find/'], ['03', 'Provider profile', `/providers/profile/?id=${demoProviders[0].id}`], ['04', 'Booking details', '/book/'], ['05', 'Schedule', '/book/schedule/'], ['06', 'Review & payment', '/book/payment/'], ['07', 'Request confirmation', '/bookings/confirmed/'], ['08', 'Customer dashboard', '/dashboard/'], ['09', 'Provider dashboard', '/provider/'], ['10', 'Messages', '/messages/'], ['11', 'Service categories', '/services/'], ['12', 'Sign in', '/login/'], ['13', 'Create account', '/register/'], ['14', 'Verify account', '/verify/'], ['15', 'Track booking', '/bookings/track/'], ['16', 'Booking history', '/bookings/'], ['17', 'Invoice', '/bookings/invoice/'], ['18', 'Review', '/bookings/review/'], ['19', 'Account', '/account/'], ['20', 'Support', '/support/'], ['A01', 'Admin sign in', '/admin/login/'], ['A02', 'Operations dashboard', '/admin/'], ['A03', 'Providers & verification', '/admin/providers/'], ['A04', 'Customer management', '/admin/customers/'], ['A05', 'Booking management', '/admin/bookings/'], ['A06', 'Services & pricing', '/admin/services/'], ['A07', 'Commissions & payouts', '/admin/payouts/'], ['A08', 'Transactions', '/admin/transactions/'], ['A09', 'Reports & analytics', '/admin/reports/'], ['A10', 'Complaints & safety', '/admin/complaints/'], ['A11', 'Announcements', '/admin/announcements/'], ['A12', 'Settings, audit & APKs', '/admin/settings/']];
function Preview() {
  const view = useSearchParams().get('view') || 'customer';
  return <><PageHeading eyebrow="Development preview" title="A look around SerbisyoGo." description="These fictional examples help review the interface before backend setup. They do not create accounts, jobs, messages or payments." /><Notice>Live routes remain protected. To exercise persistence, configure Supabase and load the separate local demo seed.</Notice><div className="row" style={{
      margin: '24px 0'
    }}>{['customer', 'provider', 'admin'].map(v => <ButtonLink key={v} href={`/preview/?view=${v}`} secondary={view !== v}>{v[0].toUpperCase() + v.slice(1)} workspace</ButtonLink>)}</div>{view === 'admin' ? <><Stats items={[{
        label: 'Example customers',
        value: 2,
        note: 'Fictional preview only'
      }, {
        label: 'Example providers',
        value: 2,
        note: 'Fictional preview only'
      }, {
        label: 'Example bookings',
        value: 3,
        note: 'Fictional preview only'
      }, {
        label: 'Live financial totals',
        value: 'Unavailable',
        note: 'Connect Supabase for actual figures'
      }]} /><Card><h2>Operational records · illustrative</h2><DataTable rows={[{
          id: 'preview-1',
          reference: 'PREVIEW-001',
          service: 'Electrical diagnostics',
          status: 'requested'
        }, {
          id: 'preview-2',
          reference: 'PREVIEW-002',
          service: 'Plumbing inspection',
          status: 'completed'
        }]} columns={[{
          key: 'reference',
          label: 'Reference'
        }, {
          key: 'service',
          label: 'Service'
        }, {
          key: 'status',
          label: 'Status',
          render: r => <Badge>{r.status}</Badge>
        }]} /></Card></> : view === 'provider' ? <><Stats items={[{
        label: 'Example assigned requests',
        value: 1,
        note: 'Fictional preview only'
      }, {
        label: 'Example completed services',
        value: 1,
        note: 'Fictional preview only'
      }, {
        label: 'Held payout balance',
        value: 'Unavailable'
      }, {
        label: 'Account status',
        value: <Badge>pending</Badge>
      }]} /><Card><h2>Complete your professional profile</h2><p className="muted">Add your service details, availability and private verification documents before review.</p><div className="row" style={{
          marginTop: 24
        }}><ButtonLink href="/provider/apply/">Open onboarding</ButtonLink><ButtonLink href="/provider/availability/" secondary>Availability</ButtonLink></div></Card></> : <><div className="grid-3">{demoProviders.map(p => <ProviderCard key={p.id} provider={p} />)}</div><div className="cta-panel"><div><h2>A little help starts here.</h2><p>Browse services and experience the public screens. Sign in after backend setup to save your first request.</p></div><ButtonLink href="/find/">Explore services</ButtonLink></div></>}<div className="section-heading"><h2>All prototype routes</h2></div><Card><DataTable rows={screenDirectory.map(([id, screen, route]) => ({
        id,
        screen,
        route
      }))} columns={[{
        key: 'id',
        label: 'View'
      }, {
        key: 'screen',
        label: 'Screen'
      }, {
        key: 'route',
        label: 'Route'
      }]} actions={r => <Link href={r.route}>Open screen →</Link>} /></Card></>;
}
function PolicyPage({
  mode
}: {
  mode: 'terms' | 'privacy';
}) {
  return <><PageHeading title={mode === 'privacy' ? 'Privacy notice' : 'Service terms'} description="Implementation disclosure for review before launch." /><Card className="form-width"><Notice>Final operator-approved policies have not been supplied. This page describes implemented data handling and does not establish fees, guarantees, cancellation entitlements or a refund policy.</Notice><div className="stack" style={{
        marginTop: 24
      }}>{mode === 'privacy' ? <><h2>Information used by the service</h2><p className="muted">Accounts use your name, email, mobile number and saved addresses. Booking participants can access the task, service address, status and conversation needed for that job. Provider verification documents and support evidence are private to authorized participants and administrators.</p><h2>Optional location sharing</h2><p className="muted">An assigned professional can choose to share their current coordinate during an active job. No location is invented or automatically generated. Shared job locations are removed when the job completes or closes.</p><h2>Account assistance</h2><p className="muted">Use support for access, correction or deactivation requests. The operator must approve retention periods, the privacy contact and final legal wording before public launch.</p></> : <><h2>Booking requests</h2><p className="muted">Requests await provider acceptance. Estimate-based jobs require customer acceptance of a final quotation. The saved booking preserves the price and fee values applicable when it was submitted.</p><h2>Payments and concerns</h2><p className="muted">This implementation records cash or authorized manual settlement. It does not integrate a real online gateway or transfer funds. Cancellation and refund concerns require review; a request does not prove a refund.</p><h2>Operator policy approval</h2><p className="muted">The operator must supply approved service terms, fee policies, consumer disclosures and contact details before public operation.</p></>}<ButtonLink href="/support/" secondary>Contact support</ButtonLink></div></Card></>;
}
