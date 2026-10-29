const { startDate, mediaBase, apiBase, music: musicFile } = window.OUR_WEB;
const $ = (id) => document.getElementById(id);
const media = (path) => `${mediaBase}/${path}`;
const fmtDate = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });

/* ---------- Topbar + hero ---------- */
const topbar = document.querySelector('.topbar');
const onScroll = () => topbar.classList.toggle('solid', scrollY > innerHeight * 0.6);
addEventListener('scroll', onScroll, { passive: true });
onScroll();
$('year').textContent = new Date().getFullYear();

/* ---------- Đồng hồ ngày yêu ---------- */
function tick() {
  const start = new Date(startDate);
  const now = new Date();
  const days = Math.floor((now - start) / 86400000);
  let months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  let anchor = new Date(start); anchor.setMonth(start.getMonth() + months);
  if (anchor > now) { months--; anchor = new Date(start); anchor.setMonth(start.getMonth() + months); }
  const restDays = Math.floor((now - anchor) / 86400000);
  const p = (n) => String(n).padStart(2, '0');
  $('daysNum').textContent = days.toLocaleString('vi-VN');
  $('breakdown').textContent =
    `${months} tháng ${restDays} ngày · ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
}
tick();
setInterval(tick, 1000);

/* ---------- Nhạc ---------- */
const music = $('music');
$('musicBtn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  if (!music.src) music.src = media(musicFile);
  if (music.paused) {
    try { await music.play(); } catch { return; }
  } else music.pause();
  btn.setAttribute('aria-pressed', String(!music.paused));
  btn.setAttribute('aria-label', music.paused ? 'Bật nhạc' : 'Tắt nhạc');
});

/* ---------- Ảnh (nhóm theo tháng) ---------- */
const photoState = { all: [], list: [], sections: [], cols: 0 };
const NO_DATE = 'none';

const tsOf = (p) => (p.taken ? new Date(p.taken).getTime() : -Infinity);
function monthKey(p) {
  if (!p.taken) return NO_DATE;
  const d = new Date(p.taken);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(key) {
  if (key === NO_DATE) return 'Chưa rõ ngày';
  const [y, m] = key.split('-');
  return `Tháng ${Number(m)}/${y}`;
}

async function loadPhotos() {
  try {
    const [manifest, meta, uploaded] = await Promise.all([
      fetch('photos.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch('photo-meta.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      authApiRaw('/api/photos').then((d) => d.photos).catch(() => []), // lỗi thì vẫn hiện ảnh tĩnh
    ]);
    const overrides = meta.photos ?? {};
    const statics = manifest.photos.map((p) => {
      const o = overrides[p.id] ?? {};
      return { ...p, taken: o.date ?? p.taken, caption: o.caption ?? '' };
    });
    photoState.all = [...statics, ...uploaded];
    render();
  } catch (err) {
    console.error(err);
    $('photoError').textContent = 'Không tải được danh sách ảnh.';
    $('photoError').hidden = false;
  }
}

function render() {
  const groups = new Map();
  for (const p of photoState.all) {
    const k = monthKey(p);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }
  // Tháng mới nhất trước, "chưa rõ ngày" cuối cùng; trong tháng thì ảnh mới nhất trước
  const keys = [...groups.keys()].sort((a, b) => (a === NO_DATE) - (b === NO_DATE) || b.localeCompare(a));
  keys.forEach((k) => groups.get(k).sort((a, b) => tsOf(b) - tsOf(a) || a.id.localeCompare(b.id)));

  photoState.list = keys.flatMap((k) => groups.get(k));
  $('photoCount').textContent = `${photoState.all.length} khoảnh khắc`;

  let offset = 0;
  photoState.sections = keys.map((k) => {
    const photos = groups.get(k);
    const section = document.createElement('section');
    section.className = 'month'; section.id = `m-${k}`;
    const head = document.createElement('header'); head.className = 'month-head';
    const h3 = document.createElement('h3'); h3.textContent = monthLabel(k);
    const count = document.createElement('span'); count.className = 'muted small'; count.textContent = `${photos.length} ảnh`;
    head.append(h3, count);
    const grid = document.createElement('div'); grid.className = 'grid';
    section.append(head, grid);
    const entry = { key: k, photos, offset, grid, section };
    offset += photos.length;
    return entry;
  });
  $('months').replaceChildren(...photoState.sections.map((s) => s.section));

  $('chips').replaceChildren(
    ...photoState.sections.map((s) => {
      const a = document.createElement('a');
      a.className = 'chip'; a.href = `#m-${s.key}`;
      a.append(monthLabel(s.key));
      const small = document.createElement('small'); small.textContent = s.photos.length;
      a.append(small);
      return a;
    })
  );
  layoutGrids();
}

