/**
 * Spending analytics over MongoDB `transactions` (windowed sums / weekly buckets).
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

function startOfIsoWeek(date) {
  const d = new Date(date);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function bucketedTrend(pool, userId, weeks, direction) {
  const { rows } = await pool.query(
    `SELECT time, amount FROM transactions
     WHERE user_id = $1 AND channel = 'wallet' AND direction = $2
       AND time > now() - ($3 || ' weeks')::interval`,
    [userId, direction, weeks]
  );
  const map = new Map();
  for (const r of rows) {
    const key = startOfIsoWeek(r.time).toISOString();
    map.set(key, (map.get(key) || 0) + (Number(r.amount) || 0));
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([weekStart, total]) => ({ weekStart, total }));
}

async function getWeeklySpendTrend(pool, userId, weeks = 4) {
  return bucketedTrend(pool, userId, weeks, 'out');
}

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
  return bucketedTrend(pool, userId, weeks, 'in');
}

module.exports = { getMonthlySpend, getWeeklySpendTrend, getMonthlyRevenue, getWeeklyRevenueTrend };
