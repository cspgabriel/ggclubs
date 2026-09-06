-- Cloudflare D1 (SQLite) Schema para GGClubs
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT DEFAULT 'player',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tag TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  description TEXT,
  owner_id TEXT REFERENCES users(id),
  region TEXT DEFAULT 'SA',
  platform TEXT DEFAULT 'CROSSPLAY',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS club_members (
  club_id TEXT REFERENCES clubs(id),
  user_id TEXT REFERENCES users(id),
  role TEXT DEFAULT 'member',
  position TEXT DEFAULT 'ST',
  shirt_number INTEGER,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (club_id, user_id)
);

CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,
  format TEXT DEFAULT 'GROUPS_AND_KNOCKOUT',
  max_teams INTEGER DEFAULT 16,
  registered_teams INTEGER DEFAULT 0,
  prize_pool TEXT DEFAULT 'R$ 1.500,00',
  status TEXT DEFAULT 'OPEN',
  starts_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tournament_registrations (
  tournament_id TEXT REFERENCES tournaments(id),
  club_id TEXT REFERENCES clubs(id),
  status TEXT DEFAULT 'CONFIRMED',
  group_name TEXT,
  points INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  PRIMARY KEY (tournament_id, club_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT REFERENCES tournaments(id),
  round TEXT NOT NULL,
  home_club_id TEXT REFERENCES clubs(id),
  away_club_id TEXT REFERENCES clubs(id),
  home_score INTEGER,
  away_score INTEGER,
  status TEXT DEFAULT 'SCHEDULED',
  scheduled_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
