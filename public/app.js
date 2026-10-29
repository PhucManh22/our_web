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

/* ---------- Ảnh ---------- */
const photoState = { all: [], list: [], cols: 0, heights: [], colEls: [], shown: 0 };
const grid = $('grid');

function albumOf(p) {
  if (p.album) return p.album;
  if (!p.taken) return 'Khoảnh khắc khác';
  const d = new Date(p.taken);
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
}

async function loadPhotos() {
  try {
    const [manifest, meta] = await Promise.all([
      fetch('photos.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch('photo-meta.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ]);
    const overrides = meta.photos ?? {};
    photoState.all = manifest.photos.map((p) => {
      const o = overrides[p.id] ?? {};
      return { ...p, taken: o.date ?? p.taken, caption: o.caption ?? '', album: o.album };
    });
    // Ảnh có ngày (mới nhất trước) rồi tới ảnh chưa rõ ngày
    photoState.all.sort((a, b) => (b.taken ?? '').localeCompare(a.taken ?? '') || a.id.localeCompare(b.id));
    $('photoCount').textContent = `${photoState.all.length} khoảnh khắc`;
    buildChips();
    applyFilter('Tất cả');
  } catch (err) {
    console.error(err);
    $('photoError').textContent = 'Không tải được danh sách ảnh.';
    $('photoError').hidden = false;
  }
}

function buildChips() {
  const counts = new Map();
  photoState.all.forEach((p) => counts.set(albumOf(p), (counts.get(albumOf(p)) ?? 0) + 1));
  const names = ['Tất cả', ...counts.keys()];
  $('chips').replaceChildren(
    ...names.map((name) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.album = name;
      b.append(name);
      const s = document.createElement('small');
      s.textContent = name === 'Tất cả' ? photoState.all.length : counts.get(name);
      b.append(s);
      b.addEventListener('click', () => applyFilter(name));
      return b;
    })
  );
}

function applyFilter(name) {
  photoState.list = name === 'Tất cả' ? photoState.all : photoState.all.filter((p) => albumOf(p) === name);
  document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.album === name)));
  relayout();
}

const colCount = () => (grid.clientWidth < 560 ? 2 : grid.clientWidth < 900 ? 3 : 4);

function relayout() {
  const n = colCount();
  photoState.cols = n;
  photoState.heights = Array(n).fill(0);
  photoState.colEls = Array.from({ length: n }, () => Object.assign(document.createElement('div'), { className: 'col' }));
  grid.replaceChildren(...photoState.colEls);
  photoState.shown = 0;
  appendMore(36);
  io.unobserve($('sentinel')); io.observe($('sentinel'));
}

function appendMore(batch = 36) {
  const { list, heights, colEls } = photoState;
  const end = Math.min(photoState.shown + batch, list.length);
  for (let i = photoState.shown; i < end; i++) {
    const p = list[i];
    let c = 0;
    for (let k = 1; k < heights.length; k++) if (heights[k] < heights[c]) c = k;
    heights[c] += p.h / p.w;
    colEls[c].append(makeTile(p, i));
  }
  photoState.shown = end;
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

const io = new IntersectionObserver((entries) => {
  if (!entries[0].isIntersecting || photoState.shown >= photoState.list.length) return;
  appendMore();
  io.unobserve($('sentinel')); io.observe($('sentinel')); // kích lại nếu vẫn đang trong tầm nhìn
}, { rootMargin: '900px' });

let resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (photoState.all.length && colCount() !== photoState.cols) relayout(); }, 150);
});

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
