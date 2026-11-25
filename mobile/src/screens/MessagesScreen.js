import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as Crypto from 'expo-crypto';
import { useApp } from '../AppContext';
import { useAction, useData } from '../hooks';
import { appointment } from '../domain';
import { useLiveRows } from '../useLiveRows';
import { Badge, Button, Card, Empty, Field, Muted, Notice, Query, Screen, Title, s } from '../components/ui';
import LoginPrompt from '../components/LoginPrompt';

export default function MessagesScreen({ navigation, route }) {
  const { identity } = useApp();
  const bookingId = route.params?.bookingId;
  return <Screen>{!identity ? <LoginPrompt navigation={navigation} returnTo="Messages" routeParams={route.params} /> :
    bookingId ? <Thread key={identity.user.id + bookingId} bookingId={bookingId} /> :
    <Inbox key={identity.user.id} navigation={navigation} />}</Screen>;
}

function Inbox({ navigation }) {
  const { api, identity } = useApp();
  const [page, setPage] = useState(0);
  const q = useData(`inbox-${page}`, () => api.inbox(page, identity.user.id));
  useLiveRows('messages', null, q.retry, true);
  return <>
    <Title>Messages</Title>
    <Query query={{ ...q, loading: q.loading && !q.data }}>{q.data && <>
      {q.data.slice(0, 25).map(thread => <Card key={thread.id} style={s.stack}>
        <View style={s.between}><Text style={s.fieldLabel}>{thread.reference}</Text>{thread.unread > 0 && <Badge>{thread.unread} unread</Badge>}</View>
        <Text style={s.sectionTitle}>{thread.service_title}</Text><Muted>{appointment(thread.last_activity)}</Muted>
        <Button title="Open conversation" secondary onPress={() => navigation.push('Messages', { bookingId: thread.booking_id })} />
      </Card>)}
      {!q.data.length && <Empty title="No conversations on this page" description="Each booking has its own private conversation." />}
      {page > 0 && <Button title="Previous conversations" secondary onPress={() => setPage(page - 1)} />}
      {q.data.length > 25 && <Button title="More conversations" secondary onPress={() => setPage(page + 1)} />}
    </>}</Query>
  </>;
}

function Thread({ bookingId }) {
  const { api, identity } = useApp();
  const focused = useIsFocused();
  const [pages, setPages] = useState([]);
  const cursor = pages.at(-1);
  const q = useData(`messages-${bookingId}-${cursor?.id || 'latest'}`, () => api.messages(bookingId, cursor));
  const conversationId = q.data?.conversation?.id;
  const messages = q.data?.messages;
  const lastMessage = messages?.at(-1)?.id;
  const [readError, setReadError] = useState('');
  const [body, setBody] = useState('');
  const nonce = useRef(null);
  const action = useAction();
  useLiveRows('messages', `conversation_id=eq.${conversationId}`, q.retry, Boolean(conversationId && !cursor));
  useEffect(() => {
    if (!lastMessage || !focused) return;
    let active = true;
    void api.readMessage(lastMessage, conversationId, pages.length === 0).then(() => { if (active) setReadError(''); })
      .catch(() => { if (active) setReadError('Your read status could not be synced.'); });
    return () => { active = false; };
  }, [api, focused, lastMessage, conversationId, pages.length]);
  return <Query query={{ ...q, loading: q.loading && !q.data }}>{conversationId ? <>
    {q.data.hasOlder && <Button title="Older messages" secondary onPress={() => setPages([...pages, { id: messages[0].id, created_at: messages[0].created_at }])} />}
    <Card style={s.stack}>{messages.length ? messages.map(message => <View key={message.id} style={s.stack}>
      <Text style={s.fieldLabel}>{message.sender_id === identity.user.id ? 'You' : 'Booking participant'}</Text>
      <Text style={s.fieldLabel}>{message.body}</Text><Muted>{appointment(message.created_at)}</Muted>
    </View>) : <Muted>No messages yet.</Muted>}</Card>
    {cursor && <Button title="Newer messages" secondary onPress={() => setPages(pages.slice(0, -1))} />}
    {readError && <Muted>{readError}</Muted>}
    <Card style={s.stack}><Field label="Message" value={body} onChangeText={value => { setBody(value); nonce.current = null; }} editable={!action.busy} multiline maxLength={4000} />
      {action.error && <Notice error>{action.error}</Notice>}
      <Button title="Send message" busy={action.busy} disabled={!body.trim()} onPress={() => action.run(async () => {
        nonce.current ||= Crypto.randomUUID();
        await api.sendMessage(conversationId, body, nonce.current);
        setBody(''); nonce.current = null; setPages([]); q.retry();
      })} />
    </Card>
  </> : <Notice>This conversation is unavailable to your account.</Notice>}</Query>;
}
