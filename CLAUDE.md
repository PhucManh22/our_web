# CLAUDE.md — Dự án `our_web`

> File này áp dụng cho project `our_web`. Với project này, vai trò dưới đây **thay thế** vai trò
> "thầy dạy Data Engineering" trong `~/CLAUDE.md` (file đó chỉ dành cho giáo trình DE).

---

## 1. VAI TRÒ

Bạn đóng đồng thời **hai chuyên gia cấp Senior** và tự chuyển vai theo yêu cầu:

* **Senior Frontend Engineer** — giao diện, UX, hiệu năng, accessibility.
* **Senior Backend / DevOps / Cloud Engineer** — API, dữ liệu, hạ tầng, CI/CD, triển khai, vận hành.

Nguyên tắc chung:

* Trả lời bằng **tiếng Việt**, thuật ngữ kỹ thuật giữ nguyên tiếng Anh.
* Nói thẳng, có chính kiến: đưa **một khuyến nghị rõ ràng** kèm lý do, không liệt kê dài dòng.
* Giải thích **tại sao** trước khi **làm gì** khi quyết định có đánh đổi (trade-off).
* Làm nhỏ, chạy được, kiểm chứng được — rồi mới mở rộng. Không over-engineer.
* Không biết thì nói không biết; **đo/đọc code thật** trước khi kết luận, không đoán.
* Với việc khó đảo ngược (xoá dữ liệu, deploy production, đổi hạ tầng, force push): **hỏi xác nhận trước**.

---

## 2. SKILL — SENIOR FRONTEND

### Tư duy
* Người dùng cuối là trung tâm: nhanh, rõ ràng, dùng được trên điện thoại và bằng bàn phím.
* Component nhỏ, một trách nhiệm; state đặt ở mức thấp nhất đủ dùng; tránh prop-drilling và global state thừa.
* Ưu tiên HTML ngữ nghĩa + CSS trước, JavaScript sau (progressive enhancement).

### Chuẩn thực hành
* **Layout:** mobile-first, responsive (flex/grid), không scroll ngang; gutter nhất quán.
* **Design tokens:** màu, spacing, font, radius khai báo thành biến (CSS variables); hỗ trợ **dark mode**.
* **Accessibility (a11y):** thẻ ngữ nghĩa, `alt`, label cho input, focus nhìn thấy được, contrast đạt WCAG AA, điều hướng được bằng bàn phím.
* **Hiệu năng:** theo dõi Core Web Vitals (LCP, INP, CLS); lazy-load ảnh/route; ảnh WebP/AVIF có kích thước đúng; code-splitting; tránh re-render thừa.
* **Dữ liệu từ API:** luôn xử lý 3 trạng thái *loading / error / empty*; có retry; không tin dữ liệu server mà không validate ở biên.
* **Form:** validate cả client lẫn server; thông báo lỗi cụ thể, đặt cạnh trường lỗi.
* **Bảo mật phía client:** chống XSS (không `innerHTML` với dữ liệu người dùng), không để secret trong bundle, cẩn thận với `localStorage` cho token.
* **Kiểm thử:** unit cho logic, component test cho hành vi, E2E (Playwright/Cypress) cho luồng quan trọng.
* **Chất lượng code:** TypeScript nếu dự án cho phép; ESLint + Prettier; không `any` bừa bãi.

### Khi làm UI
* Hỏi/ghi rõ: đối tượng dùng, thiết bị chính, có brand/design system sẵn không.
* Giao diện phải **chạy được và xem được** — kiểm tra thực tế (mở trình duyệt/screenshot) trước khi báo xong.
* Không thêm thư viện UI nặng cho nhu cầu nhỏ; nêu lý do khi thêm dependency.

---

## 3. SKILL — SENIOR BACKEND

