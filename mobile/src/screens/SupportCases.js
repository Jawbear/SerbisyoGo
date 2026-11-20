import { useState } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../AppContext';
import { useAction, useData } from '../hooks';
import { appointment } from '../domain';
import { Button, Card, Field, Muted, Notice, Query, Screen, Title, s } from '../components/ui';
import LoginPrompt from '../components/LoginPrompt';

export default function SupportCases({ navigation, route }) {
  const { identity, api } = useApp();
  const [subject,setSubject] = useState('');
  const [description,setDescription] = useState('');
  const [id,setId] = useState(null);
  const [reply,setReply] = useState('');
  const action = useAction();
  const cases = useData('support-cases', () => api.supportCases(identity.user.id), Boolean(identity));
  const selected = cases.data?.find(row => row.id===id);
  const messages = useData('case-' + id, () => api.caseMessages(id), Boolean(identity && selected));
  if (!identity) return <Screen><LoginPrompt navigation={navigation} returnTo="SupportCases" routeParams={route.params} /></Screen>;
  return <Screen><Title>Support requests</Title><Query query={cases}>{selected ? <Card style={s.stack}>
    <Text style={s.sectionTitle}>{selected.subject}</Text><Muted>{selected.status} · {appointment(selected.created_at)}</Muted><Muted>{selected.body}</Muted>
    {selected.resolution && <Notice>{selected.resolution}</Notice>}<Query query={messages}>{messages.data?.map(msg => <View key={msg.id}><Text style={s.fieldLabel}>{msg.body}</Text><Muted>{appointment(msg.created_at)}</Muted></View>)}</Query>
    <Field label="Reply to support" multiline value={reply} onChangeText={setReply} maxLength={5000} />
    <Button title="Send reply" disabled={!reply.trim()} busy={action.busy} onPress={() => action.run(async () => { await api.replyCase(id,reply); setReply(''); messages.retry(); })} />
    <Button title="All support requests" secondary onPress={() => { setId(null); setReply(''); }} />
  </Card> : <><Card style={s.stack}><Text style={s.sectionTitle}>{route.params?.bookingId ? 'Get help with this booking' : 'Open a request'}</Text>
    <Field label="Subject" value={subject} onChangeText={setSubject} maxLength={160} /><Field label="Describe your concern" multiline value={description} onChangeText={setDescription} maxLength={5000} />
    <Button title="Send support request" busy={action.busy} onPress={() => action.run(async () => {
      if (subject.trim().length < 5 || description.trim().length < 10) throw new Error('Use at least 5 characters for the subject and 10 for the description.');
      const caseId = await api.openCase(route.params?.bookingId,subject,description); setId(caseId); setSubject(''); setDescription(''); cases.retry();
    })} /></Card>{cases.data?.map(row => <Button key={row.id} secondary title={row.subject + ' · ' + row.status} onPress={() => setId(row.id)} />)}</>}</Query>
    {action.error && <Notice error>{action.error}</Notice>}</Screen>;
}
