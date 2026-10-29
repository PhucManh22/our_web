// /api/auth — màn khoá: GET trạng thái · POST ?action=login · POST ?action=change
// Bản băm mật khẩu nằm trong D1 (bảng settings). Mật khẩu lần đầu cài bằng `npm run auth:set`.
import { json, sleep, withCors } from '../_shared/http.js';
import { bearer, hashPassword, signToken, verifyPassword, verifyToken } from '../_shared/auth.js';

const TTL = 30 * 24 * 3600; // phiên đăng nhập 30 ngày

async function handle({ request, env }) {
  if (!env.DB || !env.SESSION_SECRET) return json({ error: 'Server chưa cấu hình' }, 500);

  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'login_hash'").first();
  const stored = row?.value ?? null;

  if (request.method === 'GET') {
    const authenticated = await verifyToken(env.SESSION_SECRET, stored, bearer(request));
    return json({ configured: !!stored, authenticated });
  }
  if (request.method !== 'POST') return json({ error: 'Method không hỗ trợ' }, 405);

  const body = await request.json().catch(() => ({}));
  const action = new URL(request.url).searchParams.get('action');

  if (action === 'login') {
    if (!stored) return json({ error: 'Chưa cài mật khẩu đăng nhập' }, 409);
    if (!(await verifyPassword(String(body.password ?? ''), stored))) {
      await sleep(500); // làm chậm dò mật khẩu
      return json({ error: 'Sai mật khẩu' }, 401);
    }
    return json({ token: await signToken(env.SESSION_SECRET, stored, TTL) });
  }

  if (action === 'change') {
    if (!stored) return json({ error: 'Chưa cài mật khẩu đăng nhập' }, 409);
    if (!(await verifyToken(env.SESSION_SECRET, stored, bearer(request)))) return json({ error: 'Hết phiên, hãy đăng nhập lại' }, 401);
    if (!(await verifyPassword(String(body.current ?? ''), stored))) {
      await sleep(500);
      return json({ error: 'Mật khẩu hiện tại không đúng' }, 401);
    }
    const next = String(body.next ?? '');
    if (next.length < 6 || next.length > 200) return json({ error: 'Mật khẩu mới cần 6–200 ký tự' }, 400);
    const hash = await hashPassword(next);
    await env.DB.prepare(
      "INSERT INTO settings (key, value) VALUES ('login_hash', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).bind(hash).run();
    return json({ token: await signToken(env.SESSION_SECRET, hash, TTL) }); // phiên cũ mất hiệu lực, cấp token mới
  }

  return json({ error: 'Hành động không hợp lệ' }, 400);
}

export const onRequest = withCors(handle);
