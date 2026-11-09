CREATE TABLE private_assets (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('diary','letter')),
  target_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL
);
CREATE INDEX idx_private_assets_target ON private_assets(kind,target_id);
