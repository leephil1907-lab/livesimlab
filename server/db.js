import Database from 'better-sqlite3';
import { resolve } from 'node:path';
import { config } from './config.js';

export const db = new Database(resolve(config.dataDir, 'facehub.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  credits       REAL NOT NULL DEFAULT 0,
  is_admin      INTEGER NOT NULL DEFAULT 0,
  disabled      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS characters (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  file       TEXT NOT NULL,
  mime       TEXT NOT NULL,
  consent_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Every credit movement is one ledger row. users.credits is the running balance.
CREATE TABLE IF NOT EXISTS transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,            -- purchase | usage | bonus | adjustment
  status      TEXT NOT NULL,            -- pending | completed | failed
  credits     REAL NOT NULL DEFAULT 0,  -- signed credit change once completed
  amount_kobo INTEGER NOT NULL DEFAULT 0,
  reference   TEXT UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  meta        TEXT NOT NULL DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS live_sessions (
  id              TEXT PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id  INTEGER NOT NULL REFERENCES transactions(id),
  character_id    TEXT NOT NULL,
  model           TEXT NOT NULL,
  rate            REAL NOT NULL,
  reserved        REAL NOT NULL,
  billed_seconds  INTEGER NOT NULL DEFAULT 0,
  charged         REAL NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'starting', -- starting | live | ended
  end_reason      TEXT,
  engine          TEXT NOT NULL,
  started_at      TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at        TEXT
);
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_chars_user ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_live_user ON live_sessions(user_id, started_at DESC);
`);

export const tx = fn => db.transaction(fn);

// Prune expired sign-in sessions on boot and hourly.
const prune = () => db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
prune();
setInterval(prune, 3600_000).unref();
