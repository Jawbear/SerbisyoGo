'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/session';
import { Badge, ButtonLink, Card, DataTable, Empty, Field, Guard, MutationForm, Notice, PageHeading, QueryState, Select, Textarea, useQuery } from '@/components/ui';
import { rpc } from '@/lib/backend';
import { list, one } from '@/lib/data';
import { caseSchema } from '@/lib/schemas';
import { manilaDate } from '@/lib/domain';
import { FileList, UploadForm } from './files';
import { backendConfigured } from '@/lib/config';
export function Support() {
  const contact = useQuery('public-support-contact', () => rpc<{
    support_email: string | null;
  }>('public_settings'), backendConfigured);
  return <><PageHeading eyebrow="We’re here to help" title="What can we help you with?" description="Find answers or send a concern linked to your booking." /><div className="grid-2"><Card><h2>Common questions</h2>{contact.data?.support_email && <p className="small muted" style={{
          marginBottom: 16
        }}>Account access issue? <a href={`mailto:${contact.data.support_email}`}>Contact support by email</a>.</p>}{[['How do I change a booking?', 'Open the booking and contact your provider to arrange a change. You may cancel an eligible request with a recorded reason and create a new one.'], ['How are service fees confirmed?', 'Review the current listed rate and configured fee. Quotation-based work requires your acceptance of the provider’s final labor quotation before confirmation.'], ['Where do I find past repairs?', 'My bookings includes your saved service records. Completed jobs have a persisted invoice and an eligible review form.'], ['How do payments work?', 'This website currently supports cash and authorized manual settlement records. Online payment gateways are not configured. A booking request does not charge you.'], ['Where is the Android app?', 'Visit Download Android App for the latest published APK. Until an official package is supplied, the website stays available.']].map(([question, answer]) => <details key={question} className="faq"><summary>{question}</summary><p>{answer}</p></details>)}</Card><div className="stack"><Guard><SupportForm /></Guard></div></div></>;
}
function SupportForm() {
  const params = useSearchParams();
  const router = useRouter();
  const s = useSession();
  const selected = params.get('case');
  const q = useQuery('support-' + s.user?.id + '-' + selected, async () => ({
    cases: await list('support_cases', {
      owner_id: s.user!.id
    }),
    bookings: await list<{
      id: string;
      reference: string;
      service_title: string;
    }>('bookings')
  }), !!s.user);
  return <QueryState {...q}>{selected ? <CaseDetail id={selected} /> : <><Card><h2>Send a concern</h2><MutationForm submit="Submit support case" success="Support case created." onSubmit={async f => {
          const data = caseSchema.parse({
            booking_id: String(f.get('booking')) || null,
            subject: f.get('subject'),
            body: f.get('body')
          });
          const id = await rpc<string>('open_case', {
            p_booking: data.booking_id,
            p_subject: data.subject,
            p_body: data.body
          });
          router.push(`/support/?case=${id}`);
        }}><Select label="Related booking (optional)" name="booking" defaultValue={params.get('booking') || ''}><option value="">Account or general concern</option>{q.data?.bookings.map(b => <option key={b.id} value={b.id}>{b.reference} · {b.service_title}</option>)}</Select><Field label="Subject" name="subject" required minLength={5} maxLength={160} /><Textarea label="Tell us what happened" name="body" required minLength={10} maxLength={5000} /><Notice>Replies appear in this support case. Evidence can be attached after the case is created. Internal administrative notes are never shown in your case thread.</Notice></MutationForm></Card><Card><h2>Your support cases</h2><DataTable rows={q.data?.cases || []} columns={[{
          key: 'subject',
          label: 'Concern'
        }, {
          key: 'status',
          label: 'Status',
          render: r => <Badge>{String(r.status)}</Badge>
        }]} actions={r => <Link href={`/support/?case=${r.id}`}>View case →</Link>} /></Card></>}</QueryState>;
}
export function CaseDetail({
  id,
  admin = false
}: {
  id: string;
  admin?: boolean;
}) {
  const q = useQuery('case-detail-' + id + '-' + admin, async () => ({
    case: await one<Record<string, unknown>>('support_cases', id),
    messages: await list('case_messages', {
      case_id: id
    }),
    notes: admin ? await list('case_notes', {
      case_id: id
    }) : []
  }));
  return <QueryState {...q}>{q.data?.case ? <div className="stack"><Card><div className="row between" style={{
          marginBottom: 20
        }}><h2>{String(q.data.case.subject)}</h2><Badge>{String(q.data.case.status)}</Badge></div><p style={{
          whiteSpace: 'pre-wrap'
        }}>{String(q.data.case.body)}</p><p className="small muted" style={{
          marginTop: 20
        }}>Opened {manilaDate(String(q.data.case.created_at))}</p>{q.data.case.resolution ? <Notice>Resolution: {String(q.data.case.resolution)}</Notice> : null}{q.data.case.booking_id ? <Link className="small" href={`/bookings/detail/?id=${q.data.case.booking_id}`}>Related booking →</Link> : null}</Card><Card><h2>Customer-visible conversation</h2><div className="case-thread">{q.data.messages.slice().reverse().map(m => <div key={String(m.id)}><p>{String(m.body)}</p><p className="small muted">{manilaDate(String(m.created_at))}</p></div>)}</div><MutationForm submit="Send case reply" onSubmit={async f => {
          await rpc('case_reply', {
            p_case: id,
            p_body: String(f.get('body'))
          });
        }}><Textarea label="Reply visible to the case owner" name="body" minLength={1} maxLength={5000} required /></MutationForm></Card><Card><h2>Private supporting evidence</h2><FileList caseId={id} /><UploadForm kind="support" caseId={id} /></Card>{admin && <Card><h2>Internal notes · admins only</h2><div className="case-thread">{q.data.notes.slice().reverse().map(n => <div className="internal-note" key={String(n.id)}><p>{String(n.body)}</p><p className="small muted">{manilaDate(String(n.created_at))}</p></div>)}</div><MutationForm submit="Add private note" onSubmit={async f => {
          await rpc('admin_action', {
            p_entity: 'case',
            p_id: id,
            p_action: 'note',
            p_data: {
              body: f.get('body')
            }
          });
        }}><Textarea label="Internal administrative note" name="body" required maxLength={5000} /></MutationForm></Card>}</div> : <Empty title="Support case not found" action={<ButtonLink href="/support/">Support home</ButtonLink>} />}</QueryState>;
}
