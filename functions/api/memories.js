import { json, withCors } from '../_shared/http.js';
import { requireSession } from '../_shared/session.js';

const dateValid = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
const str = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
async function handle(ctx) {
  const { request, env } = ctx;
  if (!(await requireSession(ctx))) return json({ error: 'Cần đăng nhập' }, 401);
  if (request.method === 'GET') {
    const [events, diaries] = await Promise.all([
      env.DB.prepare('SELECT * FROM events ORDER BY event_date, title').all(),
      env.DB.prepare('SELECT * FROM diaries ORDER BY year DESC, entry_date DESC').all(),
    ]);
    return json({ events: events.results, diaries: diaries.results });
  }
  if (request.method !== 'POST') return json({ error: 'Method không hỗ trợ' }, 405);
  const body = await request.json().catch(() => ({}));
  const { type, action } = body;
  if (!['event', 'diary'].includes(type) || !['save', 'delete'].includes(action)) return json({ error: 'Yêu cầu không hợp lệ' }, 400);
  const id = str(body.id, 80);
  if (action === 'delete') {
    if (!id) return json({ error: 'Thiếu mã bản ghi' }, 400);
    if (type === 'event') {
      const assets = await env.DB.prepare("SELECT id FROM private_assets WHERE kind='diary' AND target_id IN (SELECT id FROM diaries WHERE event_id=?)").bind(id).all();
      if (assets.results.length) { if (!env.PRIVATE_MEDIA) return json({error:'Kho media riêng tư chưa được cấu hình'},503); await env.PRIVATE_MEDIA.delete(assets.results.map(a=>a.id)); }
      await env.DB.batch([env.DB.prepare("DELETE FROM private_assets WHERE kind='diary' AND target_id IN (SELECT id FROM diaries WHERE event_id=?)").bind(id),env.DB.prepare("DELETE FROM photo_links WHERE kind='diary' AND target_id IN (SELECT id FROM diaries WHERE event_id=?)").bind(id), env.DB.prepare("DELETE FROM photo_links WHERE kind='event' AND target_id=?").bind(id), env.DB.prepare('UPDATE trips SET event_id=NULL WHERE event_id=?').bind(id), env.DB.prepare('UPDATE letters SET event_id=NULL WHERE event_id=?').bind(id), env.DB.prepare('UPDATE albums SET diary_id=NULL WHERE diary_id IN (SELECT id FROM diaries WHERE event_id=?)').bind(id), env.DB.prepare('UPDATE albums SET event_id=NULL WHERE event_id=?').bind(id), env.DB.prepare('DELETE FROM diaries WHERE event_id = ?').bind(id), env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id)]);
    } else {
      const assets = await env.DB.prepare("SELECT id FROM private_assets WHERE kind='diary' AND target_id=?").bind(id).all();
      if (assets.results.length) { if (!env.PRIVATE_MEDIA) return json({error:'Kho media riêng tư chưa được cấu hình'},503); await env.PRIVATE_MEDIA.delete(assets.results.map(a=>a.id)); }
      await env.DB.batch([env.DB.prepare("DELETE FROM private_assets WHERE kind='diary' AND target_id=?").bind(id),env.DB.prepare("DELETE FROM photo_links WHERE kind='diary' AND target_id=?").bind(id), env.DB.prepare('UPDATE albums SET diary_id=NULL WHERE diary_id=?').bind(id), env.DB.prepare('DELETE FROM diaries WHERE id = ?').bind(id)]);
    }
    return json({ ok: true });
  }
  const title = str(body.title, 160), date = str(body.date, 10);
  if (!title || !dateValid(date)) return json({ error: 'Vui lòng nhập tên và ngày hợp lệ.' }, 400);
  const newId = id || crypto.randomUUID();
  if (type === 'event') {
    const description = str(body.description, 5000);
    await env.DB.prepare('INSERT INTO events (id, title, event_date, description) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, event_date=excluded.event_date, description=excluded.description').bind(newId, title, date, description).run();
  } else {
    const eventId = str(body.eventId, 80), year = Number(body.year);
    if (!Number.isInteger(year) || year < 1900 || year > 9999 || !(await env.DB.prepare('SELECT id FROM events WHERE id = ?').bind(eventId).first())) return json({ error: 'Sự kiện hoặc năm không hợp lệ.' }, 400);
    await env.DB.prepare('INSERT INTO diaries (id, event_id, year, title, entry_date, location, content) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET event_id=excluded.event_id, year=excluded.year, title=excluded.title, entry_date=excluded.entry_date, location=excluded.location, content=excluded.content').bind(newId, eventId, year, title, date, str(body.location, 300), str(body.content, 10000)).run();
  }
  return json({ id: newId });
}
export const onRequest = withCors(handle);
