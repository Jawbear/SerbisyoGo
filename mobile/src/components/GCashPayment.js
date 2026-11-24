import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { useApp } from '../AppContext';
import { fileRequest, supabase } from '../data/backend';
import { watchReceiptReviews } from '../data/receiptReviews';
import { money } from '../domain';
import { useAction, useData } from '../hooks';
import { useLiveRows } from '../useLiveRows';
import { colors as c } from '../theme';
import { Button, Card, Field, Icon, Muted, Notice, Query, s } from './ui';

const receiptTypes = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };
const validReference = /^[0-9]{10,20}$/;

function PaymentStatus({ title, children, icon, tone = 'neutral' }) {
  const color = { neutral: '#a8c9ff', success: c.green, warning: c.warning, error: c.error }[tone];
  return <View accessibilityLiveRegion="polite" style={[styles.status, { borderColor: color }]}>
    <Icon name={icon} color={color} />
    <View style={s.flex}>
      <Text style={[styles.statusTitle, { color }]}>{title}</Text>
      {children && <Muted>{children}</Muted>}
    </View>
  </View>;
}

function RecipientQr({ url }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Muted>QR image unavailable. Use Express Send with the number above.</Muted>;
  return <View style={styles.qrSection}>
    <Image accessibilityLabel="Verified GCash recipient QR" source={{ uri: url }} style={styles.qr} resizeMode="contain" onError={() => setFailed(true)} />
    <Muted>Scan from another screen or upload a screenshot of this QR in GCash. Check the recipient and amount before sending.</Muted>
  </View>;
}

function TransferDetails({ settings, amount }) {
  const [copyMessage, setCopyMessage] = useState('');
  const qrUrl = settings.qr_code_url?.trim();

  async function copyNumber() {
    try {
      const copied = await Clipboard.setStringAsync(settings.recipient_phone);
      setCopyMessage(copied ? 'GCash number copied.' : 'Press and hold the number to copy it.');
    } catch {
      setCopyMessage('Press and hold the number to copy it.');
    }
  }

  return <View style={styles.step}>
    <View style={styles.stepHeader}>
      <View style={styles.stepIcon}><Icon name="phone-portrait-outline" size={17} color="#a8c9ff" /></View>
      <Text accessibilityRole="header" style={styles.stepTitle}>Send in GCash</Text>
    </View>
    <View style={styles.recipient}>
      <View><Muted>Send exactly</Muted><Text style={styles.amount} selectable>{money(amount)}</Text></View>
      <View style={styles.recipientDetails}>
        <Muted>Verified recipient</Muted>
        <Text selectable style={styles.statusTitle}>{settings.recipient_name}</Text>
        <Text selectable style={styles.phone}>{settings.recipient_phone}</Text>
      </View>
      <Button title="Copy GCash number" secondary icon="copy-outline" onPress={copyNumber} />
      {copyMessage ? <Text accessibilityLiveRegion="polite" style={s.muted}>{copyMessage}</Text> : null}
    </View>
    <Muted>In GCash, tap Send, then Express Send. Enter the number above and check the recipient and amount before sending.</Muted>
    {qrUrl && /^(https:\/\/|data:image\/(png|jpe?g|webp);base64,)/i.test(qrUrl) ? <RecipientQr key={qrUrl} url={qrUrl} /> : null}
    {settings.instructions ? <Muted>{settings.instructions}</Muted> : null}
  </View>;
}

