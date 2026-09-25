/**
 * Enterprise view — Checkpoint 14 (Tier 2, fifth and LAST item).
 *
 * Same "one engine, many lenses" principle as lenderAnalytics.js and
 * merchantAnalytics.js: no new score is computed here. An enterprise
 * (employer/organization) account rolls up the SAME trust_scores + loans
 * rows every other lens reads, across the population of employees who have
 * self-declared membership in that org (employee_links) -- an honest,
 * unverified stand-in for real workforce verification, same shape as
 * student_profiles/merchant_profiles.
 *
 * Reuses lenderAnalytics.summarizePortfolio() for the loan-exposure half of
 * the rollup instead of forking a second aggregator, and
 * trustScoreEngine.scoreToMerchantHealthRating() for the per-employee rating
 * bucket (monthlyRevenue omitted -- only the `.rating` band is used here,
 * not the credit-line dollar figure, which is merchant-specific).
 *
 * Kept as pure functions where possible, same testable-without-a-DB pattern
 * as every earlier module.
 */

const { summarizePortfolio } = require('./lenderAnalytics');
const { scoreToMerchantHealthRating } = require('./trustScoreEngine');

/**
 * @param {Object} input
 * @param {string} input.organizationName
 * @returns {{ok:boolean, error?:string}}
 */
function validateEnterpriseProfile({ organizationName }) {
  if (!organizationName || typeof organizationName !== 'string' || !organizationName.trim()) {
    return { ok: false, error: 'organizationName is required' };
  }
  return { ok: true };
}

/**
 * Employee-side self-declaration -- same validation shape, kept as its own
 * function (rather than reusing validateEnterpriseProfile) since the two
 * sides of this link may grow different rules later (e.g. an employee
 * work-email domain check), even though today they're identical.
 *
 * @param {Object} input
 * @param {string} input.organizationName
 * @returns {{ok:boolean, error?:string}}
 */
function validateEmployeeLink({ organizationName }) {
  if (!organizationName || typeof organizationName !== 'string' || !organizationName.trim()) {
    return { ok: false, error: 'organizationName is required' };
  }
  return { ok: true };
}

/**
 * Combines a list of employees' latest trust scores with the same
 * portfolio-loan rows lenderAnalytics.js already knows how to summarize,
 * into an employer-facing workforce rollup: headcount, average trust score,
 * a rating-band distribution (excellent/good/fair/poor), and total loan
 * exposure across the org's employees.
 *
 * @param {Array<{userId:string, score:number}>} employeeScores - latest trust_scores row per employee (may be shorter than headcount if some employees have no score yet)
 * @param {Array<{principal:number, status:string, expected_loss_pct_at_request:number}>} loans - loans where borrower_id is one of the org's employees
 * @param {number} headcount - total number of employees linked to the org (>= employeeScores.length)
 * @returns {{headcount:number, scoredCount:number, avgTrustScore:number, ratingDistribution:Object, loanPortfolio:Object}}
 */
function summarizeWorkforce(employeeScores, loans, headcount) {
  const scoredCount = employeeScores.length;
  const avgTrustScore = scoredCount > 0
    ? Math.round((employeeScores.reduce((sum, e) => sum + Number(e.score), 0) / scoredCount) * 10) / 10
    : 0;

  const ratingDistribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
  for (const e of employeeScores) {
    const { rating } = scoreToMerchantHealthRating(Number(e.score));
    ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
  }

  const loanPortfolio = summarizePortfolio(loans);

  return {
    headcount: Math.max(0, headcount),
    scoredCount,
    avgTrustScore,
    ratingDistribution,
    loanPortfolio
  };
}

module.exports = { validateEnterpriseProfile, validateEmployeeLink, summarizeWorkforce };
