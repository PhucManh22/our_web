---
name: senior-backend-cloud
description: Senior Backend, Cloud & DevOps Engineer for our_web: Cloudflare Pages Functions, REST API contracts, D1 SQLite database queries & migrations, R2 object storage operations, PBKDF2 hashing, HMAC session tokens, magic bytes file sniffing, CORS allowlists, wrangler CLI deployment, GitHub Actions CI/CD cache busting, and zero-secret safety guardrails.
---

# Senior Backend, Cloud & DevOps Engineering Skill — `our_web`

## 1. Triết lý Thiết kế & Nguyên tắc Vận hành

### Kiến trúc Hệ thống Hybrid Serverless
Dự án `our_web` vận hành theo mô hình phân tách rõ ràng nhằm tối ưu chi phí và độ tin cậy trên Cloudflare Free Tier kết hợp GitHub Pages:
- **Frontend tĩnh**: GitHub Pages phục vụ file tại `phucmanh22.github.io/our_web/`.
- **Backend API**: Cloudflare Pages Functions tại `our-web.pages.dev/api/*`.
- **Cơ sở dữ liệu**: Cloudflare D1 (SQLite Serverless) `our-web-db`.
- **Lưu trữ đa phương tiện**: Cloudflare R2 bucket `our-web-media` (phục vụ qua public domain `r2.dev`).
- **Nguyên tắc hành động**:
  - Trả lời bằng **tiếng Việt**, giữ nguyên technical terms tiếng Anh.
  - Thiết kế theo **hợp đồng API (API contract)** trước, cài đặt sau.
  - Mọi thao tác phải **idempotent, quan sát được, và fail loud** (lỗi rõ ràng, mã HTTP chuẩn).
  - Không over-engineer: monolith gọn gàng, không microservices thừa thãi.
  - Quy tắc an toàn: Không commit secret, không commit binary media; **hỏi xác nhận trước** khi thực hiện thao tác khó đảo ngược (xoá dữ liệu, drop bảng, force-push).

---

## 2. Thiết kế API & Cloudflare Pages Functions

### Cấu trúc Routing & Module hoá
- **Thư mục Endpoints (`functions/api/`)**:
  - `notes.js`: Quản lý ghi chú kỷ niệm (GET, POST, DELETE).
  - `auth.js`: Xác thực màn khoá, đăng nhập, đổi mật khẩu (GET, POST ?action=login, POST ?action=change).
  - `photos.js`: Upload ảnh từ web, xoá ảnh hàng loạt (GET, POST, POST ?action=delete).
- **Thư mục Dùng chung (`functions/_shared/`)**:
  - `http.js`: CORS handling, chuẩn hoá JSON response, sleep utility.
  - `auth.js`: PBKDF2 hashing, HMAC token signing & verification, timing-safe equality.
  - `session.js`: Middleware `requireSession({ request, env })`.
  - *Lưu ý*: Thư mục `_shared/` không export hàm `onRequest` nên Cloudflare Pages không sinh route public.

### CORS Security & Allowlist
- Chỉ cho phép các origin được khai báo cụ thể trong `ALLOWED_ORIGINS`:
  - `https://phucmanh22.github.io`
  - `https://our-web.pages.dev`
  - `http://localhost:8788` (khi dev local)
- Sử dụng wrapper hàm bậc cao `withCors(handler)`:
  - Tự động bắt request `OPTIONS` (preflight) và trả về `HTTP 204 No Content` kèm headers CORS đầy đủ.
  - Gắn header `vary: origin` và `access-control-allow-*` vào mọi response trả về.
- Chuẩn hoá JSON qua helper `json(data, status = 200)`:
  - Header mặc định: `content-type: application/json; charset=utf-8` và `cache-control: no-store`.

---

## 3. Quản trị Dữ liệu — Cloudflare D1 (SQLite)