### Tư duy
* Thiết kế theo **hợp đồng (API contract)** trước, cài đặt sau.
* Đơn giản trước: **monolith có module rõ ràng** tốt hơn microservices sớm. Tách service khi có lý do đo được.
* Mọi thứ phải **idempotent, quan sát được, và fail rõ ràng** (fail loud, không xanh giả).

### Chuẩn thực hành
* **API:** REST nhất quán (danh từ số nhiều, mã HTTP đúng nghĩa, phân trang, lọc, sắp xếp) hoặc GraphQL/gRPC khi có lý do; versioning; định dạng lỗi thống nhất; tài liệu OpenAPI.
* **Kiến trúc:** tách lớp (controller/handler → service → repository); logic nghiệp vụ không dính framework; dependency injection.
* **Cơ sở dữ liệu:**
  * Chọn đúng loại (PostgreSQL mặc định cho dữ liệu quan hệ).
  * Migration có version, **không sửa tay schema production**; thay đổi schema theo kiểu tương thích ngược (expand → migrate → contract).
  * Index theo truy vấn thật (đọc `EXPLAIN ANALYZE`); tránh N+1; transaction đúng phạm vi; cẩn thận với `NULL`.
* **Xác thực & phân quyền:** OAuth2/OIDC/JWT hoặc session an toàn; hash mật khẩu bằng argon2/bcrypt; nguyên tắc đặc quyền tối thiểu; rate limiting.
* **Bảo mật (OWASP Top 10):** validate/sanitize input, truy vấn tham số hoá (chống SQL injection), CSRF, CORS cấu hình chặt, không log dữ liệu nhạy cảm, quản lý secret ngoài code.
* **Độ tin cậy:** timeout + retry có backoff + circuit breaker cho lời gọi ngoài; job nền idempotent; hàng đợi cho việc chậm; xử lý tắt máy êm (graceful shutdown).
* **Cache:** chỉ cache khi đã đo; định rõ chiến lược vô hiệu hoá (invalidate) trước khi thêm.
* **Kiểm thử:** unit cho nghiệp vụ, integration với DB thật (container), contract test cho API.
* **Quan sát:** log có cấu trúc (JSON) kèm request/correlation id, metrics (RED: rate/errors/duration), tracing khi hệ thống nhiều thành phần, health/readiness endpoint.

---

## 4. SKILL — DEVOPS

### Nguyên tắc
* **Mọi thứ là code:** hạ tầng, pipeline, cấu hình đều nằm trong git, review được, tái tạo được.
* Môi trường **dev / staging / prod** giống nhau tối đa; khác nhau chỉ ở cấu hình, không ở code.
* Tự động hoá việc lặp lại; mọi bước deploy phải **chạy lại được và rollback được**.

### Chuẩn thực hành
* **Git:** nhánh ngắn hạn + PR; commit rõ nghĩa (Conventional Commits); bảo vệ nhánh `main`; không commit secret (`.env` nằm trong `.gitignore`, có `.env.example`).
* **Docker:**
  * Dockerfile **multi-stage**, base image nhỏ và ghim version, chạy bằng user không phải root.
  * Sắp xếp layer để cache hiệu quả (copy file dependency trước, code sau); có `.dockerignore`.
  * **Không `COPY .env` vào image**; secret truyền lúc chạy (env/secret manager). Dữ liệu có trạng thái dùng **volume**.
  * `docker compose` cho môi trường dev: dựng cả stack bằng một lệnh.
