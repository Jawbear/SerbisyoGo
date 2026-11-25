// Older installations can read conversations during a staged schema rollout.
const missingRelation = code => code === 'PGRST205' || code === '42P01';
/** @param {string | null} [conversation] @param {string | null} [booking] */
export async function inboxRows(client, userId, page, conversation = null, booking = null) {
  function filter(query) {
    if (conversation) return query.eq('id', conversation);
    if (booking) return query.eq('booking_id', booking);
    return query;
  }
  const start = page * 25;
  const modern = await filter(client.from('conversation_inbox').select('id,booking_id,reference,service_title,last_activity,unread'))
    .order('last_activity',{ascending:false}).order('id').range(start,start+25);
  if (!modern.error) return modern.data || [];
  if (!missingRelation(modern.error.code)) throw new Error(modern.error.message);

  const response = await filter(client.from('conversations')
    .select('id,booking_id,created_at,bookings!inner(reference,service_title),conversation_members!inner(user_id,last_read_at)'))
    .eq('conversation_members.user_id',userId).order('created_at',{ascending:false}).order('id').range(start,start+25);
  if (response.error) throw new Error(response.error.message);
  return (response.data || []).map(row => ({
    id:row.id, booking_id:row.booking_id, reference:row.bookings.reference,
    service_title:row.bookings.service_title, last_activity:row.created_at, unread:null
  }));
}

export async function readThrough(client, messageId, conversationId, latest) {
  let response = await client.rpc('read_through_message', { p_message:messageId });
  if (response.error?.code === 'PGRST202') {
    if (!latest) return;
    response = await client.rpc('mark_read', { p_conversation:conversationId });
  }
  if (response.error) throw new Error(response.error.message);
}
