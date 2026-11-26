import { json, withCors } from '../_shared/http.js';
import { requireSession } from '../_shared/session.js';

async function handle(ctx) {
  const { request, env } = ctx;
  if (request.method !== 'GET') return json({ error: 'Method không hỗ trợ' }, 405);
  if (!await requireSession(ctx)) return json({ error: 'Cần đăng nhập' }, 401);
  if (!env.MEDIA) return json({ error: 'Kho media chưa được cấu hình' }, 503);
  const key = new URL(request.url).searchParams.get('key') || '';
  if (!/^(?:(?:thumb|full|original|audio)\/[^/\\\x00-\x1f]+|hero\.webp)$/.test(key)) {
    return json({ error: 'Đường dẫn không hợp lệ' }, 400);
  }
  const object = await env.MEDIA.get(key);
  if (!object) return json({ error: 'Không tìm thấy tệp' }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('cache-control', 'private, no-store');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(object.body, { headers });
}

export const onRequest = withCors(handle);
