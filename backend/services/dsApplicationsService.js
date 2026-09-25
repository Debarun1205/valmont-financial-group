/**
 * Data-science applications catalog — surfaces live analytics already in the
 * product (fraud windows, spend trends, lender portfolio, merchant health)
 * as first-class DS apps for the judging demo.
 */

const { getFraudCleanRatio } = require('./fraudSignal');
const { getMonthlySpend, getWeeklySpendTrend, getMonthlyRevenue } = require('./spendingAnalytics');
const { summarizePortfolio } = require('./lenderAnalytics');
const { scoreToExpectedLoss, scoreToInsurancePremiumMultiplier, scoreToMerchantHealthRating } = require('./trustScoreEngine');

const APPLICATIONS = [
  {
    id: 'fraud-window',
    name: 'Fraud window analytics',
    category: 'risk',
    description: 'Timescale-style velocity + amount-spike signals over the transaction stream.'
  },
  {
    id: 'spend-forecast',
    name: 'Personal spend analytics',
    category: 'consumer',
    description: 'Trailing spend and weekly buckets powering budgeting nudges.'
  },
  {
    id: 'trust-lenses',
    name: 'Multi-lens risk applications',
    category: 'platform',
    description: 'One trust score expressed as expected loss, insurance premium, and merchant health.'
  },
  {
    id: 'portfolio-risk',
    name: 'Lender portfolio DS',
    category: 'lending',
    description: 'Aggregated funded-loan exposure and weighted expected loss.'
  },
  {
    id: 'revenue-health',
    name: 'Merchant revenue DS',
    category: 'commerce',
    description: 'Inbound wallet revenue as a business-health feature.'
  }
];

async function runDsApplication(pool, userId, applicationId) {
  const app = APPLICATIONS.find((a) => a.id === applicationId);
  if (!app) return { ok: false, error: 'unknown application id' };

  if (applicationId === 'fraud-window') {
    const signal = await getFraudCleanRatio(pool, userId);
    return { ok: true, application: app, result: signal };
  }

  if (applicationId === 'spend-forecast') {
    const [monthlySpend, trend] = await Promise.all([
      getMonthlySpend(pool, userId),
      getWeeklySpendTrend(pool, userId, 4)
    ]);
    return {
      ok: true,
      application: app,
      result: {
        monthlySpend,
        weeklyTrend: trend,
        projectedNextWeek: trend.length
          ? trend.reduce((s, r) => s + r.total, 0) / trend.length
          : monthlySpend / 4
      }
    };
  }

  if (applicationId === 'trust-lenses') {
    const { rows } = await pool.query(
      `SELECT score FROM trust_scores WHERE user_id = $1 ORDER BY computed_at DESC LIMIT 1`,
      [userId]
    );
    const score = Number(rows[0]?.score);
    if (!Number.isFinite(score)) {
      return { ok: true, application: app, result: { note: 'No trust score yet — compute one from Identity first.', score: null } };
    }
    const revenue = await getMonthlyRevenue(pool, userId);
    return {
      ok: true,
      application: app,
      result: {
        score,
        expectedLossPct: scoreToExpectedLoss(score),
        insurancePremiumMultiplier: scoreToInsurancePremiumMultiplier(score),
        merchantHealth: scoreToMerchantHealthRating(score, revenue || 1000)
      }
    };
  }

  if (applicationId === 'portfolio-risk') {
    const { rows } = await pool.query(
      `SELECT principal, status, expected_loss_pct_at_request
       FROM loans WHERE lender_id = $1`,
      [userId]
    );
    const portfolio = summarizePortfolio(rows);
    return { ok: true, application: app, result: { portfolio, loanRows: rows.length } };
  }

  if (applicationId === 'revenue-health') {
    const revenue = await getMonthlyRevenue(pool, userId);
    const { rows } = await pool.query(
      `SELECT score FROM trust_scores WHERE user_id = $1 ORDER BY computed_at DESC LIMIT 1`,
      [userId]
    );
    const score = Number(rows[0]?.score) || 50;
    return {
      ok: true,
      application: app,
      result: {
        monthlyRevenue: revenue,
        businessHealth: scoreToMerchantHealthRating(score, revenue || 500)
      }
    };
  }

  return { ok: false, error: 'unhandled application' };
}

module.exports = { APPLICATIONS, runDsApplication };
