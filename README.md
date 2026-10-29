# Chúng mình — website kỷ niệm

Web tĩnh + Cloudflare Pages Functions + D1 (ghi chú) + R2 (ảnh). Repo chỉ chứa code, vài trăm KB.

```
public/        giao diện (index.html, style.css, app.js, config.js, photos.json, photo-meta.json)
functions/     /api/notes (Pages Function, D1)
migrations/    schema D1
scripts/       optimize-photos · upload-photos · dev
```

## Chạy local

```bash
npm install
npm run photos:optimize     # tạo thumb/full WebP vào .build/photos + public/photos.json (cần ảnh gốc ở img_love/)
echo "NOTES_PASSCODE=dev-pass" > .dev.vars
npm run db:migrate:local
npm run dev                 # http://localhost:8788
```

Clone máy mới (không có ảnh gốc) vẫn chạy được phần giao diện/ghi chú; ảnh lấy từ R2 khi đã cấu hình `mediaBase`.

## Triển khai lần đầu (Cloudflare free)

1. **Đăng nhập:** `npx wrangler login`
2. **Bật R2:** dashboard Cloudflare → R2 Object Storage → bật R2 (gói free 10 GB, có thể hỏi thẻ nhưng không tính phí nếu không vượt).
3. **Tạo bucket + cho phép đọc công khai:**
   ```bash
   npx wrangler r2 bucket create our-web-media
   ```
   Dashboard → R2 → `our-web-media` → Settings → *Public access* → bật **r2.dev subdomain** (hoặc gắn custom domain — nhanh hơn nhờ CDN cache). Chép URL dạng `https://pub-xxxx.r2.dev` vào `public/config.js` (`mediaBase`).
4. **Upload ảnh** (chạy lại được, bỏ qua file đã xong):
   ```bash
   npm run photos:optimize
   npm run photos:upload          # thêm -- --no-original nếu chưa muốn đẩy ảnh gốc 1,1 GB
   ```
5. **Tạo D1:**
   ```bash
   npx wrangler d1 create our-web-db     # chép database_id vào wrangler.toml
   npm run db:migrate
   ```
6. **Tạo project Pages + secret + deploy:**
   ```bash
   npx wrangler pages project create our-web --production-branch main
   npx wrangler pages secret put NOTES_PASSCODE --project-name our-web
   npm run deploy
   ```

## Thêm ảnh mới

Bỏ ảnh vào `img_love/TX_0612/` (hoặc `-- --src <thư mục>`) → `npm run photos:optimize && npm run photos:upload` → commit `public/photos.json` → `npm run deploy`.

## Gán ngày / chú thích / album

Sửa `public/photo-meta.json` (id = tên file viết thường, ký tự lạ thành `-`, xem `photos.json`):

```json
{ "photos": { "cimg0001": { "date": "2025-10-03", "caption": "Sapa mù sương", "album": "Sapa" } } }
```

## Bảo mật ghi chú

Mật khẩu kiểm tra ở server (`NOTES_PASSCODE`), so sánh hằng thời gian, sai thì chậm 400 ms. Muốn chặn dò mật khẩu chắc hơn: Cloudflare dashboard → Security → WAF → Rate limiting rule cho `/api/notes` (free có 1 rule).
