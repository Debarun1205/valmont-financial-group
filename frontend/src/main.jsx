import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = import.meta.env.VITE_API_URL || '';
// Live Vercel+Render deploys always use the real API. Offline mocks only when
// VITE_DEMO_MODE=true AND no VITE_API_URL is set (local pitch fallback).
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' && !API;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const DEMO_USER = { id: 'demo-user-001', email: 'demo@valmont.local', role: 'individual', displayName: 'Alex', customerTier: null };

const DEMO = {
  health: { ok: true, checkpoint: 15, tier2Complete: true, tier3Progress: [{ name: 'retirement + REITs + goal framing', done: true }], demo: true },
  trust: { trustScore: { score: 78, incomeComponent: 34, fraudComponent: 44, evidence: { mocked: true }, computedAt: '2026-09-25T13:30:00Z' } },
  balance: { balance: 8240.5, savingsVaultBalance: 1800, solanaPublicKey: 'DemoSolanaPublicKey' },
  walletHistory: { transactions: [
    { createdAt: '2026-09-25T13:25:00Z', type: 'vault-deposit', amount: 1800, status: 'posted' },
    { createdAt: '2026-09-24T18:10:00Z', type: 'merchant-payout', amount: 520, status: 'posted' },
    { createdAt: '2026-09-23T08:42:00Z', type: 'sol-buy', amount: 120, status: 'posted' },
    { createdAt: '2026-09-22T15:20:00Z', type: 'transfer', amount: 75, status: 'posted' }
  ]},
  cryptoBalance: { asset: 'SOL', cryptoBalance: 4.82, priceUsd: 152.1, mocked: true, estimatedUsdValue: 733.12 },
  goldBalance: { asset: 'XAU_GRAM', goldGrams: 6.4, pricePerGramUsd: 75, mocked: true, estimatedUsdValue: 480 },
  loansMine: { loans: [
    { id: 'loan-204', principal: 1200, requested_amount: 1200, status: 'funded', rate_pct: 7.4 },
    { id: 'loan-187', principal: 450, requested_amount: 450, status: 'repaid', rate_pct: 8.8 }
  ]},
  lenderPortfolio: { portfolio: { totalFunded: 48200, totalOutstanding: 27600, weightedAvgExpectedLossPct: 4.1, loanCount: 18, countByStatus: { funded: 12, repaid: 5, pending: 1 } } },
  advisory: { advice: { allocation: { moneyMarketPct: 14, stocksPct: 32, mutualFundsPct: 18, fixedIncomePct: 12, retirementPct: 14, reitsPct: 10 }, explanation: 'Balanced growth with a moderate liquidity sleeve.', mocked: true }, goalFraming: null },
  insuranceQuote: { score: 78, premiumMultiplier: 0.91, ok: true, monthlyPremium: 1.37, maxCoverage: 800, policyType: 'device', coverageAmount: 400 },
  insuranceMine: { policies: [{ id: 'policy-1', policy_type: 'device', coverage_amount: 400, monthly_premium: 1.37, status: 'active' }] },
  remittanceQuote: { destCurrency: 'INR', fxRate: 83.35, mocked: true, ok: true, sourceAmountUsd: 50, feeUsd: 1.75, destAmount: 4012.5 },
  remittanceMine: { remittances: [{ id: 'remit-1', recipient_name: 'Priya Sharma', dest_currency: 'INR', source_amount_usd: 50, fee_usd: 1.75, dest_amount: 4012.5 }] },
  corridors: { supportedDestCurrencies: ['INR', 'PHP', 'MXN', 'NGN', 'KES'] },
  budgetGoal: { goal: { target_savings_pct: 20 }, defaultTargetSavingsPct: 20 },
  budgetNudge: { status: 'on-track', projectedSavingsPct: 24.3, targetSavingsPct: 20, note: 'Your projected savings are above target.', monthlyIncome: 2000, monthlySpend: 1514, savingsVaultBalance: 1800 },
  spendTrend: { weeks: 4, trend: [{ week: 'W-3', spend: 680 }, { week: 'W-2', spend: 590 }, { week: 'W-1', spend: 610 }, { week: 'Now', spend: 520 }] },
  merchantProfile: { profile: { business_name: 'Corner Store', category: 'retail' } },
  merchantHealth: { businessHealth: { score: 78, monthlyRevenue: 12600, rating: 'good', ratingLabel: 'Good', recommendedCreditLineUsd: 16538 }, scoreComputedAt: '2026-09-25T13:30:00Z' },
  revenueTrend: { weeklyRevenueTrend: [{ week: 'W-3', revenue: 2800 }, { week: 'W-2', revenue: 3200 }, { week: 'W-1', revenue: 3050 }, { week: 'Now', revenue: 3550 }] },
  enterpriseProfile: { profile: { organization_name: 'Acme Corp' } },
  enterpriseWorkforce: { organizationName: 'Acme Corp', workforce: { headcount: 46, scoredCount: 39, avgTrustScore: 74.6, ratingDistribution: { excellent: 8, good: 21, fair: 8, poor: 2 }, loanPortfolio: { totalFunded: 13800, totalOutstanding: 9600, weightedAvgExpectedLossPct: 4.2, loanCount: 7, countByStatus: { funded: 6, repaid: 1 } } } },
  studentProfile: { profile: { school_name: 'State University', expected_grad_year: 2028, monthly_allowance: 300 } },
  studentScore: { trustScore: { score: 62, entryPath: 'student-starter' }, startingLoanCapUsd: 300 },
  educationTutorial: { tutorial: { title: 'Compound interest in plain language', body: 'Money earns returns; future returns can themselves earn returns.', mocked: true } },
  educationQa: { qa: { question: 'What is an emergency fund?', answer: 'An emergency fund is cash set aside for essential expenses and unexpected costs.', mocked: true } },
  educationPlan: { plan: { weeks: [{ week: 1, title: 'Map your baseline' }, { week: 2, title: 'Automate a savings habit' }, { week: 3, title: 'Understand borrowing' }, { week: 4, title: 'Review and rebalance' }] } },
  mlModels: { models: [
    { key: 'trust-calibrator', name: 'Trust score calibrator', description: 'Calibrates income + fraud components.', dataSources: ['trust_scores'] },
    { key: 'fraud-velocity', name: 'Fraud velocity detector', description: 'Velocity / spike thresholds on the ledger.', dataSources: ['transactions'] },
    { key: 'spend-forecaster', name: 'Spend forecaster', description: 'Short-horizon spend projection.', dataSources: ['transactions'] },
    { key: 'advisory-allocator', name: 'Advisory allocator fidelity', description: 'Allocation sanity checks.', dataSources: ['investment_advice'] }
  ]},
  mlFeatures: { features: { sampleSize: 42, userCount: 18, avgTrustScore: 71.2, avgFraudCleanRatio: 0.84, spendVolatility: 0.22 } },
  mlRuns: { runs: [{ id: 'run-1', model_key: 'trust-calibrator', epochs: 8, status: 'completed', metrics: { accuracy: 0.86, loss: 0.12 }, created_at: '2026-09-25T12:00:00Z' }] },
  mlTrain: { run: { id: 'run-new', model_key: 'fraud-velocity', epochs: 8, status: 'completed', metrics: { accuracy: 0.88, precision: 0.85 }, created_at: '2026-09-25T13:00:00Z' }, note: 'Demo training from live features.' },
  dsApps: { applications: [
    { id: 'fraud-window', name: 'Fraud window analytics', category: 'risk', description: 'Velocity + spike signals.' },
    { id: 'spend-forecast', name: 'Personal spend analytics', category: 'consumer', description: 'Trailing spend buckets.' },
    { id: 'trust-lenses', name: 'Multi-lens risk applications', category: 'platform', description: 'Expected loss, premium, merchant health.' },
    { id: 'portfolio-risk', name: 'Lender portfolio DS', category: 'lending', description: 'Funded-loan exposure.' },
    { id: 'revenue-health', name: 'Merchant revenue DS', category: 'commerce', description: 'Inbound revenue health.' }
  ]},
  dsRun: { ok: true, application: { id: 'trust-lenses', name: 'Multi-lens risk applications' }, result: { score: 78, expectedLossPct: 4.2, insurancePremiumMultiplier: 0.91 } },
  authTiers: { tiers: [
    { id: 'students', label: 'Students & early earners', welcome: 'You belong here — starting with little formal history is exactly why we built a starter identity path.', aiFocus: 'financial literacy, starter trust scores, gentle savings habits', aiAssistance: 'I will teach in small daily bites: starter trust scores, emergency funds, and savings habits that fit a student calendar.' },
    { id: 'career_professionals', label: 'Career professionals', welcome: 'Welcome — your time is limited, so guidance stays practical and respectful of your goals.', aiFocus: 'goal-based investing, budgeting nudges, insurance lenses', aiAssistance: 'I will keep investing, budgeting, and insurance short and goal-based, so you can act in the minutes you have.' },
    { id: 'small_merchant', label: 'Small merchants & shops', welcome: 'You are welcome here — whether you run a stall, a kiosk, or a neighborhood shop.', aiFocus: 'simple cash-flow literacy, remittances, micro-credit readiness', aiAssistance: 'I will keep cash-flow literacy, remittances, and micro-credit simple — paced to the hours you actually have.' },
    { id: 'big_merchants', label: 'Growing merchants', welcome: 'Welcome — scale should not mean losing clarity on cash flow and credit lines.', aiFocus: 'business-health scoring, revenue trends, working-capital guidance', aiAssistance: 'I will track business-health, revenue trends, and working-capital guidance so growth stays readable, not overwhelming.' },
    { id: 'banks', label: 'Bank & lending partners', welcome: 'Welcome — we built Valmont so institutions can read one portable trust signal instead of reinventing risk.', aiFocus: 'portfolio risk, expected-loss lenses, marketplace funding workflows', aiAssistance: 'I will help your team inspect expected-loss, fund marketplace loans, and explain the shared score to credit committees.' },
    { id: 'organizations', label: 'Organizations & enterprises', welcome: 'Glad you are here — workforce financial health should feel inclusive, not extractive.', aiFocus: 'workforce rollups, employee financial literacy, org-level loan exposure', aiAssistance: 'I will roll up employee trust, learning, and loan exposure so people-ops can support staff without shaming anyone’s starting point.' },
    { id: 'hackers', label: 'Builders & security-minded explorers', welcome: 'Welcome, builder — curiosity about systems is a strength here, not a red flag.', aiFocus: 'transparent risk engines, on-chain attestation, model explainability', aiAssistance: 'I will explain the risk engine, on-chain attestation, and model outputs in plain language, with the knobs you like to inspect.' }
  ]},
};