### Schema & Lịch sử Migration
Mọi thay đổi cấu trúc bảng **bắt buộc** phải thông qua file migration mới trong thư mục `migrations/`, tuyệt đối không sửa trực tiếp schema trên Cloudflare Dashboard:
1. `0001_init.sql`: Bảng `notes` (ghi chú, `author IN ('anh', 'em')`, giới hạn 1–2000 ký tự, index thời gian tạo).
2. `0002_settings.sql`: Bảng `settings` (key-value lưu trữ bản băm mật khẩu `login_hash`).
3. `0003_photos.sql`: Bảng `photos` (metadata ảnh upload từ web: `id` 12 hex, `original`, `w`, `h`, `color`, `caption`, `uploaded_at`).
4. `0004_deleted_photos.sql`: Bảng `deleted_photos` (lưu danh sách `id` của các ảnh cũ trong `photos.json` đã bị xoá).

### Thực thi Truy vấn An toàn (Anti-SQL Injection)
- **BẮT BUỘC** dùng parameterized queries với `.prepare().bind()`:
  ```javascript
  // ĐÚNG
  await env.DB.prepare('SELECT original FROM photos WHERE id = ?').bind(id).first();
  await env.DB.prepare('INSERT INTO notes (author, content) VALUES (?, ?)')
    .bind(author, content).first();

  // SAI (CẤM TUYỆT ĐỐI)
  await env.DB.prepare(`SELECT * FROM photos WHERE id = '${id}'`);
  ```
- Tận dụng mệnh đề `RETURNING` của SQLite để lấy ngay bản ghi mới tạo trong cùng một lượt truy vấn.

---

## 4. Quản lý Đa phương tiện — Cloudflare R2 (`our-web-media`)

### Tổ chức Bucket & Quy ước Đường dẫn
- `thumb/<id>.webp`: Thumbnail 480px, hiển thị trên masonry grid.
- `full/<id>.webp`: Ảnh nén 1600px, hiển thị trên lightbox.
- `original/<tên-file>`: File gốc người dùng upload (JPEG, PNG, WebP) hoặc ảnh gốc lưu trữ.
- `audio/<tên-bài>.mp3`: Nhạc nền website.
- `hero.webp`: Ảnh nền hero trang chủ.

### Kiểm tra Định dạng ở Biên (Magic Bytes Sniffing)
Không bao giờ tin tưởng tên file hoặc `Content-Type` do client gửi lên (vì bucket R2 này mở public). Server đọc mảng bytes đầu tiên (`Uint8Array`) để xác thực:
- **JPEG**: Bắt đầu bằng `[0xFF, 0xD8, 0xFF]`.
- **PNG**: Bắt đầu bằng `[0x89, 0x50, 0x4E, 0x47]`.
- **WebP**: `b.length >= 12`, bytes `0..3` là `RIFF`, bytes `8..11` là `WEBP`.
- File gốc không khớp 3 định dạng trên sẽ bị từ chối ngay lập tức (`HTTP 400`).

### Chiến lược Xoá Ảnh Kép (Dual Deletion Pattern)
Hệ thống quản lý 2 nguồn ảnh song song:
1. **Ảnh upload từ web** (id 12 ký tự hex, có bản ghi trong bảng `photos`):
   - Xoá vật lý 3 objects trên R2: `thumb/${id}.webp`, `full/${id}.webp`, `original/${row.original}`.
   - Xoá bản ghi trong bảng D1: `DELETE FROM photos WHERE id = ?`.
2. **Ảnh tĩnh cũ** (nằm trong file `public/photos.json`):
   - Xoá vật lý file gốc trên R2: `original/${it.original}`.
   - Thêm `id` vào bảng `deleted_photos`: `INSERT OR IGNORE INTO deleted_photos (id) VALUES (?)`.
   - Phía frontend khi tải danh sách sẽ tự động filter loại bỏ các ảnh có id nằm trong danh sách `deleted`.
- Mọi hành vi xoá là **vĩnh viễn không thể khôi phục**.

---

## 5. Xác thực & Mật mã học (Auth & Cryptography)

