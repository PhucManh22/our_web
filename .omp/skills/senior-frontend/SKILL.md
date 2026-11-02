---
name: senior-frontend
description: Senior Frontend Engineer for our_web: vanilla modern HTML5, CSS responsive layout, dark mode, CSS custom properties, accessibility (a11y), client-side WebP canvas resizing, sequential HEIC conversion (heic2any), lightbox <dialog>, anti-XSS textContent rendering, zero-build progressive enhancement.
---

# Senior Frontend Engineering Skill — `our_web`

## 1. Triết lý Thiết kế & Chuẩn Kỹ thuật

### Kiến trúc Zero-Build & Progressive Enhancement
Dự án `our_web` sử dụng kiến trúc web tĩnh thuần (Vanilla HTML5, modern CSS, ES Modules) không qua bước compile/bundle (không Vite, Webpack, Tailwind, React).
- **Nguyên tắc**: Giữ code nhẹ, dễ đọc, tải tức thì, chạy thẳng trên trình duyệt.
- **Tổ chức mã nguồn**:
  - Giao diện đặt hoàn toàn trong thư mục `public/`.
  - Cấu hình runtime nằm tại `public/config.js` (`window.OUR_WEB`).
  - Logic điều khiển tập trung tại `public/app.js`.
  - Design tokens và styles nằm tại `public/style.css`.
- **Giao tiếp & Quyết định**:
  - Trả lời bằng **tiếng Việt**, giữ nguyên technical terms tiếng Anh.
  - Luôn đưa ra **một khuyến nghị rõ ràng** kèm lý do, không liệt kê lan man.
  - Kiểm tra thực tế bằng mắt hoặc kiểm thử hành vi trước khi kết luận.

### Responsive & Design Tokens
- **Mobile-First Layout**: Thiết kế ưu tiên màn hình điện thoại (thiết bị xem ảnh kỷ niệm chính), tự động mở rộng theo grid/flex trên tablet và desktop.
- **Không bao giờ để scroll ngang**: Kiểm soát chặt chẽ `max-width: 100%`, `overflow-x: hidden` ở cấp độ root, `box-sizing: border-box`.
- **CSS Custom Properties (Variables)**:
  - Khai báo token tập trung ở `:root` trong `public/style.css`: màu sắc (`--bg`, `--surface`, `--text`, `--accent`), khoảng cách (`--gap`), bo góc (`--radius`), độ trễ animation.
  - Hỗ trợ Dark Mode tự nhiên qua `color-scheme: dark light` và media query `@media (prefers-color-scheme: dark)`.

---

## 2. Thành phần Giao diện Trọng tâm

### Đồng hồ Ngày Yêu (Love Duration Clock)
- Hàm `tick()` cập nhật mỗi 1000ms qua `setInterval`.
- Tính toán chính xác số ngày tổng cộng cùng số tháng và ngày lẻ theo lịch thực tế (`anchor.setMonth`), hiển thị định dạng chuẩn Việt Nam (`toLocaleString('vi-VN')`).

### Masonry Layout Theo Tháng (Photo Gallery)
- **Cấu trúc dữ liệu**: Ảnh được gom nhóm theo tháng (`YYYY-MM`) từ trường `taken` (hoặc `uploaded_at`).
- **Phân bổ cột responsive**: Tính số cột dựa trên chiều rộng viewport (1 cột trên mobile nhỏ, 2-3 cột trên tablet, 4-5 cột trên desktop lớn).
- **Chống CLS (Cumulative Layout Shift)**:
  - Thẻ `<img>` luôn khai báo `width` và `height` thật từ metadata (`w`, `h`).
  - Sử dụng thuộc tính `style="aspect-ratio: w/h; background-color: color;"` với mã màu dominant (`color`) trích xuất lúc upload để tạo placeholder êm dịu trước khi ảnh WebP tải xong.
  - Bật `loading="lazy"` và `decoding="async"` cho toàn bộ ảnh masonry ngoại trừ ảnh hero.

### Native `<dialog>` Lightbox
- **Thẻ HTML ngữ nghĩa**: Sử dụng native `<dialog id="lightbox">` thay vì tạo `<div>` overlay thủ công.
- **Điều khiển trạng thái**:
  - Mở bằng `dialog.showModal()`, đóng bằng `dialog.close()`. Trình duyệt tự động khoá focus bên trong modal.
  - Lắng nghe sự kiện `keydown`: phím `Escape` để thoát, phím mũi tên `ArrowLeft` / `ArrowRight` để chuyển ảnh kế tiếp hoặc quay lại.
- **Cử chỉ cảm ứng (Touch Gestures)**:
  - Bắt các sự kiện `touchstart`, `touchmove`, `touchend`.
  - Tính toán khoảng cách vuốt ngang (`deltaX`), ngưỡng vuốt tối thiểu 50px để kích hoạt lật ảnh (swipe navigation), ngăn chặn cuộn trang vô ý.

