// Read captured mail only from a disposable local test inbox.
export async function verificationEmailLink(inbox: string, email: string, backend: string, fetcher: typeof fetch = fetch) {
  for (const endpoint of [inbox, backend]) {
    if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(new URL(endpoint).hostname)) {
      throw new Error('Email integration checks require local test endpoints.');
    }
  }
  const base = inbox.replace(/\/$/, '');
  // Current Supabase uses Mailpit. Its filtered rendered-email endpoint avoids
  // choosing another parallel test's confirmation message.
  const mailpit = await fetcher(`${base}/view/latest.html?query=${encodeURIComponent(`to:${email}`)}`);
  let html = mailpit.ok ? await mailpit.text() : '';
  if (!html) {
    // Retain compatibility with older isolated stacks using Inbucket.
    const mailbox = encodeURIComponent(email.split('@')[0]);
    const response = await fetcher(`${base}/api/v1/mailbox/${mailbox}`);
    if (!response.ok) return null;
    const messages = await response.json() as { id: string }[];
    if (!Array.isArray(messages) || !messages.length) return null;
    const mail = await fetcher(`${base}/api/v1/mailbox/${mailbox}/${encodeURIComponent(messages[0].id)}`);
    if (!mail.ok) return null;
    const data = await mail.json();
    html = String(data.body?.html || data.body?.text || '');
  }
  const link = html.match(/https?:\/\/[^\s"<>]+\/auth\/v1\/verify[^\s"<>]*/)?.[0]?.replaceAll('&amp;', '&');
  if (!link) return null;
  const confirmation = new URL(link);
  if (confirmation.origin !== new URL(backend).origin || confirmation.pathname !== '/auth/v1/verify') {
    throw new Error('The test email points outside the isolated authentication service.');
  }
  return confirmation.href;
}
