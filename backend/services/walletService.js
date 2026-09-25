/**
 * Wallet service — Module 2 core logic.
 *
 * Balance is deliberately computed from the transaction ledger, not stored
 * as a mutable number, so there's one source of truth (see schema.sql's
 * comment on the `wallets` table). Kept as pure functions over plain arrays
 * so this is unit-testable without a DB connection, same pattern as
 * services/trustScoreEngine.js.
 */

/**
 * @param {Array<{amount:number, direction:'in'|'out'}>} transactions
 * @returns {number}
 */
function computeBalance(transactions) {
  return transactions.reduce((sum, tx) => {
    const amt = Number(tx.amount);
    return tx.direction === 'in' ? sum + amt : sum - amt;
  }, 0);
}

/**
 * Validates a transfer before it's written to the ledger. Kept separate from
 * the DB-writing route so the business rule ("can't send more than you have")
 * is testable in isolation.
 * @returns {{ok:boolean, error?:string}}
 */
function validateTransfer({ currentBalance, amount }) {
  if (!amount || amount <= 0) return { ok: false, error: 'amount must be positive' };
  if (amount > currentBalance) return { ok: false, error: 'insufficient balance' };
  return { ok: true };
}

/**
 * Validates a savings-vault deposit against the wallet's spendable balance.
 */
function validateVaultDeposit({ currentBalance, amount }) {
  if (!amount || amount <= 0) return { ok: false, error: 'amount must be positive' };
  if (amount > currentBalance) return { ok: false, error: 'insufficient balance for vault deposit' };
  return { ok: true };
}

/**
 * Module 11 (Checkpoint 7) addition — crypto as a second wallet asset.
 *
 * computeBalance() above is reused as-is for the crypto ledger: it's a
 * generic sum over whatever transaction rows are passed in, so the routes
 * layer just filters by channel='crypto' before calling it — no duplicate
 * balance function needed, same "one function, filtered differently"
 * principle as the rest of this file.
 *
 * These two functions price a quote and validate a buy/sell against the two
 * balances (fiat USD, priced asset) involved in a trade. Despite the
 * "crypto" name, nothing here is actually SOL-specific — it's just a side,
 * a price-per-unit, and two amounts — so Checkpoint 10 (Tier 2, digital
 * gold as a third wallet asset) reuses both functions unchanged rather than
 * forking quoteGoldTrade/validateGoldTrade. See routes/wallet.js's gold
 * endpoints.
 */

/**
 * @param {Object} input
 * @param {'buy'|'sell'} input.side
 * @param {number} input.usdAmount - for 'buy': USD to spend. For 'sell': ignored (use cryptoAmount).
 * @param {number} input.cryptoAmount - for 'sell': crypto to sell. For 'buy': ignored (use usdAmount).
 * @param {number} input.priceUsd - current price of 1 unit of the crypto asset, in USD
 * @returns {{ok:boolean, error?:string, usdAmount?:number, cryptoAmount?:number}}
 */
function quoteCryptoTrade({ side, usdAmount, cryptoAmount, priceUsd }) {
  if (side !== 'buy' && side !== 'sell') return { ok: false, error: "side must be 'buy' or 'sell'" };
  if (!priceUsd || priceUsd <= 0) return { ok: false, error: 'priceUsd must be positive' };

  if (side === 'buy') {
    if (!usdAmount || usdAmount <= 0) return { ok: false, error: 'usdAmount must be positive for a buy' };
    return { ok: true, usdAmount, cryptoAmount: Math.round((usdAmount / priceUsd) * 1e8) / 1e8 };
  }
  if (!cryptoAmount || cryptoAmount <= 0) return { ok: false, error: 'cryptoAmount must be positive for a sell' };
  return { ok: true, usdAmount: Math.round(cryptoAmount * priceUsd * 100) / 100, cryptoAmount };
}

/**
 * Validates a priced trade against the user's two current balances before
 * it's written to the ledger — a buy can't overdraft the fiat wallet, a
 * sell can't overdraft the crypto holding.
 * @returns {{ok:boolean, error?:string}}
 */
function validateCryptoTrade({ side, currentFiatBalance, currentCryptoBalance, usdAmount, cryptoAmount }) {
  if (side === 'buy') {
    if (usdAmount > currentFiatBalance) return { ok: false, error: 'insufficient USD balance for this buy' };
    return { ok: true };
  }
  if (side === 'sell') {
    if (cryptoAmount > currentCryptoBalance) return { ok: false, error: 'insufficient crypto balance for this sell' };
    return { ok: true };
  }
  return { ok: false, error: "side must be 'buy' or 'sell'" };
}

module.exports = {
  computeBalance,
  validateTransfer,
  validateVaultDeposit,
  quoteCryptoTrade,
  validateCryptoTrade
};
