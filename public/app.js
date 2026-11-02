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
  const cm = $('chipMonths'), cd = $('chipDays'), ch = $('chipHours'), cmin = $('chipMins'), cs = $('chipSecs');
  if (cm) cm.textContent = months;
  if (cd) cd.textContent = restDays;
  if (ch) ch.textContent = p(now.getHours());
  if (cmin) cmin.textContent = p(now.getMinutes());
  if (cs) cs.textContent = p(now.getSeconds());
}
tick();
setInterval(tick, 1000);

/* ---------- Nhạc ---------- */
const music = $('music');
const musicBtn = $('musicBtn');
function setMusicUi(playing) {
  musicBtn.classList.toggle('playing', playing);
  musicBtn.setAttribute('aria-pressed', String(playing));
  musicBtn.setAttribute('aria-label', playing ? 'Tắt nhạc' : 'Bật nhạc');
}
musicBtn.addEventListener('click', async () => {
  if (!music.src) music.src = media(musicFile);
  if (music.paused) {
    try { await music.play(); setMusicUi(true); } catch { return; }
  } else {
    music.pause();
    setMusicUi(false);
  }
});
music.addEventListener('play', () => setMusicUi(true));
music.addEventListener('pause', () => setMusicUi(false));

/* ---------- Hạt lơ lửng Hero (Ambient Particles) ---------- */
function initHeroParticles() {
  const canvas = $('heroParticles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let w = (canvas.width = canvas.offsetWidth);
  let h = (canvas.height = canvas.offsetHeight);

  const particles = Array.from({ length: 26 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 2.8 + 1.2,
    speedY: Math.random() * 0.5 + 0.2,
    speedX: (Math.random() - 0.5) * 0.3,
    alpha: Math.random() * 0.45 + 0.25,
    heart: Math.random() > 0.65,
    pulse: Math.random() * Math.PI,
  }));

  function drawHeart(x, y, size, a) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 10, size / 10);
    ctx.fillStyle = `rgba(255, 110, 140, ${a})`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-5, -5, -10, 2, 0, 10);
    ctx.bezierCurveTo(10, 2, 5, -5, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  let active = true;
  function loop() {
    if (!active) return;
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.y -= p.speedY;
      p.x += p.speedX;
      p.pulse += 0.02;
      const currentAlpha = Math.max(0.1, p.alpha + Math.sin(p.pulse) * 0.15);

      if (p.heart) {
        drawHeart(p.x, p.y, p.r * 2.6, currentAlpha);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 225, 230, ${currentAlpha})`;
        ctx.shadowColor = 'rgba(255, 120, 150, 0.4)';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
    }
    requestAnimationFrame(loop);
  }

  const resize = () => {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  };
  window.addEventListener('resize', resize, { passive: true });

  const obs = new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting;
    if (active) requestAnimationFrame(loop);
  }, { threshold: 0.05 });
  obs.observe($('hero'));
}
initHeroParticles();

/* ---------- 3D Hero Parallax Tilt ---------- */
function initHero3DTilt() {
  const card = $('heroCard');
  const glare = $('heroCardGlare');
  if (!card) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;
  const onMove = (e) => {
    const rect = card.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) / rect.width - 0.5;
    const y = (clientY - rect.top) / rect.height - 0.5;

    if (!ticking) {
      requestAnimationFrame(() => {
        card.style.transform = `perspective(1200px) rotateX(${-y * 22}deg) rotateY(${x * 22}deg) translateY(-4px)`;
        if (glare) {
          glare.style.opacity = '1';
          glare.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,0.45) 0%, transparent 60%)`;
        }
        ticking = false;
      });
      ticking = true;
    }
  };

  const onLeave = () => {
    card.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0)';
    if (glare) glare.style.opacity = '0';
  };

  card.addEventListener('mousemove', onMove);
  card.addEventListener('mouseleave', onLeave);
  card.addEventListener('touchmove', onMove, { passive: true });
  card.addEventListener('touchend', onLeave);
}
initHero3DTilt();

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
    const [manifest, meta, remote] = await Promise.all([
      fetch('photos.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch('photo-meta.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      authApiRaw('/api/photos').catch(() => ({ photos: [], deleted: [] })), // lỗi thì vẫn hiện ảnh tĩnh
    ]);
    const overrides = meta.photos ?? {};
    const hidden = new Set(remote.deleted ?? []);
    const statics = manifest.photos.filter((p) => !hidden.has(p.id)).map((p) => {
      const o = overrides[p.id] ?? {};
      return { ...p, taken: o.date ?? p.taken ?? meta.defaultDate ?? null, caption: o.caption ?? '' };
    });
    photoState.all = [...statics, ...(remote.photos ?? [])];
    render();
  } catch (err) {
    console.error(err);
    $('photoError').textContent = 'Không tải được danh sách ảnh.';
    $('photoError').hidden = false;
  }
}

