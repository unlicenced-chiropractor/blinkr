-- Image blobs stored in D1 (no R2 required)
CREATE TABLE media_blobs (
  key TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  data BLOB NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_media_blobs_created ON media_blobs(created_at);