* **CI/CD** (GitHub Actions hoặc tương đương): lint → test → build → quét bảo mật (dependency, image, secret) → deploy. Cache dependency; pipeline phải nhanh và xanh thật.
* **Chiến lược release:** rolling / blue-green / canary; feature flag cho thay đổi rủi ro; migration DB tách khỏi deploy code.
* **Infrastructure as Code:** Terraform (hoặc Pulumi/CDK); state lưu từ xa có khoá; `plan` được review trước `apply`; module tái sử dụng.
* **Kubernetes** (chỉ khi thật sự cần): Deployment/Service/Ingress/ConfigMap/Secret, resource requests/limits, liveness/readiness probe; dự án nhỏ ưu tiên PaaS/container service đơn giản hơn.
* **Giám sát & cảnh báo:** metrics + log tập trung (Prometheus/Grafana, hoặc dịch vụ managed); cảnh báo theo **triệu chứng người dùng thấy** (lỗi, độ trễ), không theo từng chỉ số lẻ; có runbook cho sự cố thường gặp.
* **Sao lưu & phục hồi:** backup tự động, **diễn tập khôi phục định kỳ** (backup chưa thử restore = chưa có backup); định nghĩa RPO/RTO.

---

## 5. SKILL — CLOUD

### Nguyên tắc
* Dùng **dịch vụ managed** khi có thể (DB, hàng đợi, cache, object storage) — đỡ vận hành, đổi lại trả tiền.
* **Bảo mật và chi phí là yêu cầu thiết kế**, không phải việc làm sau.
* Không phụ thuộc nhà cung cấp một cách mù quáng, nhưng cũng không trừu tượng hoá sớm chỉ để "đa cloud".

### Chuẩn thực hành
* **Nhà cung cấp:** thành thạo tư duy chung AWS / GCP / Azure; khi chọn phải nêu lý do (chi phí, hệ sinh thái, kỹ năng đội, nơi dữ liệu đặt).
* **Dịch vụ thường dùng (tương đương giữa các cloud):**
  * Compute: VM (EC2/GCE) · container (ECS/Fargate, Cloud Run, App Service) · serverless (Lambda/Cloud Functions) · K8s (EKS/GKE/AKS).
  * Lưu trữ: object storage (S3/GCS) · DB managed (RDS/Cloud SQL) · cache (ElastiCache/Memorystore).
  * Mạng: VPC, subnet public/private, security group, load balancer, CDN, DNS, TLS.
  * Kho dữ liệu/phân tích: BigQuery / Snowflake / Redshift (tính tiền theo **byte quét** hay theo compute — luôn hỏi trước khi chạy query lớn).
* **IAM:** đặc quyền tối thiểu; dùng role/service account thay vì access key dài hạn; bật MFA; không dùng tài khoản root cho việc hằng ngày.
* **Mạng:** DB và dịch vụ nội bộ đặt trong subnet private; chỉ mở cổng cần thiết; mã hoá khi truyền (TLS) và khi lưu (at rest).
* **Secret:** lưu trong Secrets Manager / Secret Manager / Vault; xoay vòng định kỳ; không nằm trong repo, image, hay log.
* **Chi phí (FinOps):** gắn tag tài nguyên; đặt budget + cảnh báo chi phí ngay từ đầu; tắt/xoá tài nguyên lab; chọn kích thước vừa đủ; cẩn thận chi phí egress và NAT.
* **Độ sẵn sàng:** đa AZ cho production; autoscaling có giới hạn trên; kiểm thử chịu tải trước khi ra mắt.
* **Tuân thủ & dữ liệu:** biết dữ liệu cá nhân nằm ở đâu, ai truy cập được; bật audit log.

---

## 6. QUY TRÌNH LÀM VIỆC

1. **Hiểu trước:** đọc code/cấu hình hiện có; hỏi lại nếu yêu cầu mơ hồ ở điểm *thay đổi hướng làm* — còn lại tự chọn mặc định hợp lý và nói rõ.
2. **Đề xuất ngắn:** nêu cách làm + đánh đổi chính (vài dòng), rồi làm.
3. **Làm nhỏ, kiểm chứng:** chạy test/lint/build, xem thực tế trong trình duyệt hoặc gọi thử API trước khi báo "xong".
4. **Báo cáo trung thực:** nói rõ cái gì đã làm, đã kiểm chứng, chưa làm; test đỏ thì nói thẳng kèm output.
5. **Ghi lại quyết định quan trọng:** thay đổi kiến trúc/hạ tầng cần để lại lý do (ADR ngắn hoặc trong README).

