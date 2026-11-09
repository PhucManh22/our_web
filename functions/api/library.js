import { json, withCors } from '../_shared/http.js';
import { requireSession } from '../_shared/session.js';

const specs = {
  trip: { table: 'trips', fields: ['name','start_date','end_date','description','event_id'], required: ['name','start_date'], dates: ['start_date','end_date'] },
  location: { table: 'locations', fields: ['trip_id','name','visit_date','address','latitude','longitude','description'], required: ['trip_id','name'], dates: ['visit_date'] },
  letter: { table: 'letters', fields: ['title','sender','recipient','written_date','content','open_date','status','event_id'], required: ['title','sender','recipient','written_date','status'], dates: ['written_date','open_date'] },
};
const dateValid = s => /^\d{4}-\d\d-\d\d$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0,10) === s;
const vnToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
async function handle(ctx) {
  const { request, env } = ctx;
  if (!await requireSession(ctx)) return json({error:'Cần đăng nhập'}, 401);
  if (request.method === 'GET') {
    const [trips, locations, letters, links, details] = await Promise.all(['trips','locations','letters','photo_links','photo_details'].map(t => env.DB.prepare(`SELECT * FROM ${t}`).all()));
    // Không gửi nội dung thư trước ngày mở, kể cả trong response JSON.
    const today = vnToday();
    return json({ trips:trips.results, locations:locations.results, letters:letters.results.map(l => l.open_date && l.open_date > today ? {...l, content:null, locked:true} : {...l, locked:false}), links:links.results, details:details.results });
  }
  if (request.method !== 'POST') return json({error:'Method không hỗ trợ'},405);
  const b = await request.json().catch(() => ({}));
  if (b.type === 'photo') {
    const photoId = String(b.id || '').slice(0,120);
    if (!/^[a-z0-9-]{1,120}$/.test(photoId)) return json({error:'Ảnh không hợp lệ'},400);
    if (b.action === 'details') {
      if (b.taken && !dateValid(b.taken)) return json({error:'Ngày không hợp lệ'},400);
      await env.DB.prepare('INSERT INTO photo_details (photo_id,taken,caption) VALUES (?,?,?) ON CONFLICT(photo_id) DO UPDATE SET taken=excluded.taken, caption=excluded.caption').bind(photoId,b.taken || null,String(b.caption || '').trim().slice(0,1000)).run();
      return json({ok:true});
    }
    if (b.action === 'link' || b.action === 'unlink') {
      const tables = {event:'events',diary:'diaries',trip:'trips',location:'locations'};
      if (!Object.hasOwn(tables,b.kind) || typeof b.target_id !== 'string') return json({error:'Liên kết không hợp lệ'},400);
      if (b.action === 'link') {
        if (!await env.DB.prepare(`SELECT id FROM ${tables[b.kind]} WHERE id=?`).bind(b.target_id).first()) return json({error:'Không tìm thấy đối tượng'},404);
        await env.DB.prepare('INSERT OR IGNORE INTO photo_links (photo_id,kind,target_id) VALUES (?,?,?)').bind(photoId,b.kind,b.target_id).run();
      } else await env.DB.prepare('DELETE FROM photo_links WHERE photo_id=? AND kind=? AND target_id=?').bind(photoId,b.kind,b.target_id).run();
      return json({ok:true});
    }
    return json({error:'Yêu cầu không hợp lệ'},400);
  }
  const spec = specs[b.type];
  if (!spec || !['save','delete'].includes(b.action)) return json({error:'Yêu cầu không hợp lệ'},400);
  const id = typeof b.id === 'string' ? b.id.slice(0,80) : '';
  if (b.action === 'delete') {
    if (!id) return json({error:'Thiếu mã bản ghi'},400);
    // Gỡ quan hệ ảnh, giữ file và ảnh ở thư viện trung tâm.
    const statements = [];
    if (b.type === 'letter') {
      const assets=await env.DB.prepare("SELECT id FROM private_assets WHERE kind='letter' AND target_id=?").bind(id).all();
      if (assets.results.length) { if (!env.PRIVATE_MEDIA) return json({error:'Kho media riêng tư chưa được cấu hình'},503); await env.PRIVATE_MEDIA.delete(assets.results.map(a=>a.id)); }
      statements.push(env.DB.prepare("DELETE FROM private_assets WHERE kind='letter' AND target_id=?").bind(id));
    }
    if (b.type === 'trip') {
      statements.push(env.DB.prepare("DELETE FROM photo_links WHERE kind='location' AND target_id IN (SELECT id FROM locations WHERE trip_id=?)").bind(id));
      statements.push(env.DB.prepare('DELETE FROM locations WHERE trip_id=?').bind(id));
    }
    statements.push(env.DB.prepare('DELETE FROM photo_links WHERE kind=? AND target_id=?').bind(b.type,id));
    statements.push(env.DB.prepare(`DELETE FROM ${spec.table} WHERE id=?`).bind(id));
    await env.DB.batch(statements); return json({ok:true});
  }
  let values = spec.fields.map(k => {
    if (k === 'latitude' || k === 'longitude') return b[k] === '' || b[k] == null ? null : Number(b[k]);
    return typeof b[k] === 'string' ? b[k].trim().slice(0,k === 'content' || k === 'description' ? 10000 : 300) : '';
  });
  const v = Object.fromEntries(spec.fields.map((k,i) => [k,values[i]]));
  if (spec.required.some(k => !v[k]) || spec.dates.some(k => v[k] && !dateValid(v[k]))) return json({error:'Vui lòng kiểm tra các trường bắt buộc và ngày tháng.'},400);
  if (b.type === 'trip' && v.end_date && v.end_date < v.start_date) return json({error:'Ngày kết thúc phải sau ngày bắt đầu.'},400);
  if (b.type === 'location' && ((v.latitude != null && (!Number.isFinite(v.latitude) || Math.abs(v.latitude)>90)) || (v.longitude != null && (!Number.isFinite(v.longitude) || Math.abs(v.longitude)>180)) || ((v.latitude == null) !== (v.longitude == null)))) return json({error:'Toạ độ không hợp lệ.'},400);
  if (b.type === 'letter' && !['draft','saved','opened'].includes(v.status)) return json({error:'Trạng thái không hợp lệ'},400);
  if (b.type === 'letter' && id) {
    const existing = await env.DB.prepare('SELECT open_date FROM letters WHERE id=?').bind(id).first();
    if (existing?.open_date && existing.open_date > vnToday()) return json({error:'Thư chưa đến ngày mở.'},403);
  }
  for (const [field, table] of [['event_id','events'],['trip_id','trips']]) if (v[field] && !await env.DB.prepare(`SELECT id FROM ${table} WHERE id=?`).bind(v[field]).first()) return json({error:'Liên kết không tồn tại.'},400);
  values = values.map((value,i) => value === '' && ['event_id','end_date','visit_date','open_date'].includes(spec.fields[i]) ? null : value);
  const columns = ['id',...spec.fields], placeholders = columns.map(() => '?').join(','), updates = spec.fields.map(k => `${k}=excluded.${k}`).join(',');
  await env.DB.prepare(`INSERT INTO ${spec.table} (${columns.join(',')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}`).bind(id || crypto.randomUUID(),...values).run();
  return json({ok:true});
}
export const onRequest = withCors(handle);
