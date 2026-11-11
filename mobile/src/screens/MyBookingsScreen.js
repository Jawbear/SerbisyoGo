import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../AppContext';
import { useData } from '../hooks';
import { appointment, money } from '../domain';
import { colors as c } from '../theme';
import { Chip, Empty, Icon, Label, Muted, Notice, Query, Screen, StatusBadge, Title, s } from '../components/ui';
import LoginPrompt from '../components/LoginPrompt';

export default function MyBookingsScreen({ navigation, route }) {
  const { api, identity } = useApp();
  const [status, setStatus] = useState('');
  const allowed = Boolean(identity);
  const query = useData(`bookings-${identity?.user.id || 'guest'}`, () => api.bookings(identity?.user.id, identity?.role), allowed);
  const rows = (query.data || []).filter(row => !status || row.status === status);
  const saved = query.data?.some(row => row.id === route.params?.bookingId);
  return <Screen>
    <View style={s.stack}><Label>Your service records</Label><Title>Keep your home care together.</Title><Muted>Your saved requests and service history, securely linked to your account.</Muted></View>
    {!allowed ? <LoginPrompt navigation={navigation} returnTo="MyBookings" /> : <Query query={query}>
      {saved && <Notice>Your booking request has been saved and sent for provider acceptance.</Notice>}
      <ScrollView horizontal style={s.chipStrip} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{[['', 'All requests'], ['requested', 'Awaiting provider'], ['confirmed', 'Confirmed'], ['completed', 'Completed']].map(([value, label]) => <Chip key={value} title={label} selected={status === value} onPress={() => setStatus(value)} />)}</ScrollView>
      {rows.map(row => <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`Open booking ${row.reference}`} onPress={() => navigation.navigate('BookingRecord', { bookingId: row.id })} style={[s.card, s.stack, row.id === route.params?.bookingId && { borderColor: c.green }]}>
        <View style={s.between}><Text style={s.label}>{row.reference}</Text><StatusBadge status={row.status} /></View>
        <Text style={s.sectionTitle}>{row.service_title}</Text>{row.provider_name && <Muted>With {row.provider_name}</Muted>}
        <View style={s.inline}><Icon name="calendar-outline" size={16} /><Muted>{appointment(row.starts_at)}</Muted></View>
        <View style={s.cardFoot}><Text style={s.price}>{money(row.total_centavos)}</Text><View style={s.inline}><Text style={{ color: c.green, fontWeight: '600', fontSize: 12 }}>View request</Text><Icon name="arrow-forward-outline" size={16} /></View></View>
      </Pressable>)}
      {!rows.length && <Empty title={status ? 'No requests in this status' : 'Your next helping hand starts here'} description={status ? 'Choose All requests to see your other service records.' : 'Choose a professional and save your first service request.'} action={status ? 'Show all requests' : 'Find a professional'} onPress={status ? () => setStatus('') : undefined} />}
    </Query>}
  </Screen>;
}
