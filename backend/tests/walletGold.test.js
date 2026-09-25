const assert = require('assert');
const { computeBalance, quoteCryptoTrade, validateCryptoTrade } = require('../services/walletService');
const { getGoldPricePerGramUsd } = require('../adapters/goldPrice');

async function run() {
  // computeBalance is reused as-is for the gold ledger too (channel='gold' rows).
  const goldTxs = [
    { amount: 3, direction: 'in' },   // bought 3 grams
    { amount: 1, direction: 'out' }   // sold 1 gram
  ];
  assert.strictEqual(computeBalance(goldTxs), 2, 'gold balance should net the same way as fiat/crypto');

  // quoteCryptoTrade/validateCryptoTrade are reused unchanged for gold — this
  // exercises the exact same functions the crypto checkpoint tested, just
  // with gold-shaped numbers, to confirm nothing about them is SOL-specific.
  const buyQuote = quoteCryptoTrade({ side: 'buy', usdAmount: 75, priceUsd: 75 });
  assert.strictEqual(buyQuote.ok, true);
  assert.strictEqual(buyQuote.cryptoAmount, 1, '$75 at $75/gram should buy exactly 1 gram');

  const sellQuote = quoteCryptoTrade({ side: 'sell', cryptoAmount: 2, priceUsd: 75 });
  assert.strictEqual(sellQuote.ok, true);
  assert.strictEqual(sellQuote.usdAmount, 150);

  const fractionalBuy = quoteCryptoTrade({ side: 'buy', usdAmount: 10, priceUsd: 75 });
  assert.strictEqual(fractionalBuy.ok, true);
  assert.strictEqual(fractionalBuy.cryptoAmount, Math.round((10 / 75) * 1e8) / 1e8, 'fractional-gram buys should be supported');

  const okBuy = validateCryptoTrade({ side: 'buy', currentFiatBalance: 100, currentCryptoBalance: 0, usdAmount: 75 });
  assert.strictEqual(okBuy.ok, true);

  const overdraftBuy = validateCryptoTrade({ side: 'buy', currentFiatBalance: 50, currentCryptoBalance: 0, usdAmount: 75 });
  assert.strictEqual(overdraftBuy.ok, false);
  assert.match(overdraftBuy.error, /insufficient USD/);

  const okSell = validateCryptoTrade({ side: 'sell', currentFiatBalance: 0, currentCryptoBalance: 2, cryptoAmount: 1 });
  assert.strictEqual(okSell.ok, true);

  const overdraftSell = validateCryptoTrade({ side: 'sell', currentFiatBalance: 0, currentCryptoBalance: 1, cryptoAmount: 2 });
  assert.strictEqual(overdraftSell.ok, false);
  assert.match(overdraftSell.error, /insufficient crypto/);

  // The gold adapter's mock fallback: with no GOLD_PRICE_API_URL set, it
  // must return a positive static price and mark the result as mocked, same
  // "runs with zero API keys" contract as every other adapter in this repo.
  delete process.env.GOLD_PRICE_API_URL;
  const { pricePerGramUsd, mocked } = await getGoldPricePerGramUsd();
  assert.strictEqual(mocked, true);
  assert.ok(pricePerGramUsd > 0, 'mock gold price should be a positive number');

  console.log('✅ walletService (gold): all assertions passed');
  console.log(`  sample: buy $75 @ $${pricePerGramUsd}/gram -> ${buyQuote.cryptoAmount}g | sell 2g @ $75 -> $${sellQuote.usdAmount}`);
}

run();