export default function GCashPayment({ booking }) {
  const { api, refresh } = useApp();
  const [reference, setReference] = useState('');
  const [asset, setAsset] = useState(null);
  const [receiptId, setReceiptId] = useState(null);
  const [showRecipient, setShowRecipient] = useState(false);
  const action = useAction();
  const picker = useAction();
  const busy = action.busy || picker.busy;
  const q = useData(`gcash-${booking.id}`, () => api.gcash(booking.id));
  useLiveRows('payments', `booking_id=eq.${booking.id}`, q.retry, Boolean(booking.id));
  const { payment, settings, submissions = [] } = q.data ?? {};
  const paymentId = payment?.id;
  const focused = useIsFocused();
  const retry = q.retry;
  useEffect(() => {
    if (focused) return watchReceiptReviews(supabase, paymentId, retry);
  }, [focused, paymentId, retry]);
  const pending = submissions.find(row => row.status === 'pending');
  const latest = submissions[0];
  const rejected = latest?.status === 'rejected';

  async function chooseReceipt() {
    const picked = await DocumentPicker.getDocumentAsync({ type: [...new Set(Object.values(receiptTypes))], copyToCacheDirectory: true });
    if (picked.canceled) return;
    const selected = picked.assets[0];
    const size = selected.file?.size ?? selected.size;
    const extension = /\.(jpg|jpeg|png|webp|pdf)$/i.exec(selected.name)?.[1].toLowerCase();
    const type = receiptTypes[extension];
    if (!type) throw new Error('Choose a JPG, PNG, WebP or PDF receipt.');
    if (size != null && (size <= 0 || size > 10485760)) throw new Error('Choose a receipt between 1 byte and 10 MB.');
    if (Platform.OS === 'web' && !selected.file) throw new Error('Choose the receipt again to attach it.');
    setAsset({ ...selected, mimeType: type });
    setReceiptId(null);
  }

  async function submitReceipt() {
    let id = receiptId;
    if (!id) {
      const form = new FormData();
      form.append('kind', 'payment');
      form.append('booking_id', booking.id);
      form.append('file', Platform.OS === 'web' ? asset.file : { uri: asset.uri, name: asset.name, type: asset.mimeType });
      id = (await fileRequest(form)).id;
      setReceiptId(id);
    }
    await api.submitReceipt(booking.id, reference, id, payment.amount_centavos, settings.recipient_phone);
    setReceiptId(null);
    setAsset(null);
    setReference('');
    setShowRecipient(false);
    refresh();
  }

  function paymentContent() {
    if (payment?.status === 'paid') {
      return <PaymentStatus title="Paid" icon="checkmark-circle-outline" tone="success">An administrator recorded settlement of this booking.</PaymentStatus>;
    }
    if (payment?.status === 'refunded') {
      return <PaymentStatus title="Refunded" icon="return-up-back-outline" tone="success">Refund recorded.</PaymentStatus>;
    }
    if (pending && payment?.status === 'pending') {
      return <PaymentStatus title="Awaiting verification" icon="time-outline" tone="warning">Your receipt is under review. Please wait before sending any further payment.</PaymentStatus>;
    }
    if (['cancelled', 'declined'].includes(booking.status)) {
      return <PaymentStatus title="Payment closed" icon="lock-closed-outline">GCash payment is closed for this booking.</PaymentStatus>;
    }
    if (booking.status !== 'completed') {
      return <PaymentStatus title="Pay after service" icon="lock-closed-outline">Check your settlement instructions after the provider completes the service.</PaymentStatus>;
    }
    if (!payment || payment.status !== 'pending') {
      return <PaymentStatus title="Payment unavailable" icon="alert-circle-outline" tone="error">Contact support with your booking reference.</PaymentStatus>;
    }
    if (payment.amount_centavos === 0) {
      return <PaymentStatus title="No payment due" icon="checkmark-circle-outline" tone="success">The balance for this booking is zero.</PaymentStatus>;
    }
    if (!settings?.enabled || !settings.recipient_verified_at) {
      return <PaymentStatus title="GCash unavailable" icon="information-circle-outline">GCash is not enabled. Contact support for payment instructions.</PaymentStatus>;
    }
    return <>
      {rejected && <PaymentStatus title="Receipt needs updating" icon="alert-circle-outline" tone="error">Check your GCash transaction history before sending another payment. If you already paid, attach a corrected receipt.</PaymentStatus>}
      {rejected && <Button title={showRecipient ? 'Hide transfer details' : 'View transfer details'} secondary icon="phone-portrait-outline" onPress={() => setShowRecipient(value => !value)} />}
      {(!rejected || showRecipient) && <TransferDetails key={settings.recipient_phone} amount={payment.amount_centavos} settings={settings} />}
      <View style={styles.step}>
        <View style={styles.stepHeader}>
          <View style={styles.stepIcon}><Icon name="receipt-outline" size={17} color="#a8c9ff" /></View>
          <Text accessibilityRole="header" style={styles.stepTitle}>{rejected ? 'Submit a corrected receipt' : 'Submit your receipt'}</Text>
        </View>
        <Muted>Find the reference number on your GCash receipt. An administrator checks the transfer after you submit.</Muted>
        <Field label="GCash transaction reference" value={reference} onChangeText={value => setReference(value.replace(/[\s-]/g, ''))} keyboardType="number-pad" placeholder="Enter 10–20 digits" editable={!busy} />
        <Button title={asset ? 'Change GCash receipt' : 'Choose GCash receipt'} secondary icon="attach-outline" busy={picker.busy} disabled={action.busy} onPress={() => picker.run(chooseReceipt)} />
        {asset ? <View style={styles.file}><Icon name="document-attach-outline" size={17} /><Text style={[s.fieldLabel, s.flex]}>{asset.name}</Text></View> : <Muted>JPG, PNG, WebP or PDF · Up to 10 MB</Muted>}
        {picker.error ? <Notice error>{picker.error}</Notice> : null}
        {action.error ? <Notice error>{action.error}</Notice> : null}
        <Button title="Submit GCash receipt" icon="arrow-forward-outline" busy={action.busy} disabled={picker.busy || !asset || !validReference.test(reference)} onPress={() => action.run(submitReceipt)} />
      </View>
    </>;
  }

  return <Card style={[s.stack, styles.card]}>
    <View style={styles.heading}>
      <View style={styles.walletIcon}><Icon name="wallet-outline" size={23} color="#d3e5ff" /></View>
      <Text accessibilityRole="header" style={s.sectionTitle}>Pay with GCash</Text>
    </View>
    <Query query={{ ...q, loading: q.loading && !q.data }}>
      {q.data && <>
        {paymentContent()}
        {submissions.length > 0 && <View style={styles.history}>
          <Text accessibilityRole="header" style={s.fieldLabel}>Receipt history</Text>
          {submissions.map(row => <View key={row.id} style={styles.historyEntry}>
            <View style={s.between}>
              <Text selectable style={s.fieldLabel}>{row.reference}</Text>
              <Text style={[styles.historyStatus, row.status === 'rejected' && { color: c.error }]}>{row.status === 'pending' ? 'Under review' : row.status === 'approved' ? 'Verified' : 'Needs correction'}</Text>
            </View>
            {row.reason ? <Muted>{row.reason}</Muted> : null}
          </View>)}
        </View>}
        {booking.status === 'completed' && <Button title="Refresh payment status" secondary icon="refresh-outline" onPress={q.retry} disabled={busy} />}
      </>}
    </Query>
  </Card>;
}

