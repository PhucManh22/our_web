// Cài/đặt lại mật khẩu đăng nhập (băm PBKDF2 rồi ghi vào D1). Không in mật khẩu, không lưu ở đâu khác.
// Usage: npm run auth:set          (D1 thật trên Cloudflare)
//        npm run auth:set:local    (D1 giả lập khi dev)
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';
import { hashPassword } from '../functions/_shared/auth.js';

const target = process.argv.includes('--local') ? '--local' : '--remote';

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question)) process.stdout.write(s); }; // ẩn ký tự gõ
    rl.question(question, (a) => { rl.close(); process.stdout.write('\n'); resolve(a); });
  });
}

const pw = await ask('Mật khẩu đăng nhập mới (≥ 6 ký tự): ');
if (pw.length < 6) { console.error('Mật khẩu quá ngắn.'); process.exit(1); }
if (pw !== (await ask('Nhập lại: '))) { console.error('Hai lần nhập không khớp.'); process.exit(1); }

const hash = await hashPassword(pw);
const sql = `INSERT INTO settings (key, value) VALUES ('login_hash', '${hash}') ON CONFLICT(key) DO UPDATE SET value = excluded.value`;
const r = spawnSync('npx', ['wrangler', 'd1', 'execute', 'our-web-db', target, '--command', sql], { stdio: 'inherit' });
if (r.status === 0) console.log(`✅ Đã cài mật khẩu đăng nhập (${target === '--local' ? 'local' : 'Cloudflare'}).`);
process.exit(r.status ?? 1);
