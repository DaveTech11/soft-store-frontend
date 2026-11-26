// All tables for the file store + Play-Store-style catalog.
async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      app_id TEXT NOT NULL DEFAULT 'default',
      name TEXT NOT NULL,
      mime TEXT NOT NULL DEFAULT 'application/octet-stream',
      size BIGINT NOT NULL,
      sha256 TEXT,
      version TEXT,
      notes TEXT,
      downloads BIGINT NOT NULL DEFAULT 0,
      chunks JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await pool.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'file'`);
  await pool.query(`CREATE INDEX IF NOT EXISTS files_app_created_idx ON files (app_id, created_at DESC, id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS files_created_idx ON files (created_at DESC, id)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS apps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      package_name TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      short_description TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      developer TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'other',
      icon_file UUID,
      feature_file UUID,
      screenshots JSONB NOT NULL DEFAULT '[]',
      content_rating TEXT NOT NULL DEFAULT 'Everyone',
      tags TEXT[] NOT NULL DEFAULT '{}',
      website TEXT,
      privacy_policy_url TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      featured BOOLEAN NOT NULL DEFAULT FALSE,
      downloads BIGINT NOT NULL DEFAULT 0,
      rating_sum BIGINT NOT NULL DEFAULT 0,
      rating_count INT NOT NULL DEFAULT 0,
      latest_version_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS apps_category_idx ON apps (category, downloads DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS apps_downloads_idx ON apps (downloads DESC)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      version_name TEXT NOT NULL,
      version_code INT NOT NULL,
      changelog TEXT NOT NULL DEFAULT '',
      min_sdk INT,
      file_id UUID NOT NULL,
      size BIGINT NOT NULL,
      sha256 TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (app_id, version_code)
    )`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      device_id TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT 'Anonymous',
      rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      body TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (app_id, device_id)
    )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS reviews_app_created_idx ON reviews (app_id, created_at DESC, id)`);

  // per-day counters power the "Trending" chart without storing every download
  await pool.query(`
    CREATE TABLE IF NOT EXISTS downloads_daily (
      app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      day DATE NOT NULL,
      count INT NOT NULL DEFAULT 0,
      PRIMARY KEY (app_id, day)
    )`);

  // optional: faster search (needs permission to create extensions)
  try {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await pool.query(`CREATE INDEX IF NOT EXISTS apps_title_trgm_idx ON apps USING gin (title gin_trgm_ops)`);
  } catch (err) {
    console.warn("pg_trgm not available, search will use plain ILIKE:", err.message);
  }
}

module.exports = { ensureSchema };