const styles = StyleSheet.create({
  card: { padding: 16 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  walletIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#203b65', alignItems: 'center', justifyContent: 'center' },
  status: { flexDirection: 'row', gap: 10, padding: 13, borderWidth: 1, borderRadius: 12, backgroundColor: c.input },
  statusTitle: { color: c.text, fontSize: 14, fontWeight: '700', lineHeight: 21 },
  step: { gap: 14, padding: 14, borderRadius: 15, backgroundColor: c.input, borderColor: c.border, borderWidth: 1 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  stepIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1b2e49' },
  stepTitle: { color: c.text, fontSize: 16, lineHeight: 22, fontWeight: '700', flex: 1 },
  recipient: { gap: 10, padding: 12, backgroundColor: '#142238', borderColor: '#36557d', borderWidth: 1, borderRadius: 12 },
  amount: { color: '#e7f1ff', fontSize: 31, fontWeight: '800', letterSpacing: -0.8 },
  recipientDetails: { borderTopWidth: 1, borderTopColor: '#36557d', paddingTop: 10, gap: 2 },
  phone: { color: '#d3e5ff', fontWeight: '700', fontSize: 16, letterSpacing: 0.6 },
  qrSection: { gap: 10 },
  qr: { height: 164, width: 164, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 8 },
  file: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  history: { gap: 9 },
  historyEntry: { gap: 5, padding: 10, borderRadius: 10, backgroundColor: c.input },
  historyStatus: { color: c.muted, fontSize: 12, fontWeight: '600' }
});
