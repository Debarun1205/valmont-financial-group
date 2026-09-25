const assert = require('assert');
const { quoteRemittance, validateRemittance } = require('../services/remittanceService');

function run() {
  const goodQuote = quoteRemittance({ sourceAmountUsd: 100, fxRate: 83.2 });
  assert.strictEqual(goodQuote.ok, true);
  assert.ok(goodQuote.feeUsd > 0);
  assert.ok(goodQuote.destAmount > 0);
  assert.strictEqual(goodQuote.netSentUsd, Math.round((100 - goodQuote.feeUsd) * 100) / 100);

  const tooSmall = quoteRemittance({ sourceAmountUsd: 1, fxRate: 83.2 });
  assert.strictEqual(tooSmall.ok, false);
  assert.match(tooSmall.error, /at least/);

  const tooBig = quoteRemittance({ sourceAmountUsd: 5000, fxRate: 83.2 });
  assert.strictEqual(tooBig.ok, false);
  assert.match(tooBig.error, /cap/);

  const noRate = quoteRemittance({ sourceAmountUsd: 100, fxRate: null });
  assert.strictEqual(noRate.ok, false);
  assert.match(noRate.error, /FX rate/);

  const negative = quoteRemittance({ sourceAmountUsd: -10, fxRate: 83.2 });
  assert.strictEqual(negative.ok, false);

  // Fee scales with amount, so a bigger send should have a bigger fee.
  const smallSend = quoteRemittance({ sourceAmountUsd: 10, fxRate: 83.2 });
  const bigSend = quoteRemittance({ sourceAmountUsd: 500, fxRate: 83.2 });
  assert.ok(bigSend.feeUsd > smallSend.feeUsd, 'a larger send should have a larger absolute fee');

  const okValidation = validateRemittance({ currentFiatBalance: 200, sourceAmountUsd: 100, feeUsd: goodQuote.feeUsd });
  assert.strictEqual(okValidation.ok, true);

  const overdraft = validateRemittance({ currentFiatBalance: 50, sourceAmountUsd: 100, feeUsd: goodQuote.feeUsd });
  assert.strictEqual(overdraft.ok, false);
  assert.match(overdraft.error, /insufficient/);

  console.log('✅ remittanceService: all assertions passed');
  console.log(`  sample: send $100 USD -> INR @ 83.2 -> fee $${goodQuote.feeUsd}, recipient gets ₹${goodQuote.destAmount}`);
}

run();
