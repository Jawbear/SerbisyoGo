import { useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { useApp } from '../AppContext';
import { useAction, useData } from '../hooks';
import { appointment, money } from '../domain';
import { useLiveRows } from '../useLiveRows';
import { Badge, Button, Card, Chip, Field, Muted, Notice, Query, Screen, Section, StatusBadge, Title, s } from '../components/ui';

export function ProviderHome({ navigation }) {
  const { identity, api } = useApp();
  const id = identity.user.id;
  const jobs = useData('provider-jobs', () => api.providerUpcoming(id));
  useLiveRows('bookings', 'provider_id=eq.' + id, jobs.retry, true);
  return <Screen><View style={s.between}><Title>Your work</Title><Badge>Provider</Badge></View>
    <Button title="Manage services and hours" icon="calendar-outline" onPress={() => navigation.navigate('ProviderSettings')} />
    <Query query={jobs}>{jobs.data && ['Incoming requests', 'Active jobs', 'Upcoming appointments'].map((title, index) => {
      const rows = jobs.data[index];
      return <Section key={title} title={title}>{rows.length ? rows.map(job => <Card key={job.id} style={s.stack}>
        <StatusBadge status={job.status} /><Text style={s.sectionTitle}>{job.service_title}</Text><Muted>{job.reference} · {appointment(job.starts_at)}</Muted>
        <Button secondary title="View job details" onPress={() => navigation.navigate('BookingRecord', { bookingId: job.id })} /></Card>) : <Muted>None at the moment.</Muted>}</Section>;
    })}</Query>
    <Earnings />
    <Button title="Open my bookings" secondary onPress={() => navigation.navigate('MyBookings')} />
    <Button title="Manage verification credentials" secondary onPress={() => navigation.navigate('ProviderVerification')} />
    <Button title="View public profile and reviews" secondary onPress={() => navigation.navigate('ProviderDetails', { providerId: id })} />
  </Screen>;
}

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const formatTime = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
function minutes(value) {
  if (value === '24:00') return 1440;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Use a 24-hour time such as 08:30.');
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function HoursEditor({ week, api, done }) {
  const action = useAction();
  const [day, setDay] = useState(1);
  const [rows, setRows] = useState(() => week.map(row => ({ day: row.weekday, from: formatTime(row.starts_minute), until: formatTime(row.ends_minute) })));
  const update = (i, field, value) => setRows(rows.map((row, n) => n === i ? { ...row, [field]: value } : row));
  return <Card style={s.stack}><Text style={s.sectionTitle}>Weekly hours</Text><Muted>Choose appointment windows in Philippine time (UTC+8).</Muted>
    <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>{weekdays.map((name,i) => <Chip key={name} title={name} selected={day === i} onPress={() => setDay(i)} />)}</ScrollView>
    {rows.map((row,i) => row.day === day && <View key={i} style={s.stack}><View style={s.row}><View style={s.flex}><Field label="From" value={row.from} onChangeText={v => update(i,'from',v)} /></View><View style={s.flex}><Field label="Until" value={row.until} onChangeText={v => update(i,'until',v)} /></View></View><Button title="Remove window" secondary onPress={() => setRows(rows.filter((_, n) => n !== i))} /></View>)}
    <Button title="Add time window" secondary onPress={() => setRows([...rows, { day, from:'08:00', until:'17:00' }])} />
    <Button title="Save weekly hours" busy={action.busy} onPress={() => action.run(async () => {
      const windows = rows.map(row => ({ weekday:row.day, starts_minute:minutes(row.from), ends_minute:minutes(row.until) }));
      if (windows.some(window => window.starts_minute >= window.ends_minute)) throw new Error('Each end time must be later than its start.');
      await api.saveHours(windows); done('Weekly hours saved.');
    })} />{action.error && <Notice error>{action.error}</Notice>}
  </Card>;
}

function ServiceEditor({ service, categories, api, done, cancel }) {
  const action = useAction();
  const [title, setTitle] = useState(service?.title || '');
  const [category, setCategory] = useState(service?.category_id || categories[0]?.id || '');
  const [price, setPrice] = useState(service ? String(service.rate_centavos / 100) : '');
  const [duration, setDuration] = useState(String(service?.duration_minutes || 60));
  const [mode, setMode] = useState(service?.pricing_mode || 'fixed');
  const [active, setActive] = useState(service?.active ?? true);
  return <Card style={s.stack}><Text style={s.sectionTitle}>{service ? 'Edit service' : 'New service'}</Text><Field label="Service title" value={title} maxLength={120} onChangeText={setTitle} />
    <Muted>Category</Muted><ScrollView horizontal contentContainerStyle={{ gap:8 }}>{categories.map(item => <Chip key={item.id} title={item.name} selected={item.id === category} onPress={() => setCategory(item.id)} />)}</ScrollView>
    <Field label="Labor price (₱)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" /><Field label="Duration in minutes" value={duration} onChangeText={setDuration} keyboardType="number-pad" />
    <View style={s.row}><Chip title="Fixed price" selected={mode==='fixed'} onPress={() => setMode('fixed')} /><Chip title="Estimate" selected={mode==='quote'} onPress={() => setMode('quote')} /></View>
    <View style={s.between}><Muted>Offer this service</Muted><Switch accessibilityLabel="Offer this service" value={active} onValueChange={setActive} /></View>
    <Button title="Save service" busy={action.busy} onPress={() => action.run(async () => {
      if (!category || title.trim().length < 3) throw new Error('Choose a category and enter a service title of at least three characters.');
      if (!/^\d+(\.\d{1,2})?$/.test(price) || Number(price)>1000000) throw new Error('Enter a peso amount up to ₱1,000,000 with at most two decimal places.');
      if (!Number.isInteger(Number(duration)) || +duration < 30 || +duration > 480 || +duration % 30) throw new Error('Choose a duration from 30 to 480 minutes in half-hour increments.');
      await api.saveService({p_id:service?.id || null, p_category:category,p_title:title.trim(),p_rate:Math.round(Number(price)*100),p_duration:Number(duration),p_mode:mode,p_active:active});
      done('Service saved.');
    })}/><Button secondary title="Cancel edit" onPress={cancel} />{action.error && <Notice error>{action.error}</Notice>}
  </Card>;
}

export function ProviderSettings() {
  const { identity, api } = useApp();
  const allowed = Boolean(identity && ['customer','provider'].includes(identity.role));
  const q = useData('provider-settings', () => api.providerSettings(identity.user.id), allowed);
  const [editing,setEditing] = useState(null);
  const [message,setMessage] = useState('');
  const done = text => { setMessage(text); setEditing(null); q.retry(); };
  return <Screen><Title>Services and hours</Title>{!allowed ? <Muted>Sign in with your provider account to manage services.</Muted> : <Query query={q}>{q.data?.profile ? <>
    {message && <Notice>{message}</Notice>}
    <Section title="Your services">{q.data.services.map(item => <Card key={item.id} style={s.stack}><Text style={s.fieldLabel}>{item.title}</Text><Muted>{money(item.rate_centavos)} · {item.duration_minutes} min · {item.active ? 'Active' : 'Hidden'}</Muted><Button title={'Edit ' + item.title} secondary onPress={() => {setMessage('');setEditing(item.id);}} /></Card>)}</Section>
    {editing ? <ServiceEditor key={editing} api={api} service={q.data.services.find(item => item.id===editing)} categories={q.data.categories} done={done} cancel={() => setEditing(null)} /> : <Button title="Add a service" onPress={() => {setMessage('');setEditing('new');}} />}
    <HoursEditor week={q.data.week} api={api} done={done} />
  </> : <Muted>Submit a provider application first.</Muted>}</Query>}</Screen>;
}

function Earnings() {
  const { api, identity } = useApp();
  const [open,setOpen] = useState(false);
  const [page,setPage] = useState(0);
  const q = useData('provider-earnings-' + page, () => api.providerEarnings(identity.user.id,page), open);
  return <Card style={s.stack}><Button secondary title={open ? 'Hide earnings records' : 'View earnings records'} onPress={() => setOpen(!open)} />
    {open && <Query query={q}>{q.data?.length ? q.data.slice(0,15).map(row => <View key={row.id} style={s.stack}><Muted>{appointment(row.created_at)}</Muted><Text style={s.fieldLabel}>Net earnings {money(row.labor_centavos - row.commission_centavos)}</Text><Muted>Labor {money(row.labor_centavos)} · Commission {money(row.commission_centavos)}</Muted></View>) : <Muted>No settled earnings on this page.</Muted>}
      {page > 0 && <Button secondary title="Previous earnings" onPress={() => setPage(page-1)} />}{q.data?.length>15 && <Button secondary title="More earnings" onPress={() => setPage(page+1)} />}
    </Query>}
  </Card>;
}
