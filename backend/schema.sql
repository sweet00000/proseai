-- ProseAI D1 Schema

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,   -- stripe customer ID
  email       TEXT UNIQUE NOT NULL,
  jwt_version INTEGER NOT NULL DEFAULT 0,  -- increment to invalidate all tokens
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS credits (
  user_id          TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance          INTEGER NOT NULL DEFAULT 0,
  total_purchased  INTEGER NOT NULL DEFAULT 0,
  total_used       INTEGER NOT NULL DEFAULT 0,
  plan             TEXT NOT NULL DEFAULT 'free',
  last_refill_at   TEXT
);

-- full audit trail of every credit movement
CREATE TABLE IF NOT EXISTS credit_log (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           TEXT NOT NULL REFERENCES users(id),
  delta             INTEGER NOT NULL,       -- positive=add, negative=deduct
  reason            TEXT NOT NULL,          -- 'purchase' | 'feedback' | 'refund' | 'bonus'
  stripe_session_id TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_credit_log_user ON credit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
