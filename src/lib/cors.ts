const localOrigins = new Set([
  'http://localhost:8080',
  'http://127.0.0.1:8080',
]);

export function corsHeaders(request: Request) {
  const origin = request.headers.get('origin');
  const configuredOrigin = process.env.FRONTEND_URL;
  const allowed = origin && (localOrigins.has(origin) || origin === configuredOrigin);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    Vary: 'Origin',
  };

  const responseOrigin = allowed ? origin : (!origin ? configuredOrigin : null);
  if (responseOrigin) headers['Access-Control-Allow-Origin'] = responseOrigin;

  return headers;
}
