import { createClient, type User } from '@supabase/supabase-js';

export class AdminAuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireAdmin(request: Request): Promise<User> {
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) throw new AdminAuthError(401, 'Authentication required');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Missing Supabase public environment variables');

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) throw new AdminAuthError(401, 'Invalid or expired session');

  const allowlist = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!allowlist.includes(data.user.email.toLowerCase())) {
    throw new AdminAuthError(403, 'This account is not an authorized administrator');
  }

  return data.user;
}
