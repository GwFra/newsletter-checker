CREATE TABLE IF NOT EXISTS feeds (
  id        SERIAL PRIMARY KEY,
  url       TEXT NOT NULL UNIQUE,
  name      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS articles (
  id           SERIAL PRIMARY KEY,
  feed_id      INTEGER NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  url          TEXT NOT NULL UNIQUE,
  published_at TIMESTAMPTZ,
  content      TEXT,
  summary      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS preferences (
  id          SERIAL PRIMARY KEY,
  preferences TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- If this were to be something deployed to cloud and not run locally:
-- May require a users table in the future for user-specific requirements
-- User table and preferences table