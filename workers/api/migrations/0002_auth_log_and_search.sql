-- Audit log for account events (register, login, failed login)
CREATE TABLE auth_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  username TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('register', 'login', 'login_failed')),
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_auth_events_user ON auth_events(user_id, created_at);
CREATE INDEX idx_auth_events_username ON auth_events(username, created_at);

-- Username is already unique + indexed; prefix search (username LIKE 'foo%') uses idx_users_username.