const colCount = () => (innerWidth < 600 ? 2 : innerWidth < 900 ? 3 : 4);

function layoutGrids() {
  const n = colCount();
  photoState.cols = n;
  for (const s of photoState.sections) {
    const cols = Array.from({ length: n }, () => Object.assign(document.createElement('div'), { className: 'col' }));
    const heights = Array(n).fill(0);
    s.photos.forEach((p, i) => {
      let c = 0;
      for (let k = 1; k < n; k++) if (heights[k] < heights[c]) c = k;
      heights[c] += p.h / p.w;
      cols[c].append(makeTile(p, s.offset + i));
    });
    s.grid.replaceChildren(...cols);
  }
}

function makeTile(p, index) {
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'tile';
  btn.style.aspectRatio = `${p.w} / ${p.h}`;
  btn.style.background = p.color;
  btn.setAttribute('aria-label', `Xem ảnh ${index + 1}`);
  const img = new Image();
  img.width = p.w; img.height = p.h; img.alt = p.caption || '';
  img.loading = 'lazy'; img.decoding = 'async';
  img.addEventListener('load', () => img.classList.add('loaded'));
  img.src = media(`thumb/${p.id}.webp`);
  if (img.complete) img.classList.add('loaded');
  btn.append(img);
  btn.addEventListener('click', () => openLightbox(index));
  return btn;
}

let resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (photoState.all.length && colCount() !== photoState.cols) layoutGrids(); }, 150);
});

/* ---------- Upload ảnh ---------- */
const THUMB_W = 480, FULL_SIDE = 1600, MAX_ORIGINAL = 20 * 1024 * 1024, UPLOAD_CONCURRENCY = 2;

const canvasBlob = (canvas, quality) =>
  new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b && b.type === 'image/webp' ? resolve(b) : reject(new Error('Trình duyệt không xuất được WebP'))), 'image/webp', quality)
  );

// Resize ngay trên trình duyệt: không cần dịch vụ xử lý ảnh phía server.
async function prepareImage(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => {
    throw new Error('Không đọc được ảnh (HEIC chưa hỗ trợ — hãy dùng JPEG/PNG)');
  });
  try {
    const draw = (w, h) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(bmp, 0, 0, w, h);
      return c;
    };
    const { width: W, height: H } = bmp;
    const ts = Math.min(1, THUMB_W / W), fs = Math.min(1, FULL_SIDE / Math.max(W, H));
    const tw = Math.max(1, Math.round(W * ts)), th = Math.max(1, Math.round(H * ts));
    const thumbCanvas = draw(tw, th);
    const [thumb, full] = await Promise.all([
      canvasBlob(thumbCanvas, 0.72),
      canvasBlob(draw(Math.max(1, Math.round(W * fs)), Math.max(1, Math.round(H * fs))), 0.8),
    ]);
    const px = draw(1, 1).getContext('2d').getImageData(0, 0, 1, 1).data;
    const color = '#' + [...px].slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
    return { thumb, full, meta: { w: tw, h: th, color } };
  } finally { bmp.close(); }
}

async function uploadFile(file) {
  if (file.size > MAX_ORIGINAL) throw new Error('Ảnh quá lớn (tối đa 20 MB)');
  const { thumb, full, meta } = await prepareImage(file);
  const form = new FormData();
  form.append('thumb', thumb, 'thumb.webp');
  form.append('full', full, 'full.webp');
  form.append('original', file, file.name);
  form.append('meta', JSON.stringify(meta));
  const res = await fetch(`${apiBase}/api/photos`, { method: 'POST', headers: { authorization: `Bearer ${getToken()}` }, body: form });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { setToken(''); showLock('Hết phiên, hãy đăng nhập lại.'); }
  if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
  return data.photo;
}

async function handleFiles(files) {
  const list = [...files].filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/i.test(f.name));
  if (!list.length) return;
  const panel = $('uploadPanel'), ul = $('uploadList');
  panel.hidden = false; ul.replaceChildren();
  const rows = list.map((f) => {
    const li = document.createElement('li');
    const name = Object.assign(document.createElement('span'), { className: 'name', textContent: f.name });
    const st = Object.assign(document.createElement('span'), { className: 'st', textContent: 'Chờ…' });
    li.append(name, st); ul.append(li);
    return st;
  });
  let next = 0, ok = 0, failed = 0;
  const setTitle = () => { $('uploadTitle').textContent = `Đã tải ${ok}/${list.length}${failed ? ` · ${failed} lỗi` : ''}`; };
  setTitle();
  await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, async () => {
    while (next < list.length) {
      const i = next++;
      rows[i].textContent = 'Đang tải…';
      try {
        photoState.all.push(await uploadFile(list[i]));
        rows[i].textContent = '✓ Xong'; rows[i].className = 'st ok'; ok++;
      } catch (e) {
        rows[i].textContent = `✗ ${e.message}`; rows[i].className = 'st err'; failed++;
      }
      setTitle();
    }
  }));
  if (ok) render();
}

