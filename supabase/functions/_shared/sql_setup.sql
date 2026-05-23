-- Run this SQL in your Supabase Dashboard > SQL Editor to create the required tables

-- Search cache table
CREATE TABLE IF NOT EXISTS search_cache (
  cache_key TEXT PRIMARY KEY,
  results JSONB NOT NULL DEFAULT '[]',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trending searches table (replaces SQLite trending.db)
CREATE TABLE IF NOT EXISTS trending_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 1,
  platforms TEXT NOT NULL DEFAULT '[]',
  cached_products TEXT,
  last_searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for trending by count
CREATE INDEX IF NOT EXISTS idx_trending_count ON trending_searches(count DESC);

-- Auto-cleanup expired cache (optional - run periodically)
-- DELETE FROM search_cache WHERE expires_at < NOW();
