export const locationUrl = 'https://psgc.cloud/api/v2/regions/1600000000/provinces/1600300000/cities-municipalities';
export const locationError = 'Unable to load locations. Check your internet connection.';

export async function loadLocations(signal, request = fetch, timeoutMs = 15000) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel);
  if (signal?.aborted) cancel();
  const timer = setTimeout(cancel, timeoutMs);
  try {
    const response = await request(locationUrl, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(locationError);
    const body = await response.json();
    if (!Array.isArray(body?.data)) throw new Error(locationError);
    const places = new Map();
    for (const row of body.data) {
      if (!/^16003\d{5}$/.test(row?.code) || typeof row.name !== 'string' || !row.name.trim()) throw new Error(locationError);
      places.set(row.code, { code: row.code, name: row.name.trim() });
    }
    return [...places.values()].sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    throw new Error(locationError);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}
