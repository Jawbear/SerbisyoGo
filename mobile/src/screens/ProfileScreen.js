import { useState } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../AppContext';
import { normalizeMobile } from '../auth';
import { useAction, useData } from '../hooks';
import { useLiveRows } from '../useLiveRows';
import { appointment } from '../domain';
import { Button, Card, Field, Muted, Notice, Query, Screen, Section, Title, s } from '../components/ui';
import LoginPrompt from '../components/LoginPrompt';

function ProfileForm({ identity, reloadIdentity, api }) {
  const [name, setName] = useState(identity.profile.full_name);
  const [phone, setPhone] = useState(identity.profile.phone || '');
  const [saved, setSaved] = useState(false);
  const action = useAction();
  return <Card style={s.stack}><Field label="Full name" value={name} onChangeText={v => { setSaved(false); setName(v); }} maxLength={100} />
    <Field label="Mobile number" keyboardType="phone-pad" value={phone} onChangeText={v => { setSaved(false); setPhone(v); }} />
    <Button title="Save profile" busy={action.busy} onPress={() => action.run(async () => {
      if (name.trim().length < 2) throw new Error('Enter your full name.');
      await api.saveProfile(name, normalizeMobile(phone), identity.profile.preferences);
      await reloadIdentity(); setSaved(true);
    })} />{saved && <Notice>Profile saved.</Notice>}{action.error && <Notice error>{action.error}</Notice>}
  </Card>;
}

export default function ProfileScreen({ navigation }) {
  const app = useApp();
  const action = useAction();
  const userId = app.identity?.user.id;
  const notices = useData('account-notifications', () => app.api.notifications(userId), Boolean(userId));
  useLiveRows('notifications', userId ? 'user_id=eq.' + userId : null, notices.retry, Boolean(userId));
  return <Screen><Title>Your profile</Title>{app.identity ? <>
    <ProfileForm key={userId} identity={app.identity} api={app.api} reloadIdentity={app.reloadIdentity} />
    <Section title="Recent notifications"><Query query={notices}>{notices.data?.length ? <>
      {notices.data.map(note => <Card key={note.id} style={s.stack}><Text style={s.fieldLabel}>{note.title}</Text><Muted>{note.body}</Muted><Muted>{appointment(note.created_at)} · {note.read_at ? 'Read' : 'Unread'}</Muted></Card>)}
      {notices.data.some(note => !note.read_at) && <Button title="Mark all notifications read" secondary onPress={() => action.run(async () => { await app.api.readNotifications(); notices.retry(); })} />}
    </> : <Muted>No notifications yet.</Muted>}</Query></Section>
    <Button title="Sign out of this device" secondary busy={action.busy} onPress={() => action.run(app.signOut)} />
  </> : <LoginPrompt navigation={navigation} returnTo="Profile" />}
  {action.error && <Notice error>{action.error}</Notice>}
  <View style={s.stack}><Button title="App updates" secondary onPress={() => navigation.navigate('AppUpdates')} /><Button title="My support requests" secondary onPress={() => navigation.navigate('SupportCases')} /><Button title="Help and support" secondary onPress={() => navigation.navigate('Information', { page: 'contact' })} /></View>
  </Screen>;
}
