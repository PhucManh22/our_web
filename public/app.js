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
  // Dùng giờ Việt Nam cho phép tính lịch, không phụ thuộc múi giờ thiết bị.
  const offset = 7 * 3600000;
  const now = new Date(Date.now() + offset);
  const start = new Date(new Date(startDate).getTime() + offset);
  const days = Math.max(0, Math.floor((now - start) / 86400000));
  let months = (now.getUTCFullYear() - start.getUTCFullYear()) * 12 + now.getUTCMonth() - start.getUTCMonth();
  let anchor = new Date(start); anchor.setUTCMonth(start.getUTCMonth() + months);
  if (anchor > now) { months--; anchor = new Date(start); anchor.setUTCMonth(start.getUTCMonth() + months); }
  const elapsed = Math.max(0, now - anchor);
  const restDays = Math.floor(elapsed / 86400000);
  const p = (n) => String(n).padStart(2, '0');
  const hours = Math.floor(elapsed / 3600000) % 24, minutes = Math.floor(elapsed / 60000) % 60, seconds = Math.floor(elapsed / 1000) % 60;
  $('daysNum').textContent = days.toLocaleString('vi-VN');
  $('breakdown').textContent = `${months} tháng ${restDays} ngày · ${p(hours)}:${p(minutes)}:${p(seconds)}`;
  $('chipYears').textContent = Math.max(0, Math.floor(months / 12));
  $('chipMonths').textContent = Math.max(0, months % 12);
  $('chipDays').textContent = restDays;
  $('chipHours').textContent = p(hours);
  $('chipMins').textContent = p(minutes);
  $('chipSecs').textContent = p(seconds);
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

/* ---------- Background Pháo Hoa Đang Nổ (Fixed Single-Screen Fireworks) ---------- */
function initFireworksBackground() {
  const canvas = $('fireworksCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w = window.innerWidth;
  let h = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // Palette lãng mạn dành riêng cho web kỷ niệm tình yêu
  const PALETTES = [
    // 1. Hồng cánh sen / Rose Gold rực rỡ
    { h: 342, s: 95, l: 68, head: '#ff5485', glow: '#ff2d6c' },
    // 2. Vàng hoàng kim / Champagne lung linh
    { h: 42, s: 100, l: 65, head: '#ffd066', glow: '#ffb703' },
    // 3. Đỏ san hô / Ruby quyến rũ
    { h: 358, s: 92, l: 66, head: '#ff5975', glow: '#e11d48' },
    // 4. Tím mộng mơ / Lavender huyền ảo
    { h: 290, s: 92, l: 72, head: '#e879f9', glow: '#c026d3' },
    // 5. Lam ngọc / Băng tuyết lấp lánh
    { h: 195, s: 95, l: 74, head: '#7dd3fc', glow: '#0284c7' },
    // 6. Trắng ánh kim / Diamond tinh khôi
    { h: 48, s: 80, l: 88, head: '#fef08a', glow: '#ffffff' },
  ];

  const TYPES = ['heart', 'peony', 'willow', 'ring', 'strobe', 'heart'];

  const rockets = [];
  const particles = [];
  const ambientFlashes = [];

  class Rocket {
    constructor(startX, startY, targetX, targetY, palette, type) {
      this.x = startX;
      this.y = startY;
      this.targetX = targetX;
      this.targetY = targetY;
      this.palette = palette;
      this.type = type;

      const dx = targetX - startX;
      const dy = targetY - startY;
      const dist = Math.hypot(dx, dy);
      const speed = Math.max(10, Math.min(16.5, dist / 42));
      const angle = Math.atan2(dy, dx);
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;

      this.trail = [];
      this.maxTrail = 6;
      this.dead = false;
    }

    update() {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > this.maxTrail) this.trail.shift();

      this.vy += 0.035;
      this.vx *= 0.996;
      this.x += this.vx;
      this.y += this.vy;

      if (this.vy >= -0.5 || this.y <= this.targetY) {
        this.dead = true;
      }
    }

    draw(c) {
      if (this.trail.length < 2) return;
      c.save();
      c.beginPath();
      c.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        c.lineTo(this.trail[i].x, this.trail[i].y);
      }
      c.strokeStyle = this.palette.head;
      c.lineWidth = 2.4;
      c.lineCap = 'round';
      c.stroke();

      // Đốm lửa sáng ở đầu quả pháo
      c.beginPath();
      c.arc(this.x, this.y, 2.6, 0, Math.PI * 2);
      c.fillStyle = '#ffffff';
      c.shadowColor = this.palette.glow;
      c.shadowBlur = 10;
      c.fill();
      c.restore();
    }
  }

  class Particle {
    constructor(x, y, vx, vy, color, opts = {}) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.color = color;
      this.alpha = 1;
      this.decay = opts.decay || (Math.random() * 0.015 + 0.012);
      this.gravity = opts.gravity !== undefined ? opts.gravity : 0.052;
      this.friction = opts.friction || 0.976;
      this.size = opts.size || (Math.random() * 2 + 1.2);
      this.strobe = opts.strobe || false;
      this.trail = [{ x, y }];
      this.maxTrail = opts.maxTrail || 4;
      this.dead = false;
    }

    update() {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > this.maxTrail) this.trail.shift();

      this.vx *= this.friction;
      this.vy *= this.friction;
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;

      this.alpha -= this.decay;
      if (this.alpha <= 0) {
        this.dead = true;
      }
    }

    draw(c) {
      if (this.dead || this.trail.length < 2) return;
      const a = this.strobe ? (Math.random() > 0.28 ? this.alpha : this.alpha * 0.15) : this.alpha;
      if (a <= 0.01) return;

      c.save();
      c.beginPath();
      c.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        c.lineTo(this.trail[i].x, this.trail[i].y);
      }
      c.strokeStyle = `hsla(${this.color.h}, ${this.color.s}%, ${this.color.l}%, ${a})`;
      c.lineWidth = this.size;
      c.lineCap = 'round';
      c.stroke();

      c.beginPath();
      c.arc(this.x, this.y, this.size * 0.65, 0, Math.PI * 2);
      c.fillStyle = `hsla(${this.color.h}, ${Math.max(0, this.color.s - 25)}%, 92%, ${a})`;
      c.fill();
      c.restore();
    }
  }

  function explode(x, y, palette, type) {
    ambientFlashes.push({
      x,
      y,
      radius: Math.min(w * 0.42, 260),
      alpha: 0.2,
      color: palette.head,
    });

    const result = [];
    if (type === 'heart') {
      // Pháo hoa hình trái tim tình yêu lãng mạn
      const count = 56;
      for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 2;
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        const speed = Math.random() * 0.22 + 0.88;
        const vx = (hx / 16) * 4.8 * speed;
        const vy = (hy / 16) * 4.8 * speed;
        result.push(new Particle(x, y, vx, vy, palette, {
          size: Math.random() * 2 + 1.3,
          decay: Math.random() * 0.012 + 0.011,
          gravity: 0.038,
          friction: 0.98,
          maxTrail: 5,
        }));
      }
      // Đốm kim tuyến lung linh ở tâm trái tim
      for (let i = 0; i < 16; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * 1.8;
        result.push(new Particle(x, y, Math.cos(angle) * spd, Math.sin(angle) * spd, { h: 45, s: 95, l: 82 }, {
          size: 1.5,
          decay: Math.random() * 0.02 + 0.018,
          gravity: 0.03,
        }));
      }
    } else if (type === 'willow') {
      // Pháo hoa mưa sao / liễu rủ vàng óng
      const count = 68;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5.2 + 1.4;
        result.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, palette, {
          size: Math.random() * 1.8 + 1,
          decay: Math.random() * 0.009 + 0.007,
          gravity: 0.065,
          friction: 0.966,
          maxTrail: 6,
        }));
      }
    } else if (type === 'ring') {
      // Pháo hoa vòng tròn kép hai tầng màu
      const count = 46;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const speed = 4.8 + (Math.random() - 0.5) * 0.35;
        result.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, palette, {
          size: 2.2,
          decay: 0.013,
          gravity: 0.045,
          friction: 0.98,
          maxTrail: 4,
        }));
      }
      const innerColor = { h: 42, s: 100, l: 72 };
      for (let i = 0; i < 28; i++) {
        const angle = (i / 28) * Math.PI * 2;
        const speed = 2.7 + (Math.random() - 0.5) * 0.3;
        result.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, innerColor, {
          size: 1.8,
          decay: 0.015,
          gravity: 0.04,
          friction: 0.98,
        }));
      }
    } else if (type === 'strobe') {
      // Pháo hoa lách tách nhấp nháy
      const count = 64;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6.2 + 1.5;
        result.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, palette, {
          size: Math.random() * 2 + 1.2,
          decay: Math.random() * 0.014 + 0.012,
          strobe: true,
          gravity: 0.05,
          friction: 0.975,
        }));
      }
    } else {
      // Pháo hoa cầu tròn peony cổ điển nở rộ
      const count = 68;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.pow(Math.random(), 0.5) * 6.2 + 1.2;
        result.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, palette, {
          size: Math.random() * 2 + 1.2,
          decay: Math.random() * 0.015 + 0.012,
          gravity: 0.048,
          friction: 0.978,
        }));
      }
    }
    return result;
  }

  function launchAuto() {
    if (particles.length > 400) return;
    const startX = w * (0.12 + Math.random() * 0.76);
    const startY = h + 10;
    const targetX = startX + (Math.random() - 0.5) * (w * 0.28);
    const targetY = h * (0.12 + Math.random() * 0.34);
    const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    rockets.push(new Rocket(startX, startY, targetX, targetY, palette, type));
  }

  function launchTo(targetX, targetY) {
    if (particles.length > 450) return;
    const startX = Math.max(20, Math.min(w - 20, targetX + (Math.random() - 0.5) * 80));
    const startY = h + 10;
    const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    rockets.push(new Rocket(startX, startY, targetX, targetY, palette, type));
  }

  // Tương tác click / tap trên nền trống để bắn pháo hoa
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, a, input, textarea, select, [role="tab"], dialog, .card, .chip, .coverflow-btn, .lock-card, .tile')) {
      return;
    }
    launchTo(e.clientX, e.clientY);
  }, { passive: true });

  let active = true;
  let lastLaunchTime = 0;
  let nextLaunchInterval = 850;

  function loop(now) {
    if (!active) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Xoá vết mờ dần (trail effect)
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';

    // Hiệu ứng ánh sáng loé bầu trời khi nổ
    for (let i = ambientFlashes.length - 1; i >= 0; i--) {
      const f = ambientFlashes[i];
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
      g.addColorStop(0, `rgba(255, 255, 255, ${f.alpha * 0.7})`);
      g.addColorStop(0.35, `rgba(255, 170, 200, ${f.alpha * 0.4})`);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
      ctx.fill();
      f.alpha -= 0.022;
      if (f.alpha <= 0) ambientFlashes.splice(i, 1);
    }

    // Cập nhật & vẽ tên lửa phóng lên
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.update();
      r.draw(ctx);
      if (r.dead) {
        const newParticles = explode(r.x, r.y, r.palette, r.type);
        particles.push(...newParticles);
        rockets.splice(i, 1);
      }
    }

    // Cập nhật & vẽ các hạt pháo nổ
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw(ctx);
      if (p.dead) particles.splice(i, 1);
    }

    // Bắn pháo hoa tự động theo chu kỳ
    if (!reducedMotion && now - lastLaunchTime > nextLaunchInterval) {
      lastLaunchTime = now;
      launchAuto();
      // 28% khả năng bắn thêm một quả kế tiếp tạo màn bắn đôi rực rỡ
      if (Math.random() < 0.28) {
        setTimeout(() => { if (active) launchAuto(); }, 190);
      }
      nextLaunchInterval = Math.random() * 650 + 750;
    }

    requestAnimationFrame(loop);
  }

  // Tạm dừng khi tab ẩn để tiết kiệm pin/GPU
  document.addEventListener('visibilitychange', () => {
    active = !document.hidden;
    if (active) {
      lastLaunchTime = performance.now();
      requestAnimationFrame(loop);
    }
  });

  // Bắt đầu ngay 1 phát chào mừng
  launchAuto();
  requestAnimationFrame(loop);
}
// Pháo hoa đã tắt: không chạy vòng vẽ liên tục khi cuộn.

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
// Không cập nhật hiệu ứng 3D theo chuyển động chuột.

