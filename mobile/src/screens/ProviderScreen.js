import { Text, View } from 'react-native';
import { useApp } from '../AppContext';
import { useData } from '../hooks';
import { money } from '../domain';
import { Badge, Button, Card, Empty, Icon, Label, Muted, ProviderAvatar, Query, Screen, Section, Title, s } from '../components/ui';

export default function ProviderScreen({ navigation, route }) {
  const { api, mode, identity } = useApp();
  const providerId = route.params?.providerId;
  const query = useData(`provider-${providerId}`, () => api.provider(providerId));
  function choose(service) {
    const params = { providerId, serviceId: service.id };
    if (mode === 'live' && !identity) navigation.navigate('SignIn', { returnTo: 'BookingForm', routeParams: params });
    else navigation.navigate('BookingForm', params);
  }
  return <Screen><Query query={query}>{query.data ? <>
    <View style={s.stack}><ProviderAvatar provider={query.data.provider} large /><Label>{query.data.provider.city} · local expertise</Label><Title>{query.data.provider.display_name}</Title><Muted>{query.data.provider.headline}</Muted><View style={s.row}><Badge>{Number(query.data.provider.review_count) > 0 ? `★ ${Number(query.data.provider.rating).toFixed(1)} · ${query.data.provider.review_count} reviews` : 'New professional'}</Badge>{mode === 'demo' && <Badge>Sample profile</Badge>}</View></View>
    <Card style={s.stack}><Text style={s.sectionTitle}>A little about my work</Text><Muted>{query.data.provider.bio}</Muted><View style={s.row}><Icon name="location-outline" /><Muted>{query.data.provider.service_areas?.join(' · ') || query.data.provider.city}</Muted></View></Card>
    <Section title="How can I help?">{query.data.services.map(service => <Card key={service.id} style={s.stack}>
      <Text style={s.sectionTitle}>{service.title}</Text><View style={s.between}><Text style={s.price}>{money(service.rate_centavos)}{service.pricing_mode === 'quote' ? ' estimate' : ''}</Text><View style={s.inline}><Icon name="time-outline" size={15} /><Muted>{service.duration_minutes} min</Muted></View></View>
      <Muted>{service.pricing_mode === 'quote' ? 'You must accept the final quotation before this request can be confirmed.' : 'Review the booking fee and available schedule before submitting your request.'}</Muted>
      <Button title={`Choose ${service.title}`} icon="arrow-forward-outline" onPress={() => choose(service)} />
    </Card>)}{!query.data.services.length && <Empty title="No services available yet" description="Please choose another professional for now." />}</Section>
  </> : <Empty />}</Query></Screen>;
}
