/**
 * Warm onboarding quiz → customer tier classification.
 * Tiers: banks | organizations | big_merchants | small_merchant |
 *        hackers | career_professionals | students
 */

const TIERS = [
  'banks',
  'organizations',
  'big_merchants',
  'small_merchant',
  'hackers',
  'career_professionals',
  'students'
];

const TIER_META = {
  banks: {
    label: 'Bank & lending partners',
    welcome: 'Welcome — we built Valmont so institutions can read one portable trust signal instead of reinventing risk. You belong at this table.',
    aiAssistance: 'I will help your team inspect expected-loss, fund marketplace loans, and explain the shared score to credit committees — without a second black-box model.',
    aiFocus: 'portfolio risk, expected-loss lenses, marketplace funding workflows',
    suggestedRole: 'lender',
    personaHint: 'bank risk analyst'
  },
  organizations: {
    label: 'Organizations & enterprises',
    welcome: 'Glad you are here — workforce financial health should feel inclusive, not extractive. We will treat your people with care.',
    aiAssistance: 'I will roll up employee trust, learning, and loan exposure so people-ops can support staff without shaming anyone’s starting point.',
    aiFocus: 'workforce rollups, employee financial literacy, org-level loan exposure',
    suggestedRole: 'enterprise',
    personaHint: 'enterprise people-ops lead'
  },
  big_merchants: {
    label: 'Growing merchants',
    welcome: 'Welcome — scale should not mean losing clarity on cash flow and credit lines. We will keep the picture human.',
    aiAssistance: 'I will track business-health, revenue trends, and working-capital guidance so growth stays readable, not overwhelming.',
    aiFocus: 'business-health scoring, revenue trends, working-capital guidance',
    suggestedRole: 'individual',
    personaHint: 'growing merchant operator'
  },
  small_merchant: {
    label: 'Small merchants & shops',
    welcome: 'You are welcome here — whether you run a stall, a kiosk, or a neighborhood shop. There is no “too small.”',
    aiAssistance: 'I will keep cash-flow literacy, remittances, and micro-credit simple — paced to the hours you actually have.',
    aiFocus: 'simple cash-flow literacy, remittances, micro-credit readiness',
    suggestedRole: 'individual',
    personaHint: 'small shop owner'
  },
  hackers: {
    label: 'Builders & security-minded explorers',
    welcome: 'Welcome, builder — curiosity about systems is a strength here, not a red flag. We will show our work.',
    aiAssistance: 'I will explain the risk engine, on-chain attestation, and model outputs in plain language, with the knobs you like to inspect.',
    aiFocus: 'transparent risk engines, on-chain attestation, model explainability',
    suggestedRole: 'individual',
    personaHint: 'curious technologist'
  },
  career_professionals: {
    label: 'Career professionals',
    welcome: 'Welcome — your time is limited, so guidance stays practical and respectful of your goals. No lecture, just a clear next step.',
    aiAssistance: 'I will keep investing, budgeting, and insurance short and goal-based, so you can act in the minutes you have.',
    aiFocus: 'goal-based investing, budgeting nudges, insurance lenses',
    suggestedRole: 'individual',
    personaHint: 'salaried professional'
  },
  students: {
    label: 'Students & early earners',
    welcome: 'You belong here — starting with little formal history is exactly why we built a starter identity path. Zero is a valid beginning.',
    aiAssistance: 'I will teach in small daily bites: starter trust scores, emergency funds, and savings habits that fit a student calendar.',
    aiFocus: 'financial literacy, starter trust scores, gentle savings habits',
    suggestedRole: 'individual',
    personaHint: 'student'
  }
};