function demoResponse(path) {
  const normalized = path.split('?')[0];
  const exact = {
    '/health': DEMO.health,
    [`/api/trust-score/${DEMO_USER.id}`]: DEMO.trust,
    '/api/trust-score/compute': DEMO.trust,
    '/api/trust-score/verify-income': { incomeDocument: { extracted_monthly_income: 2000 }, extraction: { mocked: true } },
    '/api/wallet/create': { wallet: { id: 'wallet-demo', solana_public_key: DEMO.balance.solanaPublicKey } },
    '/api/wallet/balance': DEMO.balance,
    '/api/wallet/history': DEMO.walletHistory,
    '/api/wallet/crypto/balance': DEMO.cryptoBalance,
    '/api/wallet/gold/balance': DEMO.goldBalance,
    '/api/loans/mine': DEMO.loansMine,
    '/api/loans/marketplace': { pendingLoans: [{ id: 'loan-301', principal: 900, borrower_id: 'borrower-01', status: 'pending', rate_pct: 8.2, term_months: 9 }] },
    '/api/lender/portfolio': DEMO.lenderPortfolio,
    '/api/advisory/recommend': { ...DEMO.advisory, advice: { ...DEMO.advisory.advice, goalFraming: { monthlyContribution: 300, projectedTotal: 3870, assumedAnnualReturnPct: 4.6, explanation: 'Educational estimate only — not a guarantee.' } } },
    '/api/insurance/quote': DEMO.insuranceQuote,
    '/api/insurance/purchase': { policy: DEMO.insuranceMine.policies[0] },
    '/api/insurance/mine': DEMO.insuranceMine,
    '/api/remittance/corridors': DEMO.corridors,
    '/api/remittance/quote': DEMO.remittanceQuote,
    '/api/remittance/send': { remittance: DEMO.remittanceMine.remittances[0], mocked: true },
    '/api/remittance/mine': DEMO.remittanceMine,
    '/api/education/tutorial': DEMO.educationTutorial,
    '/api/education/tutorial/history': { history: [DEMO.educationTutorial.tutorial] },
    '/api/education/qa': DEMO.educationQa,
    '/api/education/qa/history': { history: [DEMO.educationQa.qa] },
    '/api/education/learning-plan': DEMO.educationPlan,
    '/api/education/learning-plan/history': { history: [DEMO.educationPlan.plan] },
    '/api/budget/goal': DEMO.budgetGoal,
    '/api/budget/nudge': DEMO.budgetNudge,
    '/api/budget/spend-trend': DEMO.spendTrend,
    '/api/student/profile': DEMO.studentProfile,
    '/api/student/compute-score': DEMO.studentScore,
    '/api/merchant/profile': DEMO.merchantProfile,
    '/api/merchant/health': DEMO.merchantHealth,
    '/api/merchant/revenue-trend': DEMO.revenueTrend,
    '/api/enterprise/profile': DEMO.enterpriseProfile,
    '/api/enterprise/employee-link': { link: { organization_name: 'Acme Corp' } },
    '/api/enterprise/workforce': DEMO.enterpriseWorkforce,
    '/api/ml/models': DEMO.mlModels,
    '/api/ml/features': DEMO.mlFeatures,
    '/api/ml/runs': DEMO.mlRuns,
    '/api/ml/train': DEMO.mlTrain,
    '/api/ds/applications': DEMO.dsApps,
    '/api/ds/runs': { runs: [] },
    '/api/auth/tiers': DEMO.authTiers,
    '/api/auth/config': { googleEnabled: Boolean(GOOGLE_CLIENT_ID), googleClientId: GOOGLE_CLIENT_ID || null },
    '/api/auth/google': { token: 'demo-token', user: { ...DEMO_USER, customerTier: null }, needsOnboarding: true },
    '/api/auth/login': { token: 'demo-token', user: { ...DEMO_USER, customerTier: null }, needsOnboarding: true },
    '/api/auth/signup': { token: 'demo-token', user: { ...DEMO_USER, customerTier: null }, needsOnboarding: true },
    '/api/auth/me': { user: { ...DEMO_USER, customerTier: 'career_professionals' }, needsOnboarding: false, tierMeta: DEMO.authTiers.tiers[1] },
  };
  if (exact[normalized]) return exact[normalized];
  if (normalized === '/api/wallet/transfer') return { ok: true, amount: 10, recipientEmail: 'other-user@example.com', note: null };
  if (normalized === '/api/wallet/vault/deposit') return { ok: true, deposited: 20 };
  if (normalized === '/api/wallet/crypto/quote') return { asset: 'SOL', priceUsd: 152.1, mocked: true, ok: true, side: 'buy', usdAmount: 50, cryptoAmount: 0.3287 };
  if (normalized === '/api/wallet/crypto/buy') return { ok: true, asset: 'SOL', usdAmount: 50, cryptoAmount: 0.3287 };
  if (normalized === '/api/wallet/crypto/sell') return { ok: true, asset: 'SOL', usdAmount: 15.21, cryptoAmount: 0.1 };
  if (normalized === '/api/wallet/gold/quote') return { asset: 'XAU_GRAM', pricePerGramUsd: 75, mocked: true, usdAmount: 50, goldGrams: 0.6667 };
  if (normalized === '/api/wallet/gold/buy') return { ok: true, asset: 'XAU_GRAM', usdAmount: 50, goldGrams: 0.6667 };
  if (normalized === '/api/wallet/gold/sell') return { ok: true, asset: 'XAU_GRAM', usdAmount: 7.5, goldGrams: 0.1 };
  if (normalized === '/api/loans/request') return { loan: { id: 'loan-demo', principal: 300, status: 'pending', rate_pct: 7.8 }, schedule: [] };
  if (normalized === '/api/loans/marketplace') return { pendingLoans: [{ id: 'loan-301', principal: 900, borrower_id: 'borrower-01', status: 'pending', rate_pct: 8.2, term_months: 9 }] };
  if (normalized.endsWith('/fund')) return { loan: { id: 'loan-301', status: 'funded' } };
  if (normalized.endsWith('/repay')) return { ok: true, installmentPaid: 1, loanFullyRepaid: false };
  if (normalized.startsWith('/api/loans/')) return { loan: { id: normalized.split('/').pop(), status: 'funded' }, schedule: [] };
  if (normalized === '/api/insurance/claim') return { claim: { id: 'claim-1', claim_amount: 100, status: 'submitted' } };
  if (normalized.includes('/api/insurance/') && normalized.endsWith('/claim')) return { claim: { id: 'claim-1', claim_amount: 100, status: 'submitted' } };
  if (normalized === '/api/budget/goal') return DEMO.budgetGoal;
  if (normalized === '/api/student/profile') return DEMO.studentProfile;
  if (normalized.startsWith('/api/ds/applications/') && normalized.endsWith('/run')) return DEMO.dsRun;
  if (normalized === '/api/auth/onboarding') return { user: { ...DEMO_USER, customerTier: 'students' }, classification: { customerTier: 'students', welcome: 'You belong here.', label: 'Students & early earners' } };
  return { ok: true, demo: true };
}

const NAV = [
  { group: 'Overview', items: [['overview', 'Overview', '⌂']] },
  { group: 'You', items: [['identity', 'Identity & trust', '◎'], ['wallet', 'Wallet', '◈'], ['invest', 'Investments', '↗'], ['insurance', 'Insurance', '◇'], ['remit', 'Remittances', '⇄'], ['learn', 'Financial learning', '∿'], ['budget', 'Budgeting', '≋']] },
  { group: 'Lending', items: [['loans', 'Loan marketplace', '₿'], ['lender', 'Lender dashboard', '▤']] },
  { group: 'Business', items: [['merchant', 'Merchant health', '▦'], ['enterprise', 'Enterprise view', '▥']] },
  { group: 'AI Lab', items: [['ml', 'Model training', '⚙'], ['ds', 'DS applications', 'Σ']] },
];

const moduleMeta = {
  identity: ['Identity & trust', 'One portable score, backed by evidence.', 'teal'], wallet: ['Wallet', 'Fiat, SOL and digital gold in one ledger.', 'violet'], invest: ['Investments', 'Goal-based allocation across six asset classes.', 'gold'], insurance: ['Insurance', 'A trust-score lens for policy pricing.', 'teal'], remit: ['Remittances', 'Quote and send across supported corridors.', 'orange'], learn: ['Financial learning', 'AI-guided education at your pace.', 'blue'], budget: ['Budgeting', 'A simple view of spend, savings and runway.', 'orange'], loans: ['Loan marketplace', 'Borrow and fund from the same trust engine.', 'violet'], lender: ['Lender dashboard', 'Portfolio exposure and borrower risk.', 'teal'], merchant: ['Merchant health', 'Business health from the same signal.', 'gold'], enterprise: ['Enterprise view', 'A workforce lens on financial health.', 'blue'], ml: ['Model training', 'Calibrate trust, fraud and advisory models on live features.', 'violet'], ds: ['DS applications', 'Fraud windows, lenses, spend and portfolio analytics.', 'teal']
};

