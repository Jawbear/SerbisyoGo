'use client';

import { useState } from 'react';
import { ActionButton, Badge, Card, Field, MutationForm, Notice, QueryState, Textarea, useQuery } from '@/components/ui';
import { edge, rpc } from '@/lib/backend';
import { list } from '@/lib/data';
import { money, validateUpload } from '@/lib/domain';
import { useSession } from '@/components/session';

type Settings = { recipient_name: string; recipient_phone: string; instructions: string; enabled: boolean; updated_at: string };
type Submission = { id: string; receipt_id: string; reference: string; amount_centavos: number; recipient_name: string; recipient_phone: string; status: string; reason: string | null };

export function GCashSettings() {
  const q = useQuery('gcash-settings-admin', async () => (await list<Settings>('gcash_settings'))[0] || null);
  return <Card><h2>GCash test payments</h2><p className="small muted">Customers pay your personal wallet after service completion. Verify transfers in your GCash account before approving receipts.</p><QueryState {...q}>
    <MutationForm key={q.data?.updated_at || 'new'} submit="Save GCash recipient" success="GCash settings saved." onSubmit={async f => {
      await rpc('save_gcash_settings', { p_name: f.get('name'), p_phone: f.get('phone'), p_instructions: f.get('instructions'), p_enabled: f.get('enabled') === 'on' });
    }}>
      <Field label="GCash recipient name" name="name" required minLength={2} maxLength={100} defaultValue={q.data?.recipient_name || ''} />
      <Field label="GCash mobile number" name="phone" type="tel" pattern="09[0-9]{9}" placeholder="09xxxxxxxxx" required defaultValue={q.data?.recipient_phone || ''} />
      <Textarea label="Payment instructions" name="instructions" maxLength={1000} defaultValue={q.data?.instructions || ''} />
      <label className="check-field"><input name="enabled" type="checkbox" defaultChecked={q.data?.enabled || false} /><span>Enable manual GCash test payments</span></label>
    </MutationForm>
  </QueryState></Card>;
}

export function GCashPayment({ bookingId, completed }: { bookingId: string; completed: boolean }) {
  const { refresh } = useSession();
  const [receipt, setReceipt] = useState<{ id: string; file: File } | null>(null);
  const q = useQuery('gcash-payment-' + bookingId, async () => {
    const [settings, payments] = await Promise.all([
      list<Settings>('gcash_settings'), list<{ id: string; amount_centavos: number; status: string; method: string }>('payments', { booking_id: bookingId })
    ]);
    const payment = payments[0];
    if (!payment) throw new Error('Payment record unavailable. Contact support.');
    return { settings: settings[0] || null, payment, submissions: await list<Submission>('gcash_submissions', { payment_id: payment.id }) };
  });
  const data = q.data; const pending = data?.submissions.some(s => s.status === 'pending');
  return <Card><h2>Pay with GCash</h2><QueryState {...q}>{data && <div className="stack">
    <Badge>{data.payment?.status || 'pending'}</Badge>
    {data.payment?.status === 'paid' ? <Notice>Payment received and verified by the administrator.</Notice> : data.payment?.status === 'refunded' ? <Notice>Refund recorded.</Notice> : !completed ? <Notice>GCash payment opens after the provider completes your service. Do not send payment yet.</Notice> : !data.settings?.enabled ? <Notice>GCash is not enabled. Contact support for payment instructions.</Notice> : <>
      <dl className="definition-list"><div><dt>Send exactly</dt><dd>{money(data.payment?.amount_centavos || 0)}</dd></div><div><dt>Recipient</dt><dd>{data.settings.recipient_name}</dd></div><div><dt>GCash number</dt><dd>{data.settings.recipient_phone}</dd></div></dl>
      {data.settings.instructions && <p style={{ whiteSpace: 'pre-wrap' }}>{data.settings.instructions}</p>}
      <Notice>Send through your GCash app and check the recipient first. Submit the transaction reference and receipt below. Payment stays pending until the administrator verifies the transfer. Do not pay again while your receipt is under review.</Notice>
      {!pending && <MutationForm submit="Submit GCash receipt" success="Receipt submitted. Awaiting administrator verification." onSubmit={async f => {
        const file = f.get('file');
        if (!(file instanceof File) || !file.size) throw new Error('Choose your GCash receipt.');
        validateUpload('payment', file.size, file.type, file.name);
        let id = receipt?.file === file ? receipt.id : '';
        if (!id) {
          const body = new FormData(); body.set('kind', 'payment'); body.set('booking_id', bookingId); body.set('file', file);
          id = (await edge<{ id: string }>('files', body)).id; setReceipt({ id, file });
        }
        await rpc('submit_gcash_receipt', { p_booking: bookingId, p_reference: f.get('reference'), p_receipt: id, p_expected_amount: data.payment.amount_centavos, p_recipient_phone: data.settings!.recipient_phone });
      }}>
        <Field label="GCash transaction reference" name="reference" inputMode="numeric" pattern="[0-9]{10,20}" minLength={10} maxLength={20} required />
        <Field label="GCash receipt (JPG, PNG, WebP or PDF; up to 10 MB)" name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required onChange={() => setReceipt(null)} />
      </MutationForm>}
    </>}
    {data.submissions.map(s => <div className="faq" key={s.id}><Badge>{s.status === 'pending' ? 'Awaiting verification' : s.status}</Badge><p className="small">Reference: {s.reference}</p>{s.reason && <p>{s.reason}</p>}</div>)}
    <ActionButton secondary action={async () => { refresh(); }}>Refresh payment status</ActionButton>
  </div>}</QueryState></Card>;
}

export function GCashReview({ paymentId }: { paymentId: string }) {
  const q = useQuery('gcash-review-' + paymentId, () => list<Submission>('gcash_submissions', { payment_id: paymentId }));
  return <QueryState {...q}>{q.data?.map(s => <Card key={s.id}><h3>GCash receipt</h3><Badge>{s.status}</Badge><dl className="definition-list"><div><dt>Reference</dt><dd>{s.reference}</dd></div><div><dt>Amount</dt><dd>{money(s.amount_centavos)}</dd></div><div><dt>Sent to</dt><dd>{s.recipient_name} · {s.recipient_phone}</dd></div></dl>
    <ActionButton secondary action={async () => { const { url } = await edge<{ url: string }>('files', undefined, `?id=${s.receipt_id}`); window.location.assign(url); }}>Open GCash receipt</ActionButton>
    {s.reason && <p>{s.reason}</p>}
    {s.status === 'pending' && <MutationForm submit="Record GCash review" success="Receipt review recorded." onSubmit={async f => {
      const approve = f.get('approve') === 'on';
      if (!window.confirm(approve ? 'Have you independently verified this exact reference, recipient and amount in your GCash transaction history?' : 'Reject this receipt and allow the customer to submit a corrected receipt?')) return false;
      await rpc('review_gcash_receipt', { p_submission: s.id, p_approve: approve, p_reason: f.get('reason') });
    }}><Textarea label="Wallet verification or rejection details" name="reason" required minLength={10} maxLength={2000} /><label className="check-field"><input name="approve" type="checkbox" /><span>I verified the transfer in my GCash wallet. Mark payment paid. Leave unchecked to reject.</span></label></MutationForm>}
  </Card>)}</QueryState>;
}