function validateOnboardingAnswers(raw = {}) {
  const monthlyIncome = Number(raw.monthlyIncome);
  const dailyLearningMinutes = Number(raw.dailyLearningMinutes);
  const investmentCapital = Number(raw.investmentCapital);
  const background = String(raw.background || '').trim().toLowerCase();

  if (!Number.isFinite(monthlyIncome) || monthlyIncome < 0 || monthlyIncome > 10_000_000) {
    return { ok: false, error: 'monthlyIncome must be a number between 0 and 10000000' };
  }
  if (!Number.isFinite(dailyLearningMinutes) || dailyLearningMinutes < 0 || dailyLearningMinutes > 24 * 60) {
    return { ok: false, error: 'dailyLearningMinutes must be between 0 and 1440' };
  }
  if (!Number.isFinite(investmentCapital) || investmentCapital < 0 || investmentCapital > 100_000_000) {
    return { ok: false, error: 'investmentCapital must be a number between 0 and 100000000' };
  }
  if (!background || background.length > 80) {
    return { ok: false, error: 'background is required' };
  }

  return {
    ok: true,
    answers: {
      monthlyIncome,
      dailyLearningMinutes,
      investmentCapital,
      background,
      displayName: String(raw.displayName || '').trim().slice(0, 80) || null
    }
  };
}

/**
 * Deterministic, explainable classifier — no ML black box for onboarding.
 */
function classifyCustomerTier(answers) {
  const bg = answers.background;
  const income = answers.monthlyIncome;
  const capital = answers.investmentCapital;
  const learnMin = answers.dailyLearningMinutes;

  let tier = 'career_professionals';
  let reason = 'Defaulted to career professionals based on a balanced profile.';

  if (/(bank|lender|credit.?union|fintech.?lender)/.test(bg)) {
    tier = 'banks';
    reason = 'Background signals a banking / lending institution.';
  } else if (/(organiz|enterprise|ngo|company|employer|corp)/.test(bg)) {
    tier = 'organizations';
    reason = 'Background signals an organization or enterprise.';
  } else if (/(hack|security|developer|engineer|builder|coder|tech)/.test(bg)) {
    tier = 'hackers';
    reason = 'Background signals a builder / security-minded explorer.';
  } else if (/(student|school|university|college|learner)/.test(bg) || (income < 800 && capital < 2000)) {
    tier = 'students';
    reason = 'Student-leaning background or early-income / early-capital profile.';
  } else if (/(big.?merchant|large.?merchant|chain|franchise)/.test(bg) || (/(merchant|shop|retail|store|seller)/.test(bg) && capital >= 25000)) {
    tier = 'big_merchants';
    reason = 'Merchant background with larger investment capital.';
  } else if (/(merchant|shop|retail|store|seller|vendor|stall)/.test(bg) || (capital >= 1500 && capital < 25000 && /(business|trade)/.test(bg))) {
    tier = 'small_merchant';
    reason = 'Merchant / trade background with modest capital.';
  } else if (income >= 4000 || capital >= 15000) {
    tier = 'career_professionals';
    reason = 'Steady income / capital profile fits career professionals.';
  } else if (learnMin >= 45 && income < 1500) {
    tier = 'students';
    reason = 'High learning time with modest income — student-paced path.';
  }

  if (!TIERS.includes(tier)) tier = 'career_professionals';
  const meta = TIER_META[tier];

  return {
    customerTier: tier,
    label: meta.label,
    welcome: meta.welcome,
    aiAssistance: meta.aiAssistance,
    aiFocus: meta.aiFocus,
    suggestedRole: meta.suggestedRole,
    personaHint: meta.personaHint,
    reason,
    answers
  };
}

function buildTierAwareAiContext(userRow) {
  const tier = userRow?.customer_tier || 'career_professionals';
  const meta = TIER_META[tier] || TIER_META.career_professionals;
  const onboarding = userRow?.onboarding || {};
  return {
    customerTier: tier,
    label: meta.label,
    personaHint: meta.personaHint,
    welcome: meta.welcome,
    aiAssistance: meta.aiAssistance,
    aiFocus: meta.aiFocus,
    monthlyIncome: onboarding.monthlyIncome,
    dailyLearningMinutes: onboarding.dailyLearningMinutes,
    investmentCapital: onboarding.investmentCapital,
    background: onboarding.background
  };
}

async function loadUserTierContext(pool, userId) {
  const { rows } = await pool.query(
    `SELECT customer_tier, onboarding FROM users WHERE id = $1`,
    [userId]
  );
  return buildTierAwareAiContext(rows[0] || {});
}

module.exports = {
  TIERS,
  TIER_META,
  validateOnboardingAnswers,
  classifyCustomerTier,
  buildTierAwareAiContext,
  loadUserTierContext
};
