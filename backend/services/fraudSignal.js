/**
 * Fraud / behavioral signal — Module 7, feeding Module 1's trust score.
 *
 * Windowed velocity + spike detection over the MongoDB `transactions`
 * collection (same rules as the original Timescale SQL).
 */

function parseWindowMs(windowInterval = '30 days') {
  const s = String(windowInterval).trim().toLowerCase();
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(day|days|week|weeks|hour|hours|minute|minutes)$/);
  if (!m) return 30 * 86400000;
  const n = Number(m[1]);
  const unit = m[2];
  if (unit.startsWith('week')) return n * 7 * 86400000;
  if (unit.startsWith('day')) return n * 86400000;
  if (unit.startsWith('hour')) return n * 3600000;
  return n * 60000;
}

/**
 * @param {{ query: Function }} pool
 * @param {string} userId
 * @param {string} [windowInterval='30 days']
 * @returns {Promise<{fraudCleanRatio:number, txCount:number, flaggedCount:number}>}
 */
async function getFraudCleanRatio(pool, userId, windowInterval = '30 days') {
  const { rows } = await pool.query(
    `SELECT amount, time FROM transactions WHERE user_id = $1 AND time > now() - $2::interval`,
    [userId, windowInterval]
  );

  const txCount = rows.length;
  if (txCount === 0) {
    return { fraudCleanRatio: 0.7, txCount: 0, flaggedCount: 0 };
  }

  const amounts = rows.map((r) => Number(r.amount) || 0);
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const stddev = Math.sqrt(amounts.reduce((a, b) => a + (b - avg) ** 2, 0) / amounts.length);

  const buckets = new Map();
  for (const r of rows) {
    const t = new Date(r.time).getTime();
    const bucket = Math.floor(t / 600000) * 600000;
    buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
  }
  let velocityFlags = 0;
  for (const c of buckets.values()) {
    if (c > 5) velocityFlags += 1;
  }

  let spikeFlags = 0;
  if (stddev > 0) {
    spikeFlags = amounts.filter((amount) => amount > avg + 3 * stddev).length;
  }

  const flaggedCount = velocityFlags + spikeFlags;
  const fraudCleanRatio = Math.max(0, 1 - flaggedCount / txCount);
  return { fraudCleanRatio, txCount, flaggedCount };
}

module.exports = { getFraudCleanRatio, parseWindowMs };
