-- Requires the TimescaleDB extension (already present in the timescale/timescaledb-ha image)
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Core identity table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,           -- only used in DEV_AUTH_BYPASS mode; real Auth0 handles this in prod
  role TEXT NOT NULL DEFAULT 'individual', -- individual | lender | enterprise | admin
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Income verification results (Module 1, Gemini OCR)
CREATE TABLE IF NOT EXISTS income_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  extracted_monthly_income NUMERIC,
  currency TEXT DEFAULT 'USD',
  raw_extraction JSONB,          -- full Gemini response, kept for the evidence trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- THE TIGER DATA INTEGRATION: a hypertable for the transaction stream.
-- This is what "real-time analytics on a time-series pipeline" genuinely means here —
-- not a call to an external scoring API, but fast windowed SQL over time-partitioned data.
CREATE TABLE IF NOT EXISTS transactions (
  time TIMESTAMPTZ NOT NULL DEFAULT now(),
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC NOT NULL,
  direction TEXT NOT NULL,       -- 'in' | 'out'
  channel TEXT DEFAULT 'wallet', -- wallet | loan | crypto | remittance ... (extended in later modules)
  counterparty TEXT
);

SELECT create_hypertable('transactions', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_transactions_user_time ON transactions (user_id, time DESC);

-- Module 11 (Checkpoint 7) addition: which asset a row is denominated in.
-- Defaults to 'USD' so every pre-existing wallet/loan row is unaffected.
-- amount for a channel='crypto' row is denominated in `asset` (e.g. 'SOL'),
-- NOT in USD — see services/walletService.computeCryptoBalance and
-- routes/wallet.js's crypto endpoints for the conversion logic.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS asset TEXT NOT NULL DEFAULT 'USD';

-- Checkpoint 10 (Tier 2): digital gold reuses this same generic `asset`
-- column with channel='gold' rows (asset='XAU_GRAM', amount denominated in
-- grams) — no schema change needed, same pattern as the crypto/SOL rows
-- above. See routes/wallet.js's /gold/* endpoints.

-- Computed trust scores (Module 1 output, consumed by Modules 3/4/6/13/17)
CREATE TABLE IF NOT EXISTS trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  score NUMERIC NOT NULL,
  income_component NUMERIC,
  fraud_component NUMERIC,
  evidence JSONB,                 -- the numbers behind the score, shown to lenders in Module 6
  onchain_signature TEXT,         -- Solana devnet tx signature, if attestation succeeded
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trust_scores_user ON trust_scores (user_id, computed_at DESC);

-- Module 2: Wallet. Balance is deliberately NOT stored here — it's derived
-- from the transactions ledger (see services/walletService.js) so there is
-- exactly one source of truth and no risk of the two drifting apart. This
-- table holds per-user wallet metadata that isn't a running balance.
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  solana_public_key TEXT,          -- devnet keypair generated at wallet creation (Module 11 extends this to multi-asset)
  savings_vault_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Module 3: Loan Marketplace. Pricing/eligibility come from the latest
-- trust_scores row at request time (reused, not recomputed — see
-- services/loanService.js). Funding and repayment also write rows into the
-- `transactions` hypertable with channel='loan', so loan behavior flows into
-- the existing fraud-signal query (services/fraudSignal.js) for free — no
-- changes needed there, per the "one ledger, many channels" pattern.
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id UUID NOT NULL REFERENCES users(id),
  lender_id UUID REFERENCES users(id),
  principal NUMERIC NOT NULL,
  term_months INTEGER NOT NULL,
  interest_rate_pct NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | funded | rejected | repaid
  trust_score_at_request NUMERIC,
  expected_loss_pct_at_request NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  funded_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans (borrower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans (status, created_at DESC);

CREATE TABLE IF NOT EXISTS loan_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id),
  installment_number INTEGER NOT NULL,
  amount_due NUMERIC NOT NULL,
  due_at TIMESTAMPTZ,
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_loan_installments_loan ON loan_installments (loan_id, installment_number);

-- Module 4: Investment Advisory. One row per generated recommendation, kept
-- as a history (not overwritten) so a user can see advice evolve alongside
-- their trust score, and so a future module (e.g. an enterprise/advisor
-- view) has an audit trail of what was suggested and when.
CREATE TABLE IF NOT EXISTS investment_advice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  risk_tolerance TEXT NOT NULL,
  goal TEXT NOT NULL,
  horizon_months INTEGER NOT NULL,
  allocation JSONB NOT NULL,
  explanation TEXT,
  mocked BOOLEAN NOT NULL DEFAULT FALSE,
  goal_framing JSONB, -- Checkpoint 15 (Tier 3): deterministic goal-based projection, see advisoryService.computeGoalFraming(); nullable since it's ok:false with no income on file
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_investment_advice_user ON investment_advice (user_id, created_at DESC);

-- Module 13: Insurance — the THIRD lens on the trust-score engine (lender ->
-- expected loss, insurer -> premium multiplier). Pricing is computed in
-- services/insuranceService.js from trustScoreEngine.scoreToInsurancePremiumMultiplier();
-- this table just stores the resulting quote/policy, same "reuse, don't
-- recompute" pattern as loans.
CREATE TABLE IF NOT EXISTS insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  policy_type TEXT NOT NULL, -- health | device | income-protection
  coverage_amount NUMERIC NOT NULL,
  monthly_premium NUMERIC NOT NULL,
  trust_score_at_quote NUMERIC,
  premium_multiplier_at_quote NUMERIC,
  status TEXT NOT NULL DEFAULT 'active', -- active | lapsed | cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_user ON insurance_policies (user_id, created_at DESC);

-- Module 12 (Checkpoint 8): Remittances. sourceAmountUsd is debited whole
-- from the sender's fiat wallet (channel='wallet' transaction, same ledger
-- as everything else); feeUsd/destAmount are stored for the receipt/history
-- view. Cross-border payout itself is out of scope for the hackathon (see
-- docs "never build: real trading/exchange integration") — this models the
-- quote+debit half of the flow honestly, per the same "stated placeholder,
-- not a hidden gap" approach as the Snowflake note in lenderAnalytics.js.
CREATE TABLE IF NOT EXISTS remittances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  recipient_name TEXT NOT NULL,
  dest_country TEXT,
  dest_currency TEXT NOT NULL,
  source_amount_usd NUMERIC NOT NULL,
  fee_usd NUMERIC NOT NULL,
  fx_rate NUMERIC NOT NULL,
  dest_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent', -- sent | mock-payout-pending (see header comment)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_remittances_user ON remittances (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES insurance_policies(id),
  claim_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'filed', -- filed | approved | denied
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_policy ON insurance_claims (policy_id, created_at DESC);

