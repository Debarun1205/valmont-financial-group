const express = require('express');
const { getFxRate, MOCK_RATES_FROM_USD } = require('../adapters/fx');
const { quoteRemittance, validateRemittance } = require('../services/remittanceService');
const { computeBalance } = require('../services/walletService');

function buildRemittanceRoutes(pool, requireAuth) {
  const router = express.Router();

  router.get('/corridors', requireAuth, (req, res) => {
    res.json({ supportedDestCurrencies: Object.keys(MOCK_RATES_FROM_USD) });
  });

  router.post('/quote', requireAuth, async (req, res) => {
    const { sourceAmountUsd, destCurrency } = req.body;
    const { rate, mocked } = await getFxRate(destCurrency);
    const quote = quoteRemittance({ sourceAmountUsd, fxRate: rate });
    if (!quote.ok) return res.status(400).json({ error: quote.error });
    res.json({ destCurrency, fxRate: rate, mocked, ...quote });
  });

  // Debits the sender's fiat wallet (channel='wallet') for the full
  // sourceAmountUsd (fee included), and records the remittance itself.
  router.post('/send', requireAuth, async (req, res) => {
    const { recipientName, destCountry, destCurrency, sourceAmountUsd } = req.body;
    if (!recipientName) return res.status(400).json({ error: 'recipientName required' });

    const { rate, mocked } = await getFxRate(destCurrency);
    const quote = quoteRemittance({ sourceAmountUsd, fxRate: rate });
    if (!quote.ok) return res.status(400).json({ error: quote.error });

    const { rows: txRows } = await pool.query(
      `SELECT amount, direction FROM transactions WHERE user_id = $1 AND channel = 'wallet'`,
      [req.user.id]
    );
    const currentFiatBalance = computeBalance(txRows);

    const validation = validateRemittance({ currentFiatBalance, sourceAmountUsd, feeUsd: quote.feeUsd });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const client = await pool.connect();
    let remittance;
    try {
      await client.query('BEGIN');
      // Deliberately channel='wallet' (not 'remittance') — unlike loan
      // disbursement, a remittance genuinely draws down the sender's
      // spendable balance with no offsetting inbound leg in this app, so it
      // must be visible to walletService.computeBalance()'s channel='wallet'
      // filter or the balance would silently fail to decrease.
      await client.query(
        `INSERT INTO transactions (user_id, amount, direction, channel, asset, counterparty) VALUES ($1, $2, 'out', 'wallet', 'USD', $3)`,
        [req.user.id, sourceAmountUsd, `remittance:${recipientName}:${destCountry || destCurrency}`]
      );
      const { rows } = await client.query(
        `INSERT INTO remittances (user_id, recipient_name, dest_country, dest_currency, source_amount_usd, fee_usd, fx_rate, dest_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [req.user.id, recipientName, destCountry || null, destCurrency, sourceAmountUsd, quote.feeUsd, rate, quote.destAmount]
      );
      remittance = rows[0];
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[remittance] send failed:', err.message);
      return res.status(500).json({ error: 'send failed' });
    } finally {
      client.release();
    }

    res.status(201).json({ remittance, mocked });
  });

  router.get('/mine', requireAuth, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT * FROM remittances WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ remittances: rows });
  });

  return router;
}

module.exports = buildRemittanceRoutes;
