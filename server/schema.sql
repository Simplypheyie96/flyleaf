-- Flyleaf accounts and sync. One database for Journal, Press and eReader.
-- Apply: npx wrangler d1 execute flyleaf --remote --file=server/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,          -- "g" + Google sub, the same for all three apps
  email TEXT NOT NULL,
  name TEXT,
  created INTEGER NOT NULL
);

-- Opaque session tokens, stored only as their sha-256. A row lives 400 days past
-- the last time it was seen, so a device in use is never signed out.
CREATE TABLE IF NOT EXISTS sessions (
  hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  app TEXT NOT NULL,
  seen INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);

-- One document per user per app; the text itself is in R2 under `obj`
-- (d/<user>/<app>/<rev>-<nonce>). `prev` is the revision before, kept as a one-step undo.
CREATE TABLE IF NOT EXISTS docs (
  user_id TEXT NOT NULL,
  app TEXT NOT NULL,
  rev INTEGER NOT NULL,
  at INTEGER NOT NULL,
  device TEXT,
  size INTEGER NOT NULL,
  obj TEXT NOT NULL,
  prev TEXT,
  PRIMARY KEY (user_id, app)
);

-- Content-addressed blobs (voice memos, images, book files) at m/<user>/<hash>.
CREATE TABLE IF NOT EXISTS media (
  user_id TEXT NOT NULL,
  hash TEXT NOT NULL,
  app TEXT NOT NULL,
  type TEXT,
  size INTEGER NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (user_id, hash)
);
