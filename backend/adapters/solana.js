/**
 * Solana adapter — Module 1's "score goes on-chain" step, and later reused
 * by Module 2 (wallet balance queries) and Module 11 (crypto assets).
 *
 * For the hackathon build we do NOT store the raw score on-chain (privacy —
 * a trust score is sensitive). We write a MEMO transaction containing a hash
 * of (userId + score + timestamp), which is enough to prove "this score
 * existed, unaltered, at this time" — a real, defensible attestation pattern,
 * not a fake blockchain checkbox.
 */

const crypto = require('crypto');
const { Connection, Keypair, Transaction, TransactionInstruction, PublicKey, clusterApiUrl } = require('@solana/web3.js');

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

function getConnection() {
  return new Connection(process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'), 'confirmed');
}

function getKeypair() {
  const secret = process.env.SOLANA_SECRET_KEY;
  if (!secret) return null;
  try {
    const parsed = Uint8Array.from(JSON.parse(secret));
    return Keypair.fromSecretKey(parsed);
  } catch (err) {
    console.error('[solana] SOLANA_SECRET_KEY is set but invalid JSON array:', err.message);
    return null;
  }
}

function hashScore(userId, score, timestamp) {
  return crypto.createHash('sha256').update(`${userId}:${score}:${timestamp}`).digest('hex');
}

/**
 * @returns {Promise<{signature:string|null, hash:string, mocked:boolean}>}
 */
async function attestTrustScore(userId, score) {
  const timestamp = new Date().toISOString();
  const hash = hashScore(userId, score, timestamp);
  const keypair = getKeypair();

  if (!keypair) {
    console.log('[solana] no SOLANA_SECRET_KEY set — attestation hash computed but not sent to devnet');
    return { signature: null, hash, mocked: true };
  }

  try {
    const connection = getConnection();
    const memoData = Buffer.from(`trust-score-attestation:${hash}`, 'utf8');
    const instruction = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: memoData
    });
    const transaction = new Transaction().add(instruction);
    const signature = await connection.sendTransaction(transaction, [keypair]);
    await connection.confirmTransaction(signature, 'confirmed');
    return { signature, hash, mocked: false };
  } catch (err) {
    console.error('[solana] devnet attestation failed, returning hash only:', err.message);
    return { signature: null, hash, mocked: true };
  }
}

module.exports = { attestTrustScore };

/**
 * Module 2 addition: generates a fresh devnet keypair for a new wallet.
 * We only ever return/store the PUBLIC key — the secret key is intentionally
 * not persisted anywhere in this hackathon build (there's no real custody
 * model here, see the documentation's Module 2 notes: "keep custodial/simple
 * for the demo"). This function exists so the wallet has a real Solana
 * address to display, matching the "on-chain wallet" framing, without
 * pretending to solve custody/security in 36 hours.
 */
function generateWalletKeypair() {
  const keypair = Keypair.generate();
  return { publicKey: keypair.publicKey.toBase58() };
}

module.exports.generateWalletKeypair = generateWalletKeypair;

/**
 * Module 11 (Checkpoint 7) addition — crypto as a second wallet asset.
 *
 * Real SOL/USD price feed if CRYPTO_PRICE_API_URL is configured (expects a
 * plain-JSON endpoint shaped like CoinGecko's simple/price, e.g.
 * `https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd`).
 * Falls back to a static mock price otherwise — same "every adapter has a
 * mock fallback, zero API keys required to demo" pattern as gemini.js and
 * the rest of this file.
 */
async function getSolPriceUsd() {
  const url = process.env.CRYPTO_PRICE_API_URL;
  if (!url) {
    return { priceUsd: 150, mocked: true };
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`price API error: ${res.status}`);
    const data = await res.json();
    const priceUsd = data?.solana?.usd;
    if (typeof priceUsd !== 'number') throw new Error('unexpected price API response shape');
    return { priceUsd, mocked: false };
  } catch (err) {
    console.error('[solana] price feed failed, falling back to mock:', err.message);
    return { priceUsd: 150, mocked: true };
  }
}

/**
 * Reads a wallet's real on-chain devnet SOL balance (informational only —
 * the app's own crypto ledger in `transactions` channel='crypto' is what
 * every route/balance calc in this app actually relies on; see the schema.sql
 * comment on the `asset` column). Returns null if unreachable/no key.
 */
async function getDevnetSolBalance(publicKeyStr) {
  try {
    const connection = getConnection();
    const lamports = await connection.getBalance(new PublicKey(publicKeyStr));
    return lamports / 1e9;
  } catch (err) {
    console.error('[solana] devnet balance lookup failed:', err.message);
    return null;
  }
}

module.exports.getSolPriceUsd = getSolPriceUsd;
module.exports.getDevnetSolBalance = getDevnetSolBalance;
