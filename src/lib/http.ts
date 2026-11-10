// Bound stalled network requests while preserving cancellation by Supabase callers.
export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const source = init.signal || (typeof Request !== 'undefined' && input instanceof Request ? input.signal : undefined);
  const abort = () => controller.abort(source?.reason);
  if (source?.aborted) abort();
  else source?.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new Error('The connection took too long. Check your internet connection and try again.');
    throw error;
  } finally {
    clearTimeout(timer);
    source?.removeEventListener('abort', abort);
  }
}
