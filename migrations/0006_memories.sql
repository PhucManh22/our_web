CREATE TABLE trips (id TEXT PRIMARY KEY, name TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT, description TEXT NOT NULL DEFAULT '', event_id TEXT REFERENCES events(id) ON DELETE SET NULL);
CREATE TABLE locations (id TEXT PRIMARY KEY, trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE, name TEXT NOT NULL, visit_date TEXT, address TEXT NOT NULL DEFAULT '', latitude REAL, longitude REAL, description TEXT NOT NULL DEFAULT '');
CREATE TABLE letters (id TEXT PRIMARY KEY, title TEXT NOT NULL, sender TEXT NOT NULL, recipient TEXT NOT NULL, written_date TEXT NOT NULL, content TEXT NOT NULL DEFAULT '', open_date TEXT, status TEXT NOT NULL DEFAULT 'draft', event_id TEXT REFERENCES events(id) ON DELETE SET NULL);
-- photo_id cũng hỗ trợ ảnh cũ trong photos.json; không sao chép object R2.
CREATE TABLE photo_links (photo_id TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('event','diary','trip','location')), target_id TEXT NOT NULL, PRIMARY KEY(photo_id,kind,target_id));
CREATE TABLE photo_details (photo_id TEXT PRIMARY KEY, taken TEXT, caption TEXT NOT NULL DEFAULT '');
CREATE INDEX idx_photo_links_target ON photo_links(kind,target_id);
CREATE INDEX idx_locations_trip ON locations(trip_id);
