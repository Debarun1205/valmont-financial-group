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
    welcome: 'Welcome, partner. You are among people who care about fair risk — not gates. We will keep the signal portable and the language human.',
    aiFocus: 'portfolio risk, expected-loss lenses, marketplace funding workflows',
    suggestedRole: 'lender',
    personaHint: 'bank risk analyst',
    assistance: [
      'Expected-loss view of the loan book, in plain language',
      'Borrower risk lookup that reuses the same trust score',
      'Funding workflows without a second scoring model'
    ]
  },
  organizations: {
    label: 'Organizations & enterprises',
    welcome: 'We are glad you are here. Workforce money health can feel caring — literacy, not surveillance. Everyone on the team belongs in this picture.',
    aiFocus: 'workforce rollups, employee financial literacy, org-level loan exposure',
    suggestedRole: 'enterprise',
    personaHint: 'enterprise people-ops lead',
    assistance: [
      'A workforce rollup of trust scores, never used to shame anyone',
      'Learning plans your people can take at their own pace',
      'Org-level loan exposure without extra paperwork'
    ]
  },
  big_merchants: {
    label: 'Growing merchants',
    welcome: 'Welcome — growth should feel clearer, not colder. We will walk cash flow, credit, and timing with you, at the pace you choose.',
    aiFocus: 'business-health scoring, revenue trends, working-capital guidance',
    suggestedRole: 'individual',
    personaHint: 'growing merchant operator',
    assistance: [
      'Business-health score from the same trust engine',
      'Weekly revenue trend and an explainable credit-line hint',
      'Working-capital language that stays practical'
    ]
  },
  small_merchant: {
    label: 'Small merchants & shops',
    welcome: 'You are welcome here — stall, kiosk, neighborhood shop, or side table. There is no “too small.” We will keep money talk simple and kind.',
    aiFocus: 'simple cash-flow literacy, remittances, micro-credit readiness',
    suggestedRole: 'individual',
    personaHint: 'small shop owner',
    assistance: [
      'Simple cash-in / cash-out literacy, no jargon',
      'Remittance quotes before you send',
      'Micro-credit readiness based on real activity, not paperwork theater'
    ]
  },
  hackers: {
    label: 'Builders & security-minded explorers',
    welcome: 'Welcome, builder. Curiosity about systems is a gift here. We will show how the risk engine works — transparent, inspectable, never a black box.',
    aiFocus: 'transparent risk engines, on-chain attestation, model explainability',
    suggestedRole: 'individual',
    personaHint: 'curious technologist',
    assistance: [
      'Explainable trust components you can inspect',
      'On-chain attestation on Solana devnet',
      'AI Lab: train models and run DS apps on the live ledger'
    ]
  },
  career_professionals: {
    label: 'Career professionals',
    welcome: 'Welcome. Your time is already full — so guidance stays short, practical, and respectful of the life you are building.',
    aiFocus: 'goal-based investing, budgeting nudges, insurance lenses',
    suggestedRole: 'individual',
    personaHint: 'salaried professional',
    assistance: [
      'Goal-based allocations you can actually finish reading',
      'A monthly nudge that never scolds',
      'Insurance and protection priced from the same score'
    ]
  },
  students: {
    label: 'Students & early earners',
    welcome: 'You belong here. Little formal history is not a flaw — it is exactly why we built a starter path. We will go slowly, and we will celebrate small wins.',
    aiFocus: 'financial literacy, starter trust scores, gentle savings habits',
    suggestedRole: 'individual',
    personaHint: 'student',
    assistance: [
      'Starter identity when pay stubs are still rare',
      'Tutorials paced to the minutes you actually have',
      'Gentle savings habits — five minutes still counts'
    ]
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