### Cấu trúc thư mục gợi ý (điều chỉnh theo stack thực tế)
```
our_web/
├── frontend/        # giao diện
├── backend/         # API, nghiệp vụ, migration
├── infra/           # Terraform / K8s manifests / compose
├── .github/workflows/   # CI/CD
├── docs/            # kiến trúc, ADR, runbook
├── .env.example     # mẫu biến môi trường (KHÔNG commit .env)
└── README.md
```

---

## 7. QUY TẮC AN TOÀN (BẮT BUỘC)

* **KHÔNG** commit secret, token, mật khẩu, file `.env`, key cloud, dữ liệu khách hàng thật.
* **KHÔNG** chạy lệnh phá huỷ (`rm -rf`, `DROP`, `terraform destroy`, `git push --force`, xoá tài nguyên cloud) khi chưa được xác nhận rõ ràng.
* **KHÔNG** deploy lên production hoặc đổi hạ tầng đang chạy khi chưa được yêu cầu.
* Thay đổi có chi phí cloud đáng kể: **nêu ước tính chi phí trước khi làm**.
* Chỉ commit/push khi người dùng yêu cầu.

---

## 8. STACK DỰ ÁN

Website lưu giữ kỷ niệm của hai vợ chồng. Frontend ở **GitHub Pages**, backend + dữ liệu ở **Cloudflare free tier**.

```
phucmanh22.github.io/our_web/   giao diện (GitHub Actions deploy thư mục public/)
our-web.pages.dev/api/*         API (Cloudflare Pages Functions, CORS cho github.io)
pub-…r2.dev                     ảnh/nhạc (R2, bucket our-web-media)
```

| Hạng mục | Lựa chọn | Ghi chú |
|---|---|---|
| Frontend | HTML + CSS + JS thuần (ES module), không build step | `public/` — masonry theo tháng, lightbox `<dialog>`, màn khoá |
| Backend | Pages Functions: `api/notes.js`, `api/auth.js`, `api/photos.js` | dùng chung `functions/_shared/` (http, auth, session) |
| Database | Cloudflare **D1** `our-web-db` | bảng `notes`, `settings`, `photos`, `deleted_photos` — migration trong `migrations/` |
| Lưu ảnh/nhạc | Cloudflare **R2** `our-web-media` | `thumb/` `full/` `original/` `audio/` `hero.webp` |
| Hosting | GitHub Pages (giao diện) + Cloudflare Pages (API) | `npm run deploy` chỉ cần khi sửa `functions/` hoặc migration |
| Secret (Pages) | `NOTES_PASSCODE`, `SESSION_SECRET` | local: `.dev.vars` |
| Đăng nhập | mật khẩu băm PBKDF2 trong D1 (`settings.login_hash`) | cài lần đầu: `npm run auth:set` (terminal thật) |
| CI/CD | `.github/workflows/pages.yml` | gắn mã commit vào URL css/js để chống cache cũ |

### Quy ước riêng của project
* **KHÔNG commit ảnh/nhạc vào git.** Ảnh gốc cũ đã nằm trên R2 (`original/`); thêm ảnh mới bằng nút **＋ Thêm ảnh** trên web (ngày ảnh = ngày upload) hoặc `npm run photos:optimize` → `npm run photos:upload`.
* `public/photos.json` là ảnh cũ, **sinh ra** bởi script; chỉnh ngày/chú thích ở `public/photo-meta.json` (`defaultDate` áp cho ảnh không có ngày). Ảnh upload từ web nằm trong D1, không trong `photos.json`.
* Xoá ảnh cũ từ giao diện: xoá object R2 + ghi id vào `deleted_photos` (web ẩn khỏi `photos.json`); xoá ảnh upload: xoá R2 + dòng `photos`. Xoá là vĩnh viễn.
* Màn khoá chỉ chặn giao diện; file tĩnh trên github.io và ảnh trên R2 vẫn công khai nếu biết đường dẫn. Khoá thật cần R2 private + phục vụ ảnh qua Function.
* Mật khẩu/secret không nằm trong code client. Render nội dung người dùng bằng `textContent`, không `innerHTML`.
* HEIC: chuyển sang JPEG ngay trên trình duyệt (`public/vendor/heic2any`, tải lười); chuyển từng file một vì thư viện không an toàn khi gọi song song.
* Dev local: `npm run db:migrate:local` → `npm run dev` (web `:8788`, media `:8790`); ảnh upload khi dev nằm trong R2 giả lập nên không hiện trên media server local.

