-- ============================================================
-- BaseConfess – Supabase Schema
-- Run this in the Supabase SQL editor to set up the database.
-- ============================================================

-- ── confessions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS confessions (
  id              BIGINT PRIMARY KEY,           -- on-chain confessionId
  wallet          TEXT NOT NULL,                -- poster's wallet address (lowercase)
  text            TEXT,                         -- confession text (stored by frontend)
  hash            TEXT NOT NULL,                -- keccak256 hash of text (from chain)
  timestamp       TIMESTAMPTZ NOT NULL,
  likes           INTEGER NOT NULL DEFAULT 0,
  dislikes        INTEGER NOT NULL DEFAULT 0,
  tips_received   INTEGER NOT NULL DEFAULT 0,   -- count of tips received
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── votes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS votes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id   BIGINT NOT NULL REFERENCES confessions(id) ON DELETE CASCADE,
  wallet          TEXT NOT NULL,                -- voter's wallet address (lowercase)
  vote            SMALLINT NOT NULL CHECK (vote IN (1, -1)),  -- 1 = like, -1 = dislike
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT votes_confession_id_wallet_unique UNIQUE (confession_id, wallet)
);

-- ── tips ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tips (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id   BIGINT NOT NULL REFERENCES confessions(id) ON DELETE CASCADE,
  from_wallet     TEXT NOT NULL,
  to_wallet       TEXT NOT NULL,
  amount          TEXT NOT NULL,               -- ETH amount as string (e.g. "0.001")
  tx_hash         TEXT,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS confessions_wallet_idx        ON confessions (wallet);
CREATE INDEX IF NOT EXISTS confessions_created_at_idx    ON confessions (created_at DESC);
CREATE INDEX IF NOT EXISTS votes_confession_id_idx       ON votes (confession_id);
CREATE INDEX IF NOT EXISTS votes_wallet_idx              ON votes (wallet);
CREATE INDEX IF NOT EXISTS tips_confession_id_idx        ON tips (confession_id);

-- ── Row Level Security ────────────────────────────────────────
-- Enable RLS on all tables
ALTER TABLE confessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips        ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all tables
CREATE POLICY "confessions_read_all"  ON confessions FOR SELECT USING (true);
CREATE POLICY "confessions_insert_all" ON confessions FOR INSERT WITH CHECK (true);
CREATE POLICY "confessions_update_all" ON confessions FOR UPDATE USING (true);

CREATE POLICY "votes_read_all"   ON votes FOR SELECT USING (true);
CREATE POLICY "votes_insert_all" ON votes FOR INSERT WITH CHECK (true);
CREATE POLICY "votes_update_all" ON votes FOR UPDATE USING (true);
CREATE POLICY "votes_upsert_all" ON votes FOR ALL USING (true);

CREATE POLICY "tips_read_all"    ON tips FOR SELECT USING (true);
CREATE POLICY "tips_insert_all"  ON tips FOR INSERT WITH CHECK (true);

-- ── Realtime ──────────────────────────────────────────────────
-- Enable realtime for the confessions table so the feed auto-updates
ALTER PUBLICATION supabase_realtime ADD TABLE confessions;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
