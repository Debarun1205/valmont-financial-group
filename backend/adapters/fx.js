/**
 * FX adapter — Module 12 (Remittances). Same "every adapter has a mock
 * fallback, zero API keys needed to demo" pattern as gemini.js/solana.js.
 *
 * Real rate if FX_API_URL is configured (expects a plain-JSON endpoint
 * shaped like exchangerate.host's /latest, e.g.
 * `https://api.exchangerate.host/latest?base=USD`), a static mock rate
 * table otherwise.
 */

const MOCK_RATES_FROM_USD = {
  INR: 83.2,
  PHP: 56.4,
  MXN: 17.1,
  NGN: 1550,
  KES: 129
};

/**
 * @param {string} destCurrency - ISO code, e.g. 'INR'
 * @returns {Promise<{rate:number, mocked:boolean}>} units of destCurrency per 1 USD
 */
async function getFxRate(destCurrency) {
  const url = process.env.FX_API_URL;
  if (!url) {
    const rate = MOCK_RATES_FROM_USD[destCurrency];
    if (!rate) return { rate: null, mocked: true };
    return { rate, mocked: true };
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`FX API error: ${res.status}`);
    const data = await res.json();
    const rate = data?.rates?.[destCurrency];
    if (typeof rate !== 'number') throw new Error('unexpected FX API response shape');
    return { rate, mocked: false };
  } catch (err) {
    console.error('[fx] rate feed failed, falling back to mock:', err.message);
    const rate = MOCK_RATES_FROM_USD[destCurrency] || null;
    return { rate, mocked: true };
  }
}

module.exports = { getFxRate, MOCK_RATES_FROM_USD };
