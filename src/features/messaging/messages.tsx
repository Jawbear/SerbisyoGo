'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { list } from '@/lib/data';
import { rpc } from '@/lib/backend';
import { manilaDate } from '@/lib/domain';
import { useSession } from '@/components/session';
import { Badge, Empty, MutationForm, PageHeading, QueryState, RealtimeRefresh, Textarea, useQuery } from '@/components/ui';
type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
type Conversation = {
  id: string;
  booking_id: string;
  created_at: string;
};
type Member = {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
};
export function Messages() {
  const params = useSearchParams();
  const session = useSession();
  const [body, setBody] = useState('');
  const nonce = useRef(crypto.randomUUID());
  const q = useQuery('conversations-' + session.user?.id, async () => ({
    conversations: await list<Conversation>('conversations'),
    members: await list<Member>('conversation_members', {
      user_id: session.user!.id
    }),
    messages: await list<Message>('messages'),
    bookings: await list<{
      id: string;
      reference: string;
      service_title: string;
      status: string;
    }>('bookings')
  }), !!session.user);
  const data = q.data;
  const selected = data?.conversations.find(c => c.id === params.get('conversation') || c.booking_id === params.get('booking')) || data?.conversations[0];
  const booking = data?.bookings.find(b => b.id === selected?.booking_id);
  const selectedId = selected?.id;
  useEffect(() => {
    if (selectedId) void rpc('mark_read', {
      p_conversation: selectedId
    }).catch(() => {});
  }, [selectedId, data?.messages.length]);
  return <><PageHeading title="A conversation, close at hand." description="Only you and your assigned service professional can read your booking conversation." /><RealtimeRefresh tables={['messages', 'bookings']} /><QueryState {...q}>{data?.conversations.length ? <div className="chat-layout"><aside className="chat-sidebar" aria-label="Booking conversations">{data.conversations.map(c => {
            const b = data.bookings.find(b => b.id === c.booking_id);
            const read = data.members.find(m => m.conversation_id === c.id)?.last_read_at || '';
            const unread = data.messages.filter(m => m.conversation_id === c.id && m.sender_id !== session.user?.id && m.created_at > read).length;
            return <Link key={c.id} className={selectedId === c.id ? 'active' : ''} href={`/messages/?conversation=${c.id}`}><strong>{b?.service_title || 'Service conversation'}</strong><p className="small muted">{b?.reference}</p>{unread > 0 && selectedId !== c.id && <Badge>{unread + ' unread'}</Badge>}</Link>;
          })}</aside><section className="chat-main"><div className="chat-heading row between"><div><strong>{booking?.service_title}</strong><p className="small muted">{booking?.reference}</p></div><Link href={`/bookings/detail/?id=${selected?.booking_id}`}>Booking details →</Link></div><div className="message-list" aria-live="polite" aria-label="Messages">{data.messages.filter(m => m.conversation_id === selectedId).sort((a, b) => a.created_at.localeCompare(b.created_at)).map(m => <article key={m.id} className={`message-bubble ${m.sender_id === session.user?.id ? 'own' : ''}`}><span className="eyebrow">{m.sender_id === session.user?.id ? 'You' : 'Booking participant'}</span><p>{m.body}</p><small>{manilaDate(m.created_at)}</small></article>)}{!data.messages.some(m => m.conversation_id === selectedId) && <Empty title="Start the conversation" description="Share the details that will help your professional prepare." />}</div><div className="chat-form"><MutationForm submit="Send message" success="Message sent." onSubmit={async () => {
              if (!selectedId) throw new Error('Choose a conversation');
              await rpc('send_message', {
                p_conversation: selectedId,
                p_body: body,
                p_nonce: nonce.current
              });
              nonce.current = crypto.randomUUID();
              setBody('');
            }}><Textarea label="Your message" name="body" rows={2} required minLength={1} maxLength={4000} value={body} onChange={e => setBody(e.target.value)} placeholder="Write a message…" /></MutationForm></div></section></div> : <Empty title="Your conversations start with a booking" description="A private conversation is created after a booking request is saved." />}</QueryState></>;
}
