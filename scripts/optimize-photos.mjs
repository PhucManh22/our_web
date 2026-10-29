// Tạo bản thumb + bản hiển thị (WebP) từ ảnh gốc, và sinh public/photos.json.
// Usage: npm run photos:optimize [-- --src img_love/TX_0612]
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import exifr from 'exifr';

const SRC = process.argv.includes('--src')
  ? process.argv[process.argv.indexOf('--src') + 1]
  : 'img_love/TX_0612';
const OUT = '.build/photos';
const MANIFEST = 'public/photos.json';
const THUMB_W = 480;
const FULL_SIDE = 1600;
const CONCURRENCY = 4;

const slug = (name) =>
  path.parse(name).name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Đồng hồ máy ảnh chưa chỉnh thường ghi ngày mặc định (vd CIMG → 2015) → coi như không có ngày.
const MIN_VALID = new Date('2020-01-01');
const valid = (d) => d instanceof Date && !isNaN(d) && d >= MIN_VALID && d <= new Date();

function dateFromName(name) {
  const m = name.match(/(20\d{2})(\d{2})(\d{2})[_-]?(\d{2})(\d{2})(\d{2})/);
  if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`);
  const l = name.match(/Locket_(\d{13})/); // epoch ms
  return l ? new Date(Number(l[1])) : null;
}

async function takenAt(file, name) {
  try {
    const tags = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
    const d = tags?.DateTimeOriginal ?? tags?.CreateDate;
    if (valid(d)) return d;
  } catch {}
  const n = dateFromName(name);
  return valid(n) ? n : null;
}

async function processOne(name) {
  const file = path.join(SRC, name);
  const id = slug(name);
  const img = () => sharp(file, { failOn: 'none' }).rotate();

  const thumbPath = path.join(OUT, 'thumb', `${id}.webp`);
  const fullPath = path.join(OUT, 'full', `${id}.webp`);

  const thumbInfo = await img()
    .resize({ width: THUMB_W, withoutEnlargement: true })
    .webp({ quality: 72 })
    .toFile(thumbPath);
  const fullInfo = await img()
    .resize({ width: FULL_SIDE, height: FULL_SIDE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(fullPath);
  const { dominant } = await sharp(thumbPath).stats();
  const color = '#' + [dominant.r, dominant.g, dominant.b].map((v) => v.toString(16).padStart(2, '0')).join('');

  const stat = await fs.stat(file);
  const d = await takenAt(file, name);
  return {
    id,
    original: name,
    w: thumbInfo.width,
    h: thumbInfo.height,
    color,
    taken: d ? d.toISOString().slice(0, 19) : null,
    bytes: { original: stat.size, full: fullInfo.size, thumb: thumbInfo.size },
  };
}

await fs.mkdir(path.join(OUT, 'thumb'), { recursive: true });
await fs.mkdir(path.join(OUT, 'full'), { recursive: true });
await fs.mkdir(path.dirname(MANIFEST), { recursive: true });

const names = (await fs.readdir(SRC)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
console.log(`Tìm thấy ${names.length} ảnh trong ${SRC}`);

// Ảnh nền hero + nhạc nền → cùng nằm trong .build/photos để upload chung
await fs.mkdir(path.join(OUT, 'audio'), { recursive: true });
await sharp('img_love/home_background.JPG', { failOn: 'none' })
  .rotate()
  .resize({ width: 2000, withoutEnlargement: true })
  .webp({ quality: 78 })
  .toFile(path.join(OUT, 'hero.webp'));
await fs.copyFile('sound/treaser.mp3', path.join(OUT, 'audio/treaser.mp3'));

const results = [];
const failed = [];
let next = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < names.length) {
      const name = names[next++];
      try {
        results.push(await processOne(name));
      } catch (e) {
        failed.push({ name, error: e.message });
      }
      if ((results.length + failed.length) % 25 === 0)
        console.log(`  ${results.length + failed.length}/${names.length}`);
    }
  })
);

// Mới nhất trước; ảnh không có ngày xuống cuối
results.sort((a, b) => (b.taken ?? '').localeCompare(a.taken ?? '') || a.id.localeCompare(b.id));
const ids = new Set();
for (const r of results) {
  if (ids.has(r.id)) throw new Error(`Trùng id: ${r.id}`);
  ids.add(r.id);
}

const sum = (k) => results.reduce((s, r) => s + r.bytes[k], 0);
await fs.writeFile(
  MANIFEST,
  JSON.stringify({ generated: new Date().toISOString(), count: results.length, photos: results.map(({ bytes, ...p }) => p) })
);

const mb = (n) => (n / 1048576).toFixed(0) + ' MB';
console.log(`\n✅ ${results.length} ảnh OK, ${failed.length} lỗi`);
console.log(`   Gốc ${mb(sum('original'))}  →  full ${mb(sum('full'))}  +  thumb ${mb(sum('thumb'))}`);
console.log(`   Không có ngày chụp: ${results.filter((r) => !r.taken).length}`);
if (failed.length) console.log('Lỗi:', failed);