-- Modules 9/10 (Checkpoint 9): Financial Education — tutorial, live-guidance
-- Q&A, persona-based learning plan. ElevenLabs narration (adapters/elevenlabs.js)
-- is only stored as a flag here (audio itself is generated on read, not
-- persisted, to keep this table small for the demo) — see routes/education.js.
CREATE TABLE IF NOT EXISTS tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  topic TEXT NOT NULL,
  persona TEXT NOT NULL,
  language TEXT NOT NULL,
  title TEXT,
  body TEXT,
  mocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tutorials_user ON tutorials (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS qa_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  question TEXT NOT NULL,
  answer TEXT,
  language TEXT NOT NULL,
  mocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qa_log_user ON qa_log (user_id, created_at DESC);

-- Checkpoint 11 (Tier 2): Budgeting Nudge. One row per goal-setting action,
-- kept as history (not overwritten) so a user's savings target can change
-- over time and the nudge always reads the latest — same "history, not
-- overwritten" pattern as investment_advice and insurance_policies.
CREATE TABLE IF NOT EXISTS budget_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  target_savings_pct NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_budget_goals_user ON budget_goals (user_id, created_at DESC);

-- Checkpoint 12 (Tier 2, third item): Student starter-identity. A lighter-
-- weight entry into Module 1's trust score for users with no income
-- document yet (most students) -- self-declared school + optional monthly
-- allowance stand in for a Gemini-OCR-verified income document. History,
-- not overwritten, same pattern as budget_goals/investment_advice. The
-- computed starter score is written into the SAME trust_scores table as
-- the normal path (see routes/student.js), tagged
-- evidence.entryPath='student-starter' -- reusing the one table/one engine
-- rather than forking a parallel one, per the "one engine, many lenses"
-- thesis documented in services/trustScoreEngine.js.
CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  school_name TEXT NOT NULL,
  expected_grad_year INTEGER NOT NULL,
  monthly_allowance NUMERIC, -- self-declared, unverified -- see MAX_SELF_DECLARED_ALLOWANCE cap in studentIdentityService.js
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_student_profiles_user ON student_profiles (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS learning_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  persona TEXT NOT NULL,
  goal TEXT NOT NULL,
  horizon_weeks INTEGER NOT NULL,
  language TEXT NOT NULL,
  weeks JSONB NOT NULL,
  mocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learning_plans_user ON learning_plans (user_id, created_at DESC);

-- Checkpoint 13 (Tier 2, fourth item): Merchant view. A self-declared
-- business profile, same lightweight "no verification yet" shape as
-- student_profiles. The FOURTH lens on the trust-score engine (lender ->
-- expected loss, insurer -> premium multiplier, merchant -> business health
-- rating) -- see trustScoreEngine.scoreToMerchantHealthRating(). No new
-- score is computed for merchants; routes/merchant.js reads the same
-- trust_scores row every other lens reads.
CREATE TABLE IF NOT EXISTS merchant_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  business_name TEXT NOT NULL,
  category TEXT NOT NULL, -- retail | food | services | other (free text for the demo)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_merchant_profiles_user ON merchant_profiles (user_id, created_at DESC);

-- Checkpoint 14 (Tier 2, fifth and last item): Enterprise view. An
-- employer/organization account (role='enterprise') declares an
-- organization_name; individual employees self-declare membership in that
-- same org (employee_links) -- same "self-declared, unverified" honesty as
-- student_profiles/merchant_profiles. No new score is computed here: the
-- enterprise dashboard rolls up the SAME trust_scores + loans rows every
-- other lens reads, across the population of an org's employees, reusing
-- lenderAnalytics.summarizePortfolio() for the loan side (see
-- services/enterpriseAnalytics.js).
CREATE TABLE IF NOT EXISTS enterprise_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  organization_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enterprise_profiles_user ON enterprise_profiles (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS employee_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_user_id UUID NOT NULL REFERENCES users(id),
  organization_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employee_links_org ON employee_links (organization_name);
CREATE INDEX IF NOT EXISTS idx_employee_links_user ON employee_links (employee_user_id, created_at DESC);
