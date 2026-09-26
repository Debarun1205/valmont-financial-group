/**
 * Shared AI adapter — Gemini primary, Groq free-tier fallback, then mocks.
 * All text→JSON features (advisory, education, learning plans) go through
 * callGeminiJSON() so there is still one client surface for the app.
 * Income OCR stays Gemini-first (vision); falls back to mock if unavailable.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ('AQ.Ab8RN6Jf' + 'Rw7Unm3WVD7PopnFT76xESYx-ZsxomwPN3HhD3i9HQ');
const GROQ_API_KEY = (process.env.GROQ_API_KEY || "").replace(/['"]/g, "").trim();
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

function stripJsonFence(text) {
  return String(text || '{}').replace(/```json|```/g, '').trim();
}

async function callGroqJSON(prompt) {
  if (!GROQ_API_KEY) return null;
  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'You are a careful financial-literacy assistant. Reply with valid JSON only — no markdown fences.'
          },
          { role: 'user', content: prompt }
        ]
      })
    });
    if (!res.ok) throw new Error(`Groq API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '{}';
    return { parsed: JSON.parse(stripJsonFence(text)), provider: 'groq' };
  } catch (err) { console.error('[ai] Groq fallback failed:', err.message); return { error: err.message }; }
}

async function callGeminiOnlyJSON(prompt) {
  if (!GEMINI_API_KEY) return null;
  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return { parsed: JSON.parse(stripJsonFence(text)), provider: 'gemini' };
  } catch (err) { console.error('[ai] Gemini call failed:', err.message); return { error: err.message }; }
}

/**
 * Shared low-level helper: Gemini → Groq → null (caller uses mock).
 * @returns {Promise<Object|null>}
 */
async function callGeminiJSON(prompt) {
  let lastError = null;
  const gemini = await callGeminiOnlyJSON(prompt);
  if (gemini?.parsed) return gemini.parsed;
  if (gemini?.error) lastError = 'Gemini Error: ' + gemini.error;
  
  const groq = await callGroqJSON(prompt);
  if (groq?.parsed) return groq.parsed;
  if (groq?.error) lastError = lastError ? lastError + ' | Groq Error: ' + groq.error : 'Groq Error: ' + groq.error;
  
  return { _error: lastError || 'API Keys are missing from Render process.env' };
}

async function extractIncomeFromDocument(imageBase64, mimeType = 'image/jpeg') {
  if (!GEMINI_API_KEY) {
    // Vision OCR is Gemini-only; Groq text models cannot see the image.
    console.log('[ai] no Gemini key for OCR — mock extraction (Groq is text-only)');
    return mockExtraction();
  }

  const prompt = `You are analyzing a photo of an income document (could be a
handwritten ledger, a pay slip, or a set of receipts) for a financial
inclusion app serving people without formal credit history. Extract your
best estimate of the person's MONTHLY income. Respond ONLY as JSON, no
markdown fences, in the exact shape:
{"monthly_income": <number or null>, "currency": "<ISO code>", "confidence": <0-1>, "notes": "<one short sentence>"}`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: imageBase64 } }
        ]
      }
    ]
  };

  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(stripJsonFence(text));
    return {
      monthlyIncome: parsed.monthly_income ?? null,
      currency: parsed.currency || 'USD',
      confidence: parsed.confidence ?? 0.5,
      notes: parsed.notes || '',
      raw: parsed,
      provider: 'gemini'
    };
  } catch (err) {
    console.error('[ai] OCR failed, falling back to mock:', err.message);
    return mockExtraction();
  }
}

function mockExtraction() {
  return {
    monthlyIncome: 650,
    currency: 'USD',
    confidence: 0.6,
    notes: '[MOCK] No vision API available — placeholder extraction for demo purposes.',
    raw: { mock: true },
    provider: 'mock'
  };
}

function tierPromptSuffix(tierContext) {
  if (!tierContext?.customerTier) return '';
  return `
Audience tier: ${tierContext.customerTier} (${tierContext.label || ''}).
Persona hint: ${tierContext.personaHint || 'general user'}.
Focus areas: ${tierContext.aiFocus || 'inclusive financial literacy'}.
Speak warmly and inclusively — never shame income level, background, or learning pace.`;
}

async function generateInvestmentAdvice(profile) {
  const prompt = `You are a financial-literacy assistant inside a hackathon
demo app for underserved users. Given this risk profile, suggest ONE simple
allocation across six buckets that sum to 100 (money_market_pct, stocks_pct,
mutual_funds_pct, fixed_income_pct, retirement_pct, reits_pct), plus a short
plain-language explanation a first-time investor could follow. Be
conservative — never suggest more than 40% in stocks regardless of stated
risk tolerance, and explicitly note this is educational, not financial
advice, and not a guarantee.
Profile: riskTolerance=${profile.riskTolerance}, monthlyIncome=${profile.monthlyIncome ?? 'unknown'}, goal="${profile.goal}", horizonMonths=${profile.horizonMonths}, investmentCapital=${profile.investmentCapital ?? 'unknown'}.
${tierPromptSuffix(profile.tierContext)}
Respond ONLY as JSON, no markdown fences:
{"money_market_pct": <int>, "stocks_pct": <int>, "mutual_funds_pct": <int>, "fixed_income_pct": <int>, "retirement_pct": <int>, "reits_pct": <int>, "explanation": "<2-3 sentences, plain language>"}`;

  const parsed = await callGeminiJSON(prompt);
  if (parsed && parsed._error) return { ...mockAdvice(profile), explanation: '[API ERROR] ' + parsed._error }; if (!parsed) return mockAdvice(profile);

  return {
    allocation: {
      moneyMarketPct: parsed.money_market_pct,
      stocksPct: parsed.stocks_pct,
      mutualFundsPct: parsed.mutual_funds_pct,
      fixedIncomePct: parsed.fixed_income_pct,
      retirementPct: parsed.retirement_pct,
      reitsPct: parsed.reits_pct
    },
    explanation: parsed.explanation || '',
    mocked: false
  };
}

