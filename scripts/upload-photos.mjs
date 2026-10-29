// Upload .build/photos (+ ảnh gốc) lên R2 bằng wrangler. Chạy lại được: bỏ qua file đã upload.
// Usage: npm run photos:upload [-- --bucket our-web-media] [--no-original]
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : def;
};
const BUCKET = arg('--bucket', 'our-web-media');
const SRC_ORIGINALS = arg('--src', 'img_love/TX_0612');
const WITH_ORIGINAL = !process.argv.includes('--no-original');
const BUILD = '.build/photos';
const LOG = '.build/uploaded.json';
const CONCURRENCY = 6;

const TYPES = {
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.mp3': 'audio/mpeg',
};

async function walk(dir, prefix = '') {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const rel = path.posix.join(prefix, e.name);
    if (e.isDirectory()) out.push(...(await walk(path.join(dir, e.name), rel)));
    else out.push({ file: path.join(dir, e.name), key: rel });
  }
  return out;
}

const jobs = await walk(BUILD);
if (WITH_ORIGINAL) {
  for (const name of await fs.readdir(SRC_ORIGINALS)) {
    if (TYPES[path.extname(name).toLowerCase()]) jobs.push({ file: path.join(SRC_ORIGINALS, name), key: `original/${name}` });
  }
}

const done = new Set(JSON.parse(await fs.readFile(LOG, 'utf8').catch(() => '[]')));
const todo = jobs.filter((j) => !done.has(j.key));
console.log(`Bucket ${BUCKET}: ${jobs.length} file, đã xong ${jobs.length - todo.length}, còn ${todo.length}`);

const put = (j) =>
  new Promise((resolve, reject) => {
    const p = spawn('npx', [
      'wrangler', 'r2', 'object', 'put', `${BUCKET}/${j.key}`,
      '--file', j.file,
      '--content-type', TYPES[path.extname(j.file).toLowerCase()],
      '--cache-control', 'public, max-age=31536000, immutable',
      '--remote',
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.trim().split('\n').slice(-3).join(' ')))));
  });

let i = 0, ok = 0;
const failed = [];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (i < todo.length) {
      const j = todo[i++];
      try {
        await put(j);
        done.add(j.key);
        ok++;
        if (ok % 20 === 0) {
          await fs.writeFile(LOG, JSON.stringify([...done]));
          console.log(`  ${ok}/${todo.length}`);
        }
      } catch (e) {
        failed.push({ key: j.key, error: e.message });
      }
    }
  })
);
await fs.writeFile(LOG, JSON.stringify([...done]));
console.log(`\n✅ Upload ${ok}/${todo.length}`);
if (failed.length) {
  console.log(`❌ ${failed.length} lỗi (chạy lại lệnh để thử tiếp):`);
  console.log(failed.slice(0, 5));
  process.exit(1);
}
