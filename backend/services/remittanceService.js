/**
 * Remittance service — Module 12 core logic.
 *
 * Kept thin and pure, same principle as advisoryService.js: the rate itself
 * comes from an external feed (adapters/fx.js), what belongs here is
 * everything that should NOT depend on that feed — fee calculation, quote
 * math, and balance validation, all unit-testable with a plain rate number.
 */

const FLAT_FEE_USD = 2;
const PERCENT_FEE = 0.015; // 1.5%
const MIN_SEND_USD = 5;
const MAX_SEND_USD = 2000; // hackathon-scoped cap, see docs "never build: real trading/exchange integration"

/**
 * @param {Object} input
 * @param {number} input.sourceAmountUsd
 * @param {number} input.fxRate - units of destCurrency per 1 USD
 * @returns {{ok:boolean, error?:string, feeUsd?:number, netSentUsd?:number, destAmount?:number}}
 */
function quoteRemittance({ sourceAmountUsd, fxRate }) {
  if (!sourceAmountUsd || sourceAmountUsd <= 0) {
    return { ok: false, error: 'sourceAmountUsd must be positive' };
  }
  if (sourceAmountUsd < MIN_SEND_USD) {
    return { ok: false, error: `sourceAmountUsd must be at least ${MIN_SEND_USD}` };
  }
  if (sourceAmountUsd > MAX_SEND_USD) {
    return { ok: false, error: `sourceAmountUsd exceeds the hackathon-demo cap of ${MAX_SEND_USD}` };
  }
  if (!fxRate || fxRate <= 0) {
    return { ok: false, error: 'no FX rate available for this corridor' };
  }

  const feeUsd = Math.round((FLAT_FEE_USD + sourceAmountUsd * PERCENT_FEE) * 100) / 100;
  const netSentUsd = Math.round((sourceAmountUsd - feeUsd) * 100) / 100;
  const destAmount = Math.round(netSentUsd * fxRate * 100) / 100;

  return { ok: true, feeUsd, netSentUsd, destAmount };
}

/**
 * @returns {{ok:boolean, error?:string}}
 */
function validateRemittance({ currentFiatBalance, sourceAmountUsd, feeUsd }) {
  const totalDebit = Number(sourceAmountUsd);
  if (totalDebit > currentFiatBalance) {
    return { ok: false, error: 'insufficient USD balance to cover the send amount (fee is included in sourceAmountUsd)' };
  }
  if (feeUsd >= sourceAmountUsd) {
    return { ok: false, error: 'fee would consume the entire amount sent' };
  }
  return { ok: true };
}

module.exports = { FLAT_FEE_USD, PERCENT_FEE, MIN_SEND_USD, MAX_SEND_USD, quoteRemittance, validateRemittance };