/* ---------- Ảnh trong album ---------- */
const photoState = { all: [], list: [], sections: [], cols: 0 };
const tsOf = (p) => (p.taken ? new Date(p.taken).getTime() : -Infinity);

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

let viewMode = '3d';

function setViewMode(mode) {
  viewMode = mode;
  const is3d = mode === '3d';
  $('view3dBtn')?.classList.toggle('active', is3d);
  $('view3dBtn')?.setAttribute('aria-selected', String(is3d));
  $('viewGridBtn')?.classList.toggle('active', !is3d);
  $('viewGridBtn')?.setAttribute('aria-selected', String(!is3d));
  const empty = !photoState.list.length;
  $('coverflowSection').hidden = !is3d || empty;
  $('gridSection').hidden = is3d || empty;
  if (!is3d) layoutGrids();
}

function render() {
  const album = library.albums.find(a => a.id === activeAlbum);
  const ids = new Set(library.albumPhotos.filter(ap => ap.album_id === activeAlbum).map(ap => ap.photo_id));
  photoState.list = album ? photoState.all.filter(p => ids.has(p.id)).sort((a,b) => tsOf(b) - tsOf(a) || a.id.localeCompare(b.id)) : [];
  $('photoCount').textContent = `${photoState.all.length} khoảnh khắc`;
  $('activeMonthView').hidden = !album;
  if (!album) return;
  $('activeMonthTitle').textContent = album.title;
  $('activeMonthCount').textContent = `${photoState.list.length} khoảnh khắc`;
  $('albumEmpty').hidden = photoState.list.length > 0;
  $('view3dBtn').onclick = () => setViewMode('3d');
  $('viewGridBtn').onclick = () => setViewMode('grid');
  if (photoState.list.length) initMonthCoverflow(photoState.list);
  else $('coverflow').replaceChildren();
  renderMonthGrid(photoState.list);
  setViewMode(viewMode);
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
  await loadLibrary();
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
  if (!list.length || !confirm(`Xoá vĩnh viễn ${list.length} ảnh (cả ảnh gốc trên R2)?\n${photoUsage(list)}\nKhông khôi phục được.`)) return;
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
  renderPhotoSources(p);
  [1, -1].forEach((d) => { new Image().src = media(`full/${list[(lbIndex + d + list.length) % list.length].id}.webp`); });
}

