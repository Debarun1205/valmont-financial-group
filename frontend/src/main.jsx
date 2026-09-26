import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import LandingPage from './LandingPage.jsx';
import './styles.css';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const API = import.meta.env.VITE_API_URL || 'https://valmont-financial-group-vsxz.onrender.com';
const DEMO_MODE = false;
const DEMO_USER = { id: 'demo-user-001', email: 'demo@valmont.local', role: 'individual' };

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
    { key: 'advisory-allocator', name: 'Advisory allocator fidelity', description: 'Allocation sanity checks.', dataSources: ['investment_advice'] },
    { key: 'loan-loss-predictor', name: 'Random Forest Risk Analysis', description: 'Predicts default probability and expected loss.', dataSources: ['trust_scores', 'transactions'] }
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
    { id: 'students', label: 'Students & early earners', welcome: 'You belong here.' },
    { id: 'career_professionals', label: 'Career professionals', welcome: 'Welcome.' },
    { id: 'small_merchant', label: 'Small merchants & shops', welcome: 'You are welcome here.' },
    { id: 'big_merchants', label: 'Growing merchants', welcome: 'Welcome.' },
    { id: 'banks', label: 'Bank & lending partners', welcome: 'Welcome.' },
    { id: 'organizations', label: 'Organizations & enterprises', welcome: 'Glad you are here.' },
    { id: 'hackers', label: 'Builders & security-minded explorers', welcome: 'Welcome, builder.' }
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
    '/api/auth/config': { googleClientId: '', googleEnabled: false },
    '/api/auth/google': { user: { ...DEMO_USER, customerTier: null, needsOnboarding: true, displayName: 'Demo' }, token: 'demo-token', welcome: 'Welcome — a few gentle questions next.' },
    '/api/auth/me': { user: { ...DEMO_USER, customerTier: 'career_professionals', displayName: 'Demo' }, tierMeta: DEMO.authTiers.tiers[1] },
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
  { group: 'You', items: [['identity', 'Identity & trust', '◎'], ['wallet', 'Wallet', '◈'], ['invest', 'Investments', '↗'], ['insurance', 'Insurance', '◇'], ['remit', 'Remittances', '⇄'], ['learn', 'Financial learning', '∿'], ['budget', 'Budgeting', '≋'], ['family', 'Family Finance', '👪']] },
  { group: 'Lending', items: [['loans', 'Loan marketplace', '₿'], ['lender', 'Lender dashboard', '▤']] },
  { group: 'Business', items: [['merchant', 'Merchant health', '▦'], ['enterprise', 'Enterprise view', '▥']] },
  { group: 'AI Lab', items: [['ml', 'Model training', '⚙'], ['ds', 'DS applications', 'Σ'], ['stock', 'Stock Predictor', '📈']] },
];

const moduleMeta = {
  identity: ['Identity & trust', 'One portable score, backed by evidence.', 'teal'], wallet: ['Wallet', 'Fiat, SOL and digital gold in one ledger.', 'violet'], invest: ['Investments', 'Goal-based allocation across six asset classes.', 'gold'], insurance: ['Insurance', 'A trust-score lens for policy pricing.', 'teal'], remit: ['Remittances', 'Quote and send across supported corridors.', 'orange'], learn: ['Financial learning', 'AI-guided education at your pace.', 'blue'], budget: ['Budgeting', 'A simple view of spend, savings and runway.', 'orange'], family: ['Family Finance', 'Family companion.', 'violet'], loans: ['Loan marketplace', 'Borrow and fund from the same trust engine.', 'violet'], lender: ['Lender dashboard', 'Portfolio exposure and borrower risk.', 'teal'], merchant: ['Merchant health', 'Business health from the same signal.', 'gold'], enterprise: ['Enterprise view', 'A workforce lens on financial health.', 'blue'], ml: ['Model training', 'Calibrate trust, fraud and advisory models on live features.', 'violet'], ds: ['DS applications', 'Fraud windows, lenses, spend and portfolio analytics.', 'teal']
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

function initialView() {
  if (DEMO_MODE) return 'app';
  const t = localStorage.getItem('valmont_token');
  if (t === 'demo-token') {
    localStorage.removeItem('valmont_token');
    localStorage.removeItem('valmont_user');
    localStorage.removeItem('valmont_tier');
    return 'landing';
  }
  const u = JSON.parse(localStorage.getItem('valmont_user') || 'null');
  if (t && u?.customerTier) return 'app';
  if (t && u) return 'onboard';
  return 'landing';
}

function persistSession(token, user, extra = {}) {
  if (token) localStorage.setItem('valmont_token', token);
  if (user) localStorage.setItem('valmont_user', JSON.stringify(user));
  if (extra.tierMeta) localStorage.setItem('valmont_tier', JSON.stringify(extra.tierMeta));
}

function App() {
  const [page, setPage] = useState('overview');
  const [view, setView] = useState(initialView);
  const _initToken = localStorage.getItem('valmont_token') === 'demo-token' ? '' : (localStorage.getItem('valmont_token') || '');
  const _initUser = localStorage.getItem('valmont_token') === 'demo-token' ? null : JSON.parse(localStorage.getItem('valmont_user') || 'null');
  const [token, setToken] = useState(DEMO_MODE ? 'demo-token' : _initToken);
  const [user, setUser] = useState(DEMO_MODE ? { ...DEMO_USER, customerTier: 'career_professionals', displayName: 'Demo' } : _initUser);
  const [tierMeta, setTierMeta] = useState(() => JSON.parse(localStorage.getItem('valmont_tier') || 'null'));
  const [toast, setToast] = useState('');
  const [apiOnline, setApiOnline] = useState(null);
  useEffect(() => { if (DEMO_MODE) { setApiOnline(true); return; } fetch(`${API}/health`).then(r => r.ok ? r.json() : Promise.reject()).then(() => setApiOnline(true)).catch(() => setApiOnline(false)); }, []);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 3200); return () => clearTimeout(id); }, [toast]);
  const logout = () => {
    localStorage.removeItem('valmont_token');
    localStorage.removeItem('valmont_user');
    localStorage.removeItem('valmont_tier');
    setToken(''); setUser(null); setTierMeta(null); setPage('overview'); setView('landing'); setToast('Signed out — come back anytime.');
  };
  const onAuth = data => {
    if (!data?.token) return;
    const nextUser = data.user || null;
    const nextMeta = data.tierMeta || data.classification || null;
    setToken(data.token);
    setUser(nextUser);
    if (nextMeta) setTierMeta(nextMeta);
    persistSession(data.token, nextUser, { tierMeta: nextMeta });
    const welcome = data.classification?.welcome || data.welcome;
    setToast(welcome || 'Welcome in.');
    if (nextUser?.customerTier) setView('app');
    else setView('onboard');
  };
  const onOnboarded = data => {
    onAuth(data);
    setView('app');
    setPage('overview');
  };

  if (view === 'landing') {
    return <LandingPage onStart={() => setView('auth')} />;
  }

  if (view !== 'app') {
    return (
      <div className="public-shell">
        <PublicNav view={view} onHome={() => setView('landing')} onAuth={() => setView('auth')} apiOnline={apiOnline} />
        {view === 'auth' && <AuthPage onAuth={onAuth} setToast={setToast} onBack={() => setView('landing')} />}
        {view === 'onboard' && <OnboardingQuiz token={token} user={user} onDone={onOnboarded} setToast={setToast} />}
        {toast && <div className="toast"><span className="status-dot positive" />{toast}</div>}
      </div>
    );
  }

  return <div className="app-shell"><Sidebar page={page} setPage={setPage} user={user} /><main className="main-shell"><Topbar user={user} apiOnline={apiOnline} onLogout={logout} /><div className="content-wrap"><PageRouter page={page} token={token} user={user} tierMeta={tierMeta} setPage={setPage} setToast={setToast} /></div></main>{toast && <div className="toast"><span className="status-dot positive" />{toast}</div>}<Chatbot token={token} /></div>;
}

