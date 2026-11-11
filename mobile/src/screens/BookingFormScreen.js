import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useApp } from '../AppContext';
import { useAction, useData } from '../hooks';
import { dayLabel, manilaDay, money, timeLabel } from '../domain';
import { Button, Card, Chip, Empty, Field, Label, Muted, Notice, Query, Screen, Section, Title, s } from '../components/ui';
import LoginPrompt from '../components/LoginPrompt';

export default function BookingFormScreen({ navigation, route }) {
  const { api, mode, identity } = useApp();
  const { providerId, serviceId, draftId } = route.params || {};
  const allowed = mode === 'demo' || identity?.role === 'customer';
  const query = useData(`form-${providerId}-${serviceId}-${draftId}`, () => api.form(providerId, serviceId, draftId), allowed);
  return <Screen>{!allowed ? identity ? <Notice>This request needs a customer account. Your provider or admin account can continue using its workspace on the website.</Notice> : <LoginPrompt navigation={navigation} returnTo="BookingForm" routeParams={route.params} /> : <Query query={query}>{query.data ? <BookingEditor key={`${mode}-${serviceId}-${draftId || 'new'}`} data={query.data} navigation={navigation} draftId={draftId} /> : <Empty />}</Query>}</Screen>;
}

function BookingEditor({ data, navigation, draftId }) {
  const { api, mode } = useApp();
  const action = useAction();
  const [form, setForm] = useState(() => ({
    description: data.draft?.description || '', label: data.draft?.address?.label || 'Home',
    line1: data.draft?.address?.line1 || '', city: data.draft?.address?.city || data.provider.city,
    postal_code: data.draft?.address?.postal_code || '', starts_at: data.draft?.starts_at || ''
  }));
  const [day, setDay] = useState(() => data.draft?.starts_at ? manilaDay(new Date(data.draft.starts_at)) : manilaDay(new Date(), 1));
  const slots = useData(`slots-${data.service.id}-${day}`, () => api.slots(data.service.id, day));
  const set = key => value => setForm(previous => ({ ...previous, [key]: value }));
  async function continueRequest() {
    await action.run(async () => {
      if (!slots.data?.some(slot => slot.starts_at === form.starts_at)) throw new Error('Choose one of the available appointment times.');
      const id = await api.saveDraft(data.provider.id, data.service.id, form, draftId);
      navigation.setParams({ draftId: id });
      navigation.navigate('BookingReview', { draftId: id });
    });
  }
  return <>
    <View style={s.stack}><Label>01 · Your service request</Label><Title>Tell us what needs attention.</Title><Muted>Your details and selected professional stay together as you move through the booking.</Muted></View>
    <Card style={s.stack}><Text style={s.sectionTitle}>{data.service.title}</Text><Muted>With {data.provider.display_name}</Muted><Text style={s.price}>{money(data.service.rate_centavos)}{data.service.pricing_mode === 'quote' ? ' estimate' : ''}</Text></Card>
    <Section title="What can we help with?">
      <Field label="Describe the task" placeholder="What is happening, and what would you like repaired?" multiline maxLength={3000} value={form.description} onChangeText={set('description')} />
      <Field label="Address label" placeholder="Home or work" maxLength={40} value={form.label} onChangeText={set('label')} />
      <Field label="Complete service address" placeholder="House, street, barangay" maxLength={250} value={form.line1} onChangeText={set('line1')} />
      <Field label="City / municipality" maxLength={100} value={form.city} onChangeText={set('city')} />
      <Field label="Postal code" placeholder="Four digits" keyboardType="number-pad" maxLength={4} value={form.postal_code} onChangeText={set('postal_code')} />
    </Section>
    <Section title="A time that works for you">
      <Muted>Appointments are displayed in Philippine time (Asia/Manila).</Muted>
      <ScrollView horizontal style={s.chipStrip} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{Array.from({ length: 14 }, (_, index) => manilaDay(new Date(), index + 1)).map(date => <Chip key={date} title={dayLabel(date)} selected={day === date} onPress={() => { setDay(date); set('starts_at')(''); }} />)}</ScrollView>
      <Query query={slots}><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{slots.data?.map(slot => <Chip key={slot.starts_at} title={timeLabel(slot.starts_at)} selected={form.starts_at === slot.starts_at} onPress={() => set('starts_at')(slot.starts_at)} />)}</View>{slots.data?.length === 0 && <Muted>No appointments on this date. Please choose another day.</Muted>}</Query>
    </Section>
    {mode === 'demo' && <Notice>These are sample appointment times for your laboratory demonstration.</Notice>}
    {action.error && <Notice error>{action.error}</Notice>}
    <Button title="Save and review request" busy={action.busy} onPress={continueRequest} icon="arrow-forward-outline" />
  </>;
}
