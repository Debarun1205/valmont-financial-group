require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { pool, initSchema, getHasTimescale } = require('./db');
const { buildAuthMiddleware } = require('./middleware/auth');
const buildAuthRoutes = require('./routes/auth');
const buildTrustScoreRoutes = require('./routes/trustScore');
const buildWalletRoutes = require('./routes/wallet');
const buildLoanRoutes = require('./routes/loans');
const buildAdvisoryRoutes = require('./routes/advisory');
const buildLenderRoutes = require('./routes/lender');
const buildInsuranceRoutes = require('./routes/insurance');
const buildRemittanceRoutes = require('./routes/remittance');
const buildEducationRoutes = require('./routes/education');
const buildBudgetRoutes = require('./routes/budget');
const buildStudentRoutes = require('./routes/student');
const buildMerchantRoutes = require('./routes/merchant');
const buildEnterpriseRoutes = require('./routes/enterprise');
const buildMlRoutes = require('./routes/ml');
const buildDsRoutes = require('./routes/ds');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: true
}));
app.use(express.json({ limit: '4mb' }));

const requireAuth = buildAuthMiddleware();

app.get('/health', (req, res) => res.json({
  ok: true,
  checkpoint: 16,
  timescale: getHasTimescale(),
  database: 'mongodb',
  aiProviders: {
    gemini: Boolean(process.env.GEMINI_API_KEY),
    groqFallback: Boolean(process.env.GROQ_API_KEY)
  },
  googleAuth: Boolean(process.env.GOOGLE_CLIENT_ID),
  modules: [
    'Identity & Trust Score (+ student starter-identity entry path)',
    'Wallet (+ crypto + gold assets)',
    'Loan Marketplace',
    'Investment Advisory (+ retirement/REITs buckets + goal-based framing)',
    'Lender Dashboard',
    'Insurance',
    'Remittances',
    'Financial Education (tutorial/Q&A/learning plan)',
    'Budgeting Nudge',
    'Merchant view (business-health lens)',
    'Enterprise view (workforce rollup lens)',
    'Warm onboarding quiz + customer tiers',
    'AI model training lab',
    'Data-science applications'
  ],
  tier0Complete: true,
  tier1Complete: true,
  tier2Complete: true,
  tier3Progress: ['remaining Module 12 asset classes: retirement + REITs + goal-based framing (done)']
}));

app.use('/api/auth', buildAuthRoutes(pool, requireAuth));
app.use('/api/trust-score', buildTrustScoreRoutes(pool, requireAuth));
app.use('/api/wallet', buildWalletRoutes(pool, requireAuth));
app.use('/api/loans', buildLoanRoutes(pool, requireAuth));
app.use('/api/advisory', buildAdvisoryRoutes(pool, requireAuth));
app.use('/api/lender', buildLenderRoutes(pool, requireAuth));
app.use('/api/insurance', buildInsuranceRoutes(pool, requireAuth));
app.use('/api/remittance', buildRemittanceRoutes(pool, requireAuth));
app.use('/api/education', buildEducationRoutes(pool, requireAuth));
app.use('/api/budget', buildBudgetRoutes(pool, requireAuth));
app.use('/api/student', buildStudentRoutes(pool, requireAuth));
app.use('/api/merchant', buildMerchantRoutes(pool, requireAuth));
app.use('/api/enterprise', buildEnterpriseRoutes(pool, requireAuth));
app.use('/api/ml', buildMlRoutes(pool, requireAuth));
app.use('/api/ds', buildDsRoutes(pool, requireAuth));

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await initSchema();
  } catch (err) {
    console.error('[server] MongoDB init failed — set MONGODB_URI to your MongoDB connection string');
    console.error(err.message);
    process.exit(1);
  }
  app.listen(PORT, () => console.log(`[server] listening on :${PORT} — Checkpoint 16, deploy-ready`));
}

start();
