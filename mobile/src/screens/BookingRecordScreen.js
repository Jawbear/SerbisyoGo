import { Text, View } from 'react-native';
import { useApp } from '../AppContext';
import { useData } from '../hooks';
import { appointment, money } from '../domain';
import { colors as c } from '../theme';
import { Button, Card, Empty, Icon, Label, Muted, Query, Screen, StatusBadge, Title, s } from '../components/ui';
import LoginPrompt from '../components/LoginPrompt';
import GCashPayment from '../components/GCashPayment';
import BookingActions from '../components/BookingActions';

export default function BookingRecordScreen({ navigation, route }) {
  const { api, identity } = useApp();
  const bookingId = route.params?.bookingId;
  const allowed = Boolean(identity);
  const query = useData(`booking-${bookingId}`, () => api.booking(bookingId), allowed);
  const booking = query.data;
  const canPay = identity?.role === 'customer' && identity.user.id === booking?.customer_id;
  return <Screen>{!allowed ? <LoginPrompt navigation={navigation} returnTo="BookingRecord" routeParams={{ bookingId }} /> : <Query query={{ ...query, loading: query.loading && !booking }}>{booking ? <>
    <View style={s.stack}><Label>{booking.reference}</Label><Title>{booking.service_title}</Title><StatusBadge status={booking.status} />{booking.provider_name && <Muted>With {booking.provider_name}</Muted>}</View>
    {canPay && booking.status === 'completed' && <GCashPayment key={booking.id} booking={booking} />}
    <Card style={s.stack}><Text style={s.sectionTitle}>Your appointment</Text><View style={s.row}><Icon name="calendar-outline" /><Text style={{ color: c.text, lineHeight: 22, flex: 1 }}>{appointment(booking.starts_at)}</Text></View><Muted>Asia/Manila · Philippine time</Muted><View style={s.row}><Icon name="location-outline" /><Text style={{ color: c.text, lineHeight: 22, flex: 1 }}>{booking.address_snapshot.line1}, {booking.address_snapshot.city} {booking.address_snapshot.postal_code}</Text></View></Card>
    <Card style={s.stack}><Text style={s.sectionTitle}>What needs attention</Text><Muted>{booking.description}</Muted><View style={s.cardFoot}><Muted>Agreed request total</Muted><Text style={s.price}>{money(booking.total_centavos)}</Text></View></Card>
    <BookingActions booking={booking} />
    <Button title="Open conversation" secondary onPress={() => navigation.navigate('Messages', { bookingId })} />
    {canPay && booking.status !== 'completed' && <GCashPayment key={booking.id} booking={booking} />}
    <Button title="Back to my bookings" secondary onPress={() => navigation.navigate('MyBookings')} />
    <Button title="Refresh booking status" secondary busy={query.loading} onPress={query.retry} />
  </> : <Empty title="This booking is unavailable" description="Only authorized participants can view a private booking." action="Open my bookings" onPress={() => navigation.navigate('MyBookings')} />}</Query>}</Screen>;
}