let activeMonth = null;
let currentMonthPhotos = [];
let viewMode = '3d';

function setViewMode(mode) {
  viewMode = mode;
  const is3d = mode === '3d';
  $('view3dBtn')?.classList.toggle('active', is3d);
  $('view3dBtn')?.setAttribute('aria-selected', String(is3d));
  $('viewGridBtn')?.classList.toggle('active', !is3d);
  $('viewGridBtn')?.setAttribute('aria-selected', String(!is3d));
  $('coverflowSection').hidden = !is3d;
  $('gridSection').hidden = is3d;
  if (!is3d) layoutGrids();
}

function selectMonth(key) {
  activeMonth = key;
  document.querySelectorAll('#chips .chip').forEach((c) => {
    c.classList.toggle('active', c.dataset.month === key);
  });
  currentMonthPhotos = photoState.groups.get(key) || [];
  $('activeMonthTitle').textContent = monthLabel(key);
  $('activeMonthCount').textContent = `${currentMonthPhotos.length} khoảnh khắc`;

  initMonthCoverflow(currentMonthPhotos);
  renderMonthGrid(currentMonthPhotos);
}

function render() {
  const groups = new Map();
  for (const p of photoState.all) {
    const k = monthKey(p);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }
  const keys = [...groups.keys()].sort((a, b) => (a === NO_DATE) - (b === NO_DATE) || b.localeCompare(a));
  keys.forEach((k) => groups.get(k).sort((a, b) => tsOf(b) - tsOf(a) || a.id.localeCompare(b.id)));

  photoState.groups = groups;
  photoState.keys = keys;
  photoState.list = keys.flatMap((k) => groups.get(k));
  $('photoCount').textContent = `${photoState.all.length} khoảnh khắc`;

  if (!keys.length) return;

  $('chips').replaceChildren(
    ...keys.map((k) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.dataset.month = k;
      const span = document.createElement('span');
      span.textContent = monthLabel(k);
      const small = document.createElement('small');
      small.textContent = groups.get(k).length;
      btn.append(span, small);
      btn.addEventListener('click', () => selectMonth(k));
      return btn;
    })
  );

  $('view3dBtn').onclick = () => setViewMode('3d');
  $('viewGridBtn').onclick = () => setViewMode('grid');

  const targetMonth = activeMonth && groups.has(activeMonth) ? activeMonth : keys[0];
  selectMonth(targetMonth);
}

function renderMonthGrid(photos) {
  const gridContainer = $('months');
  gridContainer.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'grid';
  grid.id = 'activeMonthGrid';
  gridContainer.appendChild(grid);
  photoState.activeGrid = grid;
  photoState.activePhotos = photos;
  layoutGrids();
}

const colCount = () => (innerWidth < 600 ? 2 : innerWidth < 900 ? 3 : 4);

