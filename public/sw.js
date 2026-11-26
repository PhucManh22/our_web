// Service worker không lưu cache: nội dung cá nhân luôn được tải qua API có xác thực.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
