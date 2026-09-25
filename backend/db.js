const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString =
  process.env.DATABASE_URL || 'postgres://postgres:devpassword@localhost:5432/financeapp';

const needsSsl =
  process.env.DATABASE_SSL === 'true' ||
  /neon\.tech|sslmode=require|render\.com|amazonaws\.com/i.test(connectionString);

const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined
});

let hasTimescale = false;

function getHasTimescale() {
  return hasTimescale;
}

/**
 * Bootstraps schema. Prefer TimescaleDB (Tiger Data) when available;
 * otherwise run on plain Postgres with date_trunc fallbacks in analytics.
 */
async function initSchema() {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS timescaledb');
    hasTimescale = true;
    console.log('[db] TimescaleDB extension ready');
  } catch (err) {
    hasTimescale = false;
    console.warn('[db] TimescaleDB not available — plain Postgres mode:', err.message);
  }

  let schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  if (!hasTimescale) {
    schema = schema
      .replace(/CREATE EXTENSION IF NOT EXISTS timescaledb;\s*/gi, '-- timescaledb skipped\n')
      .replace(/SELECT create_hypertable\([^;]+;\s*/gi, '-- hypertable skipped (plain Postgres)\n');
  }

  await pool.query(schema);

  // Migrations that stay idempotent for free-tier / existing DBs
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_tier TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding JSONB;

    CREATE TABLE IF NOT EXISTS ml_training_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      model_key TEXT NOT NULL,
      epochs INT NOT NULL DEFAULT 8,
      metrics JSONB NOT NULL,
      feature_snapshot JSONB,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_ml_training_runs_user ON ml_training_runs (user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS ds_application_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      application_id TEXT NOT NULL,
      result JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_ds_application_runs_user ON ds_application_runs (user_id, created_at DESC);
  `);

  console.log(
    `[db] schema ensured (timescale=${hasTimescale ? 'yes' : 'no'}, users+onboarding, ml_training_runs, ds_application_runs)`
  );
}

module.exports = { pool, initSchema, getHasTimescale };
