export function corsHeaders(req: Request, allowedOrigins: string) {
  const origin = req.headers.get('origin') || '';
  const allowed = allowedOrigins.split(',').map(value => value.trim()).filter(Boolean);
  if (!allowed.length || (origin && !allowed.includes(origin))) throw new Error('Origin is not allowed');
  return {
    'Access-Control-Allow-Origin': origin || allowed[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Vary': 'Origin'
  };
}