$('uploadBtn').addEventListener('click', () => $('fileInput').click());
$('fileInput').addEventListener('change', (e) => { handleFiles(e.target.files); e.target.value = ''; });
$('uploadClose').addEventListener('click', () => { $('uploadPanel').hidden = true; });

/* ---------- Lightbox ---------- */
const lb = $('lightbox');
let lbIndex = 0;

function showPhoto(i) {
  const list = photoState.list;
  lbIndex = (i + list.length) % list.length;
  const p = list[lbIndex];
  const img = $('lbImg');
  const fullUrl = media(`full/${p.id}.webp`);
  img.alt = p.caption || '';
  img.src = media(`thumb/${p.id}.webp`); // hiện bản nhỏ ngay, thay bằng bản lớn khi tải xong
  const full = new Image();
  full.onload = () => { if (list[lbIndex] === p) img.src = fullUrl; };
  full.src = fullUrl;
  const parts = [p.caption, p.taken ? fmtDate.format(new Date(p.taken)) : ''].filter(Boolean);
  $('lbCaption').textContent = parts.join(' · ');
  $('lbCount').textContent = `${lbIndex + 1} / ${list.length}`;
  $('lbOriginal').href = media(`original/${encodeURIComponent(p.original)}`);
  $('lbDelete').hidden = !p.uploaded; // chỉ xoá được ảnh upload từ web
  [1, -1].forEach((d) => { new Image().src = media(`full/${list[(lbIndex + d + list.length) % list.length].id}.webp`); });
}

function openLightbox(i) {
  showPhoto(i);
  lb.showModal();
  document.documentElement.style.overflow = 'hidden';
}
lb.addEventListener('close', () => { document.documentElement.style.overflow = ''; });
$('lbClose').addEventListener('click', () => lb.close());
$('lbPrev').addEventListener('click', () => showPhoto(lbIndex - 1));
$('lbNext').addEventListener('click', () => showPhoto(lbIndex + 1));
lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
lb.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') showPhoto(lbIndex - 1);
  if (e.key === 'ArrowRight') showPhoto(lbIndex + 1);
});
let touchX = null;
lb.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) showPhoto(lbIndex + (dx < 0 ? 1 : -1));
  touchX = null;
});

$('lbDelete').addEventListener('click', async () => {
  const p = photoState.list[lbIndex];
  if (!p?.uploaded || !confirm('Xoá ảnh này vĩnh viễn (cả ảnh gốc)?')) return;
  try {
    await authApiRaw(`/api/photos?id=${p.id}`, { method: 'DELETE' });
    photoState.all = photoState.all.filter((x) => x.id !== p.id);
    lb.close();
    render();
  } catch (e) { alert(e.message); }
});

/* ---------- Ghi chú ---------- */
const PASS_KEY = 'ourweb.pass';
const getPass = () => { try { return sessionStorage.getItem(PASS_KEY) ?? ''; } catch { return ''; } };
const setPass = (v) => { try { v ? sessionStorage.setItem(PASS_KEY, v) : sessionStorage.removeItem(PASS_KEY); } catch {} };

