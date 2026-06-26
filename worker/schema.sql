CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  codename   TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'personnel',
  clearance  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_codename ON users(codename);