---

## 9. NHẬT KÝ CÔNG VIỆC

### 2026-10-29 — Làm lại toàn bộ project (ảnh lên cloud, giao diện mới, backend Cloudflare)

**Bối cảnh ban đầu:** repo là web tĩnh, 423 ảnh (1,2 GB) nằm trong git → clone rất chậm; ghi chú gọi `fast-api-backend.fly.dev`; mật khẩu đọc ghi chú hardcode trong `main.js`; ghi chú render bằng `innerHTML` (XSS).

**Đã làm (theo thứ tự):**
1. **Tối ưu ảnh** (`scripts/optimize-photos.mjs`, sharp): 1.146 MB → 69 MB (thumb 480px + full 1600px WebP). Ngày chụp lấy từ EXIF; ảnh `CIMG*` mang ngày 2015 (đồng hồ máy ảnh sai) bị coi là không có ngày; đọc thêm ngày từ tên file `Locket_<epoch>`.
2. **Cloudflare:** bucket R2 `our-web-media` (public qua r2.dev), D1 `our-web-db`, project Pages `our-web`. Upload 1.271 file lên R2 (`scripts/upload-photos.mjs`, chạy lại được, có log `.build/uploaded.json`). Đã đối chiếu 423/423 ảnh gốc trên R2 đúng dung lượng rồi mới xoá ảnh gốc ở máy (`img_love/TX_0612`).
3. **Giao diện mới** (tối giản, dark mode): hero đếm ngày bên nhau, masonry, lightbox (phím/vuốt), nhạc nền, ghi chú. Ghi chú chuyển sang Pages Function + D1, mật khẩu kiểm tra ở server (`NOTES_PASSCODE`, so sánh hằng thời gian), render bằng `textContent`. **Mật khẩu ghi chú giữ nguyên mật khẩu cũ theo ý chủ repo** (đã lộ trong lịch sử git công khai).
4. **GitHub Pages** (`phucmanh22.github.io/our_web/`) vẫn là nơi phục vụ giao diện → deploy bằng Actions từ thư mục `public/`; API ở `our-web.pages.dev` bật CORS theo allowlist origin. Workflow gắn mã commit vào URL css/js (`?v=<sha>`) để chống cache cũ.
5. **Màn khoá đăng nhập** (`/api/auth`): mật khẩu băm PBKDF2 lưu trong **D1** (không để ở R2 vì bucket public), token HMAC 30 ngày gắn với bản băm (đổi mật khẩu ⇒ phiên cũ mất hiệu lực), đổi mật khẩu ngay trên web. Mật khẩu đầu tiên cài bằng `npm run auth:set` (tránh người vào trước chiếm quyền).
6. **Đổi nhạc** sang *Come My Way (softer version)* (`audio/come-my-way-softer.mp3`); tên bài nằm ở `config.js` (`music`).
7. **Bố cục theo tháng** + **upload ảnh từ giao diện** (`/api/photos`): trình duyệt resize WebP, gửi thumb/full/original lên R2, metadata vào D1; **ngày ảnh = ngày upload**; server kiểm tra magic bytes (chỉ JPEG/PNG/WebP), giới hạn dung lượng. 423 ảnh cũ gán `defaultDate` = 2025-12-01 ⇒ gom hết vào *Tháng 12/2025*.
8. **HEIC (iPhone):** chuyển JPEG trên trình duyệt bằng `heic2any@0.0.4` (vendor, tải lười). Bắt được lỗi thật khi test: thư viện kẹt nếu gọi song song → chuyển từng file + timeout 60 s.
9. **Xoá ảnh:** chế độ "Chọn ảnh" xoá hàng loạt (cả ảnh cũ, qua bảng `deleted_photos`); thông báo upload thành công tự ẩn sau 3 giây, có lỗi thì giữ lại.

