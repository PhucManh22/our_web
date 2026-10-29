// Pages Function: /api/notes  (GET danh sách · POST thêm · DELETE ?id=)
// Mật khẩu kiểm tra Ở SERVER (secret NOTES_PASSCODE), không nằm trong code client.

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

// So sánh hằng thời gian (băm SHA-256 hai vế rồi XOR) để không lộ độ dài/ký tự đúng qua thời gian phản hồi.
async function safeEqual(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all(
    [a, b].map(async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s))))
  );
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function onRequest({ request, env }) {
  if (!env.NOTES_PASSCODE || !env.DB) return json({ error: 'Server chưa cấu hình' }, 500);

  const pass = request.headers.get('x-passcode') ?? '';
  if (!(await safeEqual(pass, env.NOTES_PASSCODE))) {
    await new Promise((r) => setTimeout(r, 400)); // làm chậm dò mật khẩu
    return json({ error: 'Sai mật khẩu' }, 401);
  }

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT id, author, content, created_at FROM notes ORDER BY created_at DESC, id DESC LIMIT 200'
    ).all();
    return json({ notes: results });
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Dữ liệu không hợp lệ' }, 400);
    }
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    if (content.length < 1 || content.length > 2000) {
      return json({ error: 'Ghi chú cần 1–2000 ký tự' }, 400);
    }
    const author = body.author === 'anh' || body.author === 'em' ? body.author : null;
    const note = await env.DB.prepare(
      'INSERT INTO notes (author, content) VALUES (?, ?) RETURNING id, author, content, created_at'
    )
      .bind(author, content)
      .first();
    return json({ note }, 201);
  }

  if (request.method === 'DELETE') {
    const id = Number(new URL(request.url).searchParams.get('id'));
    if (!Number.isInteger(id)) return json({ error: 'Thiếu id' }, 400);
    await env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  return json({ error: 'Method không hỗ trợ' }, 405);
}