function Sidebar({ page, setPage, user }) {
  const visible = NAV.map(section => ({ ...section, items: section.items.filter(([id]) => id !== 'lender' || user?.role === 'lender').filter(([id]) => id !== 'enterprise' || user?.role === 'enterprise') })).filter(s => s.items.length);
  return <aside className="sidebar"><div className="brand" onClick={() => setPage('overview')} role="button" tabIndex="0"><div className="brand-mark">V</div><div><strong>VALMONT</strong><small>FINANCIAL GROUP</small></div></div><div className="rail-label">YOUR FINANCE OS</div><nav>{visible.map(section => <div className="nav-section" key={section.group}><div className="nav-group">{section.group}</div>{section.items.map(([id, label, icon]) => <button type="button" key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}><span className="nav-icon">{icon}</span><span>{label}</span></button>)}</div>)}</nav><div className="sidebar-bottom"><div className="engine-chip"><span className="status-dot positive" /><div><strong>Risk engine</strong><small>One engine · many lenses</small></div></div><div className="profile-mini"><div className="avatar">{user?.email?.slice(0, 1).toUpperCase() || 'V'}</div><div className="truncate"><strong>{user?.email || 'Demo workspace'}</strong><small>{user?.customerTier || user?.role || 'individual'}</small></div></div></div></aside>;
}
function Topbar({ user, apiOnline, onLogout }) { return <header className="topbar"><div className="crumb">VALMONT <span>/</span> {user ? `${String(user.customerTier || user.role || 'individual').replace(/_/g, ' ').toUpperCase()} WORKSPACE` : 'PREVIEW'}</div><div className="top-actions">{DEMO_MODE && <span className="demo-chip">MOCK DATA</span>}{user && <button type="button" className="ghost-btn" onClick={onLogout}>Sign out</button>}</div></header>; }
function PublicNav({ view, onHome, onAuth, apiOnline }) {
  return (
    <header className="topbar public-topbar">
      <div className="brand" onClick={onHome} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div className="brand-mark" style={{ width: 24, height: 24, background: 'var(--teal)', color: '#000', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>V</div>
        <strong style={{ letterSpacing: '0.1em' }}>VALMONT</strong>
      </div>
      <div className="top-actions">
        <div className="system-state"><span className={`status-dot ${apiOnline ? 'positive' : 'risk'}`} />{apiOnline ? 'Systems online' : 'Checking systems'}</div>
        {view !== 'auth' && <button type="button" className="ghost-btn" onClick={onAuth}>Sign in</button>}
      </div>
    </header>
  );
}

function AuthPage({ onAuth, setToast, onBack }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('demo@valmont.local');
  const [password, setPassword] = useState('password123');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const res = await fetch(`${API}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      onAuth(data);
    } catch (e) { setToast(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="auth-page-container">
      <div className="wrapper">
        <div className="title-text" style={{ marginLeft: mode === 'signup' ? '-100%' : '0%' }}>
          <div className="title login">Login Form</div>
          <div className="title signup">Signup Form</div>
        </div>
        <div className="form-container">
          <div className="slide-controls">
            <input type="radio" name="slide" id="login" checked={mode === 'login'} onChange={() => setMode('login')} />
            <input type="radio" name="slide" id="signup" checked={mode === 'signup'} onChange={() => setMode('signup')} />
            <label htmlFor="login" className="slide login" onClick={() => setMode('login')}>Login</label>
            <label htmlFor="signup" className="slide signup" onClick={() => setMode('signup')}>Signup</label>
            <div className="slider-tab"></div>
          </div>
          <div className="form-inner" style={{ marginLeft: mode === 'signup' ? '-100%' : '0%' }}>
            <form className="login" onSubmit={submit}>
              <div className="field">
                <input type="text" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="field">
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div className="pass-link"><a href="#" onClick={e => { e.preventDefault(); onBack(); }}>Cancel & go back</a></div>
              <div className="field btn">
                <div className="btn-layer"></div>
                <input type="submit" value={busy ? 'Connecting...' : 'Login'} disabled={busy} />
              </div>
              <div className="signup-link">Not a member? <a href="#" onClick={e => { e.preventDefault(); setMode('signup'); }}>Signup now</a></div>
            </form>
            <form className="signup" onSubmit={submit}>
              <div className="field">
                <input type="text" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="field">
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div className="field">
                <input type="password" placeholder="Confirm password" required />
              </div>
              <div className="field btn">
                <div className="btn-layer"></div>
                <input type="submit" value={busy ? 'Creating...' : 'Signup'} disabled={busy} />
              </div>
              <div className="signup-link">Already a member? <a href="#" onClick={e => { e.preventDefault(); setMode('login'); }}>Login</a></div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingQuiz({ token, user, onDone, setToast }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [quiz, setQuiz] = useState({ displayName: '', monthlyIncome: '', dailyLearningMinutes: '', investmentCapital: '', background: '' });
  const [classification, setClassification] = useState(null);

  const submitQuiz = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/auth/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          displayName: quiz.displayName || 'Friend',
          monthlyIncome: Number(quiz.monthlyIncome) || 0,
          dailyLearningMinutes: Number(quiz.dailyLearningMinutes) || 15,
          investmentCapital: Number(quiz.investmentCapital) || 0,
          background: quiz.background || 'other'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Onboarding failed');
      setClassification(data.classification || null);
      onDone(data);
    } catch (e) { setToast(e.message); } finally { setBusy(false); }
  };

  const quizSteps = [
    { title: 'Before we dive in, help us comprehend you better', body: 'What should we call you?', fields: [['displayName', 'Preferred name', 'text', 'Alex']] },
    { title: 'Financial context', body: 'About how much do you earn each month? (USD)', fields: [['monthlyIncome', 'Monthly income', 'number', 2000]] },
    { title: 'Time commitment', body: 'How much time can you spend learning? (Minutes/day)', fields: [['dailyLearningMinutes', 'Minutes per day', 'number', 30]] },
    { title: 'Investment capacity', body: 'What capital could you invest if you chose to? (USD)', fields: [['investmentCapital', 'Investment capital', 'number', 500]] },
    { title: 'Decoding purchasing preferences', body: 'What best describes your background?', fields: [['background', 'Background', 'select', '']] }
  ];
  const current = quizSteps[step];
  const backgrounds = ['Student', 'Career professional', 'Small merchant', 'Big merchant', 'Bank', 'Organization / enterprise', 'Hacker / builder / tech', 'Other'];

  const progress = ((step + 1) / quizSteps.length) * 100;

  return (
    <div className="quiz-container">
      <div className="quiz-wrapper">
        <h1 className="quiz-title">{current.title}</h1>
        
        <div className="quiz-progress-track">
          <div className="quiz-progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        
        <p className="quiz-subtitle">{current.body}</p>
        
        <div className="quiz-form">
          {current.fields.map(([key, label, type, placeholder]) => (
            <div key={key} className="quiz-field-group">
              {type === 'select' ? (
                <div className="quiz-options">
                  {backgrounds.map(b => (
                    <label key={b} className={`quiz-option ${quiz[key] === b.toLowerCase() ? 'selected' : ''}`}>
                      <input 
                        type="radio" 
                        name={key} 
                        value={b.toLowerCase()} 
                        checked={quiz[key] === b.toLowerCase()} 
                        onChange={e => setQuiz(q => ({ ...q, [key]: e.target.value }))} 
                      />
                      <span className="quiz-radio-circle"></span>
                      {b}
                    </label>
                  ))}
                </div>
              ) : (
                <input 
                  type={type} 
                  className="quiz-input" 
                  placeholder={placeholder} 
                  value={quiz[key]} 
                  onChange={e => setQuiz(q => ({ ...q, [key]: e.target.value }))} 
                  autoFocus 
                />
              )}
            </div>
          ))}
        </div>
        
        <div className="quiz-footer">
          {step > 0 ? (
            <button type="button" className="quiz-btn-secondary" onClick={() => setStep(s => s - 1)}>Back</button>
          ) : <div></div>}
          
          {step < quizSteps.length - 1 ? (
            <button type="button" className="quiz-btn-primary" onClick={() => setStep(s => s + 1)}>Next</button>
          ) : (
            <button type="button" className="quiz-btn-primary" onClick={submitQuiz} disabled={busy}>{busy ? 'Saving...' : 'Finish setup'}</button>
          )}
        </div>
      </div>
    </div>
  );
}


function PageRouter(props) { const map = { overview: Overview, identity: Identity, wallet: Wallet, invest: Invest, insurance: Insurance, remit: Remit, learn: Learn, budget: Budget, family: FamilyFinance, loans: Loans, lender: Lender, merchant: Merchant, enterprise: Enterprise, ml: ModelTraining, ds: DsApplications, stock: StockPredictor }; const C = map[props.page] || Overview; return <C {...props} />; }

function Overview({ token, user, setPage, setToast }) {
  const api = useApi(token, setToast); const [score, setScore] = useState(DEMO_MODE ? DEMO.trust : null); const [balance, setBalance] = useState(DEMO_MODE ? DEMO.balance : null); const [loans, setLoans] = useState(DEMO_MODE ? DEMO.loansMine.loans : null);
  const refresh = async () => { const [s, b, l] = await Promise.allSettled([api(`/api/trust-score/${user.id}`), api('/api/wallet/balance'), api('/api/loans/mine')]); if (s.status === 'fulfilled') setScore(s.value); if (b.status === 'fulfilled') setBalance(b.value); if (l.status === 'fulfilled') setLoans(normalize(l.value, ['loans'])); };
  useEffect(() => { refresh(); }, []);
  const ts = normalize(score, ['trustScore']) || {}; const scoreValue = Number(ts.score || 0);
  return <><PageHeader eyebrow="OVERVIEW / PERSONAL" title={`Good to see you${user?.email ? `, ${user.email.split('@')[0]}` : ''}.`} description="Your financial picture, condensed into the signals that matter." right={<Button variant="secondary" onClick={refresh}>Refresh data</Button>} /><div className="overview-grid"><Panel title="Trust score" kicker="CORE SIGNAL" className="score-panel"><div className="score-layout"><div className="big-score"><strong>{scoreValue || '—'}</strong><span>/ 100</span></div><div><StatusPill>On-chain attested</StatusPill><p className="muted">The same score can be read by you, a lender, an insurer or a business — each through its own lens.</p><button type="button" className="text-btn" onClick={() => setPage('identity')}>Review evidence →</button></div></div><div className="meter"><span style={{ width: `${Math.min(100, scoreValue)}%` }} /></div></Panel><Panel title="Wallet" kicker="LIQUIDITY"><div className="money">{money(balance?.balance)}</div><div className="split-row"><span>Available</span><span>Vault {money(balance?.savingsVaultBalance)}</span></div><button type="button" className="text-btn" onClick={() => setPage('wallet')}>Open wallet →</button></Panel></div><div className="stats-row"><Stat label="Trust signal" value={scoreValue || '—'} sub="Shared core score" /><Stat label="Wallet asset" value="USD" sub="Primary ledger" /><Stat label="Loans" value={Array.isArray(loans) ? loans.length : '—'} sub="Current requests" /><Stat label="Network" value="Solana" sub="Devnet attestation" tone="teal" /></div><div className="section-title"><span className="eyebrow">ONE ENGINE · MANY LENSES</span><h2>Choose a view.</h2></div><div className="lens-grid dense">{[['identity', 'Your identity', 'Trust score + evidence'], ['loans', 'Borrow', 'Request or fund'], ['invest', 'Grow', 'Six-bucket allocation'], ['insurance', 'Protect', 'Score-linked cover'], ['merchant', 'Operate', 'Business health'], ['enterprise', 'Workforce', 'Org-level signal']].map(([id, t, s]) => <button type="button" key={id} className="lens-card" onClick={() => setPage(id)}><span className={`accent ${moduleMeta[id][2]}`} /><div><span className="eyebrow">{t}</span><h3>{s}</h3></div><span className="arrow">↗</span></button>)}</div></>;
}

function TrustScoreCard({ data }) {
  if (!data) return null;
  const ts = data.trustScore || data;
  if (!ts) return null;
  const ev = ts.evidence || {};
  return (
    <div className="answer-card" style={{ marginTop: '16px', background: 'var(--surface-container)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-hairline)' }}>
      <h3 style={{ marginBottom: '16px', color: 'var(--slate-headline)', fontSize: '1.1rem' }}>Score Details</h3>
      <div className="list-stack">
        <div className="list-row">
          <div><strong>Total Score</strong><small>Out of 100</small></div>
          <strong style={{ fontFamily: 'Space Grotesk' }}>{ts.score || 0}</strong>
        </div>
        <div className="list-row">
          <div><strong>Income Component</strong><small>Verified flow</small></div>
          <strong style={{ fontFamily: 'Space Grotesk' }}>{Number(ts.income_component || 0).toFixed(1)}</strong>
        </div>
        <div className="list-row">
          <div><strong>Fraud Component</strong><small>Transaction history</small></div>
          <strong style={{ fontFamily: 'Space Grotesk' }}>{Number(ts.fraud_component || 0).toFixed(1)}</strong>
        </div>
        {(ev.startingLoanCapUsd || data.startingLoanCapUsd) ? (
          <div className="list-row">
            <div><strong>Starting Loan Cap</strong><small>Approved limit</small></div>
            <strong style={{ fontFamily: 'Space Grotesk' }}>{money(ev.startingLoanCapUsd || data.startingLoanCapUsd)}</strong>
          </div>
        ) : null}
        {ev.attestationHash && (
          <div className="list-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <div><strong>Solana Attestation</strong><small style={{ marginLeft: '8px', color: 'var(--slate-body)' }}>On-chain proof</small></div>
            <small style={{ color: 'var(--teal)', wordBreak: 'break-all', fontFamily: 'Space Grotesk', background: '#0a1017', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-hairline)' }}>{ev.attestationHash}</small>
          </div>
        )}
      </div>
    </div>
  );
}

function Identity({ token, setToast }) {
  const api = useApi(token, setToast), [file, setFile] = useState(null), [data, setData] = useState({}), [score, setScore] = useState(null);
  const load = async () => { const [s, p] = await Promise.allSettled([api('/api/trust-score/' + (DEMO_MODE ? DEMO_USER.id : JSON.parse(localStorage.getItem('valmont_user') || '{}').id)), api('/api/student/profile')]); if (s.status === 'fulfilled') setScore(normalize(s.value, ['trustScore'])); if (p.status === 'fulfilled') setData(d => ({ ...d, profile: normalize(p.value, ['profile']) })); };
  useEffect(() => { load(); }, []);
  const upload = async () => { if (!file) return setToast('Choose an income image first'); const f = new FormData(); f.append('document', file); await api('/api/trust-score/verify-income', { method: 'POST', body: f }); setToast('Success! Income verified.'); };
  const compute = async () => { const r = await api('/api/trust-score/compute', { method: 'POST' }); setScore(normalize(r, ['trustScore'])); setData(d => ({ ...d, score: r })); };
  const student = async () => { const r = await api('/api/student/compute-score', { method: 'POST' }); setData(d => ({ ...d, student: r })); };
  return <><PageHeader eyebrow="YOU / IDENTITY" title="Identity & trust" description="Build a portable financial signal from verified income, transaction behavior and an on-chain attestation." right={<Button variant="secondary" onClick={load}>Refresh identity</Button>} /><div className="two-col"><Panel title="Evidence" kicker="INCOME VERIFICATION"><Field label="Income document"><input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0])} /></Field><Button onClick={upload}>Verify income</Button></Panel><Panel title="Trust score" kicker="ATTESTATION"><div className="metric-callout"><strong>{score?.score ?? '—'}</strong><span>current score</span></div><Button onClick={compute}>Compute + attest on Solana</Button><TrustScoreCard data={data.score} /></Panel></div><Panel title="Student starter identity" kicker="ALTERNATE ENTRY PATH"><div className="form-grid"><Field label="School"><input id="school" defaultValue={data.profile?.school_name || 'State University'} /></Field><Field label="Graduation year"><input id="grad" type="number" defaultValue={data.profile?.expected_grad_year || 2028} /></Field><Field label="Monthly allowance"><input id="allowance" type="number" defaultValue={data.profile?.monthly_allowance || 300} /></Field></div><Button onClick={async () => { await api('/api/student/profile', { method: 'POST', body: JSON.stringify({ schoolName: document.getElementById('school').value, expectedGradYear: Number(document.getElementById('grad').value), monthlyAllowance: Number(document.getElementById('allowance').value) }) }); await student(); }}>Save profile + compute</Button><TrustScoreCard data={data.student} /></Panel></>;
}

function WalletActionCard({ data }) {
  if (!data) return null;
  const w = data.wallet || data.account;
  
  if (w) {
    return (
      <div className="answer-card" style={{ marginTop: '16px', background: 'var(--surface-container)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-hairline)' }}>
        <h3 style={{ marginBottom: '12px', color: 'var(--slate-headline)', fontSize: '1.1rem' }}>Wallet Details</h3>
        <div className="list-stack">
          {w.solana_public_key && (
            <div className="list-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <div><strong>Solana Public Key</strong></div>
              <small style={{ color: 'var(--teal)', wordBreak: 'break-all', fontFamily: 'Space Grotesk', background: '#0a1017', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-hairline)' }}>{w.solana_public_key}</small>
            </div>
          )}
          <div className="list-row">
            <div><strong>Savings Vault</strong></div>
            <strong>{w.savings_vault_balance != null ? '$' + Number(w.savings_vault_balance).toFixed(2) : '$0.00'}</strong>
          </div>
          <div className="list-row">
            <div><strong>Created At</strong></div>
            <small style={{ color: 'var(--slate-body)' }}>{new Date(w.created_at || Date.now()).toLocaleString()}</small>
          </div>
        </div>
      </div>
    );
  }
  
  if (data.success || data.transactionId || data.newVaultBalance !== undefined || data.message) {
    return (
       <div className="answer-card" style={{ marginTop: '16px', background: 'var(--surface-container)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-hairline)' }}>
        <h3 style={{ marginBottom: '12px', color: 'var(--teal)', fontSize: '1.1rem' }}>Success</h3>
        <div className="list-stack">
          {data.transactionId && (
            <div className="list-row">
              <div><strong>Transaction ID</strong></div>
              <small style={{ fontFamily: 'Space Grotesk' }}>{data.transactionId}</small>
            </div>
          )}
          {data.newVaultBalance != null && (
            <div className="list-row">
              <div><strong>New Vault Balance</strong></div>
              <strong>{'$' + Number(data.newVaultBalance).toFixed(2)}</strong>
            </div>
          )}
          {data.message && (
            <div className="list-row">
              <small>{data.message}</small>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

function Wallet({ token, setToast }) {
  const api = useApi(token, setToast), [balance, setBalance] = useState(DEMO_MODE ? DEMO.balance : null), [history, setHistory] = useState(DEMO_MODE ? DEMO.walletHistory.transactions : []), [crypto, setCrypto] = useState(DEMO_MODE ? DEMO.cryptoBalance : null), [gold, setGold] = useState(DEMO_MODE ? DEMO.goldBalance : null), [out, setOut] = useState({});
  const load = async () => { const rs = await Promise.allSettled([api('/api/wallet/balance'), api('/api/wallet/history'), api('/api/wallet/crypto/balance'), api('/api/wallet/gold/balance')]); if (rs[0].status === 'fulfilled') setBalance(rs[0].value); if (rs[1].status === 'fulfilled') setHistory(normalize(rs[1].value, ['transactions']) || []); if (rs[2].status === 'fulfilled') setCrypto(rs[2].value); if (rs[3].status === 'fulfilled') setGold(rs[3].value); };
  useEffect(() => { load(); }, []);
  const run = async (key, path, options) => { const r = await api(path, options); setOut(o => ({ ...o, [key]: r })); await load(); };
  return <><PageHeader eyebrow="YOU / WALLET" title="Your wallet" description="One spendable ledger, plus crypto and digital gold as separate asset balances." right={<Button variant="secondary" onClick={async () => { await run('create', '/api/wallet/create', { method: 'POST' }); }}>Create / refresh wallet</Button>} /><div className="stats-row"><Stat label="USD balance" value={money(balance?.balance)} sub="Spendable" /><Stat label="Savings vault" value={money(balance?.savingsVaultBalance)} sub="Protected balance" /><Stat label="SOL" value={Number(crypto?.cryptoBalance || 0).toFixed(3)} sub={money(crypto?.estimatedUsdValue)} /><Stat label="Gold" value={`${Number(gold?.goldGrams || 0).toFixed(2)} g`} sub={money(gold?.estimatedUsdValue)} /></div><div className="two-col"><Panel title="USD wallet" kicker="PRIMARY LEDGER"><div className="form-grid"><Field label="Recipient email"><input id="recipient" defaultValue="other-user@example.com" /></Field><Field label="Amount"><input id="sendamt" type="number" defaultValue="10" /></Field></div><Button onClick={() => run('transfer', '/api/wallet/transfer', { method: 'POST', body: JSON.stringify({ recipientEmail: document.getElementById('recipient').value, amount: Number(document.getElementById('sendamt').value) }) })}>Send money</Button><div className="form-grid"><Field label="Vault deposit"><input id="vault" type="number" defaultValue="20" /></Field></div><Button variant="secondary" onClick={() => run('vault', '/api/wallet/vault/deposit', { method: 'POST', body: JSON.stringify({ amount: Number(document.getElementById('vault').value) }) })}>Move to vault</Button><WalletActionCard data={out.transfer || out.vault || out.create} /></Panel><AssetPanel title="Solana" asset="SOL" run={run} crypto={crypto} /><AssetPanel title="Digital gold" asset="XAU_GRAM" run={run} gold={gold} /></div><Panel title="Recent ledger" kicker="TIMESCALE-BACKED HISTORY"><div className="ledger-table">{history.slice(0, 6).map((tx, i) => <div className="ledger-row" key={tx.id || `${tx.createdAt}-${i}`}><span>{tx.type || tx.channel || 'transaction'}</span><span>{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '—'}</span><strong>{money(tx.amount)}</strong></div>)}</div></Panel></>;
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
    {data && <div className="two-col"><Panel title="Allocation" kicker="SIX BUCKETS"><Allocation data={allocation} />{advice.explanation && <div className="answer-card" style={{ marginTop: '24px', background: 'var(--surface-container)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-hairline)' }}><p style={{ color: 'var(--slate-body)', lineHeight: 1.6, margin: 0, fontSize: '14px' }}>{advice.explanation}</p></div>}</Panel><Panel title="Goal framing" kicker="ILLUSTRATIVE ESTIMATE"><div className="metric-callout"><strong>{goalFraming?.projectedTotal != null ? money(goalFraming.projectedTotal) : '—'}</strong><span>projected total</span></div><div className="split-row"><span>Monthly contribution</span><span>{money(goalFraming?.monthlyContribution)}</span></div><div className="split-row"><span>Assumed annual return</span><span>{goalFraming?.assumedAnnualReturnPct != null ? `${goalFraming.assumedAnnualReturnPct}%` : '—'}</span></div><p className="muted">Educational estimate only — fixed assumptions, not a guarantee.</p>{goalFraming?.explanation && <div className="answer-card" style={{ marginTop: '16px', background: 'var(--surface-container)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-hairline)' }}><p style={{ color: 'var(--slate-body)', lineHeight: 1.6, margin: 0, fontSize: '14px' }}>{goalFraming.explanation}</p></div>}</Panel></div>}
    <Panel title="Recommendation history" kicker="PERSISTED BY BACKEND"><div className="list-stack">{history.slice(0, 6).map((h, i) => <div className="list-row" key={h.id || i}><div><strong>{h.goal || 'Investment recommendation'}</strong><small>{h.risk_tolerance || '—'} · {h.horizon_months || '—'} months · {h.mocked ? 'mocked' : 'live'}</small></div><span className="status-pill positive">stored</span></div>)}</div></Panel>
  </>;
}
function Allocation({ data }) { if (!data) return <p className="muted">No allocation returned.</p>; return <div className="allocation">{Object.entries(data).filter(([k]) => k.toLowerCase().endsWith('pct')).map(([k, v]) => <div className="allocation-row" key={k}><span>{k.replace('Pct', '')}</span><div className="bar"><i style={{ width: `${Math.max(0, Number(v))}%` }} /></div><strong>{v}%</strong></div>)}</div>; }

function Insurance({ token, setToast }) { const api = useApi(token, setToast), [quote, setQuote] = useState(DEMO_MODE ? DEMO.insuranceQuote : null), [policies, setPolicies] = useState(DEMO_MODE ? DEMO.insuranceMine.policies : []), [claim, setClaim] = useState(null); const load = async () => { const r = await api('/api/insurance/mine'); setPolicies(normalize(r, ['policies']) || []); }; useEffect(() => { load(); }, []); const quoteIt = async () => { setQuote(await api('/api/insurance/quote', { method: 'POST', body: JSON.stringify({ policyType: document.getElementById('ptype').value, coverageAmount: Number(document.getElementById('coverage').value) }) })); setToast('Quote generated successfully!'); }; const purchase = async () => { await api('/api/insurance/purchase', { method: 'POST', body: JSON.stringify({ policyType: document.getElementById('ptype').value, coverageAmount: Number(document.getElementById('coverage').value) }) }); setToast('Policy purchased successfully!'); await load(); }; const fileClaim = async id => { await api(`/api/insurance/${id}/claim`, { method: 'POST', body: JSON.stringify({ claimAmount: 100 }) }); setToast('Claim filed successfully!'); setClaim(null); await load(); }; return <><PageHeader eyebrow="YOU / PROTECTION" title="Insurance" description="See how the shared trust score changes the premium lens without creating a second risk model." /><div className="stats-row"><Stat label="Trust score" value={quote?.score ?? '—'} sub="Shared core signal" /><Stat label="Multiplier" value={quote?.premiumMultiplier != null ? `${quote.premiumMultiplier}×` : '—'} sub="Premium lens" /><Stat label="Monthly premium" value={quote?.monthlyPremium != null ? money(quote.monthlyPremium) : '—'} sub="Illustrative quote" /><Stat label="Max coverage" value={quote?.maxCoverage != null ? money(quote.maxCoverage) : '—'} sub="Limit based on score" /></div><Panel title="Get a quote" kicker="POLICY"><div className="form-grid"><Field label="Policy type"><select id="ptype"><option>health</option><option>device</option><option>income-protection</option></select></Field><Field label="Coverage amount"><input id="coverage" type="number" defaultValue="400" /></Field></div><div className="button-row"><Button onClick={quoteIt}>Quote policy</Button><Button variant="secondary" onClick={purchase}>Purchase</Button><Button variant="secondary" onClick={load}>Refresh policies</Button></div></Panel><Panel title="Active policies" kicker="PROTECTION"><div className="list-stack">{policies.map(p => <div className="list-row" key={p.id}><div><strong>{p.policy_type}</strong><small>{money(p.coverage_amount)} cover · {p.status}</small></div><Button variant="secondary" onClick={() => fileClaim(p.id)}>File ₹100 claim</Button></div>)}</div></Panel></>; }

function RemittanceQuoteCard({ data }) {
  if (!data || data.remittance || data.destAmount == null) return null;
  return (
    <div className="answer-card" style={{ marginTop: '16px', background: 'var(--surface-container)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-hairline)' }}>
      <h3 style={{ marginBottom: '12px', color: 'var(--slate-headline)', fontSize: '1.1rem' }}>Quote Details</h3>
      <div className="list-stack">
        <div className="list-row">
          <div><strong>FX Rate</strong></div>
          <strong style={{ fontFamily: 'Space Grotesk' }}>{data.fxRate}</strong>
        </div>
        <div className="list-row">
          <div><strong>Net Sent (USD)</strong></div>
          <strong>{'$' + Number(data.netSentUsd || 0).toFixed(2)}</strong>
        </div>
        <div className="list-row">
          <div><strong>Recipient Gets</strong></div>
          <strong style={{ color: 'var(--teal)', fontSize: '1.1rem', fontFamily: 'Space Grotesk' }}>{Number(data.destAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {data.destCurrency}</strong>
        </div>
      </div>
    </div>
  );
}

function Remit({ token, setToast }) { const api = useApi(token, setToast), [corridors, setCorridors] = useState([]), [data, setData] = useState(DEMO_MODE ? DEMO.remittanceQuote : null), [mine, setMine] = useState(DEMO_MODE ? DEMO.remittanceMine.remittances : []); const load = async () => { const [c, m] = await Promise.allSettled([api('/api/remittance/corridors'), api('/api/remittance/mine')]); if (c.status === 'fulfilled') setCorridors(normalize(c.value, ['supportedDestCurrencies']) || []); if (m.status === 'fulfilled') setMine(normalize(m.value, ['remittances']) || []); }; useEffect(() => { load(); }, []); const quote = async () => setData(await api('/api/remittance/quote', { method: 'POST', body: JSON.stringify({ destCurrency: document.getElementById('rcurrency').value, sourceAmountUsd: Number(document.getElementById('ramount').value) }) })); const send = async () => { await api('/api/remittance/send', { method: 'POST', body: JSON.stringify({ recipientName: document.getElementById('rname').value, destCountry: document.getElementById('rcountry').value, destCurrency: document.getElementById('rcurrency').value, sourceAmountUsd: Number(document.getElementById('ramount').value) }) }); setToast('Transfer sent successfully!'); setData(null); await load(); }; return <><PageHeader eyebrow="YOU / REMITTANCES" title="Move money across borders." description="Transparent corridor quotes with fee and FX details before a send is committed." /><div className="stats-row"><Stat label="Supported corridors" value={corridors.length || 5} sub="FX destinations" /><Stat label="Last quote" value={data?.destCurrency || '—'} sub="Destination currency" /><Stat label="Fee" value={data?.feeUsd != null ? money(data.feeUsd) : '—'} sub="Quote fee" /></div><Panel title="New transfer" kicker="REMITTANCE"><div className="form-grid"><Field label="Recipient"><input id="rname" defaultValue="Priya Sharma" /></Field><Field label="Country"><input id="rcountry" defaultValue="India" /></Field><Field label="Currency"><select id="rcurrency">{(corridors.length ? corridors : DEMO.corridors.supportedDestCurrencies).map(c => <option key={c}>{c}</option>)}</select></Field><Field label="USD amount"><input id="ramount" type="number" defaultValue="50" /></Field></div><div className="button-row"><Button onClick={quote}>Preview quote</Button><Button variant="secondary" onClick={send}>Send transfer</Button><Button variant="secondary" onClick={load}>Refresh history</Button></div><RemittanceQuoteCard data={data} /></Panel><Panel title="Recent remittances" kicker="LEDGER"><div className="list-stack">{mine.slice(0, 5).map(r => <div className="list-row" key={r.id}><div><strong>{r.recipient_name}</strong><small>{r.dest_currency} · {money(r.source_amount_usd)} → {money(r.dest_amount)}</small></div><span className="status-pill positive">posted</span></div>)}</div></Panel></>; }

function Learn({ token, setToast, user }) {
  const api = useApi(token, setToast), [data, setData] = useState({}), [history, setHistory] = useState({ tutorial: [], qa: [], plan: [] });
  const [busyQA, setBusyQA] = useState(false);
  const [qaError, setQaError] = useState('');
  const load = async () => {
    const r = await Promise.allSettled([api('/api/education/tutorial/history'), api('/api/education/qa/history'), api('/api/education/learning-plan/history')]);
    if (r[0].status === 'fulfilled') setHistory(h => ({ ...h, tutorial: r[0].value.history || [] }));
    if (r[1].status === 'fulfilled') setHistory(h => ({ ...h, qa: r[1].value.history || [] }));
    if (r[2].status === 'fulfilled') setHistory(h => ({ ...h, plan: r[2].value.history || [] }));
  };
  useEffect(() => { load(); }, []);
  const tierPersona = user?.customerTier === 'students' ? 'student'
    : user?.customerTier === 'hackers' ? 'curious technologist'
    : user?.customerTier?.includes('merchant') ? 'merchant operator'
    : user?.customerTier === 'banks' ? 'bank risk analyst'
    : user?.customerTier === 'organizations' ? 'enterprise people-ops lead'
    : 'salaried professional';
  return <><PageHeader eyebrow="YOU / LEARNING" title="Learn finance at your pace." description={`Tutorials, Q&A and a short learning plan — personalized for ${user?.customerTier ? user.customerTier.replace(/_/g, ' ') : 'your path'}, with optional ElevenLabs narration.`} /><div className="two-col"><Panel title="Tutorial" kicker="AI · GEMINI → GROQ"><Field label="Topic"><input id="topic" defaultValue="how compound interest works" /></Field><div className="form-grid"><Field label="Persona"><select id="persona" defaultValue={tierPersona}><option>gig worker</option><option>student</option><option>salaried professional</option><option>curious technologist</option><option>merchant operator</option><option>bank risk analyst</option><option>enterprise people-ops lead</option></select></Field><Field label="Language"><input id="language" defaultValue="English" /></Field></div><label className="check"><input id="audio" type="checkbox" /> Narrate with ElevenLabs</label><Button onClick={async () => { const __r = await api('/api/education/tutorial', { method: 'POST', body: JSON.stringify({ topic: document.getElementById('topic').value, persona: document.getElementById('persona').value, language: document.getElementById('language').value, withAudio: document.getElementById('audio').checked }) }); setData(d => ({ ...d, tutorial: __r })); }}>Generate tutorial</Button>
  {data.tutorial?.tutorial?.body && (
    <div className="answer-card" style={{ marginTop: '16px', background: 'var(--surface-container)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-hairline)' }}>
      <h3 style={{ marginBottom: '16px', color: 'var(--slate-headline)', fontSize: '1.2rem' }}>{data.tutorial.tutorial.title}</h3>
      <div className="answer-content" style={{ color: 'var(--slate-body)', lineHeight: '1.6', fontSize: '15px' }}>
        {String(data.tutorial.tutorial.body).split('\n').map((para, i) => <p key={i} style={{ marginBottom: para.trim() ? '12px' : '0' }}>{para.trim() || <br />}</p>)}
      </div>
    </div>
  )}</Panel><Panel title="Ask a question" kicker="LIVE GUIDANCE"><Field label="Question"><textarea id="question" defaultValue="What is an emergency fund?" /></Field><Button disabled={busyQA} onClick={async () => { 
    setBusyQA(true);
    setQaError('');
    setData(d => ({ ...d, qa: null }));
    try {
      const __r = await api('/api/education/qa', { method: 'POST', body: JSON.stringify({ question: document.getElementById('question').value }) }); 
      setData(d => ({ ...d, qa: __r })); 
    } catch(err) {
      setQaError('Unable to generate an answer right now. Please try again.');
    } finally {
      setBusyQA(false);
    }
  }}>Ask</Button>
  {busyQA && <div style={{ marginTop: '16px', color: 'var(--slate-body)' }}>Thinking...</div>}
  {qaError && <div style={{ marginTop: '16px', color: 'var(--brand-crimson)' }}>{qaError}</div>}
  {data.qa?.qa?.answer && (
    <div className="answer-card" style={{ marginTop: '16px', background: 'var(--surface-container)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-hairline)' }}>
      <h3 style={{ marginBottom: '16px', color: 'var(--slate-headline)', fontSize: '1.2rem' }}>Answer</h3>
      <div className="answer-content" style={{ color: 'var(--slate-body)', lineHeight: '1.6', fontSize: '15px' }}>
        {Array.isArray(data.qa.qa.answer) ? 
          data.qa.qa.answer.map((item, i) => <p key={i} style={{ marginBottom: '12px' }}>• {item}</p>) : 
          String(data.qa.qa.answer).split('\n').map((para, i) => <p key={i} style={{ marginBottom: para.trim() ? '12px' : '0' }}>{para.trim() || <br />}</p>)
        }
      </div>
    </div>
  )}</Panel></div><Panel title="Your learning plan" kicker="TIER-PACED"><div className="form-grid"><Field label="Goal"><input id="learnGoal" defaultValue="build a 3-month emergency fund" /></Field><Field label="Weeks"><input id="learnWeeks" type="number" defaultValue="4" /></Field></div><Button onClick={async () => { const __r = await api('/api/education/learning-plan', { method: 'POST', body: JSON.stringify({ persona: document.getElementById('persona')?.value || tierPersona, goal: document.getElementById('learnGoal').value, horizonWeeks: Number(document.getElementById('learnWeeks').value) }) }); setData(d => ({ ...d, plan: __r })); }}>Build plan</Button>
  {data.plan?.plan?.weeks && (
    <div className="answer-card" style={{ marginTop: '16px', background: 'var(--surface-container)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-hairline)' }}>
      <h3 style={{ marginBottom: '16px', color: 'var(--slate-headline)', fontSize: '1.2rem' }}>Learning Plan</h3>
      <div className="list-stack">
        {data.plan.plan.weeks.map((w, i) => (
          <div className="list-row" key={i}>
            <div>
              <strong>Week {w.week}</strong>
              <small style={{ color: 'var(--slate-body)' }}>{w.topic}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  )}</Panel><div className="two-col"><Panel title="Tutorial history" kicker="SAVED OUTPUTS">
    <div className="list-stack">
      {history.tutorial.slice(0, 3).map(t => (
        <div className="list-row" key={t.id}>
          <div>
            <strong>{t.title}</strong>
            <small>{t.topic}</small>
          </div>
        </div>
      ))}
    </div>
  </Panel><Panel title="Q&A + plans" kicker="SAVED OUTPUTS">
    <div className="list-stack">
      {history.qa.slice(0, 2).map(q => (
        <div className="list-row" key={q.id}>
          <div>
            <strong>Q: {q.question}</strong>
            <small style={{ color: 'var(--slate-body)' }}>{String(q.answer).substring(0, 80)}...</small>
          </div>
        </div>
      ))}
      {history.plan.slice(0, 2).map(p => (
        <div className="list-row" key={p.id}>
          <div>
            <strong>Plan: {p.goal}</strong>
            <small style={{ color: 'var(--slate-body)' }}>{p.horizon_weeks} weeks</small>
          </div>
        </div>
      ))}
    </div>
  </Panel></div></>;
}

function ModelRunCard({ data }) {
  if (!data) return <div style={{ color: 'var(--slate-body)', fontSize: '14px' }}>No training runs yet.</div>;
  return (
    <div className="answer-card" style={{ background: 'var(--surface-container)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-hairline)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ color: 'var(--slate-headline)', fontSize: '1.1rem', margin: 0 }}>Run Results</h3>
        <span className="status-pill positive" style={{ margin: 0 }}>{data.status || 'completed'}</span>
      </div>
      <div className="list-stack">
        <div className="list-row">
          <div><strong>Model ID</strong></div>
          <strong style={{ fontFamily: 'Space Grotesk', fontSize: '13px' }}>{data.model_key}</strong>
        </div>
        <div className="list-row">
          <div><strong>Epochs</strong></div>
          <strong style={{ fontFamily: 'Space Grotesk' }}>{data.epochs}</strong>
        </div>
        {data.metrics && Object.keys(data.metrics).length > 0 && (
          <div className="list-row" style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '12px' }}>
            <div style={{ width: '100%' }}>
              <strong style={{ display: 'block', marginBottom: '12px' }}>Evaluation Metrics</strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {Object.entries(data.metrics).map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--surface)', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-hairline)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--slate-body)', textTransform: 'uppercase', marginBottom: '4px' }}>{k}</div>
                    <div style={{ fontFamily: 'Space Grotesk', fontSize: '14px', color: 'var(--teal)' }}>{Number(v).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
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
    <div className="two-col"><Panel title="Latest run" kicker="OUTPUT"><ModelRunCard data={last || runs[0]} /></Panel><Panel title="Run history" kicker="PERSISTED"><div className="list-stack">{runs.slice(0, 6).map(r => <div className="list-row" key={r.id}><div><strong>{r.model_key}</strong><small>{r.status} · {r.epochs} epochs</small></div><span className="status-pill positive">stored</span></div>)}</div></Panel></div>
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


function Budget({ token, setToast }) { 
  const api = useApi(token, setToast); 
  const [goal, setGoal] = useState(DEMO_MODE ? DEMO.budgetGoal : null); 
  const [nudge, setNudge] = useState(DEMO_MODE ? DEMO.budgetNudge : null); 
  const [trend, setTrend] = useState(DEMO_MODE ? DEMO.spendTrend : null); 
  const [out, setOut] = useState({});

  const load = async () => { 
    const r = await Promise.allSettled([
      api('/api/budget/goal'), 
      api('/api/budget/nudge'), 
      api('/api/budget/spend-trend?weeks=4')
    ]); 
    if (r[0].status === 'fulfilled') setGoal(r[0].value); 
    if (r[1].status === 'fulfilled') setNudge(r[1].value); 
    if (r[2].status === 'fulfilled') setTrend(r[2].value); 
  }; 
  
  useEffect(() => { load(); }, []); 

  const target = goal?.goal?.target_savings_pct ?? goal?.defaultTargetSavingsPct ?? 20; 
  
  const saveGoal = async () => {
    await api('/api/budget/goal', { method: 'POST', body: JSON.stringify({ targetSavingsPct: Number(document.getElementById('target').value) }) });
    setToast('Goal saved successfully!');
    
    await load();
  };

  const getNudge = async () => {
    const res = await api('/api/budget/nudge');
    setNudge(res);
    setToast('Nudge refreshed successfully!');
  };

  const viewTrend = async () => {
    const res = await api('/api/budget/spend-trend?weeks=4');
    setTrend(res);
    setToast('Spend trend refreshed!');
  };

  return <>
    <PageHeader eyebrow="YOU / BUDGETING" title="Know where the month is going." description="Rules-based nudges from verified income and the same Timescale transaction history used for fraud signals." />
    <div className="stats-row">
      <Stat label="Target" value={`${target}%`} sub="Savings goal" />
      <Stat label="Projected" value={nudge ? `${Number(nudge.projectedSavingsPct).toFixed(1)}%` : '—'} sub="Current savings rate" />
      <Stat label="Status" value={nudge?.status || '—'} sub="Rules-based signal" />
      <Stat label="30d spend" value={nudge?.monthlySpend != null ? money(nudge.monthlySpend) : '—'} sub="Wallet outflow" />
    </div>
    <Panel title="Savings goal" kicker="SET A TARGET">
      <div className="form-grid">
        <Field label="Target savings %"><input id="target" type="number" defaultValue={target} /></Field>
      </div>
      <div className="button-row">
        <Button onClick={saveGoal}>Save goal</Button>
        <Button variant="secondary" onClick={getNudge}>Get nudge</Button>
        <Button variant="secondary" onClick={viewTrend}>View trend</Button>
      </div>
      {nudge?.message && (
        <div className="answer-card" style={{ marginTop: '16px', background: 'var(--surface-container)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-hairline)' }}>
          <h3 style={{ marginBottom: '8px', color: 'var(--teal)', fontSize: '1rem' }}>Insight</h3>
          <p style={{ color: 'var(--slate-body)', lineHeight: 1.5, margin: 0, fontSize: '14px' }}>{nudge.message}</p>
        </div>
      )}
    </Panel>
    {trend?.trend && <Panel title="Weekly spend" kicker="TIMESCALE WINDOW"><TrendList items={trend.trend} valueKey="spend" /></Panel>}
  </>; 
}

function LoanDetailCard({ data }) {
  if (!data || !data.loan) return null;
  const { loan, schedule } = data;
  return (
    <div className="answer-card" style={{ marginTop: '16px', background: 'var(--surface-container)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-hairline)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ color: 'var(--slate-headline)', fontSize: '1.1rem', margin: 0 }}>Loan Overview</h3>
        <span className={`status-pill ${loan.status === 'funded' ? 'positive' : 'warning'}`} style={{ margin: 0 }}>{loan.status}</span>
      </div>
      <div className="list-stack">
        <div className="list-row">
          <div><strong>Principal</strong></div>
          <strong style={{ fontFamily: 'Space Grotesk' }}>{'$' + Number(loan.principal).toFixed(2)}</strong>
        </div>
        <div className="list-row">
          <div><strong>Interest Rate</strong></div>
          <strong style={{ fontFamily: 'Space Grotesk' }}>{loan.interest_rate_pct}%</strong>
        </div>
        <div className="list-row">
          <div><strong>Term</strong></div>
          <strong style={{ fontFamily: 'Space Grotesk' }}>{loan.term_months} months</strong>
        </div>
        <div className="list-row">
          <div><strong>Trust Score</strong></div>
          <strong style={{ color: 'var(--teal)', fontFamily: 'Space Grotesk' }}>{loan.trust_score_at_request}</strong>
        </div>
        {schedule && schedule.length > 0 && (
          <div className="list-row" style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '12px' }}>
            <div><strong>Est. Payment</strong></div>
            <strong style={{ fontFamily: 'Space Grotesk' }}>{'$' + Number(schedule[0].payment_amount).toFixed(2)}/mo</strong>
          </div>
        )}
      </div>
    </div>
  );
}

function Loans({ token, setToast, user }) { const api = useApi(token, setToast), [data, setData] = useState({}), [mine, setMine] = useState([]), [market, setMarket] = useState([]); const load = async () => { const r = await Promise.allSettled([api('/api/loans/mine'), user?.role === 'lender' ? api('/api/loans/marketplace') : Promise.reject()]); if (r[0].status === 'fulfilled') setMine(normalize(r[0].value, ['loans']) || []); if (r[1].status === 'fulfilled') setMarket(normalize(r[1].value, ['pendingLoans']) || []); }; useEffect(() => { load(); }, [user?.role]); const request = async () => { const __r = await api('/api/loans/request', { method: 'POST', body: JSON.stringify({ amount: Number(document.getElementById('loanAmt').value), termMonths: Number(document.getElementById('loanTerm').value) }) }); setData(d => ({ ...d, request: __r })); }; const detail = async id => { const __r = await api(`/api/loans/${id}`); setData(d => ({ ...d, detail: __r })); }; const repay = async id => { const __r = await api(`/api/loans/${id}/repay`, { method: 'POST', body: JSON.stringify({ amount: 100 }) }); setData(d => ({ ...d, repay: __r })); }; const fund = async id => { await api(`/api/loans/${id}/fund`, { method: 'POST' }); setToast('Loan funded successfully!'); await load(); }; return <><PageHeader eyebrow="LENDING / MARKETPLACE" title="Borrow or fund." description="Loan eligibility and pricing reuse the latest trust score; repayment behavior feeds back into the transaction signal." /><div className="two-col"><Panel title="Request a loan" kicker="BORROWER"><div className="form-grid"><Field label="Amount"><input id="loanAmt" type="number" defaultValue="300" /></Field><Field label="Term (months)"><input id="loanTerm" type="number" defaultValue="6" /></Field></div><Button onClick={request}>Request loan</Button><LoanDetailCard data={data.request} /></Panel><Panel title="My loans" kicker="BORROWER"><div className="list-stack">{mine.map(l => <div className="list-row" key={l.id}><div><strong>{money(l.principal || l.requested_amount)} · {l.status}</strong><small>{l.id}</small></div><div className="button-row compact"><Button variant="secondary" onClick={() => detail(l.id)}>Detail</Button>{l.status === 'funded' && <Button variant="secondary" onClick={() => repay(l.id)}>Repay</Button>}</div></div>)}</div><LoanDetailCard data={data.detail} /></Panel></div>{user?.role === 'lender' && <Panel title="Pending marketplace" kicker="LENDER ROLE"><div className="list-stack">{market.map(l => <div className="list-row" key={l.id}><div><strong>{money(l.principal || l.requested_amount)}</strong><small>{l.term_months} mo · {l.rate_pct}%</small></div><Button onClick={() => fund(l.id)}>Fund loan</Button></div>)}</div></Panel>}</>; }

function Lender({ token, setToast }) { const api = useApi(token, setToast), [portfolio, setPortfolio] = useState(DEMO_MODE ? DEMO.lenderPortfolio.portfolio : null), [risk, setRisk] = useState(null); const load = async () => setPortfolio(normalize(await api('/api/lender/portfolio'), ['portfolio'])); useEffect(() => { load(); }, []); return <><PageHeader eyebrow="LENDING / LENDER" title="Portfolio risk, not another score." description="The lender lens translates the shared trust score into expected-loss exposure and portfolio analytics." right={<Button variant="secondary" onClick={load}>Refresh portfolio</Button>} /><div className="stats-row"><Stat label="Portfolio" value={money(portfolio?.totalFunded)} sub="Funded principal" /><Stat label="Outstanding" value={money(portfolio?.totalOutstanding ?? portfolio?.outstanding)} sub="Current exposure" /><Stat label="Expected loss" value={portfolio?.weightedAvgExpectedLossPct != null ? pct(portfolio.weightedAvgExpectedLossPct) : '—'} sub="Weighted average" /><Stat label="Loans" value={portfolio?.loanCount ?? 0} sub="Across statuses" /></div><Panel title="Borrower risk view" kicker="LOOK UP A BORROWER"><Field label="Borrower user ID"><input id="borrower" placeholder="user id" /></Field><Button onClick={async () => setRisk(await api(`/api/lender/risk/${document.getElementById('borrower').value}`))}>View risk</Button><JsonOutput data={risk} /></Panel><Panel title="Status distribution" kicker="PORTFOLIO"><div className="lens-grid dense">{Object.entries(portfolio?.countByStatus || {}).map(([k, v]) => <div className="lens-card" key={k}><div><span className="eyebrow">{k}</span><h3>{v}</h3></div></div>)}</div></Panel></>; }

function Merchant({ token, setToast }) { 
  const api = useApi(token, setToast);
  const [profile, setProfile] = useState(DEMO_MODE ? DEMO.merchantProfile.profile : null);
  const [health, setHealth] = useState(DEMO_MODE ? DEMO.merchantHealth.businessHealth : null);
  const [trend, setTrend] = useState(DEMO_MODE ? DEMO.revenueTrend.weeklyRevenueTrend : []);
  const [out, setOut] = useState({});

  const load = async () => { 
    const r = await Promise.allSettled([
      api('/api/merchant/profile'), 
      api('/api/merchant/health'), 
      api('/api/merchant/revenue-trend?weeks=4')
    ]); 
    if (r[0].status === 'fulfilled') setProfile(normalize(r[0].value, ['profile'])); 
    if (r[1].status === 'fulfilled') setHealth(normalize(r[1].value, ['businessHealth'])); 
    if (r[2].status === 'fulfilled') setTrend(normalize(r[2].value, ['weeklyRevenueTrend']) || []); 
  }; 
  
  useEffect(() => { if (!DEMO_MODE) load(); }, []); 

  const saveProfile = async () => {
    const res = await api('/api/merchant/profile', { method: 'POST', body: JSON.stringify({ businessName: document.getElementById('biz').value, category: document.getElementById('cat').value }) });
    setProfile(res?.profile || res);
    setOut({ saveProfile: res });
    await load();
  };

  const refreshHealth = async () => {
    const res = await api('/api/merchant/health');
    setHealth(normalize(res, ['businessHealth']));
    setOut({ refreshHealth: res });
    await load();
  };

  return <>
    <PageHeader eyebrow="BUSINESS / MERCHANT" title="A business-health lens on the same engine." description="Revenue trend + trust signal become a compact operating view for a merchant." />
    <div className="stats-row">
      <Stat label="Health" value={health?.ratingLabel || '—'} sub="Shared-score lens" />
      <Stat label="Revenue" value={health?.monthlyRevenue != null ? money(health.monthlyRevenue) : '—'} sub="Trailing 30d" />
      <Stat label="Credit line" value={health?.recommendedCreditLineUsd != null ? money(health.recommendedCreditLineUsd) : '—'} sub="Explainable recommendation" />
      <Stat label="Category" value={profile?.category || '—'} sub={profile?.business_name || 'Business'} />
    </div>
    <Panel title="Business profile" kicker="SELF-DECLARED">
      <div className="form-grid">
        <Field label="Business name"><input id="biz" defaultValue={profile?.business_name || 'Corner Store'} /></Field>
        <Field label="Category">
          <select id="cat">
            <option>retail</option>
            <option>food</option>
            <option>services</option>
            <option>other</option>
          </select>
        </Field>
      </div>
      <div className="button-row">
        <Button onClick={saveProfile}>Save profile</Button>
        <Button variant="secondary" onClick={refreshHealth}>Refresh health</Button>
      </div>
      
    </Panel>
    <Panel title="Revenue trend" kicker="TIMESCALE INBOUND"><TrendList items={trend} valueKey="revenue" /></Panel>
  </>; 
}

function Enterprise({ token, setToast }) { const api = useApi(token, setToast), [profile, setProfile] = useState(DEMO_MODE ? DEMO.enterpriseProfile.profile : null), [workforce, setWorkforce] = useState(DEMO_MODE ? DEMO.enterpriseWorkforce.workforce : null), [link, setLink] = useState(null); const load = async () => { const r = await Promise.allSettled([api('/api/enterprise/profile'), api('/api/enterprise/workforce')]); if (r[0].status === 'fulfilled') setProfile(normalize(r[0].value, ['profile'])); if (r[1].status === 'fulfilled') setWorkforce(normalize(r[1].value, ['workforce'])); }; useEffect(() => { if (!DEMO_MODE) load(); }, []); return <><PageHeader eyebrow="BUSINESS / ENTERPRISE" title="Workforce, seen through the same signal." description="Employer profile, employee self-link and a workforce rollup with score distribution and loan exposure." right={<Button variant="secondary" onClick={load}>Refresh workforce</Button>} /><div className="stats-row"><Stat label="Headcount" value={workforce?.headcount ?? '—'} sub="Linked employees" /><Stat label="Scored" value={workforce?.scoredCount ?? '—'} sub="Employees with signal" /><Stat label="Average trust" value={workforce?.avgTrustScore ?? '—'} sub="Same trust engine" /><Stat label="Outstanding" value={workforce?.loanPortfolio?.totalOutstanding != null ? money(workforce.loanPortfolio.totalOutstanding) : '—'} sub="Loan exposure" /></div><Panel title="Organization" kicker="EMPLOYER"><Field label="Organization name"><input id="org" defaultValue={profile?.organization_name || 'Acme Corp'} /></Field><div className="button-row"><Button onClick={async () => { await api('/api/enterprise/profile', { method: 'POST', body: JSON.stringify({ organizationName: document.getElementById('org').value }) }); await load(); }}>Save organization</Button></div></Panel><Panel title="Rating distribution" kicker="WORKFORCE"><div className="lens-grid dense">{Object.entries(workforce?.ratingDistribution || {}).map(([k, v]) => <div className="lens-card" key={k}><div><span className="eyebrow">{k}</span><h3>{v}</h3></div></div>)}</div></Panel><Panel title="Employee self-link" kicker="INDIVIDUAL"><Field label="Organization name"><input id="employeeOrg" defaultValue="Acme Corp" /></Field><Button onClick={async () => setLink(await api('/api/enterprise/employee-link', { method: 'POST', body: JSON.stringify({ organizationName: document.getElementById('employeeOrg').value }) }))}>Link me to organization</Button><JsonOutput data={link} /></Panel></>; }



const Candlestick = (props) => {
  const { x, y, width, height, payload } = props;
  const { open, close, high, low } = payload;
  if (high == null || low == null) return null;
  const isUp = close >= open;
  const color = isUp ? 'var(--teal)' : 'var(--risk)';
  const valueRange = high - low || 0.001;
  const pixelPerValue = height / valueRange;
  const yOpen = y + (high - open) * pixelPerValue;
  const yClose = y + (high - close) * pixelPerValue;
  const bodyTop = Math.min(yOpen, yClose);
  const bodyBottom = Math.max(yOpen, yClose);
  const bodyHeight = Math.max(bodyBottom - bodyTop, 2);
  return (
    <g stroke={color} fill={color} strokeWidth="2">
      <line x1={x + width / 2} y1={y} x2={x + width / 2} y2={y + height} />
      <rect x={x} y={bodyTop} width={width} height={bodyHeight} />
    </g>
  );
};

function StockPredictor({ setToast }) {
  const [ticker, setTicker] = useState('AAPL');
  const [data, setData] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [showVwap, setShowVwap] = useState(true);
  const [showCandles, setShowCandles] = useState(true);
  const [showLiquidity, setShowLiquidity] = useState(true);
  const wsRef = useRef(null);
  
  const analyzeSimulated = () => {
    setIsLive(false);
    if (wsRef.current) wsRef.current.close();
    
    let currentPrice = 150 + Math.random() * 50;
    let cumulativeVP = 0;
    let cumulativeV = 0;
    const history = [];
    
    for(let i=0; i<30; i++) {
      const vol = Math.floor(Math.random() * 10000) + 1000;
      const open = currentPrice;
      const close = currentPrice + (Math.random() - 0.5) * 5;
      const high = Math.max(open, close) + Math.random() * 2;
      const low = Math.min(open, close) - Math.random() * 2;
      
      cumulativeVP += close * vol;
      cumulativeV += vol;
      const runningVwap = cumulativeVP / cumulativeV;
      
      history.push({ 
        day: i+1, price: Number(close.toFixed(2)), vwap: Number(runningVwap.toFixed(2)), volume: vol,
        open: Number(open.toFixed(2)), high: Number(high.toFixed(2)), low: Number(low.toFixed(2)), close: Number(close.toFixed(2)),
        range: [Number(low.toFixed(2)), Number(high.toFixed(2))]
      });
      currentPrice = close;
    }
    
    const finalVwap = cumulativeVP / cumulativeV;
    
    setData({
      ticker: ticker.toUpperCase(),
      vwap: finalVwap,
      liquidityScore: cumulativeV / 30,
      currentPrice,
      history
    });
    setToast('Simulated mathematical analysis complete!');
  };

  const startLiveCrypto = () => {
    setIsLive(true);
    if (wsRef.current) wsRef.current.close();
    setTicker('BTCUSDT');
    
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
    wsRef.current = ws;
    
    let liveHistory = [];
    let cumulativeVP = 0;
    let cumulativeV = 0;
    let tickCount = 0;
    let currentBucket = null;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const price = parseFloat(msg.p);
      const vol = parseFloat(msg.q);
      
      if (!currentBucket) currentBucket = { open: price, high: price, low: price, close: price, vol: 0 };
      currentBucket.high = Math.max(currentBucket.high, price);
      currentBucket.low = Math.min(currentBucket.low, price);
      currentBucket.close = price;
      currentBucket.vol += vol;
      
      cumulativeVP += price * vol;
      cumulativeV += vol;
      tickCount++;
      
      if (tickCount % 5 === 0) {
        const runningVwap = cumulativeVP / cumulativeV;
        const time = new Date(msg.E).toLocaleTimeString();
        
        liveHistory.push({
          day: time,
          price: Number(price.toFixed(2)),
          vwap: Number(runningVwap.toFixed(2)),
          volume: currentBucket.vol,
          open: Number(currentBucket.open.toFixed(2)),
          high: Number(currentBucket.high.toFixed(2)),
          low: Number(currentBucket.low.toFixed(2)),
          close: Number(currentBucket.close.toFixed(2)),
          range: [Number(currentBucket.low.toFixed(2)), Number(currentBucket.high.toFixed(2))]
        });
        currentBucket = null;
        
        if (liveHistory.length > 30) liveHistory.shift();
        
        setData({
          ticker: 'BTC/USDT (LIVE)',
          vwap: runningVwap,
          liquidityScore: cumulativeV,
          currentPrice: price,
          history: [...liveHistory]
        });
      }
    };
    
    setToast('Connected to Live Crypto Market');
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return (
    <>
      <PageHeader eyebrow="MARKETS / AI" title="Mathematical Stock Predictor" description="Advanced VWAP and liquidity models. Stream live trades or run simulations with visual overlays." />
      <Panel title="Analyze Asset" kicker="PREDICTOR">
        <div className="form-grid">
          <Field label="Ticker Symbol"><input id="ticker" value={ticker} onChange={e => setTicker(e.target.value)} disabled={isLive} /></Field>
        </div>
        <div className="button-row" style={{ marginTop: '16px' }}>
          <Button onClick={analyzeSimulated}>Run Simulation</Button>
          <Button variant="secondary" onClick={startLiveCrypto}>{isLive ? 'Streaming Live...' : 'Stream Live Crypto Data'}</Button>
        </div>
      </Panel>
      
      {data && (
        <>
          <div className="stats-row" style={{ marginTop: '24px' }}>
            <Stat label="Asset" value={data.ticker} sub={isLive ? "Crypto" : "Equities"} />
            <Stat label="Current Price" value={'\$' + data.currentPrice.toFixed(2)} sub="Market" />
            <Stat label="VWAP" value={'\$' + data.vwap.toFixed(2)} sub="Vol-Weighted Avg" />
            <Stat label="Liquidity Score" value={Math.floor(data.liquidityScore).toLocaleString()} sub={isLive ? "Cumulative Vol" : "Avg Vol"} />
          </div>
          
          <Panel title="Price & VWAP Trend" kicker="GRAPHICAL REPRESENTATION" style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', padding: '0 16px', marginTop: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input type="checkbox" checked={showVwap} onChange={e => setShowVwap(e.target.checked)} /> Show VWAP
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input type="checkbox" checked={showCandles} onChange={e => setShowCandles(e.target.checked)} /> Candlestick Forms
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input type="checkbox" checked={showLiquidity} onChange={e => setShowLiquidity(e.target.checked)} /> Liquidity Sweep (Volume)
              </label>
            </div>
            
            <div style={{ height: '350px', width: '100%', marginTop: '16px', padding: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.history}>
                  <XAxis dataKey="day" stroke="var(--slate-body)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" domain={['auto', 'auto']} stroke="var(--slate-body)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => '\$' + val} />
                  {showLiquidity && <YAxis yAxisId="right" orientation="right" stroke="var(--slate-body)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val > 1000 ? (val/1000).toFixed(1)+'k' : val} />}
                  <Tooltip contentStyle={{ backgroundColor: 'var(--surface-container)', border: '1px solid var(--border-hairline)', borderRadius: '8px', color: 'var(--slate-headline)' }} />
                  
                  {showLiquidity && <Bar yAxisId="right" dataKey="volume" fill="var(--slate-body)" opacity={0.2} name="Volume" isAnimationActive={!isLive} />}
                  
                  {showCandles ? (
                    <Bar yAxisId="left" dataKey="range" shape={<Candlestick />} name="OHLC" isAnimationActive={!isLive} />
                  ) : (
                    <Line yAxisId="left" type="monotone" dataKey="price" stroke="var(--teal)" strokeWidth={2} dot={false} name="Price" isAnimationActive={!isLive} />
                  )}
                  
                  {showVwap && <Line yAxisId="left" type="monotone" dataKey="vwap" stroke="var(--risk)" strokeWidth={2} dot={false} name="VWAP" strokeDasharray="5 5" isAnimationActive={!isLive} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </>
      )}
    </>
  );
}

function FamilyFinance({ token, setToast }) {
  const [members, setMembers] = useState([{ name: 'Spouse', balance: 1200 }, { name: 'Child (Teen)', balance: 150 }]);
  const [sharedGoal, setSharedGoal] = useState(5000);
  const [saved, setSaved] = useState(1200);

  return (
    <>
      <PageHeader eyebrow="YOU / FAMILY" title="Family Finance Companion" description="Manage shared goals, view family balances, and allocate allowances." />
      <div className="stats-row">
        <Stat label="Total Family Balance" value={money(members.reduce((a, b) => a + b.balance, 0))} sub="Across accounts" />
        <Stat label="Shared Goal" value={money(sharedGoal)} sub="Family Vacation" />
        <Stat label="Goal Progress" value={pct((saved / sharedGoal) * 100)} sub={money(saved) + ' saved'} />
      </div>
      <Panel title="Family Members" kicker="ACCOUNTS">
        <div className="list-stack">
          {members.map((m, i) => (
            <div className="list-row" key={i}>
              <div>
                <strong>{m.name}</strong>
                <small>Linked account</small>
              </div>
              <strong style={{ fontFamily: 'Space Grotesk' }}>{money(m.balance)}</strong>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function Chatbot({ token }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ text: "Hi, I'm your financial assistant. How can I help?", sender: 'bot' }]);
  const [input, setInput] = useState('');
  const [speak, setSpeak] = useState(true);
  const api = useApi(token, () => {});

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { text: msg, sender: 'user' }]);
    
    try {
      const res = await api('/api/education/qa', {
        method: 'POST',
        body: JSON.stringify({ question: msg, withAudio: speak })
      });
      let answer = res.qa?.answer || 'Sorry, I encountered an error.';
      setMessages(prev => [...prev, { text: answer, sender: 'bot' }]);
      
      if (speak && res.narration && res.narration.audioBase64) {
        const audio = new Audio(`data:${res.narration.mimeType};base64,${res.narration.audioBase64}`);
        audio.play().catch(e => console.error('Audio play failed:', e));
      }
    } catch (err) {
      setMessages(prev => [...prev, { text: 'Sorry, I am offline.', sender: 'bot' }]);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: 24, right: open ? 24 : 80, zIndex: 1000 }}>
      {open ? (
        <div style={{ width: 320, height: 450, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#172029' }}>
            <strong style={{ fontFamily: 'Space Grotesk', fontSize: 16 }}>AI Companion</strong>
            <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--slate-headline)', cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
          
          <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--surface)' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start', background: m.sender === 'user' ? 'var(--teal)' : 'var(--surface-container)', color: m.sender === 'user' ? '#000' : 'var(--slate-body)', padding: '8px 12px', borderRadius: 8, maxWidth: '85%', fontSize: 13, lineHeight: 1.4 }}>
                {m.text}
              </div>
            ))}
          </div>
          
          <div style={{ padding: '8px 12px', background: 'var(--surface-container)', borderTop: '1px solid var(--border-hairline)' }}>
            <label style={{ fontSize: 11, color: 'var(--slate-body)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', marginBottom: 6 }}>
              <input type="checkbox" checked={speak} onChange={e => setSpeak(e.target.checked)} /> Auto-Speak Replies (Regional)
            </label>
            <form onSubmit={send} style={{ display: 'flex', gap: 8 }}>
              <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything..." style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--slate-headline)' }} />
              <button type="submit" style={{ background: 'var(--teal)', color: '#000', border: 'none', padding: '0 12px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Send</button>
            </form>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} style={{ width: 56, height: 56, borderRadius: 28, background: 'var(--teal)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        </button>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
