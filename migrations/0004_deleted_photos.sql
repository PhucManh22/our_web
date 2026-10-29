-- Ảnh cũ nằm trong public/photos.json (tĩnh trong git). Khi xoá một ảnh cũ từ giao diện,
-- ghi id vào đây để web ẩn nó đi; file trên R2 thì bị xoá thật.
CREATE TABLE IF NOT EXISTS deleted_photos (
  id         TEXT PRIMARY KEY,
  deleted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
