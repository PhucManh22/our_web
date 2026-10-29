// /api/photos — ảnh upload từ giao diện (cần đăng nhập)
//   GET            danh sách ảnh đã upload
//   POST           multipart: thumb + full (WebP, đã resize ở trình duyệt) + original + meta (JSON)
//   POST ?action=delete   body {items:[{id, original}]} — xoá ảnh (object R2 + dòng D1 / đánh dấu ẩn với ảnh cũ)
import { json, withCors } from '../_shared/http.js';
import { requireSession } from '../_shared/session.js';

const LIMITS = { thumb: 512 * 1024, full: 4 * 1024 * 1024, original: 20 * 1024 * 1024 };
const CACHE = 'public, max-age=31536000, immutable'; // id ngẫu nhiên, không bao giờ ghi đè → cache vĩnh viễn

const startsWith = (b, sig, offset = 0) => sig.every((v, i) => b[offset + i] === v);
const isWebp = (b) => b.length >= 12 && startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8);

// Xác định định dạng ảnh gốc theo nội dung file (không tin tên/MIME do client gửi) vì bucket này công khai.
function sniffOriginal(b) {
  if (startsWith(b, [0xff, 0xd8, 0xff])) return { ext: 'jpg', type: 'image/jpeg' };
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47])) return { ext: 'png', type: 'image/png' };
  if (isWebp(b)) return { ext: 'webp', type: 'image/webp' };
  return null;
}

class BadRequest extends Error {}

async function readFile(form, field) {
  const f = form.get(field);
  if (!(f instanceof File) || f.size === 0) throw new BadRequest(`Thiếu file ${field}`);
  if (f.size > LIMITS[field]) throw new BadRequest(`File ${field} quá lớn (tối đa ${LIMITS[field] / 1048576} MB)`);
  return new Uint8Array(await f.arrayBuffer());
}

const toPhoto = (r) => ({ id: r.id, original: r.original, w: r.w, h: r.h, color: r.color, caption: r.caption ?? '', taken: r.uploaded_at, uploaded: true });

async function handle(ctx) {
  const { request, env } = ctx;
  if (!env.DB || !env.MEDIA) return json({ error: 'Server chưa cấu hình' }, 500);
  if (!(await requireSession(ctx))) return json({ error: 'Cần đăng nhập' }, 401);

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT id, original, w, h, color, caption, uploaded_at FROM photos ORDER BY uploaded_at DESC, id DESC'
    ).all();
    const { results: gone } = await env.DB.prepare('SELECT id FROM deleted_photos').all();
    return json({ photos: results.map(toPhoto), deleted: gone.map((r) => r.id) });
  }

  if (request.method === 'POST' && new URL(request.url).searchParams.get('action') === 'delete') {
    const body = await request.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? body.items.slice(0, 200) : [];
    if (!items.length) return json({ error: 'Chưa chọn ảnh nào' }, 400);
    const deleted = [];
    for (const it of items) {
      const id = String(it?.id ?? '');
      const row = /^[a-f0-9]{12}$/.test(id) ? await env.DB.prepare('SELECT original FROM photos WHERE id = ?').bind(id).first() : null;
      if (row) { // ảnh upload từ web
        await env.MEDIA.delete([`thumb/${id}.webp`, `full/${id}.webp`, `original/${row.original}`]);
        await env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(id).run();
        deleted.push(id);
        continue;
      }
      // ảnh cũ: id = slug tên file, original = tên file gốc (không chứa dấu "/", nên không thoát khỏi thư mục original/)
      const original = String(it?.original ?? '');
      if (!/^[a-z0-9-]{1,120}$/.test(id) || !/^[A-Za-z0-9._() -]{1,200}$/.test(original)) continue;
      await env.MEDIA.delete([`thumb/${id}.webp`, `full/${id}.webp`, `original/${original}`]);
      await env.DB.prepare('INSERT OR IGNORE INTO deleted_photos (id) VALUES (?)').bind(id).run();
      deleted.push(id);
    }
    return json({ deleted });
  }

  if (request.method === 'POST') {
    let form;
    try {
      form = await request.formData();
      const thumb = await readFile(form, 'thumb');
      const full = await readFile(form, 'full');
      const original = await readFile(form, 'original');
      if (!isWebp(thumb) || !isWebp(full)) throw new BadRequest('Bản thumb/full phải là WebP');
      const kind = sniffOriginal(original);
      if (!kind) throw new BadRequest('Ảnh gốc phải là JPEG, PNG hoặc WebP');

      let meta;
      try { meta = JSON.parse(String(form.get('meta') ?? '{}')); } catch { throw new BadRequest('meta không hợp lệ'); }
      const w = Number(meta.w), h = Number(meta.h);
      if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w > 20000 || h > 20000) throw new BadRequest('Kích thước ảnh không hợp lệ');
      if (!/^#[0-9a-f]{6}$/i.test(String(meta.color))) throw new BadRequest('Màu không hợp lệ');

      const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      const originalName = `${id}.${kind.ext}`;
      const put = (key, bytes, type) => env.MEDIA.put(key, bytes, { httpMetadata: { contentType: type, cacheControl: CACHE } });
      await put(`thumb/${id}.webp`, thumb, 'image/webp');
      await put(`full/${id}.webp`, full, 'image/webp');
      await put(`original/${originalName}`, original, kind.type);
      try {
        const row = await env.DB.prepare(
          'INSERT INTO photos (id, original, w, h, color) VALUES (?, ?, ?, ?, ?) RETURNING id, original, w, h, color, caption, uploaded_at'
        ).bind(id, originalName, w, h, String(meta.color).toLowerCase()).first();
        return json({ photo: toPhoto(row) }, 201);
      } catch (e) {
        await env.MEDIA.delete([`thumb/${id}.webp`, `full/${id}.webp`, `original/${originalName}`]); // không để lại file mồ côi
        throw e;
      }
    } catch (e) {
      if (e instanceof BadRequest) return json({ error: e.message }, 400);
      throw e;
    }
  }

  return json({ error: 'Method không hỗ trợ' }, 405);
}

export const onRequest = withCors(handle);
