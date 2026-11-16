'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { ActionButton, Badge, Card, Field, MutationForm, Notice, QueryState, Textarea, useQuery } from '@/components/ui';
import { edge, rpc } from '@/lib/backend';
import { list } from '@/lib/data';
import { money, validateUpload } from '@/lib/domain';
import { useSession } from '@/components/session';

type Settings = { recipient_name: string; recipient_phone: string; instructions: string; enabled: boolean; qr_code_url?: string | null; recipient_verified_at?: string | null; updated_at: string };
type Submission = { id: string; receipt_id: string; reference: string; amount_centavos: number; recipient_name: string; recipient_phone: string; status: string; reason: string | null };

export function GCashSettings() {
  const q = useQuery('gcash-settings-admin', async () => (await list<Settings>('gcash_settings'))[0] || null);
  const [previewQr, setPreviewQr] = useState<string>('');

  useEffect(() => {
    if (q.data?.recipient_phone) {
      if (q.data.qr_code_url) {
        const url = q.data.qr_code_url;
        queueMicrotask(() => setPreviewQr(url));
      } else {
        const payload = `https://get.gcash.com/pay?phone=${q.data.recipient_phone}&name=${encodeURIComponent(q.data.recipient_name)}`;
        QRCode.toDataURL(payload, { width: 220, margin: 2, color: { dark: '#005ce6', light: '#ffffff' } })
          .then(setPreviewQr)
          .catch(() => {});
      }
    }
  }, [q.data]);

  return <Card>
    <h2>GCash payments & QR</h2>
    <p className="small muted">Customers pay your GCash wallet via Scan QR or Express Send after service completion. Verify transfers in your GCash app before approving receipts.</p>
    <QueryState {...q}>
      <MutationForm key={q.data?.updated_at || 'new'} submit="Save GCash recipient" success="GCash settings saved." onSubmit={async f => {
        await rpc('save_gcash_settings', {
          p_name: f.get('name'),
          p_phone: f.get('phone'),
          p_instructions: f.get('instructions'),
          p_enabled: f.get('enabled') === 'on',
          p_qr_url: f.get('qr_code_url') || null,
          p_recipient_verified: f.get('recipient_verified') === 'on'
        });
      }}>
        <Field label="GCash recipient name" name="name" required minLength={2} maxLength={100} defaultValue={q.data?.recipient_name || ''} />
        <Field label="GCash mobile number" name="phone" type="tel" pattern="09[0-9]{9}" placeholder="09xxxxxxxxx" required defaultValue={q.data?.recipient_phone || ''} />
        <Field label="Custom GCash QR image URL (optional)" name="qr_code_url" placeholder="https://... or data URL (leave blank to auto-generate)" defaultValue={q.data?.qr_code_url || ''} />
        <Textarea label="Payment instructions" name="instructions" maxLength={1000} defaultValue={q.data?.instructions || ''} />
        <Notice>{q.data?.recipient_verified_at ? 'Recipient verification is recorded. Changing the recipient name, number or QR requires verification again.' : 'Payments remain disabled until an administrator verifies the recipient in GCash.'}</Notice>
        <label className="check-field"><input name="recipient_verified" type="checkbox" /><span>I checked the recipient name and mobile number in GCash and tested any supplied QR.</span></label>
        <label className="check-field"><input name="enabled" type="checkbox" defaultChecked={q.data?.enabled ?? false} /><span>Enable GCash payments</span></label>
      </MutationForm>

      {previewQr && (
        <div style={{ marginTop: '20px', padding: '16px', background: '#0e1713', border: '1px solid #1f3323', borderRadius: '12px', textAlign: 'center' }}>
          <p className="eyebrow" style={{ color: '#27ae60', marginBottom: '8px' }}>GCash Scannable QR Code Preview</p>
          <Image unoptimized width={160} height={160} src={previewQr} alt="GCash QR Preview" style={{ width: 160, height: 160, borderRadius: 8, margin: '0 auto', display: 'block', background: '#ffffff', padding: '6px' }} />
          <p className="small muted" style={{ marginTop: '8px' }}>{q.data?.recipient_name} · {q.data?.recipient_phone}</p>
        </div>
      )}
    </QueryState>
  </Card>;
}

