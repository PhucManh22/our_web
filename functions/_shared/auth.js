// Băm mật khẩu (PBKDF2) + token phiên đăng nhập ký HMAC. Dùng được cả trong Workers lẫn Node (scripts/set-password.mjs).

const enc = new TextEncoder();
// Free plan giới hạn ~10 ms CPU/request nên không đặt quá cao; đây là mật khẩu chung của hai người, không phải kho mật khẩu.
export const ITERATIONS = 20000;

const b64 = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

function equal(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(await derive(password, salt, ITERATIONS))}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, iter, salt, hash] = String(stored).split('$');
  if (scheme !== 'pbkdf2') return false;
  return equal(await derive(password, unb64(salt), Number(iter)), unb64(hash));
}

// Khoá HMAC gắn với bản băm mật khẩu hiện tại → đổi mật khẩu là mọi phiên cũ mất hiệu lực.
const hmacKey = (secret, stored) =>
  crypto.subtle.importKey('raw', enc.encode(`${secret}|${stored}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

export async function signToken(secret, stored, ttlSeconds) {
  const body = b64(enc.encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + ttlSeconds })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret, stored), enc.encode(body));
  return `${body}.${b64(sig)}`;
}

export async function verifyToken(secret, stored, token) {
  if (!token || !stored) return false;
  const [body, sig] = token.split('.');
  if (!body || !sig) return false;
  try {
    const expected = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret, stored), enc.encode(body)));
    if (!equal(expected, unb64(sig))) return false;
    return JSON.parse(new TextDecoder().decode(unb64(body))).exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export const bearer = (request) => (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