async function api(method, { pass = getPass(), body, query = '' } = {}) {
  const res = await fetch(`${apiBase}/api/notes${query}`, {
    method,
    headers: { 'x-passcode': pass, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Lỗi ${res.status}`), { status: res.status });
  return data;
}

const showError = (el, msg) => { el.textContent = msg; el.hidden = !msg; };

function renderNotes(notes) {
  $('notesEmpty').hidden = notes.length > 0;
  $('notesList').replaceChildren(
    ...notes.map((n) => {
      const li = document.createElement('li'); li.className = 'note';
      const p = document.createElement('p'); p.textContent = n.content; // textContent → không bị XSS
      const foot = document.createElement('footer');
      const left = document.createElement('span');
      if (n.author) {
        const who = document.createElement('span'); who.className = 'who';
        who.textContent = n.author === 'anh' ? 'Anh' : 'Em';
        left.append(who, ' · ');
      }
      left.append(fmtDateTime.format(new Date(n.created_at)));
      const del = document.createElement('button');
      del.type = 'button'; del.className = 'del'; del.textContent = 'Xoá';
      del.addEventListener('click', async () => {
        if (!confirm('Xoá thư này?')) return;
        try { await api('DELETE', { query: `?id=${n.id}` }); await refreshNotes(); }
        catch (e) { showError($('noteError'), e.message); }
      });
      foot.append(left, del);
      li.append(p, foot);
      return li;
    })
  );
}

async function refreshNotes() {
  const { notes } = await api('GET');
  renderNotes(notes);
}

function setUnlocked(on) {
  $('lockForm').hidden = on;
  $('notesPanel').hidden = !on;
}

$('lockForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pass = $('passInput').value;
  showError($('lockError'), '');
  try {
    const { notes } = await api('GET', { pass });
    setPass(pass);
    $('passInput').value = '';
    setUnlocked(true);
    renderNotes(notes);
  } catch (err) {
    showError($('lockError'), err.status === 401 ? 'Sai mật khẩu rồi 🥺' : err.message);
  }
});

$('noteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = $('noteText').value.trim();
  if (!content) return;
  const author = document.querySelector('input[name="author"]:checked')?.value ?? null;
  const btn = $('noteSend');
  btn.disabled = true; showError($('noteError'), '');
  try {
    await api('POST', { body: { content, author } });
    $('noteText').value = '';
    await refreshNotes();
  } catch (err) {
    showError($('noteError'), err.status === 401 ? 'Phiên hết hạn, hãy mở khoá lại.' : err.message);
    if (err.status === 401) { setPass(''); setUnlocked(false); }
  } finally { btn.disabled = false; }
});

$('noteText').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('noteForm').requestSubmit();
});
document.querySelectorAll('input[name="author"]').forEach((r) =>
  r.addEventListener('change', () => { try { localStorage.setItem('ourweb.author', r.value); } catch {} })
);
try {
  const a = localStorage.getItem('ourweb.author');
  if (a) document.querySelector(`input[name="author"][value="${a}"]`).checked = true;
} catch {}

$('lockBtn').addEventListener('click', () => { setPass(''); setUnlocked(false); });

// Tự mở nếu phiên còn mật khẩu
if (getPass()) refreshNotes().then(() => setUnlocked(true)).catch(() => setPass(''));

/* ---------- Màn khoá + đổi mật khẩu ---------- */
const TOKEN_KEY = 'ourweb.token';
const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) ?? ''; } catch { return ''; } };
const setToken = (v) => { try { v ? localStorage.setItem(TOKEN_KEY, v) : localStorage.removeItem(TOKEN_KEY); } catch {} };

async function authApi(action, body) {
  const res = await fetch(`${apiBase}/api/auth${action ? `?action=${action}` : ''}`, {
    method: body ? 'POST' : 'GET',
    headers: { authorization: `Bearer ${getToken()}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Lỗi ${res.status}`), { status: res.status });
  return data;
}

async function authApiRaw(path, { method = 'GET' } = {}) {
  const res = await fetch(`${apiBase}${path}`, { method, headers: { authorization: `Bearer ${getToken()}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Lỗi ${res.status}`), { status: res.status });
  return data;
}

let entered = false;
function enter() {
  document.body.classList.remove('locked');
  if (entered) return;
  entered = true;
  $('hero').style.backgroundImage = `url("${media('hero.webp')}")`;
  loadPhotos();
}

function showLock(message) {
  document.body.classList.add('locked');
  $('lockMsg').textContent = message;
  $('loginPass').focus();
}

async function checkGate() {
  try {
    const { configured, authenticated } = await authApi();
    if (authenticated) return enter();
    setToken('');
    showLock(configured ? 'Nhập mật khẩu để vào.' : 'Chưa cài mật khẩu. Chạy "npm run auth:set" để cài.');
  } catch {
    showLock('Không kết nối được máy chủ. Tải lại trang để thử lại.');
  }
}

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('loginBtn');
  btn.disabled = true; showError($('loginError'), '');
  try {
    const { token } = await authApi('login', { password: $('loginPass').value });
    setToken(token);
    $('loginPass').value = '';
    enter();
  } catch (err) {
    showError($('loginError'), err.status === 401 ? 'Sai mật khẩu rồi 🥺' : err.message);
  } finally { btn.disabled = false; }
});

$('logoutBtn').addEventListener('click', () => { setToken(''); location.reload(); });

const pwDialog = $('pwDialog');
$('changePwBtn').addEventListener('click', () => { $('pwForm').reset(); showError($('pwError'), ''); pwDialog.showModal(); });
$('pwCancel').addEventListener('click', () => pwDialog.close());
$('pwForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if ($('pwNext').value !== $('pwNext2').value) return showError($('pwError'), 'Hai mật khẩu mới không khớp.');
  $('pwSave').disabled = true; showError($('pwError'), '');
  try {
    const { token } = await authApi('change', { current: $('pwCurrent').value, next: $('pwNext').value });
    setToken(token);
    pwDialog.close();
    alert('Đã đổi mật khẩu 💕');
  } catch (err) {
    showError($('pwError'), err.message);
  } finally { $('pwSave').disabled = false; }
});

checkGate();