### Chế độ Chọn & Xoá Ảnh Hàng Loạt (Select Mode)
- Nút "Chọn ảnh" kích hoạt thanh tác vụ nổi `selectBar`.
- Checkbox trên từng thẻ ảnh được gắn nhãn trợ năng rõ ràng.
- Hộp thoại xác nhận (`confirm`) nêu rõ số lượng ảnh và cảnh báo xoá vĩnh viễn trên Cloudflare R2 trước khi gửi yêu cầu `POST /api/photos?action=delete`.

---

## 3. Xử lý Ảnh & Pipeline Chuyển đổi HEIC Phía Client

### Client-Side Canvas WebP Processing
Toàn bộ thao tác nén và tạo thumbnail diễn ra trên trình duyệt của người dùng trước khi upload lên Cloudflare R2, loại bỏ nhu cầu máy chủ xử lý ảnh tốn kém:
```javascript
// Chuẩn kích thước & chất lượng
const THUMB_W = 480;       // Thumbnail cho masonry grid
const FULL_SIDE = 1600;    // Ảnh full cho lightbox
const MAX_ORIGINAL = 20 * 1024 * 1024; // 20 MB giới hạn file gốc

async function prepareImage(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    // 1. Render canvas thumb (quality 0.72)
    // 2. Render canvas full (quality 0.80)
    // 3. Trích xuất màu chủ đạo 1x1 pixel
    return { thumb, full, meta: { w, h, color } };
  } finally {
    bmp.close(); // BẮT BUỘC: giải phóng bộ nhớ đồ hoạ ngay lập tức
  }
}
```

### Xử lý Định dạng HEIC (iPhone) — Gotchas & Deadlock Prevention
- Ảnh chụp từ iPhone tải lên từ Chrome/Firefox hoặc máy tính thường giữ nguyên định dạng `.heic` / `.heif`.
- **Tải lười thư viện**: Chỉ nạp file `public/vendor/heic2any.min.js` (~1.3 MB) vào DOM khi phát hiện file HEIC đầu tiên.
- **NGUY CƠ CHÍ MẠNG**: Thư viện `heic2any` chia sẻ một Web Worker giải mã duy nhất. **Nếu gọi song song nhiều file cùng lúc, worker sẽ bị deadlock và treo vĩnh viễn tab trình duyệt**.
- **Giải pháp bắt buộc**:
  1. Xếp hàng chuyển đổi tuần tự tuyệt đối qua `Promise` chain (`heicQueue`).
  2. Bọc `Promise.race` kèm timeout tối đa 60 giây.
  3. Bắt lỗi cục bộ (`task.catch(() => {})`) để một file HEIC lỗi không làm gián đoạn các file tiếp theo.

---

## 4. Trợ năng (Accessibility - a11y) & UX

### Tiêu chuẩn a11y
- Đạt chuẩn tương phản **WCAG AA** cho mọi văn bản trên nền sáng lẫn tối.
- Thẻ nút bấm (`<button>`) luôn có nhãn chữ hoặc thuộc tính `aria-label` trực quan (vd: nút bật/tắt nhạc có `aria-pressed`, nút đóng modal có `aria-label="Đóng"`).
- Đường viền focus (`:focus-visible`) phải luôn hiển thị rõ ràng khi điều hướng bằng bàn phím.

### Xử lý Trạng thái Dữ liệu (State Handling)
Mọi tương tác bất đồng bộ gọi API (`/api/notes`, `/api/photos`, `/api/auth`) luôn thể hiện đủ 3 trạng thái:
1. **Loading**: Hiển thị spinner / làm mờ nút bấm / vô hiệu hoá submit chống double-click.
2. **Error**: Thông báo lỗi cụ thể, dễ hiểu, đặt cạnh trường nhập liệu hoặc toast banner. Thông báo lỗi **không tự động tắt** để người dùng kịp đọc.
3. **Empty**: Khi chưa có ảnh hoặc chưa có ghi chú, hiển thị thông điệp trống thân thiện, không để màn hình trắng hoặc vỡ layout.
4. **Toast Success**: Thông báo thành công tự động ẩn sau đúng 3 giây.

---

## 5. Bảo mật Phía Client (Client-Side Security)

### Phòng chống XSS Tuyệt đối
- **CẤM DÙNG `innerHTML`** đối với bất kỳ nội dung nào do người dùng nhập hoặc trả về từ API (nội dung ghi chú, tên tác giả, chú thích ảnh).
- Luôn sử dụng thuộc tính an toàn:
  ```javascript
  // ĐÚNG
  element.textContent = userContent;
  // HOẶC
  element.append(document.createTextNode(userContent));
  ```

### Quản lý Secret & Session
- Tuyệt đối không hardcode mật khẩu, passcode hay private key trong mã nguồn client.
- Token phiên đăng nhập (Bearer token từ `/api/auth`) lưu trữ trong `localStorage` hoặc bộ nhớ phiên, tự động đính kèm vào header `Authorization: Bearer <token>` ở các request cần xác thực.
- Nếu API trả về `401 Unauthorized`, tự động kích hoạt màn khoá và yêu cầu đăng nhập lại.