function layoutGrids() {
  if (!photoState.activeGrid || !photoState.activePhotos) return;
  const n = colCount();
  photoState.cols = n;
  const cols = Array.from({ length: n }, () => Object.assign(document.createElement('div'), { className: 'col' }));
  const heights = Array(n).fill(0);
  photoState.activePhotos.forEach((p) => {
    let c = 0;
    for (let k = 1; k < n; k++) if (heights[k] < heights[c]) c = k;
    heights[c] += p.h / p.w;
    const globalIdx = photoState.list.indexOf(p);
    cols[c].append(makeTile(p, globalIdx >= 0 ? globalIdx : 0));
  });
  photoState.activeGrid.replaceChildren(...cols);
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
  btn.dataset.id = p.id;
  if (selected.has(p.id)) btn.classList.add('selected');
  btn.addEventListener('click', () => (selecting ? toggleSelect(p, btn) : openLightbox(index)));
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      btn.style.transform = `perspective(800px) rotateX(${-y * 18}deg) rotateY(${x * 18}deg) translateZ(16px) scale(1.03)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0) scale(1)';
    });
  }
  return btn;
}

/* ---------- 3D Coverflow Controller (Ultra-Smooth Mobile Engine) ---------- */
let cfPhotos = [];
let cfActive = 0;
let cfPool = [];
let fullUpgradeTimer = null;

function ensureCoverflowPool() {
  const container = $('coverflow');
  if (!container) return;
  if (cfPool.length === 7 && container.children.length === 7) return;

  container.innerHTML = '';
  const offsets = [-3, -2, -1, 0, 1, 2, 3];
  cfPool = offsets.map((offset, slotIdx) => {
    const el = document.createElement('div');
    el.className = 'cf-item';
    const img = document.createElement('img');
    img.loading = 'eager';
    img.decoding = 'async';
    const cap = document.createElement('div');
    cap.className = 'cf-caption';
    el.append(img, cap);

    el.addEventListener('click', () => {
      const node = cfPool[slotIdx];
      if (!node || node.idx < 0) return;
      if (node.idx === cfActive) {
        const globalIdx = photoState.list.indexOf(node.photo);
        openLightbox(globalIdx >= 0 ? globalIdx : 0);
      } else {
        setCfActive(node.idx);
      }
    });

    container.append(el);
    return { el, img, cap, photo: null, idx: -1, offset };
  });
}

function initMonthCoverflow(photos) {
  cfPhotos = photos;
  cfActive = 0;
  ensureCoverflowPool();

  const sc = $('cfScrubber');
  if (sc) {
    sc.min = 0;
    sc.max = Math.max(0, photos.length - 1);
    sc.value = 0;
    let scrubRaf = null;
    sc.oninput = (e) => {
      cancelAnimationFrame(scrubRaf);
      scrubRaf = requestAnimationFrame(() => setCfActive(Number(e.target.value)));
    };
  }
  $('cfCounter').textContent = `${photos.length ? 1 : 0} / ${photos.length}`;
  updatePoolCards(0);
}

function setCfActive(idx) {
  if (!cfPhotos.length) return;
  cfActive = Math.max(0, Math.min(idx, cfPhotos.length - 1));
  const sc = $('cfScrubber');
  if (sc && Number(sc.value) !== cfActive) sc.value = cfActive;
  $('cfCounter').textContent = `${cfActive + 1} / ${cfPhotos.length}`;
  updatePoolCards(0);
}

function calculate3DTransform(offset) {
  const x = offset;
  const absX = Math.abs(x);
  const sign = x < 0 ? -1 : x > 0 ? 1 : 0;

  let tx = x * 190;
  let tz = (1 - Math.min(1, absX)) * 160 - Math.max(0, absX - 1) * 115;
  let ry = -sign * Math.min(55, absX * 38);
  let scale = Math.max(0.65, 1.08 - absX * 0.16);
  let opacity = Math.max(0, Math.min(1, 1.25 - absX * 0.35));
  let zIndex = Math.round(20 - absX * 5);

  if (absX > 3) {
    opacity = 0;
    tz = -300;
  }

  return {
    transform: `translate3d(${tx}px, 0, ${tz}px) rotateY(${ry}deg) scale(${scale})`,
    opacity,
    zIndex,
    filter: `brightness(${Math.max(0.45, 1 - absX * 0.18)})`,
  };
}

function updatePoolCards(dragShift = 0) {
  if (!cfPool.length || !cfPhotos.length) return;
  const total = cfPhotos.length;

  cfPool.forEach((node) => {
    const virtualIdx = cfActive + node.offset;
    const effectiveOffset = node.offset + dragShift;
    const style = calculate3DTransform(effectiveOffset);

    if (virtualIdx < 0 || virtualIdx >= total) {
      node.el.style.opacity = '0';
      node.el.style.pointerEvents = 'none';
      node.idx = -1;
      node.photo = null;
      return;
    }

    const p = cfPhotos[virtualIdx];
    node.photo = p;
    node.idx = virtualIdx;
    node.el.style.pointerEvents = 'auto';

    const isActive = node.offset === 0 && Math.abs(dragShift) < 0.35;
    node.el.classList.toggle('active', isActive);

    node.el.style.transform = style.transform;
    node.el.style.opacity = String(style.opacity);
    node.el.style.zIndex = String(style.zIndex);
    node.el.style.filter = style.filter;

    const thumbSrc = media(`thumb/${p.id}.webp`);
    if (node.img.src !== thumbSrc && !node.img.src.includes(p.id)) {
      node.img.src = thumbSrc;
    }

    node.cap.textContent = p.caption || (p.taken ? fmtDate.format(new Date(p.taken)) : `Ảnh ${virtualIdx + 1}`);
  });

  clearTimeout(fullUpgradeTimer);
  if (Math.abs(dragShift) < 0.05) {
    fullUpgradeTimer = setTimeout(() => {
      const centerNode = cfPool.find((n) => n.offset === 0);
      if (centerNode && centerNode.photo) {
        centerNode.img.src = media(`full/${centerNode.photo.id}.webp`);
      }
    }, 200);
  }
}

/* ---------- Direct Touch Drag with Momentum Physics ---------- */
const cfWrap = $('coverflowWrap');
const cfContainer = $('coverflow');

$('cfPrev')?.addEventListener('click', () => setCfActive(cfActive - 1));
$('cfNext')?.addEventListener('click', () => setCfActive(cfActive + 1));

if (cfWrap && cfContainer) {
  let isDragging = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let dragShift = 0;
  let lastTouchX = 0;
  let lastTouchTime = 0;
  let velocity = 0;
  let isHorizontal = null;

  cfWrap.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || !cfPhotos.length) return;
    isDragging = true;
    touchStartX = lastTouchX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    lastTouchTime = performance.now();
    dragShift = 0;
    velocity = 0;
    isHorizontal = null;
  }, { passive: true });

  cfWrap.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    if (isHorizontal === null) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) {
        isHorizontal = false;
        isDragging = false;
        return;
      }
      if (Math.abs(dx) > 6) {
        isHorizontal = true;
        cfContainer.classList.add('dragging');
      }
    }

    if (!isHorizontal) return;

    const now = performance.now();
    const dt = now - lastTouchTime;
    if (dt > 8) {
      velocity = (touch.clientX - lastTouchX) / dt;
      lastTouchX = touch.clientX;
      lastTouchTime = now;
    }

    dragShift = dx / 170;
    requestAnimationFrame(() => updatePoolCards(dragShift));
  }, { passive: true });

  const endDrag = () => {
    if (!isDragging && !cfContainer.classList.contains('dragging')) return;
    isDragging = false;
    cfContainer.classList.remove('dragging');

    let target = cfActive;
    if (Math.abs(velocity) > 0.35) {
      target -= Math.sign(velocity);
    } else if (Math.abs(dragShift) > 0.35) {
      target -= Math.sign(dragShift);
    }
    dragShift = 0;
    setCfActive(target);
  };

  cfWrap.addEventListener('touchend', endDrag);
  cfWrap.addEventListener('touchcancel', endDrag);
}
let resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (photoState.all.length && colCount() !== photoState.cols) layoutGrids(); }, 150);
});

/* ---------- Chọn & xoá ảnh ---------- */
let selecting = false;
const selected = new Map(); // id → photo

async function deletePhotos(list) {
  const { deleted } = await authApiRaw('/api/photos?action=delete', {
    method: 'POST',
    body: { items: list.map((p) => ({ id: p.id, original: p.original })) },
  });
  const gone = new Set(deleted);
  photoState.all = photoState.all.filter((p) => !gone.has(p.id));
  render();
  if (deleted.length < list.length) alert(`Chỉ xoá được ${deleted.length}/${list.length} ảnh (một số tên file lạ).`);
}

function updateSelectBar() {
  $('selectCount').textContent = `Đã chọn ${selected.size}`;
  $('selectDelete').disabled = selected.size === 0;
}
function setSelecting(on) {
  selecting = on;
  selected.clear();
  document.body.classList.toggle('selecting', on);
  $('selectBar').hidden = !on;
  $('selectBtn').textContent = on ? 'Xong' : 'Chọn ảnh';
  document.querySelectorAll('.tile.selected').forEach((t) => t.classList.remove('selected'));
  updateSelectBar();
}
function toggleSelect(p, btn) {
  if (selected.has(p.id)) { selected.delete(p.id); btn.classList.remove('selected'); }
  else { selected.set(p.id, p); btn.classList.add('selected'); }
  updateSelectBar();
}

$('selectBtn').addEventListener('click', () => setSelecting(!selecting));
$('selectCancel').addEventListener('click', () => setSelecting(false));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && selecting && !lb.open) setSelecting(false); });
$('selectDelete').addEventListener('click', async () => {
  const list = [...selected.values()];
  if (!list.length || !confirm(`Xoá vĩnh viễn ${list.length} ảnh (cả ảnh gốc trên R2)?\nKhông khôi phục được.`)) return;
  $('selectDelete').disabled = true;
  try { await deletePhotos(list); setSelecting(false); }
  catch (e) { alert(e.message); updateSelectBar(); }
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
    throw new Error('Không đọc được ảnh — hãy thử JPEG/PNG');
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

// iPhone: Safari thường tự đổi HEIC → JPEG khi chọn ảnh; nếu file vẫn là HEIC (Chrome/Firefox, file chép từ máy) thì chuyển ngay trên trình duyệt.
const isHeic = (f) => /^image\/hei[cf]/i.test(f.type) || /\.(heic|heif)$/i.test(f.name);
let heicLoader;
const loadHeic = () => (heicLoader ??= new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = 'vendor/heic2any.min.js'; // chỉ tải (~1,3 MB) khi thật sự có ảnh HEIC
  s.onload = () => resolve(window.heic2any);
  s.onerror = () => { heicLoader = null; reject(new Error('Không tải được bộ chuyển HEIC')); };
  document.head.append(s);
}));
// heic2any dùng một bộ giải mã chung, gọi song song là kẹt → xếp hàng từng file; quá 60 giây thì báo lỗi thay vì treo.
let heicQueue = Promise.resolve();
async function convertHeic(file) {
  const heic2any = await loadHeic();
  const task = heicQueue.then(() =>
    Promise.race([
      heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 60000)),
    ])
  );
  heicQueue = task.catch(() => {}); // lỗi của file này không chặn các file sau
  let out;
  try { out = await task; }
  catch { throw new Error('Không chuyển được HEIC này — hãy xuất sang JPEG rồi thử lại'); }
  return new File([Array.isArray(out) ? out[0] : out], file.name.replace(/\.(heic|heif)$/i, '') + '.jpg', { type: 'image/jpeg' });
}

async function uploadFile(file, onStatus = () => {}) {
  if (isHeic(file)) { onStatus('Đang chuyển HEIC…'); file = await convertHeic(file); onStatus('Đang tải…'); }
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

let panelTimer;
async function handleFiles(files) {
  clearTimeout(panelTimer);
  const list = [...files].filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
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
        photoState.all.push(await uploadFile(list[i], (t) => { rows[i].textContent = t; }));
        rows[i].textContent = '✓ Xong'; rows[i].className = 'st ok'; ok++;
      } catch (e) {
        rows[i].textContent = `✗ ${e.message}`; rows[i].className = 'st err'; failed++;
      }
      setTitle();
    }
  }));
  if (ok) render();
  if (!failed) panelTimer = setTimeout(() => { panel.hidden = true; }, 3000); // thành công hết thì tự ẩn; có lỗi thì giữ lại để đọc
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
  $('lbDelete').hidden = false;
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
  if (!p || !confirm('Xoá vĩnh viễn ảnh này (cả ảnh gốc trên R2)?\nKhông khôi phục được.')) return;
  try { lb.close(); await deletePhotos([p]); }
  catch (e) { alert(e.message); }
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

async function authApiRaw(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${apiBase}${path}`, {
    method,
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
window.enter = enter;

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
