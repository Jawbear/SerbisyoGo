// Storage clients use the internal service address; browsers need the public API.
// Both origins come from server configuration, never from request host headers.
export function publicStorageUrl(signedUrl: string, internalUrl: string, publicUrl = internalUrl) {
  const signed = new URL(signedUrl), internal = new URL(internalUrl), external = new URL(publicUrl);
  if (signed.origin !== internal.origin || !signed.pathname.startsWith(`${internal.pathname.replace(/\/$/, '')}/storage/v1/`)) {
    throw new Error('Unexpected signed Storage URL');
  }
  if (!['http:', 'https:'].includes(external.protocol) || external.username || external.password || external.search || external.hash) {
    throw new Error('Invalid public Storage address');
  }
  signed.pathname = external.pathname.replace(/\/$/, '') + signed.pathname.slice(internal.pathname.replace(/\/$/, '').length);
  signed.protocol = external.protocol;
  signed.host = external.host;
  return signed.toString();
}
