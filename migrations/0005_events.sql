-- Sự kiện và nhật ký độc lập với thư viện ảnh hiện có.
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  event_date TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);
CREATE TABLE diaries (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  title TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_diaries_event ON diaries(event_id, year DESC, entry_date DESC);
INSERT INTO events (id, title, event_date, description) VALUES
 ('met', 'The day we met', '2025-08-15', 'Ngày đầu tiên gặp nhau.'),
 ('anniversary', 'Our anniversary', '2025-09-14', 'Ngày chính thức bên nhau.'),
 ('proposal', 'The proposal', '2026-03-07', 'Ngày anh cầu hôn em.'),
 ('wedding', 'Our wedding day', '2026-03-30', 'Ngày cưới của chúng mình.');
