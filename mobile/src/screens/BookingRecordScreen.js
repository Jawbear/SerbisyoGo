import { Text, View } from 'react-native';
import { useApp } from '../AppContext';
import { useData } from '../hooks';
import { appointment, money } from '../domain';
import { colors as c } from '../theme';
import { Button, Card, Empty, Icon, Label, Muted, Notice, Query, Screen, StatusBadge, Title, s } from '../components/ui';
import LoginPrompt from '../components/LoginPrompt';

export default function BookingRecordScreen({ navigation, route }) {
  const { api, identity } = useApp();
  const bookingId = route.params?.bookingId;
  const allowed = Boolean(identity);
  const query = useData(`booking-${bookingId}`, () => api.booking(bookingId), allowed);
  const booking = query.data;
  return <Screen>{!allowed ? <LoginPrompt navigation={navigation} returnTo="BookingRecord" routeParams={{ bookingId }} /> : <Query query={query}>{booking ? <>
    <View style={s.stack}><Label>{booking.reference}</Label><Title>{booking.service_title}</Title><StatusBadge status={booking.status} />{booking.provider_name && <Muted>With {booking.provider_name}</Muted>}</View>
    <Card style={s.stack}><Text style={s.sectionTitle}>Your appointment</Text><View style={s.row}><Icon name="calendar-outline" /><Text style={{ color: c.text, lineHeight: 22, flex: 1 }}>{appointment(booking.starts_at)}</Text></View><Muted>Asia/Manila · Philippine time</Muted><View style={s.row}><Icon name="location-outline" /><Text style={{ color: c.text, lineHeight: 22, flex: 1 }}>{booking.address_snapshot.line1}, {booking.address_snapshot.city} {booking.address_snapshot.postal_code}</Text></View></Card>
    <Card style={s.stack}><Text style={s.sectionTitle}>What needs attention</Text><Muted>{booking.description}</Muted><View style={s.cardFoot}><Muted>Agreed request total</Muted><Text style={s.price}>{money(booking.total_centavos)}</Text></View></Card>
    <Notice>Booking status comes from your saved service record. Cash/manual settlement is recorded separately from provider acceptance.</Notice>
    <Button title="Back to my bookings" secondary onPress={() => navigation.navigate('MyBookings')} />
  </> : <Empty title="This booking is unavailable" description="Only authorized participants can view a private booking." action="Open my bookings" onPress={() => navigation.navigate('MyBookings')} />}</Query>}</Screen>;
}
