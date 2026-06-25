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
