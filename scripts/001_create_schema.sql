-- EIC Office Football Bets Database Schema

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  session_date DATE NOT NULL,
  stake_per_player NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  state TEXT NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Session matches table (snapshot of selected matches)
CREATE TABLE IF NOT EXISTS session_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  league_id INTEGER NOT NULL,
  kickoff_utc TIMESTAMPTZ NOT NULL,
  home_name TEXT NOT NULL,
  away_name TEXT NOT NULL,
  competition_name TEXT,
  page_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Entries table (player participation)
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  pred_home_goals INTEGER NOT NULL,
  pred_away_goals INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Match cache table for storing fetched match data
CREATE TABLE IF NOT EXISTS match_cache (
  event_id TEXT PRIMARY KEY,
  league_id INTEGER NOT NULL,
  finished BOOLEAN DEFAULT FALSE,
  started BOOLEAN DEFAULT FALSE,
  reason_short TEXT,
  home_score INTEGER,
  away_score INTEGER,
  score_str TEXT,
  kickoff_utc TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
