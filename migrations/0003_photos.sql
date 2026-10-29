-- Ảnh upload từ giao diện. Ảnh cũ vẫn nằm trong public/photos.json.
-- Ngày của ảnh = ngày upload (uploaded_at).
CREATE TABLE IF NOT EXISTS photos (
  id          TEXT PRIMARY KEY,
  original    TEXT NOT NULL,            -- tên object trong original/ (vd "ab12cd34ef56.jpg")
  w           INTEGER NOT NULL,
  h           INTEGER NOT NULL,
  color       TEXT NOT NULL,
  caption     TEXT,
  uploaded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded ON photos (uploaded_at DESC);
