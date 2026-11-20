import { useState } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../AppContext';
import { useAction, useData } from '../hooks';
import { appointment, money } from '../domain';
import { colors as c, statusLabels } from '../theme';
import { Button, Card, Chip, Empty, Field, Icon, Label, Muted, Notice, Query, Screen, StatusBadge, Title, s } from '../components/ui';
import LoginPrompt from '../components/LoginPrompt';
import GCashPayment from '../components/GCashPayment';
import BookingActions from '../components/BookingActions';
import { useLiveRows } from '../useLiveRows';

export default function BookingRecordScreen({ navigation, route }) {
  const { api, identity } = useApp();
  const bookingId = route.params?.bookingId;
  const allowed = Boolean(identity);
  const query = useData(`booking-${bookingId}`, () => api.booking(bookingId), allowed);
  const booking = query.data;
  useLiveRows('bookings', `id=eq.${bookingId}`, query.retry, Boolean(identity && bookingId));
  const canPay = identity?.role === 'customer' && identity.user.id === booking?.customer_id;
  return <Screen>{!allowed ? <LoginPrompt navigation={navigation} returnTo="BookingRecord" routeParams={{ bookingId }} /> : <Query query={{ ...query, loading: query.loading && !booking }}>{booking ? <>
    <View style={s.stack}><Label>{booking.reference}</Label><Title>{booking.service_title}</Title><StatusBadge status={booking.status} />{booking.provider_name && <Muted>With {booking.provider_name}</Muted>}
      {query.loading && <Muted>Checking the latest booking status…</Muted>}
    </View>
    {canPay && booking.status === 'completed' && <GCashPayment key={booking.id} booking={booking} />}
    <Card style={s.stack}><Text style={s.sectionTitle}>Your appointment</Text><View style={s.row}><Icon name="calendar-outline" /><Text style={{ color: c.text, lineHeight: 22, flex: 1 }}>{appointment(booking.starts_at)}</Text></View><Muted>Asia/Manila · Philippine time</Muted><View style={s.row}><Icon name="location-outline" /><Text style={{ color: c.text, lineHeight: 22, flex: 1 }}>{booking.address_snapshot.line1}, {booking.address_snapshot.city} {booking.address_snapshot.postal_code}</Text></View></Card>
    <Card style={s.stack}><Text style={s.sectionTitle}>What needs attention</Text><Muted>{booking.description}</Muted><View style={s.cardFoot}><Muted>{booking.is_estimate && !booking.quote_accepted ? 'Estimated total' : 'Booking total'}</Muted><Text style={s.price}>{money(booking.total_centavos)}</Text></View></Card>
    <BookingHistory booking={booking} />
    {booking.status === 'completed' && <CompletedRecord booking={booking} customer={canPay} />}
    <BookingActions booking={booking} />
    <Button title="Get help with this booking" secondary onPress={() => navigation.navigate('SupportCases', { bookingId })} />
    <Button title="Open conversation" secondary onPress={() => navigation.navigate('Messages', { bookingId })} />
    {canPay && booking.status !== 'completed' && <GCashPayment key={booking.id} booking={booking} />}
    <Button title="Back to my bookings" secondary onPress={() => navigation.navigate('MyBookings')} />
    <Button title="Refresh booking status" secondary busy={query.loading} onPress={query.retry} />
  </> : <Empty title="This booking is unavailable" description="Only authorized participants can view a private booking." action="Open my bookings" onPress={() => navigation.navigate('MyBookings')} />}</Query>}</Screen>;
}

function BookingHistory({ booking }) {
  const { api } = useApp();
  const [expanded,setExpanded] = useState(false);
  const q = useData('timeline-' + booking.id + booking.status, () => api.bookingEvents(booking.id), expanded);
  return <Card style={s.stack}><Button title={expanded ? 'Hide timeline' : 'View booking timeline'} secondary onPress={() => setExpanded(!expanded)} />
    {expanded && <Query query={q}>{q.data?.map(row => <View key={row.id}><Text style={s.fieldLabel}>{statusLabels[row.to_status]}</Text><Muted>{appointment(row.created_at)} {row.reason}</Muted></View>)}{!q.data?.length && <Muted>No status changes recorded.</Muted>}</Query>}
  </Card>;
}

function CompletedRecord({ booking, customer }) {
  const { api } = useApp();
  const q = useData('receipt-' + booking.id, () => api.completedRecord(booking.id));
  const action = useAction();
  const [rating,setRating] = useState(0);
  const [body,setBody] = useState('');
  const invoice = q.data?.invoice;
  return <Card style={s.stack}><Text style={s.sectionTitle}>Invoice and review</Text><Query query={q}>
    {invoice ? <><Muted>{invoice.invoice_number} · {appointment(invoice.issued_at)}</Muted><Muted>Labor {money(invoice.labor_centavos)} · Booking fee {money(invoice.fee_centavos)}</Muted><Text style={s.price}>Total {money(invoice.total_centavos)}</Text></> : <Muted>No invoice issued yet.</Muted>}
    {q.data?.payment && <Muted>Payment status · {q.data.payment.status}</Muted>}
    {q.data?.review ? <><Text style={s.fieldLabel}>Customer review · {q.data.review.rating}/5</Text><Muted>{q.data.review.body}</Muted></> : customer && <><Text style={s.fieldLabel}>How was the service?</Text><View style={[s.row,{flexWrap:'wrap'}]}>{[1,2,3,4,5].map(n => <Chip key={n} title={String(n)} selected={rating===n} onPress={() => setRating(n)} />)}</View><Field label="Your review" multiline value={body} onChangeText={setBody} maxLength={2000} />
      <Button title="Submit review" disabled={!rating || body.trim().length<10} busy={action.busy} onPress={() => action.run(async () => { await api.reviewBooking(booking.id,rating,body); q.retry(); })} /></>}
    {action.error && <Notice error>{action.error}</Notice>}
  </Query></Card>;
}
