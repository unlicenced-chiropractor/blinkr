-- Dev seed users for testing search (password for all: "password123")
-- SHA-256 of "password123"
INSERT OR IGNORE INTO users (id, username, display_name, password_hash) VALUES
  ('seed-alice', 'alice', 'Alice', 'ef92b778bafe771e89245d89ad8bdd091aa809f789c0ca6f757d8245db75a4b'),
  ('seed-bob', 'bobby', 'Bobby', 'ef92b778bafe771e89245d89ad8bdd091aa809f789c0ca6f757d8245db75a4b'),
  ('seed-charlie', 'charlie_dev', 'Charlie', 'ef92b778bafe771e89245d89ad8bdd091aa809f789c0ca6f757d8245db75a4b'),
  ('seed-dylan', 'dylan', 'Dylan', 'ef92b778bafe771e89245d89ad8bdd091aa809f789c0ca6f757d8245db75a4b'),
  ('seed-emma', 'emma_w', 'Emma', 'ef92b778bafe771e89245d89ad8bdd091aa809f789c0ca6f757d8245db75a4b');
