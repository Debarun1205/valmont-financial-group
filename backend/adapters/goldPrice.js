/**
 * Module 11 extension (Checkpoint 10, Tier 2): digital gold as a third
 * wallet asset alongside fiat (Checkpoint 2) and crypto/SOL (Checkpoint 7).
 *
 * Same "every adapter has a mock fallback, zero API keys required to demo"
 * pattern as solana.js's getSolPriceUsd() — this file exists separately
 * (rather than being bolted onto solana.js) because gold has nothing to do
 * with the Solana chain, it's just another priced asset in the wallet.
 *
 * Price is quoted per GRAM (not per troy ounce) to match how digital-gold
 * products are sold in the markets this app targets (India/SEA gig-worker
 * and student segments) — buy/sell in small fractional-gram amounts.
 */

const MOCK_PRICE_PER_GRAM_USD = 75;

/**
 * Real gold spot price if GOLD_PRICE_API_URL is configured (expects a
 * plain-JSON endpoint shaped like metals-api/GoldAPI's simple response,
 * e.g. `https://www.goldapi.io/api/XAU/USD` -> { price_gram_24k: <number> }).
 * Falls back to a static mock price otherwise.
 */
async function getGoldPricePerGramUsd() {
  const url = process.env.GOLD_PRICE_API_URL;
  if (!url) {
    return { pricePerGramUsd: MOCK_PRICE_PER_GRAM_USD, mocked: true };
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`price API error: ${res.status}`);
    const data = await res.json();
    const pricePerGramUsd = data?.price_gram_24k;
    if (typeof pricePerGramUsd !== 'number') throw new Error('unexpected price API response shape');
    return { pricePerGramUsd, mocked: false };
  } catch (err) {
    console.error('[goldPrice] price feed failed, falling back to mock:', err.message);
    return { pricePerGramUsd: MOCK_PRICE_PER_GRAM_USD, mocked: true };
  }
}

module.exports.getGoldPricePerGramUsd = getGoldPricePerGramUsd;
