// Enforce the multipart limit while streaming into the platform parser.
// Avoid retaining a chunk list, coalesced buffer and duplicate Request body.
export async function limitedFile(req: Request, max: number) {
  if (!Number.isSafeInteger(max) || max <= 0) throw new Error('Invalid upload limit');
  const limit = max + 1048576;
  const length = Number(req.headers.get('content-length') || 0);
  if (!Number.isFinite(length) || length < 0 || length > limit) throw new Error('Upload exceeds configured size limit');
  const reader = req.body?.getReader();
  if (!reader) throw new Error('File is required');
  let size = 0;
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) { controller.close(); return; }
        size += value.byteLength;
        if (size > limit) {
          await reader.cancel();
          controller.error(new Error('Upload exceeds configured size limit'));
          return;
        }
        controller.enqueue(value);
      } catch (error) { controller.error(error); }
    },
    async cancel(reason) { await reader.cancel(reason); }
  });
  const init: RequestInit & { duplex: 'half' } = {
    method: 'POST', headers: { 'Content-Type': req.headers.get('content-type') || '' }, body, duplex: 'half'
  };
  return new Request(req.url, init).formData();
}
