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

## Timeline, hành trình và thư

Bản phát triển mở rộng dùng các migration `0005`–`0007`: sự kiện và nhật ký, chuyến đi và địa điểm, thư, quan hệ ảnh và tệp đính kèm. Chạy `npm run db:migrate:local` trước khi thử local. API của các phần này yêu cầu phiên đăng nhập; thư có ngày mở trong tương lai không trả nội dung hay tệp đính kèm trước ngày đó.

Ảnh có thể liên kết với nhiều sự kiện, nhật ký, chuyến đi và địa điểm thông qua ID; xoá nhật ký hoặc địa điểm giữ ảnh trong thư viện. Video nhật ký và tệp đính kèm thư có giới hạn 20 MB/tệp, dùng binding `PRIVATE_MEDIA` và cần bucket R2 **không bật public access**. Để đính kèm tệp cho thư hẹn mở, tạo thư chưa đặt ngày mở, thêm tệp rồi sửa thư để đặt ngày mở.

Trước khi triển khai API mới cần tạo bucket R2 riêng tư `our-web-private-media`, áp dụng migration D1 và triển khai Pages Functions. Đây là thao tác trên hạ tầng thật; các thay đổi trong repo không tự tạo bucket hay áp dụng migration production.

**Giới hạn riêng tư hiện tại:** ảnh cũ và ảnh upload qua chức năng ảnh vẫn nằm trong bucket `our-web-media` công khai. Màn đăng nhập không bảo vệ URL của các ảnh đó. Để đáp ứng yêu cầu ảnh riêng tư cần chuyển toàn bộ ảnh sang bucket private, thay cách truy cập ảnh bằng API có xác thực và tắt public access sau khi kiểm tra dữ liệu; chưa thực hiện chuyển đổi này.

## Album kỷ niệm

Album lưu liên kết đến ảnh trong thư viện; một ảnh có thể nằm trong nhiều album mà không sao chép file. Mỗi album có thể gắn với nhật ký, sự kiện, chuyến đi, địa điểm và tháng. Xoá album chỉ gỡ các liên kết, không xoá ảnh. Migration `0008_albums.sql` gom ảnh tháng 12/2025 vào album ban đầu, dựa trên ngày đã chỉnh trong D1 hoặc metadata có sẵn.

Khi phát hành phiên bản này, chạy migration D1 trước, sau đó triển khai Pages Functions và cuối cùng phát hành frontend; frontend mới cần API và schema album mới.