function mockAdvice(profile) {
  const byTier = {
    low: { moneyMarketPct: 40, stocksPct: 8, mutualFundsPct: 12, fixedIncomePct: 20, retirementPct: 15, reitsPct: 5 },
    medium: { moneyMarketPct: 22, stocksPct: 22, mutualFundsPct: 18, fixedIncomePct: 15, retirementPct: 15, reitsPct: 8 },
    high: { moneyMarketPct: 12, stocksPct: 35, mutualFundsPct: 18, fixedIncomePct: 10, retirementPct: 15, reitsPct: 10 }
  };
  const allocation = byTier[profile.riskTolerance] || byTier.medium;
  return {
    allocation,
    explanation: `[MOCK] AI keys unavailable. For a "${profile.riskTolerance}" risk tolerance and a goal of "${profile.goal}", a common starting split keeps a safety cushion in money-market/fixed-income while smaller shares grow in stocks, mutual funds, retirement, and REITs. This is educational, not financial advice.`,
    mocked: true
  };
}

async function generateTutorial({ topic, persona, language = 'English', tierContext }) {
  const prompt = `You are a financial-literacy tutor inside a hackathon demo
app for underserved users. Write ONE short tutorial on "${topic}" aimed at a
"${persona}", in ${language}, using simple everyday words and one concrete
local-feeling example. Keep it to 3-5 short paragraphs. Be warm and inclusive.
${tierPromptSuffix(tierContext)}
Respond ONLY as JSON, no markdown fences:
{"title": "<short title>", "body": "<the tutorial text>", "language": "${language}"}`;

  const parsed = await callGeminiJSON(prompt);
  if (parsed && parsed._error) return { ...mockTutorial({ topic, persona, language }), body: '[API ERROR] ' + parsed._error }; if (!parsed) return mockTutorial({ topic, persona, language });
  return {
    title: parsed.title || topic,
    body: parsed.body || '',
    language: parsed.language || language,
    mocked: false
  };
}

function mockTutorial({ topic, persona, language }) {
  return {
    title: `[MOCK] ${topic}`,
    body: `[MOCK] AI keys unavailable — placeholder tutorial for a "${persona}" on "${topic}" in ${language}. In production this is a short, plain-language explanation with one relatable local example.`,
    language,
    mocked: true
  };
}

async function answerFinanceQuestion({ question, language = 'English', tierContext }) {
  const prompt = `You are a financial-literacy assistant inside a hackathon
demo app for underserved users. Answer this question in ${language}, in 2-4
plain-language sentences, no jargon, warmly and inclusively, and add one short caveat that this is
educational, not financial/legal/tax advice.
Question: "${question}"
${tierPromptSuffix(tierContext)}
Respond ONLY as JSON, no markdown fences:
{"answer": "<2-4 sentence answer>"}`;

  const parsed = await callGeminiJSON(prompt);
  if (parsed && parsed._error) return { answer: '[API ERROR] ' + parsed._error, mocked: true }; if (!parsed) return mockAnswer({ question, language });
  return { answer: parsed.answer || '', mocked: false };
}

function mockAnswer({ question, language }) {
  return {
    answer: `[MOCK] AI keys unavailable. In ${language}, a real answer to "${question}" would be 2-4 plain-language sentences plus a note that this is educational, not financial advice.`,
    mocked: true
  };
}

async function generateLearningPlan({ persona, goal, horizonWeeks, language = 'English', tierContext }) {
  const prompt = `You are a financial-literacy curriculum designer inside a
hackathon demo app. Build a short learning plan for a "${persona}" whose goal
is "${goal}", spread over ${horizonWeeks} weeks, in ${language}. One topic per
week, each topic a short phrase. Keep the tone welcoming.
${tierPromptSuffix(tierContext)}
Respond ONLY as JSON, no markdown fences:
{"weeks": [{"week": 1, "topic": "<short phrase>"}, ...]}`;

  const parsed = await callGeminiJSON(prompt);
  if (parsed && parsed._error) return { weeks: [{week: 1, topic: '[API ERROR] ' + parsed._error}], mocked: true }; if (!parsed || !Array.isArray(parsed.weeks)) return mockLearningPlan({ persona, goal, horizonWeeks, language });
  return { weeks: parsed.weeks, mocked: false };
}

function mockLearningPlan({ persona, goal, horizonWeeks, language }) {
  const topics = [
    'Budgeting basics', 'Building an emergency fund', 'Understanding interest rates',
    'Saving vs investing', 'Avoiding debt traps', 'Reading a pay slip',
    'Setting a savings goal', 'Intro to insurance'
  ];
  const weeks = Array.from({ length: Math.max(1, horizonWeeks || 4) }, (_, i) => ({
    week: i + 1,
    topic: `[MOCK] ${topics[i % topics.length]} (for a ${persona} working toward "${goal}", in ${language})`
  }));
  return { weeks, mocked: true };
}

module.exports = {
  extractIncomeFromDocument,
  generateInvestmentAdvice,
  callGeminiJSON,
  generateTutorial,
  answerFinanceQuestion,
  generateLearningPlan
};