export function GCashPayment({ bookingId, completed }: { bookingId: string; completed: boolean }) {
  const { refresh } = useSession();
  const [receipt, setReceipt] = useState<{ id: string; file: File } | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const q = useQuery('gcash-payment-' + bookingId, async () => {
    const [settings, payments] = await Promise.all([
      list<Settings>('gcash_settings'),
      list<{ id: string; amount_centavos: number; status: string; method: string }>('payments', { booking_id: bookingId })
    ]);
    const payment = payments[0];
    if (!payment) throw new Error('Payment record unavailable. Contact support.');
    return { settings: settings[0] || null, payment, submissions: await list<Submission>('gcash_submissions', { payment_id: payment.id }) };
  });

  const data = q.data;
  const pending = data?.submissions.some(s => s.status === 'pending');

  useEffect(() => {
    if (data?.settings?.enabled && data.settings.recipient_verified_at && data.settings.recipient_phone) {
      if (data.settings.qr_code_url) {
        const url = data.settings.qr_code_url;
        queueMicrotask(() => setQrCodeUrl(url));
      } else {
        const payload = `https://get.gcash.com/pay?phone=${data.settings.recipient_phone}&amount=${((data.payment?.amount_centavos || 0) / 100).toFixed(2)}`;
        QRCode.toDataURL(payload, { width: 220, margin: 2, color: { dark: '#005ce6', light: '#ffffff' } })
          .then(setQrCodeUrl)
          .catch(() => {});
      }
    }
  }, [data?.settings, data?.payment]);

  const copyNumber = async () => {
    if (!data?.settings?.recipient_phone) return;
    try {
      await navigator.clipboard.writeText(data.settings.recipient_phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return <Card>
    <h2>Pay with GCash</h2>
    <QueryState {...q}>
      {data && <div className="stack">
        <Badge>{data.payment?.status || 'pending'}</Badge>
        {data.payment?.status === 'paid' ? (
          <Notice>Payment received and verified by the administrator.</Notice>
        ) : data.payment?.status === 'refunded' ? (
          <Notice>Refund recorded.</Notice>
        ) : !completed ? (
          <Notice>GCash payment opens after the provider completes your service. Do not send payment yet.</Notice>
        ) : !data.settings?.enabled || !data.settings.recipient_verified_at ? (
          <Notice>GCash is not enabled. Contact support for payment instructions.</Notice>
        ) : (
          <>
            {/* Scannable GCash QR Display */}
            <div style={{
              background: '#0c1712',
              border: '1px solid #1f3323',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              textAlign: 'center'
            }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#005ce6', color: '#fff', padding: '4px 14px', borderRadius: '16px', fontSize: '11px', fontWeight: 700 }}>
                <span>GCash Scan to Pay</span>
              </div>

              {qrCodeUrl ? (
                <div style={{ background: '#ffffff', padding: '8px', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                  <Image unoptimized width={180} height={180} src={qrCodeUrl} alt="GCash Scannable QR Code" style={{ width: '180px', height: '180px', display: 'block', borderRadius: '6px' }} />
                </div>
              ) : (
                <div style={{ width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1b2a1e', borderRadius: '8px' }}>
                  <span className="small muted">Generating QR...</span>
                </div>
              )}

              <p className="small" style={{ color: '#d0ead2', margin: '4px 0 0 0' }}>
                Open GCash app & tap <strong>Scan</strong> or send to the number below.
              </p>

              <dl className="definition-list" style={{ width: '100%', marginTop: '8px', textAlign: 'left' }}>
                <div><dt>Send exactly</dt><dd style={{ color: '#27ae60', fontWeight: 700 }}>{money(data.payment?.amount_centavos || 0)}</dd></div>
                <div><dt>Recipient</dt><dd>{data.settings.recipient_name}</dd></div>
                <div><dt>GCash number</dt><dd>
                  <span style={{ fontFamily: 'monospace', marginRight: '8px' }}>{data.settings.recipient_phone}</span>
                  <button type="button" onClick={copyNumber} style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    border: '1px solid #304438',
                    borderRadius: '6px',
                    background: copied ? '#27ae60' : '#152019',
                    color: copied ? '#fff' : '#88d49e',
                    cursor: 'pointer'
                  }}>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </dd></div>
              </dl>
            </div>

            {data.settings.instructions && <p style={{ whiteSpace: 'pre-wrap' }}>{data.settings.instructions}</p>}

            <Notice>
              Send through your GCash app and check the recipient first. Submit the transaction reference and receipt below.
              Payment stays pending until the administrator verifies the transfer. Do not pay again while your receipt is under review.
            </Notice>

            {!pending && (
              <MutationForm submit="Submit GCash receipt" success="Receipt submitted. Awaiting administrator verification." onSubmit={async f => {
                const file = f.get('file');
                if (!(file instanceof File) || !file.size) throw new Error('Choose your GCash receipt.');
                validateUpload('payment', file.size, file.type, file.name);
                let id = receipt?.file === file ? receipt.id : '';
                if (!id) {
                  const body = new FormData();
                  body.set('kind', 'payment');
                  body.set('booking_id', bookingId);
                  body.set('file', file);
                  id = (await edge<{ id: string }>('files', body)).id;
                  setReceipt({ id, file });
                }
                await rpc('submit_gcash_receipt', {
                  p_booking: bookingId,
                  p_reference: f.get('reference'),
                  p_receipt: id,
                  p_expected_amount: data.payment.amount_centavos,
                  p_recipient_phone: data.settings!.recipient_phone
                });
              }}>
                <Field label="GCash transaction reference" name="reference" inputMode="numeric" pattern="[0-9]{10,20}" minLength={10} maxLength={20} placeholder="e.g. 1234567890123" required />
                <Field label="GCash receipt (JPG, PNG, WebP or PDF; up to 10 MB)" name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required onChange={() => setReceipt(null)} />
              </MutationForm>
            )}
          </>
        )}

        {data.submissions.map(s => (
          <div className="faq" key={s.id}>
            <Badge>{s.status === 'pending' ? 'Awaiting verification' : s.status}</Badge>
            <p className="small">Reference: {s.reference}</p>
            {s.reason && <p>{s.reason}</p>}
          </div>
        ))}
        <ActionButton secondary action={async () => { refresh(); }}>Refresh payment status</ActionButton>
      </div>}
    </QueryState>
  </Card>;
}

export function GCashReview({ paymentId }: { paymentId: string }) {
  const q = useQuery('gcash-review-' + paymentId, () => list<Submission>('gcash_submissions', { payment_id: paymentId }));
  return <QueryState {...q}>
    {q.data?.map(s => (
      <Card key={s.id}>
        <h3>GCash receipt</h3>
        <Badge>{s.status}</Badge>
        <dl className="definition-list">
          <div><dt>Reference</dt><dd>{s.reference}</dd></div>
          <div><dt>Amount</dt><dd>{money(s.amount_centavos)}</dd></div>
          <div><dt>Sent to</dt><dd>{s.recipient_name} · {s.recipient_phone}</dd></div>
        </dl>
        <ActionButton secondary action={async () => {
          const { url } = await edge<{ url: string }>('files', undefined, `?id=${s.receipt_id}`);
          window.location.assign(url);
        }}>Open GCash receipt</ActionButton>
        {s.reason && <p>{s.reason}</p>}
        {s.status === 'pending' && (
          <MutationForm submit="Record GCash review" success="Receipt review recorded." onSubmit={async f => {
            const approve = f.get('approve') === 'on';
            if (!window.confirm(approve ? 'Have you independently verified this exact reference, recipient and amount in your GCash transaction history?' : 'Reject this receipt and allow the customer to submit a corrected receipt?')) return false;
            await rpc('review_gcash_receipt', { p_submission: s.id, p_approve: approve, p_reason: f.get('reason') });
          }}>
            <Textarea label="Wallet verification or rejection details" name="reason" required minLength={10} maxLength={2000} />
            <label className="check-field">
              <input name="approve" type="checkbox" />
              <span>I verified the transfer in my GCash wallet. Mark payment paid. Leave unchecked to reject.</span>
            </label>
          </MutationForm>
        )}
      </Card>
    ))}
  </QueryState>;
}
