import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useApp } from '../AppContext';
import { fileRequest } from '../data/backend';
import { useAction, useData } from '../hooks';
import { money } from '../domain';
import { Badge, Button, Card, Field, Muted, Notice, Query, s } from './ui';

export default function GCashPayment({ booking }) {
  const { api, refresh } = useApp(); const [reference, setReference] = useState('');
  const [asset, setAsset] = useState(null); const [receiptId, setReceiptId] = useState(null); const action = useAction();
  const q = useData(`gcash-${booking.id}`, () => api.gcash(booking.id)); const data = q.data;
  const pending = data?.submissions.some(row => row.status === 'pending');
  return <Card style={s.stack}><Text style={s.sectionTitle}>Pay with GCash</Text><Query query={q}>{data && <>
    <Badge>{data.payment?.status || 'pending'}</Badge>
    {data.payment?.status === 'paid' ? <Notice>Payment received and verified by the administrator.</Notice> : data.payment?.status === 'refunded' ? <Notice>Refund recorded.</Notice> : booking.status !== 'completed' ? <Notice>Pay after the provider completes your service. Do not send payment yet.</Notice> : !data.settings?.enabled ? <Notice>GCash is not enabled. Contact support for payment instructions.</Notice> : <>
      <View style={s.stack}><Muted>Send exactly {money(data.payment?.amount_centavos || 0)}</Muted><Text selectable style={s.fieldLabel}>{data.settings.recipient_name}</Text><Text selectable style={s.fieldLabel}>{data.settings.recipient_phone}</Text>{Boolean(data.settings.instructions) && <Muted>{data.settings.instructions}</Muted>}</View>
      <Notice>Send through your GCash app. Check the recipient, then submit the reference and receipt here. Payment stays pending until the administrator verifies it. Do not pay again while awaiting review.</Notice>
      {!pending && <>
        <Field label="GCash transaction reference" value={reference} onChangeText={setReference} keyboardType="numeric" maxLength={20} />
        <Button title={asset ? 'Change GCash receipt' : 'Choose GCash receipt'} secondary busy={action.busy} onPress={() => action.run(async () => {
          const picked = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], copyToCacheDirectory: true });
          if (picked.canceled) return;
          const selected = picked.assets[0];
          if (!selected.size || selected.size > 10485760) throw new Error('Choose a receipt up to 10 MB.');
          setAsset(selected); setReceiptId(null);
        })} />
        {asset && <Muted>{asset.name}</Muted>}
        <Button title="Submit GCash receipt" busy={action.busy} disabled={!asset} onPress={() => action.run(async () => {
          if (!/^\d{10,20}$/.test(reference.trim())) throw new Error('Enter the 10–20 digit GCash transaction reference.');
          let id = receiptId;
          if (!id) {
            const form = new FormData(); form.append('kind', 'payment'); form.append('booking_id', booking.id);
            form.append('file', Platform.OS === 'web' ? asset.file : { uri: asset.uri, name: asset.name, type: asset.mimeType || 'image/jpeg' });
            id = (await fileRequest(form)).id; setReceiptId(id);
          }
          await api.submitReceipt(booking.id, reference, id, data.payment.amount_centavos, data.settings.recipient_phone);
          refresh();
        })} />
      </>}
    </>}
    {data.submissions.map(row => <View key={row.id} style={s.stack}><Badge>{row.status === 'pending' ? 'Awaiting verification' : row.status}</Badge><Muted>Reference: {row.reference}</Muted>{Boolean(row.reason) && <Muted>{row.reason}</Muted>}</View>)}
    <Button title="Refresh payment status" secondary onPress={q.retry} />
  </>}</Query>{action.error && <Notice error>{action.error}</Notice>}</Card>;
}