function normalize(data, keys) { if (!data) return null; for (const key of keys) if (data[key] !== undefined) return data[key]; return data; }
function money(value) { return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function pct(value) { return `${Number(value || 0).toFixed(1)}%`; }

function useApi(token, setToast) {
  return async (path, options = {}) => {
    if (DEMO_MODE) return new Promise(resolve => setTimeout(() => resolve(demoResponse(path)), 90));
    try {
      const headers = { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) };
      const res = await fetch(`${API}${path}`, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
      return data;
    } catch (e) { setToast?.(e.message); throw e; }
  };
}

function Button({ children, onClick, variant = 'primary', disabled = false }) { return <button type="button" className={`${variant}-btn`} onClick={onClick} disabled={disabled}>{children}</button>; }
function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Panel({ title, kicker, children, className = '' }) { return <section className={`panel ${className}`}><div className="panel-head">{kicker && <span className="eyebrow">{kicker}</span>}{title && <h3>{title}</h3>}</div>{children}</section>; }
function PageHeader({ eyebrow, title, description, right }) { return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{right}</div>; }
function JsonOutput({ data }) { return data ? <pre className="json-output">{JSON.stringify(data, null, 2)}</pre> : null; }
function Stat({ label, value, sub, tone = '' }) { return <div className="stat"><span className="eyebrow">{label}</span><strong className={tone}>{value}</strong>{sub && <small>{sub}</small>}</div>; }
function StatusPill({ children, tone = 'positive' }) { return <span className={`status-pill ${tone}`}><span className="status-dot" />{children}</span>; }
function TrendList({ items, valueKey }) { return <div className="trend-list">{(items || []).map((x, i) => <div className="trend-row" key={`${x.week || x.createdAt || i}`}><span>{x.week || new Date(x.createdAt || Date.now()).toLocaleDateString()}</span><div className="trend-bar"><i style={{ width: `${Math.min(100, Math.max(8, Number(x[valueKey] || 0) / Math.max(1, Math.max(...(items || []).map(y => Number(y[valueKey] || 0))) ) * 100))}%` }} /></div><strong>{money(x[valueKey])}</strong></div>)}</div>; }

function readStoredUser() {
  try { return JSON.parse(localStorage.getItem('valmont_user') || 'null'); } catch { return null; }
}

function attachAuthUser(data) {
  if (!data?.user) return data?.user || null;
  return {
    ...data.user,
    tierMeta: data.tierMeta || data.classification || data.user.tierMeta || null,
    welcome: data.welcome || data.classification?.welcome || data.tierMeta?.welcome || null,
    aiAssistance: data.classification?.aiAssistance || data.tierMeta?.aiAssistance || data.user.aiAssistance || null
  };
}

function App() {
  const storedUser = readStoredUser();
  const storedToken = localStorage.getItem('valmont_token') || '';
  const initialView = storedToken && storedUser?.customerTier ? 'app' : storedToken ? 'onboarding' : 'landing';
  const [view, setView] = useState(initialView);
  const [page, setPage] = useState('overview');
  const [token, setToken] = useState(storedToken);
  const [user, setUser] = useState(storedUser);
  const [classification, setClassification] = useState(storedUser?.tierMeta || null);
  const [toast, setToast] = useState('');
  const [apiOnline, setApiOnline] = useState(null);
  const [authMode, setAuthMode] = useState('signin');
  const [googleClientId, setGoogleClientId] = useState(GOOGLE_CLIENT_ID);
  const persist = (nextToken, nextUser) => {
    setToken(nextToken || '');
    setUser(nextUser || null);
    if (nextToken) localStorage.setItem('valmont_token', nextToken); else localStorage.removeItem('valmont_token');
    if (nextUser) localStorage.setItem('valmont_user', JSON.stringify(nextUser)); else localStorage.removeItem('valmont_user');
  };
  useEffect(() => {
    if (DEMO_MODE) { setApiOnline(true); return; }
    fetch(`${API}/health`).then(r => r.ok ? r.json() : Promise.reject()).then(() => setApiOnline(true)).catch(() => setApiOnline(false));
    fetch(`${API}/api/auth/config`).then(r => r.ok ? r.json() : Promise.reject()).then(c => {
      if (c.googleClientId) setGoogleClientId(c.googleClientId);
    }).catch(() => {});
  }, []);
  useEffect(() => {
    if (DEMO_MODE || !storedToken) return undefined;
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${storedToken}` } })
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) return;
        const next = attachAuthUser(data);
        persist(storedToken, next);
        if (data.needsOnboarding || !next?.customerTier) setView('onboarding');
        else {
          setClassification(data.classification || data.tierMeta || next.tierMeta);
        }
      })
      .catch(() => {});
    return undefined;
  }, []);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 3200); return () => clearTimeout(id); }, [toast]);
  const logout = () => { persist('', null); setClassification(null); setPage('overview'); setView('landing'); setToast('Signed out — come back anytime.'); };
  const onAuth = data => {
    if (!data?.token) return;
    const next = attachAuthUser(data);
    persist(data.token, next);
    setClassification(data.classification || data.tierMeta || null);
    if (data.needsOnboarding || !next?.customerTier) {
      setView('onboarding');
      setToast('You are in. A few warm questions, then your workspace.');
    } else {
      setView('app');
      setToast(data.welcome || data.classification?.welcome || 'Welcome back.');
    }
  };
  const onOnboarded = data => {
    const next = attachAuthUser({ ...data, user: data.user || user });
    persist(data.token || token, next);
    setClassification(data.classification || data.tierMeta || next.tierMeta);
    setView('welcome');
    setToast(data.classification?.welcome || 'Your path is ready.');
  };
  const goAuth = (mode) => { setAuthMode(mode); setView('auth'); };
  if (view === 'landing') return <><PublicChrome apiOnline={apiOnline} onSignIn={() => goAuth('signin')} /><Landing onSignIn={() => goAuth('signin')} onSignUp={() => goAuth('signup')} /><Toast toast={toast} /></>;
  if (view === 'auth') return <><PublicChrome apiOnline={apiOnline} onSignIn={() => goAuth('signin')} onHome={() => setView('landing')} /><AuthPage mode={authMode} setMode={setAuthMode} googleClientId={googleClientId} onAuth={onAuth} setToast={setToast} onBack={() => setView('landing')} /><Toast toast={toast} /></>;
  if (view === 'onboarding') return <><PublicChrome apiOnline={apiOnline} onHome={() => setView('landing')} /><OnboardingQuiz token={token} user={user} setToast={setToast} onDone={onOnboarded} /><Toast toast={toast} /></>;
  if (view === 'welcome') return <><PublicChrome apiOnline={apiOnline} /><WelcomeGate user={user} classification={classification} onContinue={() => { setView('app'); setPage('overview'); }} onLogout={logout} /><Toast toast={toast} /></>;
  return <div className="app-shell"><Sidebar page={page} setPage={setPage} user={user} /><main className="main-shell"><Topbar user={user} apiOnline={apiOnline} onLogout={logout} /><div className="content-wrap"><PageRouter page={page} token={token} user={user} setPage={setPage} setToast={setToast} /></div></main><Toast toast={toast} /></div>;
}
function Toast({ toast }) { return toast ? <div className="toast"><span className="status-dot positive" />{toast}</div> : null; }
function PublicChrome({ apiOnline, onSignIn, onHome }) {
  return <header className="public-topbar"><button type="button" className="brand public-brand" onClick={onHome}><div className="brand-mark">V</div><div><strong>VALMONT</strong><small>FINANCIAL GROUP</small></div></button><div className="top-actions"><div className="system-state"><span className={`status-dot ${apiOnline ? 'positive' : apiOnline === false ? 'risk' : 'pending'}`} />{DEMO_MODE ? 'Demo systems' : apiOnline ? 'Systems online' : apiOnline === false ? 'API offline' : 'Checking systems'}</div>{onSignIn && <button type="button" className="primary-btn" onClick={onSignIn}>Sign in</button>}</div></header>;
}

function Sidebar({ page, setPage, user }) {
  const visible = NAV.map(section => ({ ...section, items: section.items.filter(([id]) => id !== 'lender' || user?.role === 'lender').filter(([id]) => id !== 'enterprise' || user?.role === 'enterprise') })).filter(s => s.items.length);
  return <aside className="sidebar"><div className="brand" onClick={() => setPage('overview')} role="button" tabIndex="0"><div className="brand-mark">V</div><div><strong>VALMONT</strong><small>FINANCIAL GROUP</small></div></div><div className="rail-label">YOUR FINANCE OS</div><nav>{visible.map(section => <div className="nav-section" key={section.group}><div className="nav-group">{section.group}</div>{section.items.map(([id, label, icon]) => <button type="button" key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}><span className="nav-icon">{icon}</span><span>{label}</span></button>)}</div>)}</nav><div className="sidebar-bottom"><div className="engine-chip"><span className="status-dot positive" /><div><strong>Risk engine</strong><small>One engine · many lenses</small></div></div><div className="profile-mini"><div className="avatar">{(user?.displayName || user?.email || 'V').slice(0, 1).toUpperCase()}</div><div className="truncate"><strong>{user?.displayName || user?.email || 'Guest'}</strong><small>{String(user?.customerTier || user?.role || 'member').replace(/_/g, ' ')}</small></div></div></div></aside>;
}
function Topbar({ user, apiOnline, onLogout }) { return <header className="topbar"><div className="crumb">VALMONT <span>/</span> {user ? `${String(user.customerTier || user.role || 'individual').replace(/_/g, ' ').toUpperCase()} WORKSPACE` : 'PREVIEW'}</div><div className="top-actions"><div className="system-state"><span className={`status-dot ${apiOnline ? 'positive' : apiOnline === false ? 'risk' : 'pending'}`} />{DEMO_MODE ? 'Demo systems' : apiOnline ? 'Systems online' : apiOnline === false ? 'API offline' : 'Checking systems'}</div>{DEMO_MODE && <span className="demo-chip">MOCK DATA</span>}{user && <button type="button" className="ghost-btn" onClick={onLogout}>Sign out</button>}</div></header>; }

async function postAuth(path, body, token) {
  if (DEMO_MODE) return demoResponse(path);
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
  return data;
}

function GoogleButton({ onCredential, setToast, clientId }) {
  const slotRef = useRef(null);
  const cbRef = useRef(onCredential);
  cbRef.current = onCredential;
  const id = clientId || GOOGLE_CLIENT_ID;
  useEffect(() => {
    if (!id) return undefined;
    const render = () => {
      if (!window.google?.accounts?.id || !slotRef.current) return;
      slotRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: id,
        callback: (res) => cbRef.current(res.credential)
      });
      window.google.accounts.id.renderButton(slotRef.current, { theme: 'filled_black', size: 'large', width: 360, text: 'continue_with', shape: 'rectangular' });
    };
    if (window.google?.accounts?.id) { render(); return undefined; }
    const existing = document.getElementById('google-gsi');
    if (existing) { existing.addEventListener('load', render); return () => existing.removeEventListener('load', render); }
    const script = document.createElement('script');
    script.id = 'google-gsi';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = render;
    script.onerror = () => setToast?.('Could not load Google Sign-In. Use email instead, or check GOOGLE_CLIENT_ID.');
    document.head.appendChild(script);
    return undefined;
  }, [setToast, id]);
  if (!id) {
    return DEMO_MODE
      ? <button type="button" className="google-btn" onClick={() => onCredential('demo-google-token')}>Continue with Google</button>
      : <p className="muted">Google Sign-In needs the same OAuth client ID on Render (<code>GOOGLE_CLIENT_ID</code>) and, optionally, Vercel (<code>VITE_GOOGLE_CLIENT_ID</code>). Add this site to Authorized JavaScript origins in Google Cloud.</p>;
  }
  return <div className="google-slot" ref={slotRef} />;
}

function Landing({ onSignIn, onSignUp }) {
  const paths = [
    ['Students', 'Starter identity with zero history'],
    ['Career professionals', 'Short, goal-based guidance'],
    ['Small merchants', 'Cash-flow that fits a shop day'],
    ['Growing merchants', 'Health score as you scale'],
    ['Banks', 'Expected-loss on one shared score'],
    ['Organizations', 'Workforce care, not extraction'],
    ['Builders', 'Transparent engines, shown plainly']
  ];
  return (
    <div className="landing public-page">
      <div className="hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">UNIVERSAL FINANCE PLATFORM</span>
          <h1>You belong here —<br /><em>whatever your starting point.</em></h1>
          <p>Valmont is a warm, inclusive finance OS. One portable trust score powers a wallet, loans, investing, protection, and business intelligence. Students, shops, banks, organizations, and builders share the same table — never a second-class path.</p>
          <div className="hero-actions">
            <button type="button" className="primary-btn" onClick={onSignIn}>Sign in with Google</button>
            <button type="button" className="secondary-btn" onClick={onSignUp}>Create an account</button>
          </div>
        </div>
        <div className="hero-score">
          <div className="score-ring"><div><strong>78</strong><span>TRUST</span></div></div>
          <div className="score-caption"><span className="status-dot positive" /> One signal, many lenses</div>
        </div>
      </div>
      <div className="feature-line">{['Google sign-in', 'Warm onboarding quiz', 'Tier-aware AI', 'Timescale signals', 'Solana attestation', 'Multi-asset wallet'].map(x => <span key={x}>{x}</span>)}</div>
      <div className="section-title"><span className="eyebrow">EVERY PATH IS VALID</span><h2>We meet you where you are.</h2></div>
      <div className="lens-grid">{paths.map(([t, s]) => <div key={t} className="lens-card"><span className="accent teal" /><div><span className="eyebrow">{t}</span><h3>{s}</h3></div></div>)}</div>
    </div>
  );
}

function AuthPage({ onAuth, setToast, onBack, mode = 'signin', setMode, googleClientId }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const path = mode === 'signin' ? '/api/auth/login' : '/api/auth/signup';
      const data = await postAuth(path, { email, password });
      onAuth(data);
    } catch (e) { setToast(e.message); } finally { setBusy(false); }
  };
  const onGoogle = async (idToken) => {
    setBusy(true);
    try {
      const data = await postAuth('/api/auth/google', { idToken });
      onAuth(data);
    } catch (e) { setToast(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="public-page auth-page">
      <section className="auth-card">
        <span className="eyebrow">{mode === 'signin' ? 'WELCOME BACK' : 'CREATE YOUR PLACE HERE'}</span>
        <h1>{mode === 'signin' ? 'Sign in to Valmont.' : 'Join Valmont — every path is valid.'}</h1>
        <p>Continue with Google (sign-in and sign-up are the same door). After you arrive we ask a few gentle questions — income, learning time, capital, background — so your AI guide fits real life, not an ideal customer.</p>
        <div className="segmented"><button type="button" className={mode === 'signin' ? 'selected' : ''} onClick={() => setMode('signin')}>Sign in</button><button type="button" className={mode === 'signup' ? 'selected' : ''} onClick={() => setMode('signup')}>Sign up</button></div>
        <GoogleButton clientId={googleClientId} onCredential={onGoogle} setToast={setToast} />
        <div className="or-line"><span>or email</span></div>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" autoComplete="email" />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
        <button type="button" className="primary-btn" onClick={submit} disabled={busy || !email || !password}>{busy ? 'Connecting…' : mode === 'signin' ? 'Enter with email' : 'Create account'}</button>
        <button type="button" className="text-btn" onClick={onBack}>Back to landing</button>
      </section>
    </div>
  );
}

function classifyQuizLocally(payload) {
  const bg = String(payload.background || '').toLowerCase();
  const income = Number(payload.monthlyIncome || 0);
  const capital = Number(payload.investmentCapital || 0);
  const learnMin = Number(payload.dailyLearningMinutes || 0);
  let id = 'career_professionals';
  if (/(bank|lender|credit.?union|fintech.?lender)/.test(bg)) id = 'banks';
  else if (/(organiz|enterprise|ngo|company|employer|corp)/.test(bg)) id = 'organizations';
  else if (/(hack|security|developer|engineer|builder|coder|tech)/.test(bg)) id = 'hackers';
  else if (/(student|school|university|college|learner)/.test(bg) || (income < 800 && capital < 2000)) id = 'students';
  else if (/(big.?merchant|large.?merchant|chain|franchise)/.test(bg) || (/(merchant|shop|retail|store|seller)/.test(bg) && capital >= 25000)) id = 'big_merchants';
  else if (/(merchant|shop|retail|store|seller|vendor|stall)/.test(bg) || (capital >= 1500 && capital < 25000 && /(business|trade)/.test(bg))) id = 'small_merchant';
  else if (income >= 4000 || capital >= 15000) id = 'career_professionals';
  else if (learnMin >= 45 && income < 1500) id = 'students';
  const tier = DEMO.authTiers.tiers.find(t => t.id === id) || DEMO.authTiers.tiers[1];
  const role = id === 'banks' ? 'lender' : id === 'organizations' ? 'enterprise' : 'individual';
  return { id, tier, role };
}

function OnboardingQuiz({ token, user, setToast, onDone }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [quiz, setQuiz] = useState({ displayName: user?.displayName || '', monthlyIncome: '', dailyLearningMinutes: '', investmentCapital: '', background: 'career professional' });
  const backgrounds = [
    ['student', 'Student / early earner'],
    ['career professional', 'Career professional'],
    ['small merchant', 'Small merchant / shop'],
    ['big merchant', 'Growing / larger merchant'],
    ['bank', 'Bank or lending partner'],
    ['organization / enterprise', 'Organization / enterprise'],
    ['hacker / builder / tech', 'Builder, hacker, or technologist'],
    ['other', 'Something else — still welcome']
  ];
  const quizSteps = [
    { key: 'displayName', title: 'What should we call you?', body: 'A first name, nickname, or just “friend” is perfect. There is no wrong answer.', kind: 'text', label: 'Preferred name' },
    { key: 'monthlyIncome', title: 'About how much do you earn each month?', body: 'Any number is welcome — including zero. We use this only to personalize guidance, never to gatekeep or judge.', kind: 'number', label: 'Monthly income (USD)', chips: [['0', 'Starting at zero'], ['400', 'Modest'], ['2000', 'Steady'], ['8000', 'Comfortable']] },
    { key: 'dailyLearningMinutes', title: 'How much time can you spend learning each day?', body: 'Five quiet minutes still counts. We will pace tutorials around your real life, not an ideal schedule.', kind: 'number', label: 'Minutes per day', chips: [['5', '5 min'], ['15', '15 min'], ['30', '30 min'], ['60', '1 hour']] },
    { key: 'investmentCapital', title: 'What capital could you invest if you chose to?', body: 'Zero is a respected answer. Understanding can start before money does.', kind: 'number', label: 'Investment capital (USD)', chips: [['0', 'None yet'], ['250', 'A little'], ['5000', 'Some runway'], ['40000', 'Meaningful']] },
    { key: 'background', title: 'What best describes your background?', body: 'Banks, shops, students, builders, organizations — every path belongs here. Pick the closest, not a perfect label.', kind: 'select', label: 'Background' }
  ];
  const current = quizSteps[step];
  const finish = async () => {
    setBusy(true);
    try {
      const payload = {
        displayName: quiz.displayName,
        monthlyIncome: Number(quiz.monthlyIncome || 0),
        dailyLearningMinutes: Number(quiz.dailyLearningMinutes || 0),
        investmentCapital: Number(quiz.investmentCapital || 0),
        background: quiz.background
      };
      if (DEMO_MODE) {
        const { id, tier, role } = classifyQuizLocally(payload);
        onDone({
          token: token || 'demo-token',
          user: { ...(user || DEMO_USER), customerTier: id, displayName: quiz.displayName || user?.displayName, onboarding: payload, role: user?.role && user.role !== 'individual' ? user.role : role, tierMeta: { id, ...tier } },
          classification: { customerTier: id, ...tier },
          tierMeta: { id, ...tier },
          welcome: tier.welcome,
          needsOnboarding: false
        });
        return;
      }
      const data = await postAuth('/api/auth/onboarding', payload, token);
      onDone(data);
    } catch (e) { setToast(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="public-page auth-page">
      <section className="auth-card quiz-card">
        <div className="quiz-meter" aria-hidden="true"><span style={{ width: `${((step + 1) / quizSteps.length) * 100}%` }} /></div>
        <span className="eyebrow">WARM ONBOARDING · {step + 1} OF {quizSteps.length}</span>
        <h1>{current.title}</h1>
        <p>{current.body}</p>
        <label className="field">
          <span>{current.label}</span>
          {current.kind === 'select'
            ? <select value={quiz.background} onChange={e => setQuiz(q => ({ ...q, background: e.target.value }))}>{backgrounds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            : <input type={current.kind} value={quiz[current.key]} onChange={e => setQuiz(q => ({ ...q, [current.key]: e.target.value }))} placeholder={current.kind === 'number' ? '0 is welcome' : 'Optional'} />}
        </label>
        {current.chips && (
          <div className="chip-row">
            {current.chips.map(([value, label]) => (
              <button type="button" key={value} className={`choice-chip ${String(quiz[current.key]) === value ? 'selected' : ''}`} onClick={() => setQuiz(q => ({ ...q, [current.key]: value }))}>{label}</button>
            ))}
          </div>
        )}
        <div className="button-row">
          {step > 0 && <button type="button" className="secondary-btn" onClick={() => setStep(s => s - 1)}>Back</button>}
          {step < quizSteps.length - 1
            ? <button type="button" className="primary-btn" onClick={() => setStep(s => s + 1)}>Continue</button>
            : <button type="button" className="primary-btn" onClick={finish} disabled={busy}>{busy ? 'Finding your path…' : 'Meet your AI guide'}</button>}
        </div>
      </section>
    </div>
  );
}

function WelcomeGate({ user, classification, onContinue, onLogout }) {
  const meta = classification || user?.tierMeta || {};
  const name = user?.displayName ? `, ${user.displayName}` : '';
  return (
    <div className="public-page auth-page">
      <section className="auth-card welcome-card">
        <span className="eyebrow">YOUR PLACE AT VALMONT</span>
        <h1>{meta.welcome || `Welcome${name}. You belong here.`}</h1>
        <StatusPill>{meta.label || String(user?.customerTier || '').replace(/_/g, ' ')}</StatusPill>
        <p className="ai-assist">{meta.aiAssistance || user?.aiAssistance || 'Your AI assistance will stay practical, inclusive, and paced to you.'}</p>
        <p className="muted">I will focus on {meta.aiFocus || 'inclusive financial literacy'} — always educational, never a lecture.</p>
        <div className="button-row"><button type="button" className="primary-btn" onClick={onContinue}>Enter dashboard</button><button type="button" className="ghost-btn" onClick={onLogout}>Sign out</button></div>
      </section>
    </div>
  );
}

function PageRouter(props) { const map = { overview: Overview, identity: Identity, wallet: Wallet, invest: Invest, insurance: Insurance, remit: Remit, learn: Learn, budget: Budget, loans: Loans, lender: Lender, merchant: Merchant, enterprise: Enterprise, ml: ModelTraining, ds: DsApplications }; const C = map[props.page] || Overview; return <C {...props} />; }

function Overview({ token, user, setPage, setToast }) {
  const api = useApi(token, setToast); const [score, setScore] = useState(DEMO_MODE ? DEMO.trust : null); const [balance, setBalance] = useState(DEMO_MODE ? DEMO.balance : null); const [loans, setLoans] = useState(DEMO_MODE ? DEMO.loansMine.loans : null);
  const refresh = async () => { const [s, b, l] = await Promise.allSettled([api(`/api/trust-score/${user.id}`), api('/api/wallet/balance'), api('/api/loans/mine')]); if (s.status === 'fulfilled') setScore(s.value); if (b.status === 'fulfilled') setBalance(b.value); if (l.status === 'fulfilled') setLoans(normalize(l.value, ['loans'])); };
  useEffect(() => { refresh(); }, []);
  const ts = normalize(score, ['trustScore']) || {}; const scoreValue = Number(ts.score || 0);
  const meta = user?.tierMeta || DEMO.authTiers.tiers.find(t => t.id === user?.customerTier) || {};
  const greetName = user?.displayName || (user?.email ? user.email.split('@')[0] : '');
  return <><PageHeader eyebrow="OVERVIEW / PERSONAL" title={`Good to see you${greetName ? `, ${greetName}` : ''}.`} description={meta.welcome || 'Your financial picture, condensed into the signals that matter.'} right={<Button variant="secondary" onClick={refresh}>Refresh data</Button>} /><Panel title="Your AI guide" kicker={meta.label || 'INCLUSIVE ASSISTANCE'} className="ai-guide-panel"><p className="ai-assist">{meta.aiAssistance || user?.aiAssistance || 'I will stay practical, inclusive, and paced to you.'}</p><p className="muted">Focus: {meta.aiFocus || 'inclusive financial literacy'}. Open Learn for tutorials, Q&amp;A, and a plan cut to your daily minutes.</p><button type="button" className="text-btn" onClick={() => setPage('learn')}>Talk with your AI guide →</button></Panel><div className="overview-grid"><Panel title="Trust score" kicker="CORE SIGNAL" className="score-panel"><div className="score-layout"><div className="big-score"><strong>{scoreValue || '—'}</strong><span>/ 100</span></div><div><StatusPill>On-chain attested</StatusPill><p className="muted">The same score can be read by you, a lender, an insurer or a business — each through its own lens.</p><button type="button" className="text-btn" onClick={() => setPage('identity')}>Review evidence →</button></div></div><div className="meter"><span style={{ width: `${Math.min(100, scoreValue)}%` }} /></div></Panel><Panel title="Wallet" kicker="LIQUIDITY"><div className="money">{money(balance?.balance)}</div><div className="split-row"><span>Available</span><span>Vault {money(balance?.savingsVaultBalance)}</span></div><button type="button" className="text-btn" onClick={() => setPage('wallet')}>Open wallet →</button></Panel></div><div className="stats-row"><Stat label="Trust signal" value={scoreValue || '—'} sub="Shared core score" /><Stat label="Wallet asset" value="USD" sub="Primary ledger" /><Stat label="Loans" value={Array.isArray(loans) ? loans.length : '—'} sub="Current requests" /><Stat label="Network" value="Solana" sub="Devnet attestation" tone="teal" /></div><div className="section-title"><span className="eyebrow">ONE ENGINE · MANY LENSES</span><h2>Choose a view.</h2></div><div className="lens-grid dense">{[['identity', 'Your identity', 'Trust score + evidence'], ['loans', 'Borrow', 'Request or fund'], ['invest', 'Grow', 'Six-bucket allocation'], ['insurance', 'Protect', 'Score-linked cover'], ['merchant', 'Operate', 'Business health'], ['enterprise', 'Workforce', 'Org-level signal']].map(([id, t, s]) => <button type="button" key={id} className="lens-card" onClick={() => setPage(id)}><span className={`accent ${moduleMeta[id][2]}`} /><div><span className="eyebrow">{t}</span><h3>{s}</h3></div><span className="arrow">↗</span></button>)}</div></>;
}

function Identity({ token, setToast }) {
  const api = useApi(token, setToast), [file, setFile] = useState(null), [data, setData] = useState({}), [score, setScore] = useState(null);
  const load = async () => { const [s, p] = await Promise.allSettled([api('/api/trust-score/' + (DEMO_MODE ? DEMO_USER.id : JSON.parse(localStorage.getItem('valmont_user') || '{}').id)), api('/api/student/profile')]); if (s.status === 'fulfilled') setScore(normalize(s.value, ['trustScore'])); if (p.status === 'fulfilled') setData(d => ({ ...d, profile: normalize(p.value, ['profile']) })); };
  useEffect(() => { load(); }, []);
  const upload = async () => { if (!file) return setToast('Choose an income image first'); const f = new FormData(); f.append('document', file); const r = await api('/api/trust-score/verify-income', { method: 'POST', body: f }); setData(d => ({ ...d, income: r })); };
  const compute = async () => { const r = await api('/api/trust-score/compute', { method: 'POST' }); setScore(normalize(r, ['trustScore'])); setData(d => ({ ...d, score: r })); };
  const student = async () => { const r = await api('/api/student/compute-score', { method: 'POST' }); setData(d => ({ ...d, student: r })); };
  return <><PageHeader eyebrow="YOU / IDENTITY" title="Identity & trust" description="Build a portable financial signal from verified income, transaction behavior and an on-chain attestation." right={<Button variant="secondary" onClick={load}>Refresh identity</Button>} /><div className="two-col"><Panel title="Evidence" kicker="INCOME VERIFICATION"><Field label="Income document"><input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0])} /></Field><Button onClick={upload}>Verify income</Button><JsonOutput data={data.income} /></Panel><Panel title="Trust score" kicker="ATTESTATION"><div className="metric-callout"><strong>{score?.score ?? '—'}</strong><span>current score</span></div><Button onClick={compute}>Compute + attest on Solana</Button><JsonOutput data={data.score} /></Panel></div><Panel title="Student starter identity" kicker="ALTERNATE ENTRY PATH"><div className="form-grid"><Field label="School"><input id="school" defaultValue={data.profile?.school_name || 'State University'} /></Field><Field label="Graduation year"><input id="grad" type="number" defaultValue={data.profile?.expected_grad_year || 2028} /></Field><Field label="Monthly allowance"><input id="allowance" type="number" defaultValue={data.profile?.monthly_allowance || 300} /></Field></div><Button onClick={async () => { await api('/api/student/profile', { method: 'POST', body: JSON.stringify({ schoolName: document.getElementById('school').value, expectedGradYear: Number(document.getElementById('grad').value), monthlyAllowance: Number(document.getElementById('allowance').value) }) }); await student(); }}>Save profile + compute</Button><JsonOutput data={data.student} /></Panel></>;
}

function Wallet({ token, setToast }) {
  const api = useApi(token, setToast), [balance, setBalance] = useState(DEMO_MODE ? DEMO.balance : null), [history, setHistory] = useState(DEMO_MODE ? DEMO.walletHistory.transactions : []), [crypto, setCrypto] = useState(DEMO_MODE ? DEMO.cryptoBalance : null), [gold, setGold] = useState(DEMO_MODE ? DEMO.goldBalance : null), [out, setOut] = useState({});
  const load = async () => { const rs = await Promise.allSettled([api('/api/wallet/balance'), api('/api/wallet/history'), api('/api/wallet/crypto/balance'), api('/api/wallet/gold/balance')]); if (rs[0].status === 'fulfilled') setBalance(rs[0].value); if (rs[1].status === 'fulfilled') setHistory(normalize(rs[1].value, ['transactions']) || []); if (rs[2].status === 'fulfilled') setCrypto(rs[2].value); if (rs[3].status === 'fulfilled') setGold(rs[3].value); };
  useEffect(() => { load(); }, []);
  const run = async (key, path, options) => { const r = await api(path, options); setOut(o => ({ ...o, [key]: r })); await load(); };
  return <><PageHeader eyebrow="YOU / WALLET" title="Your wallet" description="One spendable ledger, plus crypto and digital gold as separate asset balances." right={<Button variant="secondary" onClick={async () => { await run('create', '/api/wallet/create', { method: 'POST' }); }}>Create / refresh wallet</Button>} /><div className="stats-row"><Stat label="USD balance" value={money(balance?.balance)} sub="Spendable" /><Stat label="Savings vault" value={money(balance?.savingsVaultBalance)} sub="Protected balance" /><Stat label="SOL" value={Number(crypto?.cryptoBalance || 0).toFixed(3)} sub={money(crypto?.estimatedUsdValue)} /><Stat label="Gold" value={`${Number(gold?.goldGrams || 0).toFixed(2)} g`} sub={money(gold?.estimatedUsdValue)} /></div><div className="two-col"><Panel title="USD wallet" kicker="PRIMARY LEDGER"><div className="form-grid"><Field label="Recipient email"><input id="recipient" defaultValue="other-user@example.com" /></Field><Field label="Amount"><input id="sendamt" type="number" defaultValue="10" /></Field></div><Button onClick={() => run('transfer', '/api/wallet/transfer', { method: 'POST', body: JSON.stringify({ recipientEmail: document.getElementById('recipient').value, amount: Number(document.getElementById('sendamt').value) }) })}>Send money</Button><div className="form-grid"><Field label="Vault deposit"><input id="vault" type="number" defaultValue="20" /></Field></div><Button variant="secondary" onClick={() => run('vault', '/api/wallet/vault/deposit', { method: 'POST', body: JSON.stringify({ amount: Number(document.getElementById('vault').value) }) })}>Move to vault</Button><JsonOutput data={out.transfer || out.vault || out.create} /></Panel><AssetPanel title="Solana" asset="SOL" run={run} crypto={crypto} /><AssetPanel title="Digital gold" asset="XAU_GRAM" run={run} gold={gold} /></div><Panel title="Recent ledger" kicker="TIMESCALE-BACKED HISTORY"><div className="ledger-table">{history.slice(0, 6).map((tx, i) => <div className="ledger-row" key={tx.id || `${tx.createdAt}-${i}`}><span>{tx.type || tx.channel || 'transaction'}</span><span>{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '—'}</span><strong>{money(tx.amount)}</strong></div>)}</div></Panel></>;
}
function AssetPanel({ title, asset, run, crypto, gold }) { const isGold = Boolean(gold); const prefix = isGold ? 'gold' : 'crypto'; return <Panel title={title} kicker={`${asset} / ASSET`}><div className="asset-mark">{isGold ? 'Au' : '◎'}</div><div className="split-row"><span>Balance</span><span>{isGold ? `${Number(gold?.goldGrams || 0).toFixed(3)} g` : `${Number(crypto?.cryptoBalance || 0).toFixed(3)} SOL`}</span></div><div className="button-row"><Button onClick={() => run(`${prefix}buy`, `/api/wallet/${prefix}/buy`, { method: 'POST', body: JSON.stringify({ usdAmount: 50 }) })}>Buy {isGold ? 'gold' : 'SOL'}</Button><Button variant="secondary" onClick={() => run(`${prefix}sell`, `/api/wallet/${prefix}/sell`, { method: 'POST', body: JSON.stringify(isGold ? { goldGrams: 0.1 } : { cryptoAmount: 0.1 }) })}>Sell</Button><Button variant="secondary" onClick={() => run(`${prefix}quote`, `/api/wallet/${prefix}/quote`, { method: 'POST', body: JSON.stringify(isGold ? { side: 'buy', usdAmount: 50 } : { side: 'buy', usdAmount: 50 }) })}>Quote</Button></div></Panel>; }

function Invest({ token, setToast }) {
  const api = useApi(token, setToast);
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const loadHistory = async () => { const r = await api('/api/advisory/history'); setHistory(r.history || []); };
  useEffect(() => { loadHistory(); }, []);
  const generate = async () => { const r = await api('/api/advisory/recommend', { method: 'POST', body: JSON.stringify({ riskTolerance: document.getElementById('risk').value, goal: document.getElementById('goal').value, horizonMonths: Number(document.getElementById('horizon').value) }) }); setData(r); setHistory(h => [r.advice, ...h].filter(Boolean).slice(0, 8)); };
  const advice = normalize(data, ['advice']) || {};
  const allocation = advice.allocation;
  const goalFraming = advice.goal_framing || advice.goalFraming || data?.goalFraming;
  return <>
    <PageHeader eyebrow="YOU / INVESTMENTS" title="Invest with context." description="A six-bucket allocation generated from your risk tolerance, goal and horizon, with an illustrative goal framing." right={<Button variant="secondary" onClick={loadHistory}>Refresh history</Button>} />
    <Panel title="Investor profile" kicker="RECOMMENDATION"><div className="form-grid"><Field label="Risk tolerance"><select id="risk"><option>low</option><option>medium</option><option>high</option></select></Field><Field label="Goal"><input id="goal" defaultValue="wedding" /></Field><Field label="Horizon (months)"><input id="horizon" type="number" defaultValue="12" /></Field></div><Button onClick={generate}>Generate allocation</Button></Panel>
    {data && <div className="two-col"><Panel title="Allocation" kicker="SIX BUCKETS"><Allocation data={allocation} /><JsonOutput data={advice.explanation} /></Panel><Panel title="Goal framing" kicker="ILLUSTRATIVE ESTIMATE"><div className="metric-callout"><strong>{goalFraming?.projectedTotal != null ? money(goalFraming.projectedTotal) : '—'}</strong><span>projected total</span></div><div className="split-row"><span>Monthly contribution</span><span>{money(goalFraming?.monthlyContribution)}</span></div><div className="split-row"><span>Assumed annual return</span><span>{goalFraming?.assumedAnnualReturnPct != null ? `${goalFraming.assumedAnnualReturnPct}%` : '—'}</span></div><p className="muted">Educational estimate only — fixed assumptions, not a guarantee.</p><JsonOutput data={goalFraming} /></Panel></div>}
    <Panel title="Recommendation history" kicker="PERSISTED BY BACKEND"><div className="list-stack">{history.slice(0, 6).map((h, i) => <div className="list-row" key={h.id || i}><div><strong>{h.goal || 'Investment recommendation'}</strong><small>{h.risk_tolerance || '—'} · {h.horizon_months || '—'} months · {h.mocked ? 'mocked' : 'live'}</small></div><span className="status-pill positive">stored</span></div>)}</div></Panel>
  </>;
}
function Allocation({ data }) { if (!data) return <p className="muted">No allocation returned.</p>; return <div className="allocation">{Object.entries(data).filter(([k]) => k.toLowerCase().endsWith('pct')).map(([k, v]) => <div className="allocation-row" key={k}><span>{k.replace('Pct', '')}</span><div className="bar"><i style={{ width: `${Math.max(0, Number(v))}%` }} /></div><strong>{v}%</strong></div>)}</div>; }

function Insurance({ token, setToast }) { const api = useApi(token, setToast), [quote, setQuote] = useState(DEMO_MODE ? DEMO.insuranceQuote : null), [policies, setPolicies] = useState(DEMO_MODE ? DEMO.insuranceMine.policies : []), [claim, setClaim] = useState(null); const load = async () => { const r = await api('/api/insurance/mine'); setPolicies(normalize(r, ['policies']) || []); }; useEffect(() => { load(); }, []); const quoteIt = async () => setQuote(await api('/api/insurance/quote', { method: 'POST', body: JSON.stringify({ policyType: document.getElementById('ptype').value, coverageAmount: Number(document.getElementById('coverage').value) }) })); const purchase = async () => { await api('/api/insurance/purchase', { method: 'POST', body: JSON.stringify({ policyType: document.getElementById('ptype').value, coverageAmount: Number(document.getElementById('coverage').value) }) }); await load(); }; const fileClaim = async id => setClaim(await api(`/api/insurance/${id}/claim`, { method: 'POST', body: JSON.stringify({ claimAmount: 100 }) })); return <><PageHeader eyebrow="YOU / PROTECTION" title="Insurance" description="See how the shared trust score changes the premium lens without creating a second risk model." /><div className="stats-row"><Stat label="Trust score" value={quote?.score ?? '—'} sub="Shared core signal" /><Stat label="Multiplier" value={quote?.premiumMultiplier != null ? `${quote.premiumMultiplier}×` : '—'} sub="Premium lens" /><Stat label="Monthly premium" value={quote?.monthlyPremium != null ? money(quote.monthlyPremium) : '—'} sub="Illustrative quote" /></div><Panel title="Get a quote" kicker="POLICY"><div className="form-grid"><Field label="Policy type"><select id="ptype"><option>health</option><option>device</option><option>income-protection</option></select></Field><Field label="Coverage amount"><input id="coverage" type="number" defaultValue="400" /></Field></div><div className="button-row"><Button onClick={quoteIt}>Quote policy</Button><Button variant="secondary" onClick={purchase}>Purchase</Button><Button variant="secondary" onClick={load}>Refresh policies</Button></div><JsonOutput data={quote} /></Panel><Panel title="Active policies" kicker="PROTECTION"><div className="list-stack">{policies.map(p => <div className="list-row" key={p.id}><div><strong>{p.policy_type}</strong><small>{money(p.coverage_amount)} cover · {p.status}</small></div><Button variant="secondary" onClick={() => fileClaim(p.id)}>File ₹100 claim</Button></div>)}</div><JsonOutput data={claim} /></Panel></>; }

function Remit({ token, setToast }) { const api = useApi(token, setToast), [corridors, setCorridors] = useState([]), [data, setData] = useState(DEMO_MODE ? DEMO.remittanceQuote : null), [mine, setMine] = useState(DEMO_MODE ? DEMO.remittanceMine.remittances : []); const load = async () => { const [c, m] = await Promise.allSettled([api('/api/remittance/corridors'), api('/api/remittance/mine')]); if (c.status === 'fulfilled') setCorridors(normalize(c.value, ['supportedDestCurrencies']) || []); if (m.status === 'fulfilled') setMine(normalize(m.value, ['remittances']) || []); }; useEffect(() => { load(); }, []); const quote = async () => setData(await api('/api/remittance/quote', { method: 'POST', body: JSON.stringify({ destCurrency: document.getElementById('rcurrency').value, sourceAmountUsd: Number(document.getElementById('ramount').value) }) })); const send = async () => { setData(await api('/api/remittance/send', { method: 'POST', body: JSON.stringify({ recipientName: document.getElementById('rname').value, destCountry: document.getElementById('rcountry').value, destCurrency: document.getElementById('rcurrency').value, sourceAmountUsd: Number(document.getElementById('ramount').value) }) })); await load(); }; return <><PageHeader eyebrow="YOU / REMITTANCES" title="Move money across borders." description="Transparent corridor quotes with fee and FX details before a send is committed." /><div className="stats-row"><Stat label="Supported corridors" value={corridors.length || 5} sub="FX destinations" /><Stat label="Last quote" value={data?.destCurrency || '—'} sub="Destination currency" /><Stat label="Fee" value={data?.feeUsd != null ? money(data.feeUsd) : '—'} sub="Quote fee" /></div><Panel title="New transfer" kicker="REMITTANCE"><div className="form-grid"><Field label="Recipient"><input id="rname" defaultValue="Priya Sharma" /></Field><Field label="Country"><input id="rcountry" defaultValue="India" /></Field><Field label="Currency"><select id="rcurrency">{(corridors.length ? corridors : DEMO.corridors.supportedDestCurrencies).map(c => <option key={c}>{c}</option>)}</select></Field><Field label="USD amount"><input id="ramount" type="number" defaultValue="50" /></Field></div><div className="button-row"><Button onClick={quote}>Preview quote</Button><Button variant="secondary" onClick={send}>Send transfer</Button><Button variant="secondary" onClick={load}>Refresh history</Button></div><JsonOutput data={data} /></Panel><Panel title="Recent remittances" kicker="LEDGER"><div className="list-stack">{mine.slice(0, 5).map(r => <div className="list-row" key={r.id}><div><strong>{r.recipient_name}</strong><small>{r.dest_currency} · {money(r.source_amount_usd)} → {money(r.dest_amount)}</small></div><span className="status-pill positive">posted</span></div>)}</div></Panel></>; }

function Learn({ token, setToast, user }) {
  const api = useApi(token, setToast), [data, setData] = useState({}), [history, setHistory] = useState({ tutorial: [], qa: [], plan: [] });
  const load = async () => {
    const r = await Promise.allSettled([api('/api/education/tutorial/history'), api('/api/education/qa/history'), api('/api/education/learning-plan/history')]);
    if (r[0].status === 'fulfilled') setHistory(h => ({ ...h, tutorial: r[0].value.history || [] }));
    if (r[1].status === 'fulfilled') setHistory(h => ({ ...h, qa: r[1].value.history || [] }));
    if (r[2].status === 'fulfilled') setHistory(h => ({ ...h, plan: r[2].value.history || [] }));
  };
  useEffect(() => { load(); }, []);
  const meta = user?.tierMeta || DEMO.authTiers.tiers.find(t => t.id === user?.customerTier) || {};
  const tierPersona = user?.customerTier === 'students' ? 'student'
    : user?.customerTier === 'hackers' ? 'curious technologist'
    : user?.customerTier?.includes('merchant') ? 'merchant operator'
    : user?.customerTier === 'banks' ? 'bank risk analyst'
    : user?.customerTier === 'organizations' ? 'enterprise people-ops lead'
    : 'salaried professional';
  return <><PageHeader eyebrow="YOU / LEARNING" title="Learn finance at your pace." description={meta.aiAssistance || `Tutorials, Q&A and a short learning plan — personalized for ${user?.customerTier ? user.customerTier.replace(/_/g, ' ') : 'your path'}, with optional ElevenLabs narration.`} /><div className="two-col"><Panel title="Tutorial" kicker="AI · GEMINI → GROQ"><Field label="Topic"><input id="topic" defaultValue="how compound interest works" /></Field><div className="form-grid"><Field label="Persona"><select id="persona" defaultValue={tierPersona}><option>gig worker</option><option>student</option><option>salaried professional</option><option>curious technologist</option><option>merchant operator</option><option>bank risk analyst</option><option>enterprise people-ops lead</option></select></Field><Field label="Language"><input id="language" defaultValue="English" /></Field></div><label className="check"><input id="audio" type="checkbox" /> Narrate with ElevenLabs</label><Button onClick={async () => { const __r = await api('/api/education/tutorial', { method: 'POST', body: JSON.stringify({ topic: document.getElementById('topic').value, persona: document.getElementById('persona').value, language: document.getElementById('language').value, withAudio: document.getElementById('audio').checked }) }); setData(d => ({ ...d, tutorial: __r })); }}>Generate tutorial</Button></Panel><Panel title="Ask a question" kicker="LIVE GUIDANCE"><Field label="Question"><textarea id="question" defaultValue="What is an emergency fund?" /></Field><Button onClick={async () => { const __r = await api('/api/education/qa', { method: 'POST', body: JSON.stringify({ question: document.getElementById('question').value }) }); setData(d => ({ ...d, qa: __r })); }}>Ask</Button></Panel></div><Panel title="Your learning plan" kicker="TIER-PACED"><div className="form-grid"><Field label="Goal"><input id="learnGoal" defaultValue="build a 3-month emergency fund" /></Field><Field label="Weeks"><input id="learnWeeks" type="number" defaultValue="4" /></Field></div><Button onClick={async () => { const __r = await api('/api/education/learning-plan', { method: 'POST', body: JSON.stringify({ persona: document.getElementById('persona')?.value || tierPersona, goal: document.getElementById('learnGoal').value, horizonWeeks: Number(document.getElementById('learnWeeks').value) }) }); setData(d => ({ ...d, plan: __r })); }}>Build plan</Button><JsonOutput data={data.plan || data.qa || data.tutorial} /></Panel><div className="two-col"><Panel title="Tutorial history" kicker="SAVED OUTPUTS"><JsonOutput data={history.tutorial.slice(0, 3)} /></Panel><Panel title="Q&A + plans" kicker="SAVED OUTPUTS"><JsonOutput data={{ qa: history.qa.slice(0, 2), plans: history.plan.slice(0, 2) }} /></Panel></div></>;
}

function ModelTraining({ token, setToast }) {
  const api = useApi(token, setToast);
  const [models, setModels] = useState(DEMO_MODE ? DEMO.mlModels.models : []);
  const [features, setFeatures] = useState(DEMO_MODE ? DEMO.mlFeatures.features : null);
  const [runs, setRuns] = useState(DEMO_MODE ? DEMO.mlRuns.runs : []);
  const [last, setLast] = useState(null);
  const load = async () => {
    const r = await Promise.allSettled([api('/api/ml/models'), api('/api/ml/features'), api('/api/ml/runs')]);
    if (r[0].status === 'fulfilled') setModels(r[0].value.models || []);
    if (r[1].status === 'fulfilled') setFeatures(r[1].value.features);
    if (r[2].status === 'fulfilled') setRuns(r[2].value.runs || []);
  };
  useEffect(() => { if (!DEMO_MODE) load(); }, []);
  const train = async (modelKey) => {
    const r = await api('/api/ml/train', { method: 'POST', body: JSON.stringify({ modelKey, epochs: 8 }) });
    setLast(r);
    await load();
  };
  return <>
    <PageHeader eyebrow="AI LAB / TRAINING" title="Train on live features." description="Hackathon-honest model training: calibrate trust, fraud, spend and advisory models from the same Postgres ledger judges can inspect." right={<Button variant="secondary" onClick={load}>Refresh lab</Button>} />
    <div className="stats-row"><Stat label="Samples" value={features?.sampleSize ?? '—'} sub="Feature window" /><Stat label="Users" value={features?.userCount ?? '—'} sub="In workspace DB" /><Stat label="Avg trust" value={features?.avgTrustScore != null ? Number(features.avgTrustScore).toFixed(1) : '—'} sub="Calibration prior" /><Stat label="Fraud clean" value={features?.avgFraudCleanRatio != null ? pct(features.avgFraudCleanRatio * 100) : '—'} sub="Signal prior" /></div>
    <Panel title="Model catalog" kicker="SELECT + TRAIN"><div className="list-stack">{models.map(m => <div className="list-row" key={m.key}><div><strong>{m.name}</strong><small>{m.description}</small></div><Button onClick={() => train(m.key)}>Train</Button></div>)}</div></Panel>
    <div className="two-col"><Panel title="Latest run" kicker="OUTPUT"><JsonOutput data={last || runs[0]} /></Panel><Panel title="Run history" kicker="PERSISTED"><div className="list-stack">{runs.slice(0, 6).map(r => <div className="list-row" key={r.id}><div><strong>{r.model_key}</strong><small>{r.status} · {r.epochs} epochs</small></div><span className="status-pill positive">stored</span></div>)}</div></Panel></div>
  </>;
}

function DsApplications({ token, setToast }) {
  const api = useApi(token, setToast);
  const [apps, setApps] = useState(DEMO_MODE ? DEMO.dsApps.applications : []);
  const [result, setResult] = useState(DEMO_MODE ? DEMO.dsRun : null);
  const [runs, setRuns] = useState([]);
  const load = async () => {
    const r = await Promise.allSettled([api('/api/ds/applications'), api('/api/ds/runs')]);
    if (r[0].status === 'fulfilled') setApps(r[0].value.applications || []);
    if (r[1].status === 'fulfilled') setRuns(r[1].value.runs || []);
  };
  useEffect(() => { if (!DEMO_MODE) load(); }, []);
  const runApp = async (id) => {
    const r = await api(`/api/ds/applications/${id}/run`);
    setResult(r);
    await load();
  };
  return <>
    <PageHeader eyebrow="AI LAB / DATA SCIENCE" title="DS applications on the same engine." description="Fraud windows, multi-lens risk, spend forecasting, portfolio risk and merchant revenue — live analytics, not slideware." right={<Button variant="secondary" onClick={load}>Refresh apps</Button>} />
    <div className="lens-grid dense">{apps.map(a => <button type="button" key={a.id} className="lens-card" onClick={() => runApp(a.id)}><span className="accent teal" /><div><span className="eyebrow">{a.category}</span><h3>{a.name}</h3><p className="muted" style={{ marginTop: 6 }}>{a.description}</p></div><span className="arrow">▶</span></button>)}</div>
    <div className="two-col"><Panel title="Latest application result" kicker="LIVE RUN"><JsonOutput data={result} /></Panel><Panel title="Recent runs" kicker="HISTORY"><div className="list-stack">{runs.slice(0, 6).map(r => <div className="list-row" key={r.id}><div><strong>{r.application_id}</strong><small>{new Date(r.created_at).toLocaleString()}</small></div><span className="status-pill positive">ok</span></div>)}</div></Panel></div>
  </>;
}


function Budget({ token, setToast }) { const api = useApi(token, setToast), [goal, setGoal] = useState(DEMO_MODE ? DEMO.budgetGoal : null), [nudge, setNudge] = useState(DEMO_MODE ? DEMO.budgetNudge : null), [trend, setTrend] = useState(DEMO_MODE ? DEMO.spendTrend : null); const load = async () => { const r = await Promise.allSettled([api('/api/budget/goal'), api('/api/budget/nudge'), api('/api/budget/spend-trend?weeks=4')]); if (r[0].status === 'fulfilled') setGoal(r[0].value); if (r[1].status === 'fulfilled') setNudge(r[1].value); if (r[2].status === 'fulfilled') setTrend(r[2].value); }; useEffect(() => { load(); }, []); const target = goal?.goal?.target_savings_pct ?? goal?.defaultTargetSavingsPct ?? 20; return <><PageHeader eyebrow="YOU / BUDGETING" title="Know where the month is going." description="Rules-based nudges from verified income and the same Timescale transaction history used for fraud signals." /><div className="stats-row"><Stat label="Target" value={`${target}%`} sub="Savings goal" /><Stat label="Projected" value={nudge ? `${Number(nudge.projectedSavingsPct).toFixed(1)}%` : '—'} sub="Current savings rate" /><Stat label="Status" value={nudge?.status || '—'} sub="Rules-based signal" /><Stat label="30d spend" value={nudge?.monthlySpend != null ? money(nudge.monthlySpend) : '—'} sub="Wallet outflow" /></div><Panel title="Savings goal" kicker="SET A TARGET"><div className="form-grid"><Field label="Target savings %"><input id="target" type="number" defaultValue={target} /></Field></div><div className="button-row"><Button onClick={async () => { setGoal(await api('/api/budget/goal', { method: 'POST', body: JSON.stringify({ targetSavingsPct: Number(document.getElementById('target').value) }) })); }}>Save goal</Button><Button variant="secondary" onClick={async () => setNudge(await api('/api/budget/nudge'))}>Get nudge</Button><Button variant="secondary" onClick={async () => setTrend(await api('/api/budget/spend-trend?weeks=4'))}>View trend</Button></div><JsonOutput data={nudge || goal || trend} /></Panel>{trend?.trend && <Panel title="Weekly spend" kicker="TIMESCALE WINDOW"><TrendList items={trend.trend} valueKey="spend" /></Panel>}</>; }

function Loans({ token, setToast, user }) { const api = useApi(token, setToast), [data, setData] = useState({}), [mine, setMine] = useState([]), [market, setMarket] = useState([]); const load = async () => { const r = await Promise.allSettled([api('/api/loans/mine'), user?.role === 'lender' ? api('/api/loans/marketplace') : Promise.reject()]); if (r[0].status === 'fulfilled') setMine(normalize(r[0].value, ['loans']) || []); if (r[1].status === 'fulfilled') setMarket(normalize(r[1].value, ['pendingLoans']) || []); }; useEffect(() => { load(); }, [user?.role]); const request = async () => { const __r = await api('/api/loans/request', { method: 'POST', body: JSON.stringify({ amount: Number(document.getElementById('loanAmt').value), termMonths: Number(document.getElementById('loanTerm').value) }) }); setData(d => ({ ...d, request: __r })); }; const detail = async id => { const __r = await api(`/api/loans/${id}`); setData(d => ({ ...d, detail: __r })); }; const repay = async id => { const __r = await api(`/api/loans/${id}/repay`, { method: 'POST', body: JSON.stringify({ amount: 100 }) }); setData(d => ({ ...d, repay: __r })); }; const fund = async id => { const __r = await api(`/api/loans/${id}/fund`, { method: 'POST' }); setData(d => ({ ...d, fund: __r })); }; return <><PageHeader eyebrow="LENDING / MARKETPLACE" title="Borrow or fund." description="Loan eligibility and pricing reuse the latest trust score; repayment behavior feeds back into the transaction signal." /><div className="two-col"><Panel title="Request a loan" kicker="BORROWER"><div className="form-grid"><Field label="Amount"><input id="loanAmt" type="number" defaultValue="300" /></Field><Field label="Term (months)"><input id="loanTerm" type="number" defaultValue="6" /></Field></div><Button onClick={request}>Request loan</Button><JsonOutput data={data.request} /></Panel><Panel title="My loans" kicker="BORROWER"><div className="list-stack">{mine.map(l => <div className="list-row" key={l.id}><div><strong>{money(l.principal || l.requested_amount)} · {l.status}</strong><small>{l.id}</small></div><div className="button-row compact"><Button variant="secondary" onClick={() => detail(l.id)}>Detail</Button>{l.status === 'funded' && <Button variant="secondary" onClick={() => repay(l.id)}>Repay</Button>}</div></div>)}</div><JsonOutput data={data.detail || data.repay} /></Panel></div>{user?.role === 'lender' && <Panel title="Pending marketplace" kicker="LENDER ROLE"><div className="list-stack">{market.map(l => <div className="list-row" key={l.id}><div><strong>{money(l.principal || l.requested_amount)}</strong><small>{l.term_months} mo · {l.rate_pct}%</small></div><Button onClick={() => fund(l.id)}>Fund loan</Button></div>)}</div><JsonOutput data={data.fund} /></Panel>}</>; }

function Lender({ token, setToast }) { const api = useApi(token, setToast), [portfolio, setPortfolio] = useState(DEMO_MODE ? DEMO.lenderPortfolio.portfolio : null), [risk, setRisk] = useState(null); const load = async () => setPortfolio(normalize(await api('/api/lender/portfolio'), ['portfolio'])); useEffect(() => { load(); }, []); return <><PageHeader eyebrow="LENDING / LENDER" title="Portfolio risk, not another score." description="The lender lens translates the shared trust score into expected-loss exposure and portfolio analytics." right={<Button variant="secondary" onClick={load}>Refresh portfolio</Button>} /><div className="stats-row"><Stat label="Portfolio" value={money(portfolio?.totalFunded)} sub="Funded principal" /><Stat label="Outstanding" value={money(portfolio?.totalOutstanding ?? portfolio?.outstanding)} sub="Current exposure" /><Stat label="Expected loss" value={portfolio?.weightedAvgExpectedLossPct != null ? pct(portfolio.weightedAvgExpectedLossPct) : '—'} sub="Weighted average" /><Stat label="Loans" value={portfolio?.loanCount ?? 0} sub="Across statuses" /></div><Panel title="Borrower risk view" kicker="LOOK UP A BORROWER"><Field label="Borrower user ID"><input id="borrower" placeholder="user id" /></Field><Button onClick={async () => setRisk(await api(`/api/lender/risk/${document.getElementById('borrower').value}`))}>View risk</Button><JsonOutput data={risk} /></Panel><Panel title="Status distribution" kicker="PORTFOLIO"><div className="lens-grid dense">{Object.entries(portfolio?.countByStatus || {}).map(([k, v]) => <div className="lens-card" key={k}><div><span className="eyebrow">{k}</span><h3>{v}</h3></div></div>)}</div></Panel></>; }

function Merchant({ token, setToast }) { const api = useApi(token, setToast), [profile, setProfile] = useState(DEMO_MODE ? DEMO.merchantProfile.profile : null), [health, setHealth] = useState(DEMO_MODE ? DEMO.merchantHealth.businessHealth : null), [trend, setTrend] = useState(DEMO_MODE ? DEMO.revenueTrend.weeklyRevenueTrend : []); const load = async () => { const r = await Promise.allSettled([api('/api/merchant/profile'), api('/api/merchant/health'), api('/api/merchant/revenue-trend?weeks=4')]); if (r[0].status === 'fulfilled') setProfile(normalize(r[0].value, ['profile'])); if (r[1].status === 'fulfilled') setHealth(normalize(r[1].value, ['businessHealth'])); if (r[2].status === 'fulfilled') setTrend(normalize(r[2].value, ['weeklyRevenueTrend']) || []); }; useEffect(() => { if (!DEMO_MODE) load(); }, []); return <><PageHeader eyebrow="BUSINESS / MERCHANT" title="A business-health lens on the same engine." description="Revenue trend + trust signal become a compact operating view for a merchant." /><div className="stats-row"><Stat label="Health" value={health?.ratingLabel || '—'} sub="Shared-score lens" /><Stat label="Revenue" value={health?.monthlyRevenue != null ? money(health.monthlyRevenue) : '—'} sub="Trailing 30d" /><Stat label="Credit line" value={health?.recommendedCreditLineUsd != null ? money(health.recommendedCreditLineUsd) : '—'} sub="Explainable recommendation" /><Stat label="Category" value={profile?.category || '—'} sub={profile?.business_name || 'Business'} /></div><Panel title="Business profile" kicker="SELF-DECLARED"><div className="form-grid"><Field label="Business name"><input id="biz" defaultValue={profile?.business_name || 'Corner Store'} /></Field><Field label="Category"><select id="cat"><option>retail</option><option>food</option><option>services</option><option>other</option></select></Field></div><div className="button-row"><Button onClick={async () => { await api('/api/merchant/profile', { method: 'POST', body: JSON.stringify({ businessName: document.getElementById('biz').value, category: document.getElementById('cat').value }) }); await load(); }}>Save profile</Button><Button variant="secondary" onClick={load}>Refresh health</Button></div></Panel><Panel title="Revenue trend" kicker="TIMESCALE INBOUND"><TrendList items={trend} valueKey="revenue" /></Panel></>; }

function Enterprise({ token, setToast }) { const api = useApi(token, setToast), [profile, setProfile] = useState(DEMO_MODE ? DEMO.enterpriseProfile.profile : null), [workforce, setWorkforce] = useState(DEMO_MODE ? DEMO.enterpriseWorkforce.workforce : null), [link, setLink] = useState(null); const load = async () => { const r = await Promise.allSettled([api('/api/enterprise/profile'), api('/api/enterprise/workforce')]); if (r[0].status === 'fulfilled') setProfile(normalize(r[0].value, ['profile'])); if (r[1].status === 'fulfilled') setWorkforce(normalize(r[1].value, ['workforce'])); }; useEffect(() => { if (!DEMO_MODE) load(); }, []); return <><PageHeader eyebrow="BUSINESS / ENTERPRISE" title="Workforce, seen through the same signal." description="Employer profile, employee self-link and a workforce rollup with score distribution and loan exposure." right={<Button variant="secondary" onClick={load}>Refresh workforce</Button>} /><div className="stats-row"><Stat label="Headcount" value={workforce?.headcount ?? '—'} sub="Linked employees" /><Stat label="Scored" value={workforce?.scoredCount ?? '—'} sub="Employees with signal" /><Stat label="Average trust" value={workforce?.avgTrustScore ?? '—'} sub="Same trust engine" /><Stat label="Outstanding" value={workforce?.loanPortfolio?.totalOutstanding != null ? money(workforce.loanPortfolio.totalOutstanding) : '—'} sub="Loan exposure" /></div><Panel title="Organization" kicker="EMPLOYER"><Field label="Organization name"><input id="org" defaultValue={profile?.organization_name || 'Acme Corp'} /></Field><div className="button-row"><Button onClick={async () => { await api('/api/enterprise/profile', { method: 'POST', body: JSON.stringify({ organizationName: document.getElementById('org').value }) }); await load(); }}>Save organization</Button></div></Panel><Panel title="Rating distribution" kicker="WORKFORCE"><div className="lens-grid dense">{Object.entries(workforce?.ratingDistribution || {}).map(([k, v]) => <div className="lens-card" key={k}><div><span className="eyebrow">{k}</span><h3>{v}</h3></div></div>)}</div></Panel><Panel title="Employee self-link" kicker="INDIVIDUAL"><Field label="Organization name"><input id="employeeOrg" defaultValue="Acme Corp" /></Field><Button onClick={async () => setLink(await api('/api/enterprise/employee-link', { method: 'POST', body: JSON.stringify({ organizationName: document.getElementById('employeeOrg').value }) }))}>Link me to organization</Button><JsonOutput data={link} /></Panel></>; }

createRoot(document.getElementById('root')).render(<App />);
