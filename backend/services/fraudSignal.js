/**
 * Fraud / behavioral signal — Module 7, feeding Module 1's trust score.
 *
 * This is the genuine Tiger Data (TimescaleDB) integration point: a
 * real-time windowed SQL query against the `transactions` hypertable,
 * not a call to an external "fraud API". The hypertable's time-partitioning
 * is what makes this query fast even as transaction volume grows.
 */

/**
 * Computes a 0..1 "clean" ratio for a user over a trailing window using two
 * simple, explainable rules (kept rules-based deliberately — see the
 * documentation's scoping notes: a trained anomaly model is explicitly
 * out of scope for the hackathon build):
 *   1. Velocity: too many transactions in a short burst is suspicious.
 *   2. Amount spikes: a transaction far above the user's own rolling
 *      average is flagged.
 *
 * @param {import('pg').Pool} pool
 * @param {string} userId
 * @param {string} [windowInterval='30 days']
 * @returns {Promise<{fraudCleanRatio:number, txCount:number, flaggedCount:number}>}
 */
async function getFraudCleanRatio(pool, userId, windowInterval = '30 days') {
  // Prefer Timescale time_bucket; fall back to epoch flooring on plain Postgres (Neon/Render free tier).
  let hasTimescale = false;
  try {
    const { getHasTimescale } = require('../db');
    hasTimescale = typeof getHasTimescale === 'function' && getHasTimescale();
  } catch (_) { /* ignore */ }

  const bucketExpr = hasTimescale
    ? `time_bucket('10 minutes', time)`
    : `to_timestamp(floor(extract(epoch from time) / 600) * 600)`;

  const { rows } = await pool.query(
    `
    WITH windowed AS (
      SELECT amount, time
      FROM transactions
      WHERE user_id = $1 AND time > now() - $2::interval
    ),
    stats AS (
      SELECT
        count(*) AS tx_count,
        avg(amount) AS avg_amount,
        stddev_pop(amount) AS stddev_amount
      FROM windowed
    ),
    velocity AS (
      -- more than 5 transactions inside any 10-minute bucket in the window = velocity flag
      SELECT count(*) AS velocity_flags FROM (
        SELECT ${bucketExpr} AS bucket, count(*) AS c
        FROM windowed
        GROUP BY bucket
        HAVING count(*) > 5
      ) buckets
    ),
    spikes AS (
      SELECT count(*) AS spike_flags
      FROM windowed, stats
      WHERE stats.stddev_amount > 0
        AND amount > stats.avg_amount + 3 * stats.stddev_amount
    )
    SELECT
      stats.tx_count,
      COALESCE(velocity.velocity_flags, 0) AS velocity_flags,
      COALESCE(spikes.spike_flags, 0) AS spike_flags
    FROM stats, velocity, spikes;
    `,
    [userId, windowInterval]
  );

  const row = rows[0] || { tx_count: 0, velocity_flags: 0, spike_flags: 0 };
  const txCount = Number(row.tx_count) || 0;
  const flaggedCount = Number(row.velocity_flags || 0) + Number(row.spike_flags || 0);

  // No history yet -> neutral-positive default (0.7) rather than 0, so a
  // brand-new user isn't penalized to the floor before they've transacted at all.
  if (txCount === 0) {
    return { fraudCleanRatio: 0.7, txCount: 0, flaggedCount: 0 };
  }

  const fraudCleanRatio = Math.max(0, 1 - flaggedCount / txCount);
  return { fraudCleanRatio, txCount, flaggedCount };
}

module.exports = { getFraudCleanRatio };
