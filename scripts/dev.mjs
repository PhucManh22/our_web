// Dev local: server media (ảnh từ .build/photos, cổng 8790) + wrangler pages dev (web + /api, cổng 8788).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = path.resolve('.build/photos');
const TYPES = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp3': 'audio/mpeg' };

const media = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'access-control-allow-origin': '*' }).end();
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'access-control-allow-origin': '*',
  });
  fs.createReadStream(file).pipe(res);
});
media.listen(8790, () => console.log('media  → http://localhost:8790'));

const wr = spawn('npx', ['wrangler', 'pages', 'dev', 'public', '--port', '8788'], { stdio: 'inherit' });
const stop = () => { media.close(); wr.kill(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
wr.on('close', stop);
