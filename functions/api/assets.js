import { json, withCors } from '../_shared/http.js';
import { requireSession } from '../_shared/session.js';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Ho_Chi_Minh', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
async function allowed(db,kind,id) {
  if (kind === 'diary') return !!await db.prepare('SELECT id FROM diaries WHERE id=?').bind(id).first();
  if (kind === 'letter') { const l=await db.prepare('SELECT open_date FROM letters WHERE id=?').bind(id).first(); return !!l && (!l.open_date || l.open_date <= today()); }
  return false;
}
async function handle(ctx) {
  const {request,env}=ctx; if (!await requireSession(ctx)) return json({error:'Cần đăng nhập'},401);
  if (!env.PRIVATE_MEDIA) return json({error:'Chưa cấu hình kho media riêng tư'},503);
  const url=new URL(request.url), id=url.searchParams.get('id');
  if(request.method==='GET' && id) {
    const a=await env.DB.prepare('SELECT * FROM private_assets WHERE id=?').bind(id).first();
    if(!a || !await allowed(env.DB,a.kind,a.target_id)) return json({error:'Tệp không tồn tại hoặc chưa đến ngày mở'},404);
    const object=await env.PRIVATE_MEDIA.get(a.id); if(!object) return json({error:'Không tìm thấy tệp'},404);
    return new Response(object.body,{headers:{'content-type':a.content_type,'content-disposition':'attachment; filename="download"','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
  }
  if(request.method==='GET') {
    const kind=url.searchParams.get('kind'),target=url.searchParams.get('target');
    if(!await allowed(env.DB,kind,target)) return json({error:'Không có quyền xem tệp'},403);
    const {results}=await env.DB.prepare('SELECT id, filename, content_type, size FROM private_assets WHERE kind=? AND target_id=?').bind(kind,target).all(); return json({assets:results});
  }
  if(request.method==='POST' && url.searchParams.get('action')==='delete') {
    const data=await request.json().catch(()=>({})); const a=await env.DB.prepare('SELECT * FROM private_assets WHERE id=?').bind(String(data.id||'')).first();
    if(!a || !await allowed(env.DB,a.kind,a.target_id)) return json({error:'Không có quyền xoá tệp'},403);
    await env.PRIVATE_MEDIA.delete(a.id); await env.DB.prepare('DELETE FROM private_assets WHERE id=?').bind(a.id).run(); return json({ok:true});
  }
  if(request.method==='POST') {
    const form=await request.formData(), kind=String(form.get('kind')||''),target=String(form.get('target')||''),file=form.get('file');
    if(!await allowed(env.DB,kind,target)) return json({error:'Không có quyền thêm tệp'},403);
    if(!(file instanceof File) || !file.size || file.size>20*1024*1024) return json({error:'Tệp phải nhỏ hơn 20 MB'},400);
    const bytes=new Uint8Array(await file.arrayBuffer());
    const mp4=bytes.length>12 && String.fromCharCode(...bytes.slice(4,8))==='ftyp';
    const webm=bytes.length>4 && bytes[0]===0x1a && bytes[1]===0x45 && bytes[2]===0xdf && bytes[3]===0xa3;
    const type=mp4?'video/mp4':webm?'video/webm':'application/octet-stream';
    if(kind==='diary' && type==='application/octet-stream') return json({error:'Nhật ký hỗ trợ video MP4 hoặc WebM'},400);
    const id=crypto.randomUUID(), filename=String(file.name).replace(/[\x00-\x1f]/g,'').slice(0,200);
    await env.PRIVATE_MEDIA.put(id,bytes,{httpMetadata:{contentType:type}});
    try { await env.DB.prepare('INSERT INTO private_assets (id,kind,target_id,filename,content_type,size) VALUES (?,?,?,?,?,?)').bind(id,kind,target,filename,type,file.size).run(); }
    catch(e){ await env.PRIVATE_MEDIA.delete(id); throw e; }
    return json({id},201);
  }
  return json({error:'Method không hỗ trợ'},405);
}
export const onRequest=withCors(handle);