### Cơ chế Màn khoá Đăng nhập (`/api/auth`)
- **Băm mật khẩu PBKDF2**:
  - Thuật toán: PBKDF2-HMAC-SHA256, 16 bytes salt ngẫu nhiên, số vòng lặp `ITERATIONS = 20000`.
  - Lý do chọn 20.000 vòng: Cloudflare Pages Free giới hạn ~10 ms CPU time mỗi request; đây là mật khẩu riêng tư của hai người, không phải multi-tenant SaaS.
  - Lưu vào D1 bảng `settings` với key `login_hash`.
- **Token phiên 30 ngày tự huỷ khi đổi mật khẩu (HMAC Session Token)**:
  - Khóa HMAC được sinh động từ: `crypto.subtle.importKey('raw', secret + '|' + stored_hash)`.
  - Body token: `{ exp: now + 30 days }`.
  - Khi người dùng đổi mật khẩu, `stored_hash` trong D1 thay đổi $\to$ chữ ký của toàn bộ token phiên đã cấp trước đó trở nên vô hiệu $\to$ bắt buộc đăng nhập lại trên tất cả thiết bị.

### Chống Tấn công Dò thời gian (Timing-Attack Prevention)
- So sánh mật khẩu và chữ ký HMAC bằng hàm so sánh hằng thời gian (`equal(a, b)`):
  ```javascript
  function equal(a, b) {
    if (a.length !== b.length) return false;
    let d = 0;
    for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
    return d === 0;
  }
  ```
- Endpoint `/api/notes`: So sánh `x-passcode` với `env.NOTES_PASSCODE` bằng cách băm SHA-256 cả hai chuỗi rồi XOR (`safeEqual`), kèm trễ cố ý `setTimeout(400ms)` khi mật khẩu sai để triệt tiêu tấn công vét cạn.
- Endpoint `/api/auth`: Trễ cố ý `sleep(500ms)` khi mật khẩu không đúng.

---

## 6. CI/CD, Triển khai & Vận hành

### Quy trình CI/CD GitHub Actions (`.github/workflows/pages.yml`)
- Kích hoạt khi `push` vào nhánh `main`.
- Triển khai toàn bộ thư mục `public/` lên GitHub Pages.
- **Cache-Busting Tự động**:
  - Chạy lệnh `sed -i "s/__V__/${GITHUB_SHA::7}/g" public/index.html`.
  - Gắn mã hash commit 7 ký tự vào URL tài nguyên (`style.css?v=<sha>`, `app.js?v=<sha>`), ngăn trình duyệt lưu cache cũ khi web có cập nhật mới.

### Quy trình Triển khai Cloudflare Backend & Database
- `public/` do GitHub Pages quản lý.
- Khi có thay đổi trong `functions/` hoặc `migrations/`:
  1. Chạy migration cơ sở dữ liệu: `npm run db:migrate` (`wrangler d1 migrations apply our-web-db --remote`).
  2. Deploy Pages Functions: `npm run deploy` (`wrangler pages deploy public --project-name our-web`).

### Môi trường Phát triển Cục bộ (Local Development)
- Áp dụng migration vào D1 giả lập: `npm run db:migrate:local`.
- Chạy môi trường local: `npm run dev`.
  - Khởi tạo media server tại cổng `8790` (đọc ảnh từ `.build/photos`).
  - Khởi tạo wrangler pages dev tại cổng `8788` (chạy Functions + phục vụ `public/`).
- Cài mật khẩu ban đầu: `npm run auth:set` (hoặc `npm run auth:set:local`).
  - **Lưu ý**: Lệnh này kiểm tra `process.stdin.isTTY` và **phải chạy trong terminal thật có bàn phím tương tác** để ẩn ký tự khi gõ mật khẩu.

### Quy tắc An toàn Bất khả Xâm phạm
- **CẤM COMMIT**:
  - Không bao giờ commit ảnh gốc, thumbnail, file nhạc vào git (ảnh/nhạc thuộc về R2).
  - Không commit secret, file `.env`, file `.dev.vars`, token API.
- **HÀNH ĐỘNG PHÁ HUỶ**:
  - Tuyệt đối không chạy lệnh `rm -rf`, `DROP TABLE`, `git push --force`, hoặc xoá tài nguyên cloud khi chưa có xác nhận rõ ràng.
