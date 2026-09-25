/**
 * Spending analytics — Checkpoint 11's second genuine Tiger Data
 * (TimescaleDB) touchpoint, alongside services/fraudSignal.js's fraud
 * signal. Both are real windowed SQL over the `transactions` hypertable,
 * not calls to an external analytics API — same story, different lens.
 */

/**
 * Trailing-window total outbound wallet spend (channel='wallet', 'out' rows
 * only — loan, crypto and gold channels are excluded on purpose, same
 * "wallet balance only reads channel='wallet'" isolation as
 * walletService.computeBalance()'s callers elsewhere in this repo).
 *
 * @param {import('pg').Pool} pool
 * @param {string} userId
 * @param {string} [windowInterval='30 days']
 * @returns {Promise<number>}
 */
async function getMonthlySpend(pool, userId, windowInterval = '30 days') {
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE user_id = $1 AND channel = 'wallet' AND direction = 'out' AND time > now() - $2::interval`,
    [userId, windowInterval]
  );
  return Number(rows[0]?.total) || 0;
}

/**
 * Weekly outbound wallet spend over the trailing N weeks, bucketed with
 * TimescaleDB's time_bucket() — the same function services/fraudSignal.js
 * uses for velocity detection, applied here to a spending trend a nudge
 * (or a future dashboard chart) can show instead of just a single total.
 *
 * @param {import('pg').Pool} pool
 * @param {string} userId
 * @param {number} [weeks=4]
 * @returns {Promise<Array<{weekStart:string, total:number}>>}
 */
function weekBucketExpr() {
  try {
    const { getHasTimescale } = require('../db');
    if (typeof getHasTimescale === 'function' && getHasTimescale()) {
      return `time_bucket('1 week', time)`;
    }
  } catch (_) { /* ignore */ }
  return `date_trunc('week', time)`;
}

async function getWeeklySpendTrend(pool, userId, weeks = 4) {
  const bucket = weekBucketExpr();
  const { rows } = await pool.query(
    `SELECT ${bucket} AS week_start, COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE user_id = $1 AND channel = 'wallet' AND direction = 'out'
       AND time > now() - ($2 || ' weeks')::interval
     GROUP BY week_start
     ORDER BY week_start ASC`,
    [userId, weeks]
  );
  return rows.map((r) => ({ weekStart: r.week_start, total: Number(r.total) || 0 }));
}

/**
 * Checkpoint 13 (Merchant view) addition: the inbound-side mirror of
 * getMonthlySpend()/getWeeklySpendTrend() above — same windowed queries,
 * `direction = 'in'` instead of `'out'`. This is what stands in for
 * "business revenue" for a merchant account: money arriving into the
 * wallet (channel='wallet'), not spend leaving it.
 */
async function getMonthlyRevenue(pool, userId, windowInterval = '30 days') {
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE user_id = $1 AND channel = 'wallet' AND direction = 'in' AND time > now() - $2::interval`,
    [userId, windowInterval]
  );
  return Number(rows[0]?.total) || 0;
}

async function getWeeklyRevenueTrend(pool, userId, weeks = 4) {
  const bucket = weekBucketExpr();
  const { rows } = await pool.query(
    `SELECT ${bucket} AS week_start, COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE user_id = $1 AND channel = 'wallet' AND direction = 'in'
       AND time > now() - ($2 || ' weeks')::interval
     GROUP BY week_start
     ORDER BY week_start ASC`,
    [userId, weeks]
  );
  return rows.map((r) => ({ weekStart: r.week_start, total: Number(r.total) || 0 }));
}

module.exports = { getMonthlySpend, getWeeklySpendTrend, getMonthlyRevenue, getWeeklyRevenueTrend };
