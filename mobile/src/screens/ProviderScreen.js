import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useApp } from '../AppContext';
import { useData } from '../hooks';
import { dayLabel, manilaDay, money, timeLabel } from '../domain';
import { Badge, Button, Card, Chip, Empty, Icon, Label, Muted, ProviderAvatar, ProviderTrustBadges, Query, Screen, Section, Title, s } from '../components/ui';

export default function ProviderScreen({ navigation, route }) {
  const { api, identity } = useApp();
  const providerId = route.params?.providerId;
  const query = useData(`provider-${providerId}`, () => api.provider(providerId));
  const [scheduleId, setScheduleId] = useState('');
  const [day, setDay] = useState(() => manilaDay());
  const schedule = useData('profile-slots-' + scheduleId + '-' + day, () => api.slots(scheduleId, day), Boolean(scheduleId));
  function choose(service) {
    const params = { providerId, serviceId: service.id };
    if (!identity) navigation.navigate('SignIn', { returnTo: 'BookingForm', routeParams: params });
    else navigation.navigate('BookingForm', params);
  }
  return <Screen><Query query={query}>{query.data ? <>
    <View style={s.stack}><ProviderAvatar provider={query.data.provider} large /><Label>{query.data.provider.city} · local expertise</Label><Title>{query.data.provider.display_name}</Title><Muted>{query.data.provider.headline}</Muted><View style={s.row}><Badge>{Number(query.data.provider.review_count) > 0 ? `★ ${Number(query.data.provider.rating).toFixed(1)} · ${query.data.provider.review_count} reviews` : 'New professional'}</Badge></View></View>
    <ProviderTrustBadges provider={query.data.provider}/><Card style={s.stack}><Text style={s.sectionTitle}>A little about my work</Text><Muted>{query.data.provider.bio}</Muted><View style={s.row}><Icon name="location-outline" /><Muted>{query.data.provider.service_areas?.join(' · ') || query.data.provider.city}</Muted></View></Card>
    <Section title="How can I help?">{query.data.services.map(service => <Card key={service.id} style={s.stack}>
      <Text style={s.sectionTitle}>{service.title}</Text><View style={s.between}><Text style={s.price}>{money(service.rate_centavos)}{service.pricing_mode === 'quote' ? ' estimate' : ''}</Text><View style={s.inline}><Icon name="time-outline" size={15} /><Muted>{service.duration_minutes} min</Muted></View></View>
      <Muted>{service.pricing_mode === 'quote' ? 'You must accept the final quotation before this request can be confirmed.' : 'Review the booking fee and available schedule before submitting your request.'}</Muted>
      <Chip title={scheduleId === service.id ? 'Hide available times' : 'Check available times'} selected={scheduleId === service.id} onPress={() => setScheduleId(scheduleId === service.id ? '' : service.id)} />
      {scheduleId === service.id && <View style={s.stack}>
        <Muted>Available times · Philippine time</Muted>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {Array.from({ length: 7 }, (_, index) => manilaDay(new Date(), index)).map(date => <Chip key={date} title={dayLabel(date)} selected={date === day} onPress={() => setDay(date)} />)}
        </ScrollView>
        <Query query={schedule}><Muted>{schedule.data?.length ? schedule.data.map(slot => timeLabel(slot.starts_at)).join(' · ') : 'No appointments available on this date.'}</Muted></Query>
      </View>}
      <Button title={`Choose ${service.title}`} icon="arrow-forward-outline" onPress={() => choose(service)} />
    </Card>)}{!query.data.services.length && <Empty title="No services available yet" description="Please choose another professional for now." />}</Section>
    <Section title="Customer reviews">{query.data.reviews.length ? query.data.reviews.map(review =>
      <Card key={review.id} style={s.stack}><Badge>{review.rating} / 5</Badge><Muted>{review.body}</Muted></Card>
    ) : <Muted>No published reviews yet.</Muted>}</Section>
  </> : <Empty />}</Query></Screen>;
}