function openLightbox(i) {
  showPhoto(i);
  lb.showModal();
  document.documentElement.style.overflow = 'hidden';
}
lb.addEventListener('close', () => { document.documentElement.style.overflow = ''; render(); });
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
  if (!p || !confirm(`Xoá vĩnh viễn ảnh này (cả ảnh gốc trên R2)?\n${photoUsage([p])}\nKhông khôi phục được.`)) return;
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
async function enter() {
  document.body.classList.remove('locked');
  if (entered) return;
  entered = true;
  $('hero').style.backgroundImage = `url("${media('hero.webp')}")`;
  await loadPhotos();
  await loadMemories();
  await loadLibrary();
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


/* ---------- Các cột mốc và nhật ký ---------- */
let memoryEvents = [], memoryDiaries = [], activeEvent = '', editingMemory = null;
const memoryDialog = $('memoryDialog'), memoryForm = $('memoryForm');
function node(tag, text, className) {
  const el = document.createElement(tag);
  if (text != null) el.textContent = text;
  if (className) el.className = className;
  return el;
}
function memoryButton(text, callback, className = 'link') {
  const button = node('button', text, className); button.type = 'button'; button.addEventListener('click', callback); return button;
}
function displayDate(value) { return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(`${value}T00:00:00+07:00`)); }
async function loadMemories() {
  $('timelineStatus').textContent = 'Đang tải các sự kiện…';
  try {
    const result = await authApiRaw('/api/memories');
    memoryEvents = result.events; memoryDiaries = result.diaries;
    renderTimeline();
    if (activeEvent && $('eventDialog').open) renderEvent(activeEvent);
  } catch (err) { $('timelineStatus').textContent = `Không tải được sự kiện: ${err.message}`; }
}
function renderTimeline() {
  const list = $('timelineList'); list.replaceChildren();
  $('timelineStatus').textContent = memoryEvents.length ? '' : 'Chưa có sự kiện nào.';
  for (const event of memoryEvents) {
    const card = node('article', null, 'timeline-card');
    const image = document.createElement('img'); image.alt = ''; image.loading = 'lazy';
    const linked = event.cover_photo_id ? {photo_id:event.cover_photo_id} : library.links.find(l => l.kind === 'event' && l.target_id === event.id);
    image.src = linked ? media(`thumb/${linked.photo_id}.webp`) : media('hero.webp');
    const frame = node('div', null, 'timeline-photo'); frame.append(image);
    card.append(frame, node('h3', event.title), node('p', event.description, 'muted'), node('p', displayDate(event.event_date), 'memory-date'));
    card.append(memoryButton('Xem kỷ niệm →', () => { activeEvent = event.id; renderEvent(event.id); $('eventDialog').showModal(); }));
    list.append(card);
  }
  const now = new Date(), vnToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const year = Number(vnToday.slice(0, 4));
  const upcoming = memoryEvents.map((e) => {
    let next = e.event_date > vnToday ? e.event_date : `${year}-${e.event_date.slice(5)}`;
    if (next < vnToday) next = `${year + 1}-${e.event_date.slice(5)}`;
    if (!/^\d{4}-02-29$/.test(next) || new Date(`${next}T00:00:00Z`).getUTCDate() === 29) return { event: e, next };
    while (new Date(`${next}T00:00:00Z`).getUTCDate() !== 29) next = `${Number(next.slice(0, 4)) + 1}-02-29`;
    return { event: e, next };
  }).sort((a, b) => a.next.localeCompare(b.next))[0];
  const todayMemories = [...memoryEvents.filter(e => e.event_date < vnToday && e.event_date.slice(5) === vnToday.slice(5)).map(e => `${e.title} (${e.event_date.slice(0,4)})`), ...memoryDiaries.filter(d => d.entry_date < vnToday && d.entry_date.slice(5) === vnToday.slice(5)).map(d => `${d.title} (${d.entry_date.slice(0,4)})`)];
  $('onThisDay').textContent = todayMemories.length ? `Ngày này năm ấy: ${todayMemories.join(' · ')}` : '';
  $('nextAnniversary').textContent = upcoming ? `Kỷ niệm sắp tới: ${upcoming.event.title} · còn ${Math.round((Date.parse(`${upcoming.next}T00:00:00Z`) - Date.parse(`${vnToday}T00:00:00Z`)) / 86400000)} ngày` : '';
}
function renderEvent(id) {
  const event = memoryEvents.find((e) => e.id === id); if (!event) { $('eventDialog').close(); return; }
  const box = $('eventDetail'); box.replaceChildren(); box.className = 'event-detail-layout';
  const cover = node('div', null, 'event-cover');
  const image = document.createElement('img'); image.alt = 'Ảnh kỷ niệm';
  const linked = event.cover_photo_id ? {photo_id:event.cover_photo_id} : library.links.find(l => l.kind === 'event' && l.target_id === event.id);
  image.src = linked ? media(`full/${linked.photo_id}.webp`) : media('hero.webp');
  cover.append(image, node('p', 'Together forever ♡'));
  const center = node('div', null, 'event-detail-center');
  const title = node('h2', `${event.title} ♡`); title.id = 'eventDetailTitle';
  const elapsed = Math.max(0, Math.floor((Date.now() - Date.parse(`${event.event_date}T00:00:00+07:00`)) / 86400000));
  const counter = node('div', null, 'event-counter');
  counter.append(node('span', 'Đã cùng nhau lưu giữ kỷ niệm'), node('strong', elapsed.toLocaleString('vi-VN')), node('em', 'ngày'));
  center.append(title, node('p', `${event.description} · ${displayDate(event.event_date)}`), counter, memoryPhotoStrip('event',event.id));
  const actions = node('div', null, 'memory-actions');
  actions.append(memoryButton('Đổi ảnh avatar', () => openPhotoLinks('cover', event.id)));
  for (const trip of library.trips.filter(t => t.event_id === event.id)) actions.append(memoryButton(`Chuyến đi: ${trip.name}`, () => openTrip(trip.id)));
  for (const letter of library.letters.filter(l => l.event_id === event.id)) actions.append(memoryButton(`Thư: ${letter.title}`, () => openLetter(letter.id)));
  actions.append(memoryButton('Sửa sự kiện', () => openMemoryForm('event', event)), memoryButton('Xoá sự kiện', () => deleteMemory('event', event.id), 'link danger')); center.append(actions);
  const journal = node('div', null, 'event-journal');
  journal.append(node('h3', 'Nhật ký kỷ niệm'));
  const diaries = memoryDiaries.filter((d) => d.event_id === id);
  if (!diaries.length) journal.append(node('p', 'Chưa có nhật ký cho sự kiện này.', 'muted'));
  let lastYear;
  for (const diary of diaries) {
    if (lastYear !== diary.year) { journal.append(node('h4', String(diary.year), 'memory-year')); lastYear = diary.year; }
    const entry = node('article', null, 'diary-entry');
    entry.append(node('h4', diary.title), node('p', `${displayDate(diary.entry_date)}${diary.location ? ` · ${diary.location}` : ''}`, 'muted small'), node('p', diary.content));
    const buttons = node('div', null, 'memory-actions'); buttons.append(memoryButton('＋ Thêm Album', () => openAlbumForm({diary_id:diary.id,event_id:diary.event_id,album_month:diary.entry_date.slice(0,7),title:diary.title})), ...library.albums.filter(a => a.diary_id === diary.id).map(a => memoryButton(`Album: ${a.title}`, () => selectAlbum(a.id))), memoryButton('Ảnh', () => openPhotoLinks('diary', diary.id)), memoryButton('Video', () => openAssets('diary', diary.id)), memoryButton('Sửa', () => openMemoryForm('diary', diary)), memoryButton('Xoá', () => deleteMemory('diary', diary.id), 'link danger')); entry.append(memoryPhotoStrip('diary',diary.id), buttons); journal.append(entry);
  }
  journal.append(memoryButton('＋ Thêm nhật ký', () => openMemoryForm('diary', null), 'btn btn-sm'));
  box.append(cover,center,journal);
}
function openMemoryForm(type, item) {
  editingMemory = { type, id: item?.id || '' };
  memoryForm.reset(); $('memoryError').hidden = true;
  $('memoryDialogTitle').textContent = `${item ? 'Sửa' : 'Thêm'} ${type === 'event' ? 'sự kiện' : 'nhật ký'}`;
  $('memoryYearLabel').hidden = $('memoryLocationLabel').hidden = $('diaryAlbumOptions').hidden = type !== 'diary';
  $('diaryAlbumTitleLabel').hidden = true;
  const f = memoryForm.elements;
  f.title.value = item?.title || ''; f.date.value = item?.event_date || item?.entry_date || '';
  f.year.value = item?.year || new Date().getFullYear(); f.location.value = item?.location || '';
  f.description.value = item?.description || item?.content || '';
  memoryDialog.showModal();
}
$('addEvent').addEventListener('click', () => openMemoryForm('event', null));
$('eventClose').addEventListener('click', () => { $('eventDialog').close(); activeEvent = ''; });
$('memoryCancel').addEventListener('click', () => memoryDialog.close());
memoryForm.elements.createAlbum.addEventListener('change', e => { $('diaryAlbumTitleLabel').hidden = !e.target.checked; });
memoryForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const f = memoryForm.elements, submit = memoryForm.querySelector('[type="submit"]'); submit.disabled = true; $('memoryError').hidden = true;
  const data = { ...editingMemory, action: 'save', title: f.title.value, date: f.date.value, year: Number(f.year.value), eventId: activeEvent, location: f.location.value, description: f.description.value, content: f.description.value };
  try {
    const saved = await authApiRaw('/api/memories', { method: 'POST', body: data });
    editingMemory.id = saved.id;
    if (editingMemory.type === 'diary' && f.createAlbum.checked) {
      editingMemory.albumId ||= crypto.randomUUID();
      try { await libraryPost({type:'album',action:'save',id:editingMemory.albumId,title:f.albumTitle.value.trim() || data.title,album_month:data.date.slice(0,7),event_id:activeEvent,diary_id:saved.id}); }
      catch (err) { throw new Error(`Đã lưu nhật ký nhưng chưa tạo được album: ${err.message}. Hãy thử lưu lại.`); }
    }
    memoryDialog.close(); await loadMemories(); await loadLibrary();
  }
  catch (err) { $('memoryError').textContent = err.message; $('memoryError').hidden = false; }
  finally { submit.disabled = false; }
});
async function deleteMemory(type, id) {
  if (!confirm(type === 'event' ? 'Xoá sự kiện và tất cả nhật ký thuộc sự kiện này?' : 'Xoá nhật ký này?')) return;
  try { await authApiRaw('/api/memories', { method: 'POST', body: { type, action: 'delete', id } }); await loadMemories(); await loadLibrary(); }
  catch (err) { alert(`Không xoá được: ${err.message}`); }
}

