// Postgres Changes can start streaming after the socket has joined the channel.
export function postgresFeedReady(message) {
  return message.extension === 'postgres_changes' && message.status === 'ok';
}

export function watchReceiptReviews(client, paymentId, refresh) {
  if (!client || !paymentId) return;
  let active = true;
  const reload = () => { if (active) refresh(); };
  const channel = client.channel(`receipt-reviews-${paymentId}-${Math.random()}`)
    .on('postgres_changes', {
      schema: 'public', table: 'gcash_submissions', event: '*', filter: 'payment_id=eq.' + paymentId,
    }, reload)
    .on('system', {}, message => {
      // Re-read the authorized rows to catch changes committed before a join or rejoin.
      if (postgresFeedReady(message)) reload();
    })
    .subscribe();
  return () => {
    active = false;
    void client.removeChannel(channel);
  };
}
