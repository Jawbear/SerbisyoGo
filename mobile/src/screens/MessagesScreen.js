import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useApp } from '../AppContext';
import { supabase } from '../data/backend';
import { useAction, useData } from '../hooks';
import { Button, Card, Field, Muted, Notice, Query, Screen, s } from '../components/ui';
import LoginPrompt from '../components/LoginPrompt';

export default function MessagesScreen({ navigation, route }) {
  const { api, identity, refresh } = useApp(); const bookingId = route.params?.bookingId;
  const q = useData(`messages-${bookingId}`, () => api.messages(bookingId), Boolean(identity && bookingId));
  const [body, setBody] = useState(''); const nonce = useRef(null); const action = useAction();
  const conversationId = q.data?.conversation?.id;
  useEffect(() => {
    if (!supabase || !conversationId) return;
    const channel = supabase.channel(`mobile-messages-${conversationId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, q.retry).subscribe();
    const timer = setInterval(q.retry, 30000);
    return () => { clearInterval(timer); void supabase.removeChannel(channel); };
  }, [conversationId, q.retry]);
  return <Screen>{!identity ? <LoginPrompt navigation={navigation} returnTo="Messages" routeParams={{ bookingId }} /> : <Query query={q}>
    {q.data?.conversation ? <><Card style={s.stack}>{q.data.messages.length ? q.data.messages.map(message => <View key={message.id} style={s.stack}><Text style={s.fieldLabel}>{message.sender_id === identity.user.id ? 'You' : 'Booking participant'}</Text><Muted>{message.body}</Muted></View>) : <Muted>No messages yet.</Muted>}</Card>
      <Card style={s.stack}><Field label="Message" value={body} onChangeText={value => { setBody(value); nonce.current = null; }} editable={!action.busy} multiline maxLength={5000} />
        {action.error && <Notice error>{action.error}</Notice>}
        <Button title="Send message" busy={action.busy} disabled={!body.trim()} onPress={() => action.run(async () => {
          nonce.current ||= Crypto.randomUUID(); await api.sendMessage(conversationId, body, nonce.current); setBody(''); nonce.current = null; refresh();
        })} />
      </Card></> : <Notice>This conversation is unavailable to your account.</Notice>}
  </Query>}</Screen>;
}
