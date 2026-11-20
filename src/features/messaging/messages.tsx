'use client';

import { inboxRows, readThrough } from '../../../mobile/src/data/conversations.js';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { requireDb, result, rpc } from '@/lib/backend';
import type { Database } from '@/lib/database.types';
import { manilaDate } from '@/lib/domain';
import { useSession } from '@/components/session';
import { Badge, Empty, MutationForm, PageHeading, QueryState, RealtimeRefresh, Textarea, useQuery } from '@/components/ui';

type Thread = Database['public']['Views']['conversation_inbox']['Row'];
type Message = Pick<Database['public']['Tables']['messages']['Row'], 'id' | 'sender_id' | 'body' | 'created_at'>;
type Cursor = Pick<Message, 'id' | 'created_at'>;

export function Messages() {
  const { user } = useSession();
  const params = useSearchParams();
  const [page, setPage] = useState(0);
  const conversation = params.get('conversation');
  const booking = params.get('booking');
  const inbox = useQuery(`inbox-${user?.id}-${page}`, () => inboxRows(requireDb(), user!.id, page) as Promise<Thread[]>, !!user);
  const threads = inbox.data?.slice(0, 25) || [];
  const selected = conversation || booking ? threads.find(t => conversation ? t.id === conversation : t.booking_id === booking) : threads[0];
  const deepLink = useQuery(`thread-${user?.id}-${conversation}-${booking}`, async () => {
    const rows = await inboxRows(requireDb(), user!.id, 0, conversation, booking);
    return rows[0] as Thread | undefined;
  },
    Boolean(user && inbox.data && (conversation || booking) && !selected));
  const active = selected || deepLink.data;
  return <>
    <PageHeading title="Messages" description="Open a booking to talk with its customer or service professional." />
    <RealtimeRefresh tables={['messages', 'bookings']} />
    <QueryState {...inbox} loading={inbox.loading && !inbox.data}>
      {Boolean(threads.length || page || conversation || booking) ? <div className="chat-layout">
        <aside className="chat-sidebar" aria-label="Booking conversations">
          {threads.map(t => <Link key={t.id} href={`/messages/?conversation=${t.id}`} className={active?.id === t.id ? 'active' : ''} aria-current={active?.id === t.id ? 'page' : undefined}>
            <strong>{t.service_title}</strong><p className="small muted">{t.reference}</p>
            {(t.unread ?? 0) > 0 && active?.id !== t.id && <Badge>{t.unread} unread</Badge>}
          </Link>)}
          <div className="row">
            {page > 0 && <button className="button secondary compact" onClick={() => setPage(page - 1)}>Previous conversations</button>}
            {Number(inbox.data?.length) > 25 && <button className="button secondary compact" onClick={() => setPage(page + 1)}>More conversations</button>}
          </div>
        </aside>
        <QueryState {...deepLink} loading={deepLink.loading && !active}>{active && user ? <Conversation key={user.id + active.id} thread={active} userId={user.id} /> :
          <Empty title="Conversation unavailable" description="Choose one of your booking conversations." />}</QueryState>
      </div> : <Empty title="Your conversations start with a booking" description="A private conversation is created after a booking request is saved." />}
    </QueryState>
  </>;
}

function Conversation({ thread, userId }: { thread: Thread; userId: string }) {
  const [pages, setPages] = useState<Cursor[]>([]);
  const cursor = pages.at(-1);
  const [body, setBody] = useState('');
  const [readError, setReadError] = useState('');
  const nonce = useRef(crypto.randomUUID());
  const messageList = useRef<HTMLDivElement>(null);
  const q = useQuery(`messages-${thread.id}-${cursor?.id || 'latest'}`, async () => {
    let query = requireDb().from('messages').select('id,sender_id,body,created_at')
      .eq('conversation_id', thread.id).order('created_at', { ascending: false }).order('id', { ascending: false });
    if (cursor) query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
    const rows = await result<Message[] | null>(query.limit(51)) ?? [];
    return { messages: rows.slice(0, 50).reverse(), hasOlder: rows.length > 50 };
  });
  const latest = q.data?.messages.at(-1)?.id;
  useEffect(() => {
    if (!latest) return;
    let active = true;
    const markRead = () => {
      if (document.visibilityState !== 'visible') return;
      void readThrough(requireDb(), latest, thread.id, !cursor)
        .then(() => { if (active) setReadError(''); })
        .catch(() => { if (active) setReadError('Your read status could not be synced.'); });
    };
    markRead();
    document.addEventListener('visibilitychange', markRead);
    if (!cursor && messageList.current) messageList.current.scrollTop = messageList.current.scrollHeight;
    return () => { active = false; document.removeEventListener('visibilitychange', markRead); };
  }, [cursor, latest, thread.id]);
  return <section className="chat-main">
    <div className="chat-heading row between"><div><strong>{thread.service_title}</strong><p className="small muted">{thread.reference}</p></div>
      <Link href={`/bookings/detail/?id=${thread.booking_id}`}>Booking details →</Link></div>
    <QueryState {...q} loading={q.loading && !q.data}>{q.data && <>
      <div className="message-list" ref={messageList} tabIndex={0} aria-live="polite" aria-label="Messages">
        {q.data.hasOlder && <button className="button secondary compact" onClick={() => setPages([...pages, q.data!.messages[0]])}>Older messages</button>}
        {q.data.messages.map(m => <article key={m.id} className={`message-bubble ${m.sender_id === userId ? 'own' : ''}`}>
          <span className="eyebrow">{m.sender_id === userId ? 'You' : 'Booking participant'}</span><p>{m.body}</p><small>{manilaDate(m.created_at)}</small>
        </article>)}
        {cursor && <button className="button secondary compact" onClick={() => setPages(pages.slice(0, -1))}>Newer messages</button>}
        {!q.data.messages.length && <Empty title="Start the conversation" description="Share the details that will help your professional prepare." />}
      </div>{readError && <p className="small muted" role="status">{readError}</p>}
    </>}</QueryState>
    <div className="chat-form"><MutationForm submit="Send message" success="Message sent." onSubmit={async () => {
      await rpc('send_message', { p_conversation: thread.id, p_body: body.trim(), p_nonce: nonce.current });
      nonce.current = crypto.randomUUID(); setBody(''); setPages([]);
    }}><Textarea label="Your message" name="body" rows={2} required maxLength={4000} value={body} onChange={e => { nonce.current = crypto.randomUUID(); setBody(e.target.value); }} placeholder="Write a message…" /></MutationForm></div>
  </section>;
}
