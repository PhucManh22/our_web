// Helper dùng chung cho các Pages Function: JSON response + CORS theo allowlist origin.
// (Thư mục _shared không export onRequest nên không thành route.)

// Chỉ các origin này được gọi API từ trình duyệt (GitHub Pages phục vụ frontend).
export const ALLOWED_ORIGINS = new Set([
  'https://phucmanh22.github.io',
  'https://our-web.pages.dev',
  'http://localhost:8788',
]);

export function corsHeaders(request) {
  const origin = request.headers.get('origin');
  const h = { vary: 'origin' };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    h['access-control-allow-origin'] = origin;
    h['access-control-allow-headers'] = 'content-type, x-passcode, authorization';
    h['access-control-allow-methods'] = 'GET, POST, DELETE, OPTIONS';
    h['access-control-max-age'] = '86400';
  }
  return h;
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Bọc handler: trả preflight OPTIONS và gắn header CORS vào mọi response.
export const withCors = (handler) => async (ctx) => {
  if (ctx.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(ctx.request) });
  }
  const res = await handler(ctx);
  for (const [k, v] of Object.entries(corsHeaders(ctx.request))) res.headers.set(k, v);
  return res;
};
