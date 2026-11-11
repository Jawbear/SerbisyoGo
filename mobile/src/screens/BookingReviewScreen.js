import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '../AppContext';
import { useAction, useData } from '../hooks';
import { appointment, money } from '../domain';
import { colors as c } from '../theme';
import { Button, Card, Empty, Icon, Label, Muted, Notice, Query, Screen, Title, s } from '../components/ui';
import LoginPrompt from '../components/LoginPrompt';

export default function BookingReviewScreen({ navigation, route }) {
  const app = useApp();
  const draftId = route.params?.draftId;
  const allowed = app.mode === 'demo' || app.identity?.role === 'customer';
  const query = useData(`review-${draftId}`, () => app.api.review(draftId), allowed);
  return <Screen>{!allowed ? <LoginPrompt navigation={navigation} returnTo="BookingReview" routeParams={{ draftId }} /> : <Query query={query}>{query.data ? <Review data={query.data} navigation={navigation} retry={query.retry} /> : <Empty title="Your draft is unavailable" description="Choose a professional and save your request details first." />}</Query>}</Screen>;
}

function Review({ data, navigation, retry }) {
  const { api, mode, refresh } = useApp();
  const [accepted, setAccepted] = useState(false);
  const action = useAction();
  async function submit() {
    if (!accepted) return;
    await action.run(async () => {
      const bookingId = await api.submit(data.draft.id, data.price.total_centavos);
      refresh();
      // Remove the submission form from history to prevent accidental resubmission.
      navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'MyBookings', params: { bookingId } }] });
    });
  }
  return <>
    <View style={s.stack}><Label>02 · Review your request</Label><Title>Everything look right?</Title><Muted>Check the professional, service, address, and appointment before continuing.</Muted></View>
    <Card style={s.stack}><Text style={s.sectionTitle}>{data.service.title}</Text><Muted>With {data.provider.display_name}</Muted><View style={s.row}><Icon name="calendar-outline" /><Text style={{ color: c.text, flex: 1, lineHeight: 23 }}>{appointment(data.draft.starts_at)}</Text></View><View style={s.row}><Icon name="location-outline" /><Text style={{ color: c.text, flex: 1, lineHeight: 23 }}>{data.draft.address.line1}, {data.draft.address.city} {data.draft.address.postal_code}</Text></View><Muted>{data.draft.description}</Muted></Card>
    <Card style={s.stack}><Text style={s.sectionTitle}>{data.price.is_estimate ? 'Estimated total' : 'Request total'}</Text><View style={s.between}><Muted>Labor {data.price.is_estimate ? 'estimate' : ''}</Muted><Text style={{ color: c.text }}>{money(data.price.labor_centavos)}</Text></View><View style={s.between}><Muted>{mode === 'demo' ? 'Example booking fee' : 'Booking fee'}</Muted><Text style={{ color: c.text }}>{money(data.price.fee_centavos)}</Text></View><View style={s.cardFoot}><Text style={s.sectionTitle}>Total</Text><Text style={[s.price, { fontSize: 25 }]}>{money(data.price.total_centavos)}</Text></View></Card>
    <Notice>{mode === 'demo' ? 'This saves a sample request on this device for your lab. No professional receives it and no payment is taken.' : 'This is a request awaiting provider acceptance. Payment is cash/manual settlement; no online charge is made.'}</Notice>
    {data.price.is_estimate && <Notice>A final quotation must be accepted before the provider can confirm this job.</Notice>}
    <Pressable accessibilityRole="checkbox" accessibilityLabel="I checked the service, address, and schedule" accessibilityState={{ checked: accepted }} onPress={() => setAccepted(value => !value)} style={[s.row, { minHeight: 48, alignItems: 'flex-start', paddingVertical: 8 }]}><View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: accepted ? c.green : c.muted, backgroundColor: accepted ? c.green : c.input, justifyContent: 'center', alignItems: 'center' }}>{accepted && <Icon name="checkmark" size={18} color={c.buttonText} />}</View><Muted style={s.flex}>I checked the service, address, and schedule. I understand this request still needs provider acceptance.</Muted></Pressable>
    {action.error && <><Notice error>{action.error}</Notice><Button title="Refresh request total" secondary onPress={retry} /></>}
    <Button title={mode === 'demo' ? 'Save demo request' : 'Submit booking request'} disabled={!accepted} busy={action.busy} onPress={submit} icon="checkmark-circle-outline" />
    <Button title="Edit request details" secondary onPress={() => navigation.goBack()} />
  </>;
}
