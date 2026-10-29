// Cấu hình chung. Sửa ở đây khi đổi ngày kỷ niệm hoặc địa chỉ bucket ảnh.
window.OUR_WEB = {
  startDate: '2025-09-14T00:00:00+07:00', // ngày bắt đầu yêu nhau
  // Ảnh/nhạc nằm trên Cloudflare R2. Dev local: server media ở cổng 8790 (npm run dev).
  mediaBase:
    location.hostname === 'localhost'
      ? 'http://localhost:8790'
      : 'https://pub-51043db568c94f6894740d64a460d3f1.r2.dev',
};
