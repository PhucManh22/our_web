// Kiểm tra phiên đăng nhập (token Bearer do /api/auth cấp) cho các API cần đăng nhập.
import { bearer, verifyToken } from './auth.js';

export async function requireSession({ request, env }) {
  if (!env.DB || !env.SESSION_SECRET) return false;
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'login_hash'").first();
  return verifyToken(env.SESSION_SECRET, row?.value, bearer(request));
}
