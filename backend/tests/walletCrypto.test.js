const assert = require('assert');
const { computeBalance, quoteCryptoTrade, validateCryptoTrade } = require('../services/walletService');

function run() {
  // computeBalance is reused as-is for the crypto ledger (channel='crypto' rows).
  const cryptoTxs = [
    { amount: 2, direction: 'in' },   // bought 2 SOL
    { amount: 0.5, direction: 'out' } // sold 0.5 SOL
  ];
  assert.strictEqual(computeBalance(cryptoTxs), 1.5, 'crypto balance should net the same way as fiat');

  const buyQuote = quoteCryptoTrade({ side: 'buy', usdAmount: 150, priceUsd: 150 });
  assert.strictEqual(buyQuote.ok, true);
  assert.strictEqual(buyQuote.cryptoAmount, 1, '150 USD at 150/unit should buy exactly 1 unit');

  const sellQuote = quoteCryptoTrade({ side: 'sell', cryptoAmount: 2, priceUsd: 150 });
  assert.strictEqual(sellQuote.ok, true);
  assert.strictEqual(sellQuote.usdAmount, 300);

  const badSide = quoteCryptoTrade({ side: 'trade', usdAmount: 10, priceUsd: 150 });
  assert.strictEqual(badSide.ok, false);

  const zeroBuy = quoteCryptoTrade({ side: 'buy', usdAmount: 0, priceUsd: 150 });
  assert.strictEqual(zeroBuy.ok, false);

  const badPrice = quoteCryptoTrade({ side: 'buy', usdAmount: 100, priceUsd: 0 });
  assert.strictEqual(badPrice.ok, false);

  // Trade validation against balances
  const okBuy = validateCryptoTrade({ side: 'buy', currentFiatBalance: 200, currentCryptoBalance: 0, usdAmount: 150 });
  assert.strictEqual(okBuy.ok, true);

  const overdraftBuy = validateCryptoTrade({ side: 'buy', currentFiatBalance: 100, currentCryptoBalance: 0, usdAmount: 150 });
  assert.strictEqual(overdraftBuy.ok, false);
  assert.match(overdraftBuy.error, /insufficient USD/);

  const okSell = validateCryptoTrade({ side: 'sell', currentFiatBalance: 0, currentCryptoBalance: 2, cryptoAmount: 1 });
  assert.strictEqual(okSell.ok, true);

  const overdraftSell = validateCryptoTrade({ side: 'sell', currentFiatBalance: 0, currentCryptoBalance: 1, cryptoAmount: 2 });
  assert.strictEqual(overdraftSell.ok, false);
  assert.match(overdraftSell.error, /insufficient crypto/);

  console.log('✅ walletService (crypto): all assertions passed');
  console.log(`  sample: buy $150 @ $150/SOL -> ${buyQuote.cryptoAmount} SOL | sell 2 SOL @ $150 -> $${sellQuote.usdAmount}`);
}

run();
