const express = require('express');
const { generateWalletKeypair, getSolPriceUsd } = require('../adapters/solana');
const { getGoldPricePerGramUsd } = require('../adapters/goldPrice');
const {
  computeBalance,
  validateTransfer,
  validateVaultDeposit,
  quoteCryptoTrade,
  validateCryptoTrade
} = require('../services/walletService');

function buildWalletRoutes(pool, requireAuth) {
  const router = express.Router();

  // Create a wallet for the logged-in user (idempotent — returns the
  // existing one if already created). Generates a devnet public key so the
  // wallet has a real Solana address to show, per Module 2's design notes.
  router.post('/create', requireAuth, async (req, res) => {
    const { rows: existing } = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [req.user.id]);
    if (existing[0]) return res.json({ wallet: existing[0] });

    const { publicKey } = generateWalletKeypair();
    const { rows } = await pool.query(
      `INSERT INTO wallets (user_id, solana_public_key) VALUES ($1, $2) RETURNING *`,
      [req.user.id, publicKey]
    );
    res.status(201).json({ wallet: rows[0] });
  });

  // Balance is derived live from the ledger (see walletService.computeBalance),
  // never read from a stored counter — one source of truth.
  router.get('/balance', requireAuth, async (req, res) => {
    const wallet = await getWalletOrFail(pool, req.user.id, res);
    if (!wallet) return;

    const { rows: txRows } = await pool.query(
      `SELECT amount, direction FROM transactions WHERE user_id = $1 AND channel = 'wallet'`,
      [req.user.id]
    );
    const balance = computeBalance(txRows);
    res.json({ balance, savingsVaultBalance: Number(wallet.savings_vault_balance), solanaPublicKey: wallet.solana_public_key });
  });

  // Send money to another user (by email). Writes two ledger rows atomically
  // — an 'out' for the sender and an 'in' for the recipient — inside a DB
  // transaction so the ledger can never end up half-written.
  router.post('/transfer', requireAuth, async (req, res) => {
    const { recipientEmail, amount, note } = req.body;
    if (!recipientEmail || !amount) return res.status(400).json({ error: 'recipientEmail and amount required' });

    const { rows: recipientRows } = await pool.query('SELECT id FROM users WHERE email = $1', [recipientEmail]);
    const recipient = recipientRows[0];
    if (!recipient) return res.status(404).json({ error: 'recipient not found' });
    if (recipient.id === req.user.id) return res.status(400).json({ error: 'cannot transfer to yourself' });

    const { rows: txRows } = await pool.query(
      `SELECT amount, direction FROM transactions WHERE user_id = $1 AND channel = 'wallet'`,
      [req.user.id]
    );
    const currentBalance = computeBalance(txRows);

    const validation = validateTransfer({ currentBalance, amount });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: senderRows } = await client.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
      const senderEmail = senderRows[0]?.email || req.user.id;
      await client.query(
        `INSERT INTO transactions (user_id, amount, direction, channel, counterparty) VALUES ($1, $2, 'out', 'wallet', $3)`,
        [req.user.id, amount, recipientEmail]
      );
      await client.query(
        `INSERT INTO transactions (user_id, amount, direction, channel, counterparty) VALUES ($1, $2, 'in', 'wallet', $3)`,
        [recipient.id, amount, senderEmail]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[wallet] transfer failed:', err.message);
      return res.status(500).json({ error: 'transfer failed' });
    } finally {
      client.release();
    }

    res.json({ ok: true, amount, recipientEmail, note: note || null });
  });

  // Move funds from spendable balance into the savings vault (Module 5 ties
  // into this later — the vault deposit here is what "conceptually funds
  // the loan pool" in the documentation's Module 5 narrative).
  router.post('/vault/deposit', requireAuth, async (req, res) => {
    const { amount } = req.body;
    const wallet = await getWalletOrFail(pool, req.user.id, res);
    if (!wallet) return;

    const { rows: txRows } = await pool.query(
      `SELECT amount, direction FROM transactions WHERE user_id = $1 AND channel = 'wallet'`,
      [req.user.id]
    );
    const currentBalance = computeBalance(txRows);

    const validation = validateVaultDeposit({ currentBalance, amount });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO transactions (user_id, amount, direction, channel) VALUES ($1, $2, 'out', 'wallet')`,
        [req.user.id, amount]
      );
      await client.query(
        `UPDATE wallets SET savings_vault_balance = savings_vault_balance + $1 WHERE user_id = $2`,
        [amount, req.user.id]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[wallet] vault deposit failed:', err.message);
      return res.status(500).json({ error: 'vault deposit failed' });
    } finally {
      client.release();
    }

    res.json({ ok: true, deposited: amount });
  });

  // Transaction history — also what Module 7 (fraud detection) and Module 1
  // (fraud signal) read from; this route is just a read view over the same table.
  router.get('/history', requireAuth, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT time, amount, direction, channel, counterparty FROM transactions
       WHERE user_id = $1 ORDER BY time DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ transactions: rows });
  });

  // --- Module 11 (Checkpoint 7): crypto as a second wallet asset ---
  // The fiat USD ledger keeps using channel='wallet' as before; crypto
  // trades write channel='crypto' rows (amount denominated in the crypto
  // asset itself, see schema.sql's `asset` column comment), kept in the
  // SAME transactions hypertable so crypto activity flows into the existing
  // fraud-signal query for free — no changes needed in fraudSignal.js.

  const CRYPTO_ASSET = 'SOL';

  router.get('/crypto/balance', requireAuth, async (req, res) => {
    const { rows: txRows } = await pool.query(
      `SELECT amount, direction FROM transactions WHERE user_id = $1 AND channel = 'crypto' AND asset = $2`,
      [req.user.id, CRYPTO_ASSET]
    );
    const cryptoBalance = computeBalance(txRows);
    const { priceUsd, mocked } = await getSolPriceUsd();
    res.json({ asset: CRYPTO_ASSET, cryptoBalance, priceUsd, mocked, estimatedUsdValue: Math.round(cryptoBalance * priceUsd * 100) / 100 });
  });

  router.post('/crypto/quote', requireAuth, async (req, res) => {
    const { side, usdAmount, cryptoAmount } = req.body;
    const { priceUsd, mocked } = await getSolPriceUsd();
    const quote = quoteCryptoTrade({ side, usdAmount, cryptoAmount, priceUsd });
    if (!quote.ok) return res.status(400).json({ error: quote.error });
    res.json({ asset: CRYPTO_ASSET, priceUsd, mocked, ...quote });
  });

  // Buy crypto: debits the fiat wallet (channel='wallet'), credits the
  // crypto holding (channel='crypto') — two ledger rows, one DB transaction,
  // same atomic pattern as /transfer above.
  router.post('/crypto/buy', requireAuth, async (req, res) => {
    const { usdAmount } = req.body;
    const { priceUsd } = await getSolPriceUsd();
    const quote = quoteCryptoTrade({ side: 'buy', usdAmount, priceUsd });
    if (!quote.ok) return res.status(400).json({ error: quote.error });

    const { rows: fiatTxRows } = await pool.query(
      `SELECT amount, direction FROM transactions WHERE user_id = $1 AND channel = 'wallet'`,
      [req.user.id]
    );
    const currentFiatBalance = computeBalance(fiatTxRows);

    const validation = validateCryptoTrade({ side: 'buy', currentFiatBalance, currentCryptoBalance: 0, usdAmount: quote.usdAmount });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO transactions (user_id, amount, direction, channel, asset, counterparty) VALUES ($1, $2, 'out', 'wallet', 'USD', $3)`,
        [req.user.id, quote.usdAmount, `crypto-buy:${CRYPTO_ASSET}`]
      );
      await client.query(
        `INSERT INTO transactions (user_id, amount, direction, channel, asset, counterparty) VALUES ($1, $2, 'in', 'crypto', $3, $4)`,
        [req.user.id, quote.cryptoAmount, CRYPTO_ASSET, `bought with USD`]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[wallet] crypto buy failed:', err.message);
      return res.status(500).json({ error: 'crypto buy failed' });
    } finally {
      client.release();
    }
    res.json({ ok: true, ...quote });
  });

  // Sell crypto: debits the crypto holding, credits the fiat wallet.
  router.post('/crypto/sell', requireAuth, async (req, res) => {
    const { cryptoAmount } = req.body;
    const { priceUsd } = await getSolPriceUsd();
    const quote = quoteCryptoTrade({ side: 'sell', cryptoAmount, priceUsd });
    if (!quote.ok) return res.status(400).json({ error: quote.error });

    const { rows: cryptoTxRows } = await pool.query(
      `SELECT amount, direction FROM transactions WHERE user_id = $1 AND channel = 'crypto' AND asset = $2`,
      [req.user.id, CRYPTO_ASSET]
    );
    const currentCryptoBalance = computeBalance(cryptoTxRows);

    const validation = validateCryptoTrade({ side: 'sell', currentFiatBalance: 0, currentCryptoBalance, cryptoAmount: quote.cryptoAmount });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO transactions (user_id, amount, direction, channel, asset, counterparty) VALUES ($1, $2, 'out', 'crypto', $3, $4)`,
        [req.user.id, quote.cryptoAmount, CRYPTO_ASSET, `sold for USD`]
      );
      await client.query(
        `INSERT INTO transactions (user_id, amount, direction, channel, asset, counterparty) VALUES ($1, $2, 'in', 'wallet', 'USD', $3)`,
        [req.user.id, quote.usdAmount, `crypto-sell:${CRYPTO_ASSET}`]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[wallet] crypto sell failed:', err.message);
      return res.status(500).json({ error: 'crypto sell failed' });
    } finally {
      client.release();
    }
    res.json({ ok: true, ...quote });
  });

  // --- Checkpoint 10 (Tier 2): digital gold as a third wallet asset ---
  // Exact same shape as the crypto block above — channel='gold' rows in the
  // same transactions hypertable (so gold activity also flows into the
  // existing fraud-signal query for free), quoted per gram via
  // adapters/goldPrice.js. quoteCryptoTrade/validateCryptoTrade are reused
  // unchanged (see the comment in services/walletService.js) since neither
  // function actually cared what asset it was pricing.

  const GOLD_ASSET = 'XAU_GRAM';

  router.get('/gold/balance', requireAuth, async (req, res) => {
    const { rows: txRows } = await pool.query(
      `SELECT amount, direction FROM transactions WHERE user_id = $1 AND channel = 'gold' AND asset = $2`,
      [req.user.id, GOLD_ASSET]
    );
    const goldGrams = computeBalance(txRows);
    const { pricePerGramUsd, mocked } = await getGoldPricePerGramUsd();
    res.json({ asset: GOLD_ASSET, goldGrams, pricePerGramUsd, mocked, estimatedUsdValue: Math.round(goldGrams * pricePerGramUsd * 100) / 100 });
  });

  router.post('/gold/quote', requireAuth, async (req, res) => {
    const { side, usdAmount, cryptoAmount: gramsAmount } = req.body;
    const { pricePerGramUsd, mocked } = await getGoldPricePerGramUsd();
    const quote = quoteCryptoTrade({ side, usdAmount, cryptoAmount: gramsAmount, priceUsd: pricePerGramUsd });
    if (!quote.ok) return res.status(400).json({ error: quote.error });
    res.json({ asset: GOLD_ASSET, pricePerGramUsd, mocked, usdAmount: quote.usdAmount, goldGrams: quote.cryptoAmount });
  });

  // Buy gold: debits the fiat wallet (channel='wallet'), credits the gold
  // holding (channel='gold') — two ledger rows, one DB transaction, same
  // atomic pattern as /transfer and /crypto/buy above.
  router.post('/gold/buy', requireAuth, async (req, res) => {
    const { usdAmount } = req.body;
    const { pricePerGramUsd } = await getGoldPricePerGramUsd();
    const quote = quoteCryptoTrade({ side: 'buy', usdAmount, priceUsd: pricePerGramUsd });
    if (!quote.ok) return res.status(400).json({ error: quote.error });

    const { rows: fiatTxRows } = await pool.query(
      `SELECT amount, direction FROM transactions WHERE user_id = $1 AND channel = 'wallet'`,
      [req.user.id]
    );
    const currentFiatBalance = computeBalance(fiatTxRows);

    const validation = validateCryptoTrade({ side: 'buy', currentFiatBalance, currentCryptoBalance: 0, usdAmount: quote.usdAmount });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO transactions (user_id, amount, direction, channel, asset, counterparty) VALUES ($1, $2, 'out', 'wallet', 'USD', $3)`,
        [req.user.id, quote.usdAmount, `gold-buy:${GOLD_ASSET}`]
      );
      await client.query(
        `INSERT INTO transactions (user_id, amount, direction, channel, asset, counterparty) VALUES ($1, $2, 'in', 'gold', $3, $4)`,
        [req.user.id, quote.cryptoAmount, GOLD_ASSET, `bought with USD`]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[wallet] gold buy failed:', err.message);
      return res.status(500).json({ error: 'gold buy failed' });
    } finally {
      client.release();
    }
    res.json({ ok: true, asset: GOLD_ASSET, usdAmount: quote.usdAmount, goldGrams: quote.cryptoAmount });
  });

  // Sell gold: debits the gold holding, credits the fiat wallet.
  router.post('/gold/sell', requireAuth, async (req, res) => {
    const { goldGrams } = req.body;
    const { pricePerGramUsd } = await getGoldPricePerGramUsd();
    const quote = quoteCryptoTrade({ side: 'sell', cryptoAmount: goldGrams, priceUsd: pricePerGramUsd });
    if (!quote.ok) return res.status(400).json({ error: quote.error });

    const { rows: goldTxRows } = await pool.query(
      `SELECT amount, direction FROM transactions WHERE user_id = $1 AND channel = 'gold' AND asset = $2`,
      [req.user.id, GOLD_ASSET]
    );
    const currentGoldBalance = computeBalance(goldTxRows);

    const validation = validateCryptoTrade({ side: 'sell', currentFiatBalance: 0, currentCryptoBalance: currentGoldBalance, cryptoAmount: quote.cryptoAmount });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO transactions (user_id, amount, direction, channel, asset, counterparty) VALUES ($1, $2, 'out', 'gold', $3, $4)`,
        [req.user.id, quote.cryptoAmount, GOLD_ASSET, `sold for USD`]
      );
      await client.query(
        `INSERT INTO transactions (user_id, amount, direction, channel, asset, counterparty) VALUES ($1, $2, 'in', 'wallet', 'USD', $3)`,
        [req.user.id, quote.usdAmount, `gold-sell:${GOLD_ASSET}`]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[wallet] gold sell failed:', err.message);
      return res.status(500).json({ error: 'gold sell failed' });
    } finally {
      client.release();
    }
    res.json({ ok: true, asset: GOLD_ASSET, usdAmount: quote.usdAmount, goldGrams: quote.cryptoAmount });
  });

  return router;
}

async function getWalletOrFail(pool, userId, res) {
  const { rows } = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
  if (!rows[0]) {
    res.status(404).json({ error: 'no wallet yet — call POST /api/wallet/create first' });
    return null;
  }
  return rows[0];
}

module.exports = buildWalletRoutes;