/* ---------- Chuyến đi, thư và liên kết ảnh ---------- */
let library = { trips: [], locations: [], letters: [], links: [], details: [], albums: [], albumPhotos: [] };
let activeAlbum = '', editingAlbum = '';
let libraryEdit = null, linkTarget = null, mapInstance, mapMarkers;
const libraryDialog = $('libraryDialog'), libraryForm = $('libraryForm');
const libraryPost = (body) => authApiRaw('/api/library', { method: 'POST', body });
async function loadLibrary() {
  try {
    library = await authApiRaw('/api/library');
    library.albums ||= []; library.albumPhotos ||= [];
    for (const p of photoState.all) {
      const detail = library.details.find(d => d.photo_id === p.id);
      if (detail) { if (detail.taken) p.taken = detail.taken; p.caption = detail.caption; }
    }
    updateLibraryFilters(); renderTimeline(); renderTrips(); renderLetters(); renderAlbums(); render();
    if (activeEvent && $('eventDialog').open) renderEvent(activeEvent);
  } catch (err) { renderTrips(); $('mapStatus').textContent = `Không tải được dữ liệu chuyến đi: ${err.message}`; $('letterStatus').textContent = `Không tải được thư: ${err.message}`; }
}
function photoLinkedTo(p, kind, id) {
  if (!id) return true;
  return library.albumPhotos.some(ap => ap.photo_id === p.id && library.albums.some(a => a.id === ap.album_id && (a[`${kind}_id`] === id || (kind === 'event' && memoryDiaries.some(d => d.id === a.diary_id && d.event_id === id)) || (kind === 'trip' && library.locations.some(loc => loc.id === a.location_id && loc.trip_id === id))))) || library.links.some(l => l.photo_id === p.id && ((l.kind === kind && l.target_id === id) ||
    (kind === 'event' && l.kind === 'diary' && memoryDiaries.some(d => d.id === l.target_id && d.event_id === id)) ||
    (kind === 'trip' && l.kind === 'location' && library.locations.some(x => x.id === l.target_id && x.trip_id === id))));
}
function fillSelect(id, items, placeholder) {
  const el = $(id), old = el.value; el.replaceChildren(new Option(placeholder, ''));
  for (const [value,label] of items) el.add(new Option(label,value));
  if ([...el.options].some(x => x.value === old)) el.value = old;
}
function updateLibraryFilters() {
  const years = [...new Set([...photoState.all.map(p => (p.taken || '').slice(0,4)), ...library.trips.map(t => t.start_date.slice(0,4)), ...library.albums.map(a => (a.album_month || '').slice(0,4))].filter(Boolean))].sort().reverse();
  fillSelect('photoYear',years.map(y => [y,y]),'Tất cả'); fillSelect('mapYearFilter',years.map(y => [y,y]),'Tất cả các năm');
  fillSelect('photoMonth',Array.from({length:12},(_,i) => [String(i+1).padStart(2,'0'),`Tháng ${i+1}`]),'Tất cả');
  fillSelect('photoEvent',memoryEvents.map(e => [e.id,e.title]),'Tất cả');
  for (const id of ['photoTrip','mapTripFilter']) fillSelect(id,library.trips.map(t => [t.id,t.name]),id === 'photoTrip' ? 'Tất cả' : 'Tất cả chuyến đi');
  fillSelect('photoLocation',library.locations.map(l => [l.id,l.name]),'Tất cả');
}
for (const id of ['photoSearch','photoYear','photoMonth','photoEvent','photoTrip','photoLocation']) $(id).addEventListener('input',() => { if (!library.albums.some(a => a.id === activeAlbum && albumMatchesFilters(a))) activeAlbum = ''; renderAlbums(); render(); });
for (const id of ['mapTripFilter','mapYearFilter']) $(id).addEventListener('change',renderTrips);
function openAlbum(kind,id) {
  activeAlbum = '';
  for (const key of ['photoYear','photoMonth','photoEvent','photoTrip','photoLocation','photoSearch']) $(key).value = '';
  $(kind === 'trip' ? 'photoTrip' : kind === 'event' ? 'photoEvent' : 'photoLocation').value = id;
  if ($('libraryDetailDialog').open) $('libraryDetailDialog').close();
  if ($('eventDialog').open) $('eventDialog').close();
  renderAlbums(); render(); $('photos').scrollIntoView();
}
function renderTrips() {
  const selectedTrip = $('mapTripFilter').value, year = $('mapYearFilter').value;
  const trips = library.trips.filter(t => (!selectedTrip || t.id === selectedTrip) && (!year || t.start_date.startsWith(year)));
  const list = $('tripList'); list.replaceChildren();
  if (!trips.length) list.append(node('p','Chưa có chuyến đi phù hợp.','muted'));
  for (const trip of trips) {
    const card = node('article',null,'timeline-card');
    card.append(node('p',displayDate(trip.start_date),'memory-date'),node('h3',trip.name),node('p',trip.description,'muted'), memoryButton('Xem hành trình →',() => openTrip(trip.id)));
    list.append(card);
  }
  if (!window.L) { $('mapStatus').textContent = 'Không tải được bản đồ. Các chuyến đi vẫn hiển thị bên dưới.'; return; }
  if (!mapInstance) {
    mapInstance = L.map('memoryMap', { scrollWheelZoom:true }).setView([16.05,107.8],5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(mapInstance);
    mapMarkers = L.layerGroup().addTo(mapInstance);
    mapInstance.on('click', e => { if (libraryEdit?.type === 'location' && libraryDialog.open) { libraryForm.elements.latitude.value = e.latlng.lat.toFixed(6); libraryForm.elements.longitude.value = e.latlng.lng.toFixed(6); } });
  }
  mapMarkers.clearLayers();
  const ids = new Set(trips.map(t=>t.id)); let count = 0;
  for (const loc of library.locations.filter(l=>ids.has(l.trip_id) && l.latitude != null && l.longitude != null)) {
    const marker = L.marker([loc.latitude,loc.longitude], { icon: L.divIcon({className:'heart-marker', html:'♥', iconSize:[34,34], iconAnchor:[17,17]}) }).addTo(mapMarkers);
    const content = node('div'); content.append(node('strong',loc.name),document.createElement('br'),memoryButton('Xem địa điểm',() => openLocation(loc.id))); marker.bindPopup(content); count++;
  }
  $('mapStatus').textContent = count ? `${count} địa điểm trên bản đồ` : 'Chưa có địa điểm có toạ độ.';
}
function detailOpen() { if (!$('libraryDetailDialog').open) $('libraryDetailDialog').showModal(); }
function openTrip(id) {
  const t = library.trips.find(x=>x.id===id); if (!t) return;
  const box=$('libraryDetail'); box.replaceChildren(node('p',displayDate(t.start_date),'memory-date'),node('h2',t.name),node('p',t.description));
  const actions=node('div',null,'memory-actions');
  actions.append(memoryButton('Album chuyến đi',()=>openAlbum('trip',t.id)),memoryButton('Ảnh chuyến đi',()=>openPhotoLinks('trip',t.id)),memoryButton('Sửa',()=>openLibraryForm('trip',t)),memoryButton('Xoá',()=>deleteLibrary('trip',t.id),'link danger'));
  const event=memoryEvents.find(e=>e.id===t.event_id);
  if(event) actions.append(memoryButton(`Sự kiện: ${event.title}`,()=>{ $('libraryDetailDialog').close(); activeEvent=event.id; renderEvent(event.id); if (!$('eventDialog').open) $('eventDialog').showModal(); }));
  box.append(actions);
  renderTripAlbums(box,t);
  box.append(node('h3','Các địa điểm'),memoryButton('＋ Thêm địa điểm',()=>openLibraryForm('location',{trip_id:t.id}),'btn btn-sm'));
  const locations=library.locations.filter(l=>l.trip_id===t.id);
  if(!locations.length) box.append(node('p','Chưa có địa điểm nào.','muted'));
  for(const loc of locations) { const el=node('div',null,'diary-entry'); el.append(node('h4',loc.name),node('p',loc.address,'muted'),memoryButton('Xem địa điểm →',()=>openLocation(loc.id))); box.append(el); }
  detailOpen();
}
function renderTripAlbums(box, trip) {
  const section = node('section', null, 'trip-albums');
  section.append(node('h3', 'Album kỷ niệm'));
  const linked = library.albums.filter(a => a.trip_id === trip.id);
  if (!linked.length) section.append(node('p', 'Chuyến đi chưa có album liên kết.', 'muted'));
  for (const album of linked) {
    const row = node('div', null, 'trip-album-row');
    const count = library.albumPhotos.filter(ap => ap.album_id === album.id).length;
    row.append(node('span', `${album.title} · ${count} ảnh`), memoryButton('Xem album', () => selectAlbum(album.id)),
      memoryButton('Gỡ liên kết', async () => {
        try { await libraryPost({ ...album, type:'album', action:'save', trip_id:'' }); await loadLibrary(); openTrip(trip.id); }
        catch (err) { status.textContent = `Không gỡ được liên kết: ${err.message}`; }
      }));
    section.append(row);
  }
  const available = library.albums.filter(a => !a.trip_id);
  const form = node('form', null, 'trip-album-form');
  const label = node('label', 'Chọn album có sẵn');
  const select = document.createElement('select'); select.setAttribute('aria-label', 'Chọn album liên kết với chuyến đi');
  select.add(new Option(available.length ? 'Chọn album' : 'Không có album chưa liên kết', ''));
  for (const album of available) select.add(new Option(album.title, album.id));
  select.required = true; select.disabled = !available.length;
  const submit = node('button', 'Liên kết album', 'btn btn-sm'); submit.type = 'submit'; submit.disabled = !available.length;
  const status = node('p', '', 'muted'); status.setAttribute('role', 'status');
  label.append(select); form.append(label, submit); section.append(form, status); box.append(section);
  form.addEventListener('submit', async e => {
    e.preventDefault(); const album = library.albums.find(a => a.id === select.value && !a.trip_id);
    if (!album) { status.textContent = 'Album không còn khả dụng. Hãy tải lại trang.'; return; }
    submit.disabled = true; status.textContent = 'Đang liên kết…';
    try { await libraryPost({ ...album, type:'album', action:'save', trip_id:trip.id }); await loadLibrary(); openTrip(trip.id); }
    catch (err) { status.textContent = `Không liên kết được album: ${err.message}`; submit.disabled = false; }
  });
}
function openLocation(id) {
  const loc=library.locations.find(x=>x.id===id); if(!loc) return;
  const box=$('libraryDetail'); box.replaceChildren(node('p',loc.visit_date ? displayDate(loc.visit_date) : '', 'memory-date'),node('h2',loc.name),node('p',loc.address,'muted'),node('p',loc.description));
  const actions=node('div',null,'memory-actions'); actions.append(memoryButton('← Chuyến đi',()=>openTrip(loc.trip_id)),memoryButton('Xem toàn bộ ảnh tại địa điểm',()=>openAlbum('location',loc.id)),memoryButton('Album chuyến đi',()=>openAlbum('trip',loc.trip_id)),memoryButton('Thêm / gỡ ảnh',()=>openPhotoLinks('location',loc.id)),memoryButton('Sửa',()=>openLibraryForm('location',loc)),memoryButton('Xoá',()=>deleteLibrary('location',loc.id),'link danger')); box.append(actions); detailOpen();
}
function renderLetters() {
  const list=$('letterList'); list.replaceChildren(); $('letterStatus').textContent=library.letters.length ? '' : 'Chưa có thư nào. Viết cho nhau một lá thư nhé.';
  for(const l of library.letters) { const card=node('article',null,'letter-card'); card.append(node('div','✉','letter-icon'),node('h3',l.title),node('p',`${l.sender} → ${l.recipient} · ${displayDate(l.written_date)}`,'muted small'),node('p',l.locked ? `Mở vào ${displayDate(l.open_date)}` : l.status === 'draft' ? 'Bản nháp' : 'Thư nhỏ','memory-date'),memoryButton(l.locked?'Chưa đến ngày mở':'Mở thư',()=>openLetter(l.id))); list.append(card); }
}
function openLetter(id) {
  const l=library.letters.find(x=>x.id===id); if(!l) return;
  const box=$('libraryDetail'); box.replaceChildren(node('p',`${l.sender} → ${l.recipient} · ${displayDate(l.written_date)}`,'memory-date'),node('h2',l.title),node('p',l.locked ? `Lá thư sẽ mở vào ${displayDate(l.open_date)}.` : l.content,'letter-content'));
  const actions=node('div',null,'memory-actions'); if(!l.locked) actions.append(memoryButton('Tệp đính kèm',()=>openAssets('letter',l.id)), memoryButton('Sửa',()=>openLibraryForm('letter',l)));
  actions.append(memoryButton('Xoá',()=>deleteLibrary('letter',l.id),'link danger'));
  const event=memoryEvents.find(e=>e.id===l.event_id); if(event) actions.append(memoryButton(`Sự kiện: ${event.title}`,()=>{ $('libraryDetailDialog').close(); activeEvent=event.id; renderEvent(event.id); if(!$('eventDialog').open) $('eventDialog').showModal(); }));
  box.append(actions); detailOpen();
}
const fieldDefinitions = {
  trip: [ ['name','Tên chuyến đi','text',true],['start_date','Ngày bắt đầu','date',true],['end_date','Ngày kết thúc','date'],['description','Ghi chú','textarea'] ],
  location: [ ['name','Tên địa điểm','text',true],['visit_date','Ngày ghé','date'],['address','Địa chỉ','text'],['latitude','Vĩ độ','number'],['longitude','Kinh độ','number'],['description','Ghi chú','textarea'] ],
  letter: [ ['title','Tiêu đề','text',true],['sender','Người gửi','text',true],['recipient','Người nhận','text',true],['written_date','Ngày viết','date',true],['content','Nội dung','textarea'],['open_date','Ngày mở thư','date'],['status','Trạng thái','status',true],['event_id','Sự kiện liên quan','events'] ],
  photo: [ ['caption','Chú thích','text'],['taken','Ngày chụp','date'] ],
};
function openLibraryForm(type,item={}) {
  libraryEdit={ type,id:item.id || '', trip_id:item.trip_id || '', ...(type === 'trip' ? { event_id:item.event_id || '' } : {}), addingLocation: type === 'trip' && !item.id, locationId: crypto.randomUUID() }; libraryForm.reset(); $('libraryError').hidden=true;
  $('libraryDialogTitle').textContent=type==='photo'?'Thông tin ảnh':`${item.id?'Sửa':'Thêm'} ${ {trip:'chuyến đi',location:'địa điểm',letter:'thư'}[type]}`;
  const fields=$('libraryFields'); fields.replaceChildren();
  for(const [name,label,typeName,required] of fieldDefinitions[type]) {
    const wrap=node('label',label); let input;
    if(typeName==='events' || typeName==='status') {
      input=document.createElement('select');
      if(typeName==='events') { input.add(new Option('Không liên kết','')); for(const e of memoryEvents) input.add(new Option(e.title,e.id)); }
      else for(const [value,text] of [['draft','Bản nháp'],['saved','Đã lưu'],['opened','Đã mở']]) input.add(new Option(text,value));
    } else { input=document.createElement(typeName==='textarea'?'textarea':'input'); if(typeName!=='textarea') input.type=typeName==='date' ? 'text' : typeName; if(typeName==='number') input.step='any'; if(typeName==='textarea') input.rows=3; }
    input.name=name; input.required=!!required;
    const initial=item[name] ?? (name==='written_date' ? new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()) : '');
    if (typeName==='date') { input.placeholder='DD/MM/YYYY'; input.inputMode='numeric'; input.maxLength=10; input.dataset.dateField='true'; input.value=initial ? initial.split('-').reverse().join('/') : ''; input.addEventListener('input', () => { const digits=input.value.replace(/\D/g,'').slice(0,8); input.value=digits.replace(/^(\d{2})(?=\d)/,'$1/').replace(/^(\d{2}\/\d{2})(?=\d)/,'$1/'); }); }
    else input.value=initial;
    wrap.append(input); fields.append(wrap);
  }
  if (type === 'trip' && !item.id) {
    const wrap = node('label', 'Album kỷ niệm (không bắt buộc)', 'trip-album-field');
    const select = document.createElement('select'); select.name = 'album_id';
    select.add(new Option('Chưa chọn album', ''));
    for (const album of library.albums) {
      const trip = library.trips.find(t => t.id === album.trip_id);
      const option = new Option(trip ? `${album.title} · đã liên kết ${trip.name}` : album.title, album.id);
      option.disabled = !!album.trip_id; select.add(option);
    }
    if (!library.albums.length) select.add(new Option('Chưa có album', '', true, false));
    wrap.append(select); fields.append(wrap);
  }
  if (type === 'location' || (type === 'trip' && !item.id)) {
    if (type === 'trip') {
      const heading=node('div',null,'trip-location-heading'); heading.append(node('h3','Ghim địa điểm đầu tiên'),node('p','Chọn một điểm trên bản đồ hoặc tìm theo địa chỉ. Bạn có thể thêm các địa điểm khác sau.','muted small')); fields.append(heading);
      for (const [name,label] of [['place_name','Tên địa điểm'],['address','Địa chỉ']]) { const wrap=node('label',label); const input=document.createElement('input'); input.name=name; input.placeholder=name==='place_name'?'Ví dụ: Hội An':'Nhập địa chỉ để tìm kiếm'; wrap.append(input); fields.append(wrap); }
      for (const name of ['latitude','longitude']) { const input=document.createElement('input'); input.type='hidden'; input.name=name; fields.append(input); }
    }
    const helper=node('p','Chạm vào bản đồ để ghim vị trí.','muted small location-help');
    const search=memoryButton('⌕ Tìm địa chỉ',async()=>{
      const address=libraryForm.elements.address.value.trim(); if(!address) { helper.textContent='Hãy nhập địa chỉ trước khi tìm.'; return; }
      search.disabled=true; helper.textContent='Đang tìm địa chỉ…';
      try { const res=await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&q=${encodeURIComponent(address)}`); if(!res.ok) throw new Error(); const data=await res.json(); if(!data.length) throw new Error(); setLocationPoint(Number(data[0].lat),Number(data[0].lon)); pickerMap?.setView([Number(data[0].lat),Number(data[0].lon)],14); helper.textContent=`Đã chọn: ${data[0].display_name}`; }
      catch { helper.textContent='Không tìm thấy địa chỉ. Hãy thử tìm lại hoặc chọn trực tiếp trên bản đồ.'; } finally { search.disabled=false; }
    },'location-search');
    const picker=node('div',null,'location-picker'); fields.append(search,helper,picker);
    let pickerMap, marker;
    function setLocationPoint(lat,lng) { libraryForm.elements.latitude.value=lat.toFixed(6); libraryForm.elements.longitude.value=lng.toFixed(6); if(pickerMap) { if(marker) marker.setLatLng([lat,lng]); else marker=L.marker([lat,lng],{icon:L.divIcon({className:'heart-marker',html:'♥',iconSize:[34,34],iconAnchor:[17,17]})}).addTo(pickerMap); } helper.textContent=`Đã ghim: ${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
    if (window.L) { requestAnimationFrame(() => { const lat=Number(libraryForm.elements.latitude.value), lng=Number(libraryForm.elements.longitude.value); const selected=libraryForm.elements.latitude.value !== '' && libraryForm.elements.longitude.value !== ''; pickerMap=L.map(picker,{ scrollWheelZoom:true }).setView(selected ? [lat,lng] : [16.05,107.8],selected ? 12 : 5); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(pickerMap); if(selected) setLocationPoint(lat,lng); pickerMap.on('click',e=>setLocationPoint(e.latlng.lat,e.latlng.lng)); setTimeout(()=>pickerMap.invalidateSize(),100); }); }
    else helper.textContent='Không tải được bản đồ. Hãy kiểm tra kết nối và mở lại.';
  }
  libraryDialog.showModal();
}
$('addTrip').addEventListener('click',()=>openLibraryForm('trip'));
$('addLetter').addEventListener('click',()=>openLibraryForm('letter'));
$('libraryCancel').addEventListener('click',()=>libraryDialog.close());
$('libraryDetailClose').addEventListener('click',()=> $('libraryDetailDialog').close());
libraryForm.addEventListener('submit',async e=>{
  e.preventDefault(); const submit=libraryForm.querySelector('[type="submit"]'); submit.disabled=true; $('libraryError').hidden=true;
  const values=Object.fromEntries(new FormData(libraryForm));
  try {
    for (const input of libraryForm.querySelectorAll('[data-date-field]')) {
      if (!input.value) continue;
      const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input.value);
      const iso=match ? `${match[3]}-${match[2]}-${match[1]}` : '';
      const date=iso ? new Date(`${iso}T00:00:00Z`) : new Date(NaN);
      if (!iso || Number.isNaN(date.getTime()) || date.toISOString().slice(0,10)!==iso) throw new Error(`Ngày không hợp lệ: ${input.value}. Hãy nhập DD/MM/YYYY.`);
      values[input.name]=iso;
    }
    if (libraryEdit.addingLocation && (values.latitude || values.longitude || values.place_name || values.address) && (!values.latitude || !values.longitude || !values.place_name?.trim())) throw new Error('Nhập tên địa điểm và chọn vị trí trên bản đồ để ghim.');
    if (libraryEdit.type==='trip' && !libraryEdit.id) libraryEdit.id=crypto.randomUUID();
    const body={...values,...libraryEdit,action:libraryEdit.type==='photo'?'details':'save'};
    await libraryPost(body);
    if (libraryEdit.addingLocation && values.latitude && values.longitude) {
      try { await libraryPost({type:'location', action:'save', id:libraryEdit.locationId, trip_id:libraryEdit.id, name:values.place_name, address:values.address, latitude:values.latitude, longitude:values.longitude}); }
      catch (err) { throw new Error(`Đã lưu chuyến đi nhưng chưa ghim được địa điểm: ${err.message}. Hãy thử lưu lại.`); }
    }
    if (libraryEdit.type === 'trip' && libraryEdit.addingLocation && values.album_id) {
      try {
        const current = await authApiRaw('/api/library');
        const album = (current.albums || []).find(a => a.id === values.album_id);
        if (!album || (album.trip_id && album.trip_id !== libraryEdit.id)) throw new Error('Album không còn khả dụng; hãy chọn album khác.');
        await libraryPost({ ...album, type:'album', action:'save', trip_id:libraryEdit.id });
      } catch (err) { throw new Error(`Đã lưu chuyến đi nhưng chưa liên kết được album: ${err.message} Hãy thử lưu lại.`); }
    }
    libraryDialog.close(); await loadLibrary(); if(body.type==='trip' && body.id && $('libraryDetailDialog').open) openTrip(body.id); if(body.type==='location' && body.id && $('libraryDetailDialog').open) openLocation(body.id); if(body.type==='letter' && body.id && $('libraryDetailDialog').open) openLetter(body.id); if(body.type==='photo' && lb.open) showPhoto(lbIndex);
  }
  catch(err) { $('libraryError').textContent=err.message; $('libraryError').hidden=false; } finally { submit.disabled=false; }
});
async function deleteLibrary(type,id) {
  if(!confirm(type==='trip'?'Xoá chuyến đi và các địa điểm? Ảnh vẫn được giữ trong album.':`Xoá ${type==='letter'?'thư':'địa điểm'} này? Ảnh liên quan vẫn được giữ trong album.`)) return;
  try { await libraryPost({type,id,action:'delete'}); $('libraryDetailDialog').close(); await loadLibrary(); } catch(err) { alert(err.message); }
}
function openPhotoLinks(kind,id) { linkTarget={kind,id}; $('linkedUpload').multiple = kind !== 'cover'; $('photoLinkHelp').textContent = kind === 'cover' ? 'Chọn một ảnh có sẵn hoặc tải ảnh mới làm avatar sự kiện.' : kind === 'album' ? 'Chọn ảnh có sẵn hoặc tải thêm ảnh vào album này.' : 'Chọn ảnh có sẵn hoặc tải ảnh mới để liên kết.'; $('photoLinkStatus').textContent=''; renderPhotoLinks(); $('photoLinkDialog').showModal(); }
function renderPhotoLinks() {
  const grid=$('photoLinkGrid'); grid.replaceChildren();
  for(const p of photoState.all) {
    const label=node('label',null,'link-photo'); const input=document.createElement('input'); input.type='checkbox';
    input.type = linkTarget.kind === 'cover' ? 'radio' : 'checkbox'; input.name = linkTarget.kind === 'cover' ? 'event-cover' : '';
    input.checked=linkTarget.kind === 'album' ? library.albumPhotos.some(l=>l.photo_id===p.id && l.album_id===linkTarget.id) : linkTarget.kind === 'cover' ? memoryEvents.find(e=>e.id===linkTarget.id)?.cover_photo_id === p.id : library.links.some(l=>l.photo_id===p.id && l.kind===linkTarget.kind && l.target_id===linkTarget.id);
    input.setAttribute('aria-label',p.caption || `Ảnh ${p.id}`);
    const img=document.createElement('img'); img.loading='lazy'; img.src=media(`thumb/${p.id}.webp`); img.alt=p.caption || '';
    input.addEventListener('change',async()=>{ input.disabled=true; try { if (linkTarget.kind === 'cover') { await libraryPost({type:'cover',event_id:linkTarget.id,photo_id:p.id}); await loadMemories(); } else if (linkTarget.kind === 'album') await libraryPost({type:'albumPhoto',album_id:linkTarget.id,photo_id:p.id,action:input.checked?'link':'unlink'}); else await libraryPost({type:'photo',id:p.id,action:input.checked?'link':'unlink',kind:linkTarget.kind,target_id:linkTarget.id}); await loadLibrary(); } catch(err) { input.checked=!input.checked; $('photoLinkStatus').textContent=err.message; } finally { input.disabled=false; } });
    label.append(img,input); grid.append(label);
  }
}
$('photoLinkClose').addEventListener('click',()=> $('photoLinkDialog').close());
$('linkedUpload').addEventListener('change',async e=>{
  const input=e.target; input.disabled=true; let count=0;
  try { for(const file of input.files) { $('photoLinkStatus').textContent=`Đang tải ${file.name}…`; const p=await uploadFile(file); photoState.all.push(p); if (linkTarget.kind === 'album') await libraryPost({type:'albumPhoto',album_id:linkTarget.id,photo_id:p.id,action:'link'}); else if (linkTarget.kind === 'cover') { await libraryPost({type:'cover',event_id:linkTarget.id,photo_id:p.id}); await loadMemories(); } else await libraryPost({type:'photo',id:p.id,action:'link',kind:linkTarget.kind,target_id:linkTarget.id}); count++; } $('photoLinkStatus').textContent=`Đã tải và liên kết ${count} ảnh.`; await loadLibrary(); renderPhotoLinks(); }
  catch(err) { $('photoLinkStatus').textContent=`Đã tải ${count} ảnh. Lỗi: ${err.message}`; await loadLibrary(); renderPhotoLinks(); } finally { input.value=''; input.disabled=false; }
});
function sourceName(l) {
  if(l.kind==='event') return memoryEvents.find(e=>e.id===l.target_id)?.title;
  if(l.kind==='diary') return memoryDiaries.find(d=>d.id===l.target_id)?.title;
  if(l.kind==='trip') return library.trips.find(t=>t.id===l.target_id)?.name;
  return library.locations.find(x=>x.id===l.target_id)?.name;
}
function photoUsage(photos) { const ids=new Set(photos.map(p=>p.id)); const names=[...new Set([...library.links.filter(l=>ids.has(l.photo_id)).map(sourceName), ...library.albumPhotos.filter(ap=>ids.has(ap.photo_id)).map(ap=>library.albums.find(a=>a.id===ap.album_id)?.title)].filter(Boolean))]; return names.length?`Ảnh đang dùng tại: ${names.join(', ')}.`:'Ảnh không có liên kết nào.'; }
function renderPhotoSources(photo) {
  const box=$('photoSources'); box.replaceChildren();
  for (const ap of library.albumPhotos.filter(ap=>ap.photo_id===photo.id)) { const album=library.albums.find(a=>a.id===ap.album_id); if (album) box.append(memoryButton(`Album: ${album.title}`,()=>{ lb.close(); selectAlbum(album.id); })); }
  for(const l of library.links.filter(l=>l.photo_id===photo.id)) {
    const name=sourceName(l); if(!name) continue;
    box.append(memoryButton(name,()=>{ lb.close(); if(l.kind==='event'||l.kind==='diary') { const id=l.kind==='event'?l.target_id:memoryDiaries.find(d=>d.id===l.target_id)?.event_id; activeEvent=id; renderEvent(id); if(!$('eventDialog').open) $('eventDialog').showModal(); } else if(l.kind==='trip') openTrip(l.target_id); else openLocation(l.target_id); }));
  }
}
$('photoEdit').addEventListener('click',()=>{ const p=photoState.list[lbIndex]; if(p) openLibraryForm('photo',{id:p.id,caption:p.caption,taken:(p.taken||'').slice(0,10)}); });

/* Video và tệp đính kèm được đọc qua API có xác thực. */
let assetTarget;
async function assetRequest(query, options={}) {
  const res=await fetch(`${apiBase}/api/assets${query}`,{...options,headers:{...(options.headers||{}),authorization:`Bearer ${getToken()}`}});
  if(!res.ok) { const data=await res.json().catch(()=>({})); throw new Error(data.error || `Lỗi ${res.status}`); }
  return res;
}
async function openAssets(kind,id) {
  assetTarget={kind,id}; $('assetFile').accept=kind==='diary'?'video/mp4,video/webm':''; $('assetsDialog').showModal(); await renderAssets();
}
async function renderAssets() {
  const list=$('assetsList'); list.replaceChildren(); $('assetStatus').textContent='Đang tải…';
  try {
    const {assets}=await (await assetRequest(`?kind=${encodeURIComponent(assetTarget.kind)}&target=${encodeURIComponent(assetTarget.id)}`)).json();
    $('assetStatus').textContent=assets.length?'':'Chưa có tệp đính kèm.';
    for(const a of assets) {
      const row=node('div',null,'diary-entry'); row.append(node('span',`${a.filename} · ${(a.size/1048576).toFixed(1)} MB`));
      if (a.content_type.startsWith('video/')) row.append(memoryButton('Xem video',async()=>{ try { const response=await assetRequest(`?id=${encodeURIComponent(a.id)}`), url=URL.createObjectURL(await response.blob()), video=document.createElement('video'); video.controls=true; video.src=url; video.className='asset-video'; video.addEventListener('emptied',()=>URL.revokeObjectURL(url),{once:true}); row.append(video); video.play().catch(()=>{}); } catch(err) { $('assetStatus').textContent=err.message; } }));
      row.append(memoryButton('Mở / tải',async()=>{
        try { const response=await assetRequest(`?id=${encodeURIComponent(a.id)}`), blob=await response.blob(), url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download=a.filename; link.click(); setTimeout(()=>URL.revokeObjectURL(url),60000); }
        catch(err){ $('assetStatus').textContent=err.message; }
      }),memoryButton('Xoá',async()=>{ if(!confirm(`Xoá tệp ${a.filename}?`)) return; try { await assetRequest('?action=delete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:a.id})}); await renderAssets(); } catch(err) { $('assetStatus').textContent=err.message; } },'link danger')); list.append(row);
    }
  } catch(err) { $('assetStatus').textContent=err.message; }
}
$('assetsClose').addEventListener('click',()=> $('assetsDialog').close());
$('assetFile').addEventListener('change',async e=>{
  const input=e.target; input.disabled=true;
  try { for(const file of input.files) { $('assetStatus').textContent=`Đang tải ${file.name}…`; const form=new FormData(); form.append('kind',assetTarget.kind); form.append('target',assetTarget.id); form.append('file',file); await assetRequest('',{method:'POST',body:form}); } await renderAssets(); }
  catch(err) { $('assetStatus').textContent=err.message; } finally { input.disabled=false; input.value=''; }
});

function memoryPhotoStrip(kind,id) {
  const strip=node('div',null,'memory-photo-strip');
  const photos=photoState.all.filter(p => photoLinkedTo(p,kind,id));
  for(const photo of photos.slice(0,12)) {
    const button=memoryButton('',()=>{ photoState.list=photos; const index=photos.indexOf(photo); if(index>=0) openLightbox(index); },'memory-photo-button');
    const img=document.createElement('img'); img.src=media(`thumb/${photo.id}.webp`); img.alt=photo.caption || 'Ảnh kỷ niệm'; img.loading='lazy'; button.append(img); strip.append(button);
  }
  return strip;
}

/* Album giữ liên kết tới ảnh trong thư viện, không sao chép tệp. */
function albumMatchesFilters(a) {
  const year=$('photoYear').value, month=$('photoMonth').value, event=$('photoEvent').value, trip=$('photoTrip').value, location=$('photoLocation').value;
  const diary=memoryDiaries.find(d=>d.id===a.diary_id), place=library.locations.find(l=>l.id===a.location_id);
  const query=$('photoSearch').value.trim().toLocaleLowerCase('vi');
  const members=library.albumPhotos.filter(ap=>ap.album_id===a.id);
  const photoText=members.map(ap=>photoState.all.find(p=>p.id===ap.photo_id)?.caption || '').join(' ');
  return (!year || (a.album_month || '').slice(0,4)===year) && (!month || (a.album_month || '').slice(5,7)===month) &&
    (!event || a.event_id===event || diary?.event_id===event) && (!trip || a.trip_id===trip || place?.trip_id===trip) &&
    (!location || a.location_id===location) && (!query || `${a.title} ${place?.name || ''} ${photoText}`.toLocaleLowerCase('vi').includes(query));
}
function renderAlbums() {
  const list = $('albumList'); list.replaceChildren();
  const albums=library.albums.filter(albumMatchesFilters);
  $('albumFilterStatus').textContent = `${albums.length} album phù hợp`;
  for (const a of albums) {
    const count = library.albumPhotos.filter(p => p.album_id === a.id && photoState.all.some(photo=>photo.id===p.photo_id)).length;
    const button = memoryButton(`${a.title} · ${count} ảnh`, () => selectAlbum(a.id), 'chip');
    button.classList.toggle('active', activeAlbum === a.id); list.append(button);
  }
  if (!albums.length) list.append(node('p',library.albums.length?'Không có album phù hợp.':'Chưa có album. Hãy tạo album đầu tiên.','muted'));
  const actions=$('albumActions'); actions.replaceChildren(); actions.hidden=!activeAlbum;
  const album=library.albums.find(a=>a.id===activeAlbum);
  if (album) actions.append(memoryButton('＋ Thêm / quản lý ảnh',()=>openPhotoLinks('album',album.id),'btn btn-sm'),memoryButton('Sửa album',()=>openAlbumForm(album)),memoryButton('Xoá album',()=>deleteAlbum(album.id),'link danger'));
}
function selectAlbum(id) {
  const album=library.albums.find(a=>a.id===id);
  if (!album) return;
  if (!albumMatchesFilters(album)) for (const key of ['photoYear','photoMonth','photoEvent','photoTrip','photoLocation','photoSearch']) $(key).value='';
  activeAlbum=id;
  if ($('eventDialog').open) $('eventDialog').close();
  if ($('libraryDetailDialog').open) $('libraryDetailDialog').close();
  renderAlbums(); render(); $('photos').scrollIntoView();
}
function openAlbumForm(item={}) {
  editingAlbum=item.id || ''; const form=$('albumForm'); form.reset(); $('albumError').hidden=true;
  $('albumDialogTitle').textContent=editingAlbum?'Sửa album':'Thêm Album';
  form.elements.title.value=item.title || ''; form.elements.album_month.value=item.album_month || '';
  for (const [field,entries] of [['event_id',memoryEvents.map(x=>[x.id,x.title])],['diary_id',memoryDiaries.map(x=>[x.id,x.title])],['trip_id',library.trips.map(x=>[x.id,x.name])],['location_id',library.locations.map(x=>[x.id,x.name])]]) {
    const select=form.elements[field]; select.replaceChildren(new Option('Không liên kết','')); for(const [id,name] of entries) select.add(new Option(name,id)); select.value=item[field] || '';
  }
  $('albumDialog').showModal();
}
$('addAlbum').addEventListener('click',()=>openAlbumForm());
$('albumCancel').addEventListener('click',()=>$('albumDialog').close());
$('albumForm').addEventListener('submit',async e=>{
  e.preventDefault(); const form=e.currentTarget, submit=form.querySelector('[type=submit]'); submit.disabled=true; $('albumError').hidden=true;
  const id=editingAlbum || crypto.randomUUID(); const body={type:'album',action:'save',id,...Object.fromEntries(new FormData(form))};
  try { await libraryPost(body); $('albumDialog').close(); activeAlbum=id; await loadLibrary(); }
  catch(err) { $('albumError').textContent=err.message; $('albumError').hidden=false; }
  finally { submit.disabled=false; }
});
async function deleteAlbum(id) {
  if (!confirm('Xoá album này? Ảnh vẫn được giữ trong thư viện.')) return;
  try { await libraryPost({type:'album',action:'delete',id}); activeAlbum=''; await loadLibrary(); } catch(err) { alert(err.message); }
}
