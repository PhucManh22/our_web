// Cấu hình chung. Sửa ở đây khi đổi ngày kỷ niệm hoặc địa chỉ bucket ảnh.
window.OUR_WEB = {
  // API ghi chú: GitHub Pages không chạy được backend nên gọi sang Cloudflare. Local/Cloudflare Pages dùng cùng origin.
  apiBase: location.hostname.endsWith('github.io') || location.protocol === 'capacitor:' || (location.hostname === 'localhost' && location.protocol === 'https:') ? 'https://our-web.pages.dev' : '',
  music: 'audio/come-my-way-softer.mp3', // nằm trong bucket R2
  startDate: '2025-09-14T00:00:00+07:00', // ngày bắt đầu yêu nhau
};
