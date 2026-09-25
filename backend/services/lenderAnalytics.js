/**
 * Lender Dashboard service — Module 6 core logic.
 *
 * Deliberately does NOT recompute risk — every number here is derived from
 * the existing trust_scores / loans data (services/trustScoreEngine.js,
 * services/loanService.js). This is the literal "same engine, lender lens"
 * principle from the documentation.
 *
 * NOTE on Tiger Data vs Snowflake: this portfolio aggregation currently runs
 * as a Postgres query (routes/lender.js) against the same TimescaleDB
 * instance everything else uses — a practical stand-in until the team has a
 * Snowflake account and an ETL step to sync into it. That's the honest state
 * as of Checkpoint 5; swap the query source, not this summarization
 * function, when Snowflake is wired in a later checkpoint.
 */

/**
 * @param {Array<{principal:number, status:string, expected_loss_pct_at_request:number}>} loans
 */
function summarizePortfolio(loans) {
  const fundedOrRepaid = loans.filter((l) => l.status === 'funded' || l.status === 'repaid');
  const totalFunded = fundedOrRepaid.reduce((sum, l) => sum + Number(l.principal), 0);
  const totalOutstanding = loans
    .filter((l) => l.status === 'funded')
    .reduce((sum, l) => sum + Number(l.principal), 0);

  const weightedLossSum = fundedOrRepaid.reduce(
    (sum, l) => sum + Number(l.principal) * Number(l.expected_loss_pct_at_request),
    0
  );
  const weightedAvgExpectedLossPct = totalFunded > 0 ? Math.round((weightedLossSum / totalFunded) * 10) / 10 : 0;

  const countByStatus = loans.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  return {
    totalFunded: Math.round(totalFunded * 100) / 100,
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    weightedAvgExpectedLossPct,
    loanCount: loans.length,
    countByStatus
  };
}

module.exports = { summarizePortfolio };
