const defaultAllowedOrigins = [
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://reginaseptianadrah.my.id',
  'https://www.reginaseptianadrah.my.id',
];

function normalizeOrigin(url: string) {
  return url.trim().replace(/\/+$/, '');
}

function isOriginAllowed(origin: string, configuredOrigins: string[]) {
  const normalized = normalizeOrigin(origin);
  if (defaultAllowedOrigins.includes(normalized)) return true;
  if (configuredOrigins.includes(normalized)) return true;
  if (/^https:\/\/[a-zA-Z0-9-]+\.pages\.dev$/.test(normalized)) return true;
  if (/^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(normalized)) return true;
  if (/^https:\/\/(.*\.)?reginaseptianadrah\.my\.id$/.test(normalized)) return true;
  return false;
}

export function corsHeaders(request: Request) {
  const origin = request.headers.get('origin');
  const configured = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  const allowed = origin ? isOriginAllowed(origin, configured) : false;

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    Vary: 'Origin',
  };

  const responseOrigin = allowed ? origin : (!origin && configured.length > 0 ? configured[0] : (origin ? null : 'https://reginaseptianadrah.my.id'));
  if (responseOrigin) {
    headers['Access-Control-Allow-Origin'] = responseOrigin;
  }

  return headers;
}