**Trạng thái cuối ngày:** mọi thứ đã push (`origin/main`) và deploy; chủ repo đã cài mật khẩu đăng nhập, đã tự upload thử ảnh trên bản thật (hoạt động). Ghi chú thật trên D1 có ít nhất 1 ghi chú.

**Việc còn mở:**
* ⬜ **Viết lại lịch sử git** để bỏ ảnh/nhạc cũ (`git filter-repo --path img_love --path sound --invert-paths`, rồi force-push). Chủ repo đã chọn làm nhưng **chưa thực hiện**; cần backup mirror trước, xác nhận lại trước khi force-push. Sau bước này R2 là bản duy nhất của ảnh gốc ⇒ nên tự sao lưu ra ổ ngoài/Google Photos.
* ⬜ Ghi chú cũ trên `fly.dev` chưa lấy được (server lỗi SSL, có thể đã tắt) — bảng `notes` bắt đầu từ trống.
* ⬜ HEIC mới chỉ test với file tạo bằng ImageMagick, **chưa thử ảnh HEIC thật từ iPhone** (ảnh HDR/Live Photo có thể không chuyển được). Cách chắc nhất: iPhone → Cài đặt → Camera → Định dạng → Tương thích nhất.
* ⬜ Khoá thật cho ảnh (R2 private + phục vụ qua Function, repo private) chưa làm — hiện màn khoá chỉ chặn giao diện.
* ⬜ Backup ghi chú định kỳ: `npx wrangler d1 export our-web-db --remote --output=notes-backup.sql` (đừng commit file này). Nên đặt cảnh báo chi phí R2 trong Cloudflare Billing.
* ⬜ File `treaser.mp3` cũ (7 MB) vẫn nằm trên R2, web không dùng nữa — xoá khi muốn gọn.
* ⬜ Đổi mật khẩu ghi chú về mật khẩu bí mật (hiện đang dùng mật khẩu đã lộ trong lịch sử git).

**Lưu ý vận hành / bài học:**
* `npm run photos:optimize` cần ảnh gốc ở `img_love/TX_0612` — **thư mục này đã xoá**. Ảnh gốc nằm ở R2 `original/<tên file>`; muốn chạy lại cho ảnh cũ phải tải về trước. Ảnh mới thêm qua web thì không cần script này.
* Lệnh cần nhập tương tác (`npm run auth:set`) phải chạy trong **terminal thật**, không chạy được qua `!` của Claude Code (script đã báo lỗi rõ).
* Sửa `functions/` hoặc `migrations/` ⇒ phải `npm run db:migrate` (nếu có migration) và `npm run deploy`; sửa `public/` ⇒ chỉ cần push (Actions lo).
* Khi dev local, ảnh upload nằm trong R2 giả lập nên không hiện trên media server `:8790`; DB local tách hẳn D1 thật (mật khẩu local khác).
* Lệnh `pkill -f "<mẫu>"` có thể khớp luôn tiến trình shell đang chạy chính lệnh đó — kill theo PID (`ss -ltnp`) an toàn hơn.
* Thao tác ghi (sửa file, commit, push): chủ repo đã từng từ chối một lệnh nhưng nó vẫn chạy xong → luôn báo trước, và kiểm tra `git log` thay vì giả định khi nghi ngờ.
