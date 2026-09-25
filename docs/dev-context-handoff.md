# Dev Context Handoff — Universal Finance Platform (HackNex 2026)

**Purpose of this file:** paste this whole document into a new Claude chat (along with the repo, e.g. as a zip upload or by pasting relevant files) to resume exactly where this session left off — no need to re-explain the idea, the constraints, or what's built.

---

## 1. Event context

- **Event:** HackNex, 36-hour hackathon, started 25 Sept 2026
- **Team:** 5 members
- **Submission:** dual (Devfolio + Risers Cre8), public repo with **active commit history spanning the 36 hacking hours**
- **Compliance rule that matters for how code gets written:** all code must be created *during* the official hacking window. Code written before the event, or committed with backdated/batch history, risks disqualification. **Practical implication: whatever is in this repo at handoff time should be treated as reference material to be typed/pasted and committed live during the actual hacking hours — not pushed verbatim with pre-existing git history.**
- **Judging weights:** Fruition 25% (working demo) > Usability 20% = Innovation 20% = Novelty 20% > Business 15%. Fruition is the single biggest number — this has driven every scoping decision in this project.
- Sponsors targeted (all genuinely integrated, not checkbox usage): Auth0, Solana, Gemini API, ElevenLabs, Tiger Data (= TimescaleDB), Snowflake, Vultr. Prune and Tracecommons were never clarified by the sponsor list the team had — not integrated.

## 2. The product, in one paragraph

A "universal finance app" for individuals (gig workers through students to salaried professionals), lenders/banks, merchants, and enterprises: one portable, on-chain trust score (Solana-attested) built from income verification (Gemini OCR) and real-time transaction behavior (TimescaleDB/Tiger Data), that powers a wallet (fiat + crypto), a loan marketplace, AI investment advisory (stocks/crypto/mutual funds/gold/fixed income/retirement), insurance, remittances, financial education (regional-language, persona-paced), and — the core differentiator — the **same risk engine re-shown as a loan-loss predictor to banks, a premium-pricing signal to insurers, and a business-health score to merchants.** "One engine, many lenses" is the technical thesis to keep repeating in the pitch.

**Full product spec (18 modules, journeys, sponsor mapping, full vision):** see the separate "Universal Finance Platform — Full Documentation" artifact from the planning chat. This handoff file does NOT repeat that spec — it only tracks *build* state. If a new chat doesn't have that documentation, ask the user to paste/attach it before making product decisions; this file alone is enough to keep coding but not enough to redesign a module.

## 3. Build plan — tiers (from the documentation's Section 6)

- **Tier 0 (hour 0–14, non-negotiable):** Auth, trust-score engine, wallet, loan request+fund, investment advisory, lender dashboard
- **Tier 1 (hour 14–22):** one tutorial, one live-guidance Q&A, one learning plan, crypto-as-second-wallet-asset, insurance-as-third-lens, remittances
- **Tier 2 (hour 22–29):** pick one extra asset class, budgeting nudge, one enterprise view, one merchant view, student starter-identity
- **Tier 3 (hour 29–33, stretch only):** everything else
- **Never build, pitch as roadmap:** real trading/exchange integration, real KYC/AML, filmed video, persistent live-call guidance, a second fraud model for crypto

**Rule the team agreed on:** don't start tier N+1 until tier N is fully demoable end-to-end.

## 4. Tech stack decisions (don't relitigate these without a reason)

- **Backend:** Node.js + Express, plain JavaScript (not TypeScript — chosen for hackathon speed)
- **Database:** PostgreSQL + **TimescaleDB extension**. This is the actual Tiger Data integration — a hypertable (`transactions`) with real-time windowed SQL queries, not an external "fraud API" call. Local dev via `docker-compose.yml` (image `timescale/timescaledb-ha:pg17`)
- **Auth:** Auth0-ready via `express-oauth2-jwt-bearer`, with a `DEV_AUTH_BYPASS=true` mode (simple signed JWT) so the team can build before anyone's created the Auth0 tenant. Flip one env var to switch — no route code changes needed.
- **AI:** Gemini API (`gemini-2.0-flash`), called via plain `fetch` to the REST endpoint (no SDK dependency). One shared adapter (`adapters/gemini.js`) — every module that needs Gemini (advisory, tutorials, learning plans) should extend this file, not create a second client.
- **Chain:** Solana devnet, `@solana/web3.js`, writing a SHA-256 hash of the score as a **memo transaction** (not the raw score — privacy). `adapters/solana.js`.
- **Voice:** ElevenLabs — not wired yet, planned for the Tier 1 checkpoint.
- **Frontend:** currently a single plain HTML/JS file (`frontend/index.html`) as a raw test harness — explicitly NOT the judged UI. Plan is to build the real frontend in React once enough backend modules exist to make a UI meaningful (consult the `frontend-design` skill when that happens, if using Claude to build it).
- **Every adapter has a mock fallback.** The entire app runs and demos with zero API keys filled in. This was a deliberate choice so the team is never blocked waiting on a credential — fill in `.env` as each sponsor's key/account becomes available during the event.

## 5. What's built — Checkpoint log

### ✅ Checkpoint 1 — Module 1: Identity & Trust Score engine (committed: "Checkpoint 1: Module 1 - Identity & Trust Score engine")

Files:
- `backend/schema.sql` — users, income_documents, `transactions` (hypertable!), trust_scores
- `backend/db.js` — pg Pool + schema init on boot
- `backend/services/trustScoreEngine.js` — **pure function**, unit tested, the one scoring function every later module reuses (`computeTrustScore`, `scoreToExpectedLoss`)
- `backend/services/fraudSignal.js` — the real TimescaleDB windowed query (`time_bucket`, velocity + amount-spike detection)
- `backend/adapters/gemini.js` — income-doc OCR, mock fallback
- `backend/adapters/solana.js` — devnet memo attestation, mock fallback
- `backend/middleware/auth.js` + `routes/auth.js` — dev-bypass auth working now, Auth0 wired and ready
- `backend/routes/trustScore.js` — `POST /verify-income`, `POST /compute`, `GET /:userId`
- `backend/tests/trustScoreEngine.test.js` — **passing**, run with `npm test`
- `frontend/index.html` — manual test harness

**Verification done in the build session:** all files pass `node --check` (syntax); `trustScoreEngine.test.js` passes with real assertions (verified income+clean history scores higher than no-history; fraud-flagged history pulls score down even with strong income; score→expected-loss mapping is monotonic). **Not yet verified:** a live run against an actual TimescaleDB instance (no Docker available in the environment this was built in) — the team should run `docker compose up -d && npm run dev` as their first step and confirm `schema.sql` applies cleanly before building Checkpoint 2 on top of it.

### ✅ Checkpoint 2 — Module 2: Wallet (committed: "Checkpoint 2: Module 2 - Wallet")

Files:
- `backend/schema.sql` — added `wallets` table (public key + savings vault balance only; the spendable balance is NOT stored, deliberately, to avoid two sources of truth)
- `backend/adapters/solana.js` — extended (not duplicated) with `generateWalletKeypair()`. Secret key is never persisted anywhere — no custody model in this hackathon build, by design
- `backend/services/walletService.js` — **pure functions**, unit tested: `computeBalance()` (nets the ledger), `validateTransfer()`, `validateVaultDeposit()`
- `backend/routes/wallet.js` — `POST /create`, `GET /balance`, `POST /transfer` (atomic two-row ledger write in a DB transaction), `POST /vault/deposit`, `GET /history`
- `backend/tests/walletService.test.js` — **passing**
- `frontend/index.html` — extended with a wallet test section

**Verification done:** all new files pass `node --check`; `walletService.test.js` passes (balance nets correctly, overdraft rejected, negative amounts rejected, vault deposit respects balance). **Not yet verified:** live DB run, same caveat as Checkpoint 1 — no Docker in the build sandbox.

### ✅ Checkpoint 3 — Module 3: Loan Marketplace (committed: "Checkpoint 3: Module 3 - Loan Marketplace")
Files:
- `backend/schema.sql` — added `loans` and `loan_installments` tables
- `backend/services/loanService.js` — **pure functions**, unit tested: `evaluateLoanApplication()` (score-tiered eligibility + risk-priced rate via `trustScoreEngine.scoreToExpectedLoss`), `buildRepaymentSchedule()` (flat-interest, equal installments), `validateFunding()`, `validateRepayment()`
- `backend/routes/loans.js` — `POST /request`, `GET /mine`, `GET /marketplace` (lender role), `POST /:loanId/fund` (lender role), `POST /:loanId/repay`, `GET /:loanId`
- `backend/tests/loanService.test.js` — **passing**
- `frontend/index.html` — extended with a loan marketplace test section (borrower + lender flows, separate token slots)
- `backend/server.js` — wired `/api/loans`, health check now reports checkpoint 3

**Design notes carried forward:** rate/eligibility come from the latest `trust_scores` row only — this module never recomputes the score. Funding and repayment write `channel='loan'` rows into the existing `transactions` hypertable (not `channel='wallet'`), so loan behavior feeds `services/fraudSignal.js`'s windowed query automatically with zero changes there, and stays isolated from `walletService.computeBalance()`, which only reads `channel='wallet'` rows — a deliberate hackathon simplification (real cross-channel balance transfer is not built).

**Verification done:** all new files pass `node --check`; `loanService.test.js` passes (low score rejected, higher score → strictly lower rate than lower score at comparable loss, over-cap amount rejected, schedule sums exactly to principal+interest, double-funding rejected, partial/premature repayment rejected). **Not yet verified:** live DB run — same caveat as Checkpoints 1–2, no Docker in the build sandbox; run `docker compose up -d && npm run dev` and exercise the new frontend section before Checkpoint 4.

### ✅ Checkpoint 4 — Module 4: Investment Advisory (committed: "Checkpoint 4: Module 4 - Investment Advisory")
Files:
- `backend/adapters/gemini.js` — extended (not duplicated) with a shared `callGeminiJSON()` helper used by both income OCR and the new `generateInvestmentAdvice()`. Prompt explicitly caps stocks at 40% regardless of stated risk tolerance and instructs "educational, not financial advice" — matches the documentation's advisory-only scoping.
- `backend/services/advisoryService.js` — **pure functions**, unit tested: `validateRiskProfile()`, `validateAllocation()` (sanity-checks whatever Gemini/mock returns sums to ~100 with no negative buckets, before it can reach the user)
- `backend/schema.sql` — added `investment_advice` table (history, not overwritten — one row per recommendation)
- `backend/routes/advisory.js` — `POST /recommend` (pulls monthlyIncome from Module 1's `income_documents` rather than re-asking), `GET /history`
- `backend/tests/advisoryService.test.js` — **passing**
- `frontend/index.html` — extended with an advisory test section

### ✅ Checkpoint 5 — Module 6: Lender Dashboard (committed: "Checkpoint 5: Module 6 - Lender Dashboard — TIER 0 COMPLETE")
Files:
- `backend/services/lenderAnalytics.js` — **pure function**, unit tested: `summarizePortfolio()` (total funded, outstanding, weighted-avg expected loss, counts by status — guards divide-by-zero on an empty portfolio)
- `backend/routes/lender.js` — `GET /risk/:userId` (same trust score, expected-loss lens — `scoreToExpectedLoss` reused, nothing recomputed), `GET /portfolio` (aggregates this lender's funded loans)
- `backend/tests/lenderAnalytics.test.js` — **passing**
- `frontend/index.html` — extended with a lender test section (needs a second, lender-role user — the harness only signs up "individual" role, so sign up a second user via curl/Postman with `{"role":"lender"}` in the signup body to test this section)
- `backend/server.js` — health check reports `checkpoint: 5, tier0Complete: true`

**Honest note on Snowflake:** the portfolio aggregation in `lenderAnalytics.js`/`routes/lender.js` runs as a Postgres query against the same TimescaleDB instance as everything else — not real Snowflake yet. This is a deliberate, stated placeholder (see the header comment in `lenderAnalytics.js`) rather than a hidden gap: wire an actual Snowflake account + ETL sync in a later checkpoint if time allows, and only change the query source in `routes/lender.js` — the summarization function itself doesn't need to change.

**Verification done:** all new/changed files pass `node --check`; both new test files pass with real assertions (bad risk-tolerance/goal/horizon rejected; malformed or off-sum allocations rejected with small LLM-rounding tolerance; portfolio math correctly excludes pending/rejected loans from funded totals, correctly separates outstanding vs total funded, handles an empty portfolio without dividing by zero). **Not yet verified:** live DB run — same caveat as every prior checkpoint, no Docker in the build sandbox.

**🎯 TIER 0 IS NOW COMPLETE.** The full non-negotiable core loop from the documentation's Section 6 works end-to-end: Auth → trust score (income OCR + fraud signal + on-chain attestation) → wallet → loan request/fund → investment advisory → lender dashboard. Before starting Tier 1, the team should actually run this on a real machine (`docker compose up -d && npm run dev`, click through the whole frontend harness in order) — this is the natural checkpoint to catch any integration surprise before adding more modules on top.

### ✅ Checkpoint 6 — Module 13: Insurance (third lens on the trust score)
Files:
- `backend/services/trustScoreEngine.js` — extended (not forked) with `scoreToInsurancePremiumMultiplier(score)`, the third lens alongside `scoreToExpectedLoss` (lender view): same score, monotonic 0.6x–2.0x premium multiplier
- `backend/services/insuranceService.js` — **pure functions**, unit tested: `quotePolicy()` (base rate × coverage ratio × trust-score multiplier, per-type coverage caps for health/device/income-protection), `validateClaim()`
- `backend/schema.sql` — added `insurance_policies`, `insurance_claims`
- `backend/routes/insurance.js` — `POST /quote`, `POST /purchase`, `POST /:policyId/claim`, `GET /mine`
- `backend/tests/insuranceService.test.js` — **passing**
- `frontend/index.html` — extended with an insurance test section

### ✅ Checkpoint 7 — Module 11: Crypto as a second wallet asset
Files:
- `backend/schema.sql` — added `asset` column to `transactions` (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, defaults to `'USD'` so all prior rows are unaffected)
- `backend/adapters/solana.js` — extended with `getSolPriceUsd()` (mock fallback, real feed via `CRYPTO_PRICE_API_URL`) and `getDevnetSolBalance()` (informational on-chain read, not used for app balance math)
- `backend/services/walletService.js` — extended: `computeBalance()` is **reused as-is** for the crypto ledger (just filtered by `channel='crypto'` in the route), plus new pure functions `quoteCryptoTrade()` and `validateCryptoTrade()`, unit tested
- `backend/routes/wallet.js` — extended with `GET /crypto/balance`, `POST /crypto/quote`, `POST /crypto/buy`, `POST /crypto/sell` — buy/sell write two atomic ledger rows (`channel='wallet'` debit/credit + `channel='crypto'` credit/debit), so crypto trades flow into the existing fraud-signal query for free
- `backend/tests/walletCrypto.test.js` — **passing**
- `frontend/index.html` — extended with a crypto test section

### ✅ Checkpoint 8 — Module 12: Remittances
Files:
- `backend/adapters/fx.js` — new adapter, `getFxRate(destCurrency)`, mock rate table (INR/PHP/MXN/NGN/KES) with real-feed hook via `FX_API_URL`
- `backend/services/remittanceService.js` — **pure functions**, unit tested: `quoteRemittance()` (flat + percent fee, min/max send caps), `validateRemittance()`
- `backend/schema.sql` — added `remittances`
- `backend/routes/remittance.js` — `GET /corridors`, `POST /quote`, `POST /send`, `GET /mine`. **Design note:** the debit transaction is deliberately written as `channel='wallet'` (not `channel='remittance'`) — unlike loan disbursement, a remittance genuinely draws down the spendable balance with no offsetting inbound leg in this app, so it must be visible to `walletService.computeBalance()`'s wallet filter
- `backend/tests/remittanceService.test.js` — **passing**
- `frontend/index.html` — extended with a remittance test section
- **Honest note:** actual cross-border payout is out of scope for the hackathon (per docs §3 "never build: real trading/exchange integration") — this models the quote+debit half of the flow honestly, same "stated placeholder" approach as the Snowflake note in Checkpoint 5

### ✅ Checkpoint 9 — Modules 9/10: Financial Education (tutorial + Q&A + learning plan) — TIER 1 COMPLETE
Files:
- `backend/adapters/gemini.js` — extended with `generateTutorial()`, `answerFinanceQuestion()`, `generateLearningPlan()` — all through the existing `callGeminiJSON()` helper, no second client
- `backend/adapters/elevenlabs.js` — **new adapter, first wired here per the Tier 1 plan**: `narrateText()`, mock fallback (silent/no-audio) with zero `ELEVENLABS_API_KEY`, real call to `eleven_multilingual_v2` otherwise
- `backend/services/educationService.js` — **pure functions**, unit tested: `validateTutorialRequest()`, `validateQaRequest()`, `validateLearningPlanRequest()`, `validateLearningPlan()` (sanity-checks the AI-returned weeks array before it reaches the user, same "guard the LLM output" pattern as `advisoryService.validateAllocation`)
- `backend/schema.sql` — added `tutorials`, `qa_log`, `learning_plans`
- `backend/routes/education.js` — `POST /tutorial` (optional `withAudio` triggers ElevenLabs narration), `GET /tutorial/history`, `POST /qa`, `GET /qa/history`, `POST /learning-plan`, `GET /learning-plan/history`
- `backend/tests/educationService.test.js` — **passing**
- `frontend/index.html` — extended with a financial-education test section (tutorial w/ audio checkbox, Q&A, learning plan)
- `backend/server.js` — wired `/api/insurance`, `/api/remittance`, `/api/education`; health check now reports `checkpoint: 9, tier1Complete: true`
- `backend/.env.example` — added `CRYPTO_PRICE_API_URL`, `FX_API_URL`, `ELEVENLABS_VOICE_ID`

**Verification done across Checkpoints 6–9:** every new/changed file passes `node --check`; all four new test files pass with real assertions (insurance: multiplier is monotonic and cheaper for a better score, coverage caps enforced, inactive/over-coverage claims rejected; crypto: `computeBalance` reused correctly for a crypto-denominated ledger, buy/sell quotes convert correctly both directions, overdraft on either leg rejected; remittances: fee scales with amount, min/max caps enforced, insufficient-balance rejected; education: bad persona/empty question/oversized question/bad horizon rejected, malformed or out-of-sequence learning-plan weeks rejected). `schema.sql` was checked for balanced syntax and no duplicate table definitions. **Not yet verified: a live run against an actual TimescaleDB instance** — same caveat as every checkpoint since Checkpoint 1, no Docker in the build sandbox. Run `docker compose up -d && npm run dev` and click through the full frontend harness (all 10 sections, in order) as the first step before Tier 2.

**🎯 TIER 1 IS NOW COMPLETE.** All six Tier 1 items are built: tutorial, live-guidance Q&A, learning plan, crypto as a second wallet asset, insurance as a third lens, and remittances.

### ✅ Checkpoint 10 — Module 11 extension: Digital gold (third wallet asset) — TIER 2 BEGINS
Files:
- `backend/adapters/goldPrice.js` — **new adapter**, `getGoldPricePerGramUsd()`, mock fallback ($75/gram) with real feed via `GOLD_PRICE_API_URL`. Kept separate from `solana.js` since gold has nothing to do with the chain — it's just another priced asset in the wallet.
- `backend/services/walletService.js` — **no new functions**. `quoteCryptoTrade()`/`validateCryptoTrade()` (Checkpoint 7) were already fully generic (side, price-per-unit, two amounts, nothing SOL-specific), so they're reused unchanged for gold — see the comment added above them.
- `backend/schema.sql` — no structural change; gold reuses the existing generic `asset` column with `channel='gold'`, `asset='XAU_GRAM'` (amount in grams), same pattern as the crypto/SOL rows. Comment added noting this.
- `backend/routes/wallet.js` — extended with `GET /gold/balance`, `POST /gold/quote`, `POST /gold/buy`, `POST /gold/sell` — exact mirror of the `/crypto/*` block, buy/sell write two atomic ledger rows (`channel='wallet'` debit/credit + `channel='gold'` credit/debit), so gold trades flow into the existing fraud-signal query for free
- `backend/tests/walletGold.test.js` — **passing** (re-exercises the reused generic trade functions with gold numbers + checks the new adapter's mock fallback)
- `backend/package.json` — added `walletGold.test.js` to the `test` script chain
- `backend/.env.example` — added `GOLD_PRICE_API_URL`
- `backend/server.js` — health check now reports `checkpoint: 10` and a `tier2Progress` array tracking the remaining four Tier 2 items
- `frontend/index.html` — extended with a gold test section (balance/buy/sell), mirroring the crypto section's markup and JS

**Verification done:** every file (existing + new) passes `node --check`; all 10 test suites pass via `npm test`, including the new gold test. **Not yet verified: a live run against an actual TimescaleDB instance** — same caveat as every checkpoint since Checkpoint 1, no Docker in the build sandbox. Run `docker compose up -d && npm run dev` and click through the full frontend harness before continuing Tier 2.

**Compliance reminder honored:** this checkpoint's files were generated in this session as reference material, same as all prior checkpoints — the team should type/paste and commit them live during actual hacking hours per the handoff's compliance rule (§1), not push this zip's history verbatim.

### ✅ Checkpoint 11 — Budgeting Nudge (Tier 2, second item)
Files:
- `backend/services/budgetService.js` — **new, pure functions**, unit tested: `validateBudgetGoal()` (target savings % must be a number, 1–90), `computeBudgetNudge()` (compares projected savings % — income minus trailing-30-day wallet spend — against the user's goal; returns `no-income-data` | `on-track` | `watch` | `over-budget`, with a savings-vault-cushion mention when not on-track). Deliberately rules-based, not an AI call, same "kept explainable" choice as `fraudSignal.js`.
- `backend/services/spendingAnalytics.js` — **new**, a second genuine TimescaleDB windowed-query module alongside `fraudSignal.js`: `getMonthlySpend()` (trailing-30-day sum, `channel='wallet'` outbound only) and `getWeeklySpendTrend()` (uses `time_bucket('1 week', ...)`, same function `fraudSignal.js` uses for velocity, applied here to a spend trend for a chart)
- `backend/schema.sql` — added `budget_goals` (history, not overwritten — same pattern as `investment_advice`/`insurance_policies`)
- `backend/routes/budget.js` — `POST /goal`, `GET /goal`, `GET /nudge` (pulls monthlyIncome from `income_documents` and savingsVaultBalance from `wallets`, reused not re-asked, same pattern as `routes/advisory.js`), `GET /spend-trend`
- `backend/tests/budgetService.test.js` — **passing**
- `backend/package.json` — added `budgetService.test.js` to the `test` script chain
- `backend/server.js` — wired `/api/budget`, health check now reports `checkpoint: 11` and `budgeting nudge (done)` in `tier2Progress`
- `frontend/index.html` — extended with a budgeting-nudge test section (set goal, get nudge, weekly spend-trend)

**Verification done:** every file (existing + new) passes `node --check`; all 11 test suites pass via `npm test`, including 8 new assertions in `budgetService.test.js` (no-income guarded, on-track/watch/over-budget boundaries at the watch-zone threshold, default target used when none set, vault-cushion message appended only when off-track, negative-spend input can't produce >100% projected savings). **Not yet verified: a live run against an actual TimescaleDB instance** — same caveat as every checkpoint since Checkpoint 1, no Docker in the build sandbox. In particular, `getWeeklySpendTrend()`'s `time_bucket()` call should be exercised against a real hypertable before relying on it in the demo.

**Compliance reminder honored:** same as Checkpoint 10 — this checkpoint's files are reference material for the team to type/paste and commit live during hacking hours, not push verbatim.

### ✅ Checkpoint 12 — Student Starter-Identity (Tier 2, third item)
Files:
- `backend/services/studentIdentityService.js` — **new, pure functions**, unit tested: `validateStudentProfile()` (school name required, grad year within `[currentYear, currentYear+8]`, optional self-declared monthly allowance 0–2000), `computeStudentStarterScore()` — calls `trustScoreEngine.computeTrustScore()` directly (reused, not forked) and discounts only the resulting income component by 0.5x before recombining with the fraud component, since a self-declared allowance carries less evidence than a Gemini-OCR-verified income document. Also exposes a fixed `STUDENT_STARTER_LOAN_CAP_USD` (300) for a future loan-module integration to enforce — this checkpoint only computes and returns the number, it does not wire it into `loanService.js`.
- `backend/schema.sql` — added `student_profiles` (history, not overwritten — same pattern as `budget_goals`)
- `backend/routes/student.js` — `POST /profile`, `GET /profile`, `POST /compute-score` (the lighter-weight sibling of `routes/trustScore.js`'s `POST /compute` — same fraud-signal query, same Solana attestation step, reused unchanged; writes into the **same** `trust_scores` table tagged `evidence.entryPath='student-starter'`, so Modules 3/6/13 already read a student's score with zero changes on their side). No new GET-score route was added — `GET /api/trust-score/:userId` already reads whatever's in `trust_scores`, student or not.
- `backend/tests/studentIdentityService.test.js` — **passing**
- `backend/package.json` — added `studentIdentityService.test.js` to the `test` script chain
- `backend/server.js` — wired `/api/student`, health check now reports `checkpoint: 12` and `tier2Progress` shows `student starter-identity (done)`
- `frontend/index.html` — extended with a student starter-identity test section (save profile, compute starter score); title/heading bumped to reflect Checkpoints 1–12

**Verification done:** every file (existing + new) passes `node --check`; all 12 test suites pass via `npm test`, including new assertions in `studentIdentityService.test.js` (profile validation for missing school name, out-of-range grad years, and out-of-range/negative allowance; a declared allowance raises the starter score above the no-allowance baseline but strictly less than an equally-sized *verified* income would via the normal `computeTrustScore` path; score stays within 0–100 at the max allowance/perfect fraud-ratio extreme; a worse fraud-clean ratio still pulls the starter score down, confirming the engine is genuinely reused and not just decorated). The inline frontend JS was parsed with `new Function()` to confirm it's syntactically valid. **Not yet verified: a live run against an actual TimescaleDB instance** — same caveat as every checkpoint since Checkpoint 1, no Docker in the build sandbox. Run `docker compose up -d && npm run dev` and click through the full frontend harness (all 12 sections, in order) before continuing Tier 2.

**Compliance reminder honored:** same as Checkpoints 10–11 — this checkpoint's files are reference material for the team to type/paste and commit live during hacking hours, not push verbatim.

### ✅ Checkpoint 13 — Merchant view (Tier 2, fourth item)
Files:
- `backend/services/trustScoreEngine.js` — added `scoreToMerchantHealthRating(score, monthlyRevenue)`, the FOURTH lens on the same engine (lender → expected loss, insurer → premium multiplier, merchant → rating band + recommended credit line). Same "reuse, don't fork `computeTrustScore()`" rule as the other two mappers.
- `backend/services/spendingAnalytics.js` — added `getMonthlyRevenue()`/`getWeeklyRevenueTrend()`, the inbound-side mirror of the existing outbound spend queries (`direction='in'` instead of `'out'`) — stands in for "business revenue."
- `backend/services/merchantAnalytics.js` — **new**, pure functions, unit tested: `validateMerchantProfile()`, `computeBusinessHealth()` (combines a trust score + revenue into the merchant summary, no new scoring math).
- `backend/schema.sql` — added `merchant_profiles` (self-declared business name + category, same lightweight shape as `student_profiles`).
- `backend/routes/merchant.js` — `POST /profile`, `GET /profile`, `GET /health` (business-health summary), `GET /revenue-trend`.
- `backend/tests/merchantAnalytics.test.js` — **passing**.
- `backend/package.json` — added `merchantAnalytics.test.js` to the `test` script chain.
- `backend/server.js` — wired `/api/merchant`; health check now reports `checkpoint: 13` and `tier2Progress` marks merchant view done (only enterprise view left).
- `frontend/index.html` — extended with a merchant test section (save business profile, get business health, weekly revenue trend); title/heading bumped to reflect Checkpoints 1–13.

**Built at surface level, on purpose:** with judging ~5 hours out and 2–3 hours reserved for deployment, this checkpoint is intentionally scoped thin — no role-gating on the merchant routes (unlike the lender dashboard's `requireLenderRole`), the credit-line formula is a simple explainable multiplier (not a calibrated model, same honesty as every other lens here), and there's no separate "enterprise vs. merchant" distinction beyond the `category` field. Good enough to demo end-to-end, not hardened — flag if judges probe edge cases.

**Verification done:** every file (existing + new) passes `node --check`; all 13 test suites pass via `npm test`, including new assertions in `merchantAnalytics.test.js` (profile validation rejects empty name / bad category; rating bands are monotonic across score; credit line scales up with score at fixed revenue and is zero at zero revenue; `computeBusinessHealth` combines score+revenue correctly). **Not yet verified: a live run against an actual TimescaleDB instance** — same caveat as every checkpoint since Checkpoint 1, no Docker in the build sandbox. Run `docker compose up -d && npm run dev` and click through the full frontend harness (all 13 sections, in order) before deployment.

**Compliance reminder honored:** same as Checkpoints 10–12 — this checkpoint's files are reference material for the team to type/paste and commit live during hacking hours, not push verbatim.

### ✅ Checkpoint 14 — Enterprise view (Tier 2, fifth and LAST item — Tier 2 now complete)
Files:
- `backend/services/lenderAnalytics.js` — reused unchanged (`summarizePortfolio()`) for the loan-exposure half of the workforce rollup; no new loan-aggregation logic was written.
- `backend/services/trustScoreEngine.js` — reused unchanged (`scoreToMerchantHealthRating()`) for the per-employee rating-band bucket; no new scoring math.
- `backend/services/enterpriseAnalytics.js` — **new**, pure functions, unit tested: `validateEnterpriseProfile()`, `validateEmployeeLink()`, `summarizeWorkforce(employeeScores, loans, headcount)` — headcount, scored-count, average trust score, a rating-band distribution (excellent/good/fair/poor), and the loan portfolio summary (delegated to `lenderAnalytics.summarizePortfolio`).
- `backend/schema.sql` — added `enterprise_profiles` (employer/organization self-declaration, same lightweight shape as `merchant_profiles`/`student_profiles`) and `employee_links` (an individual self-declaring which org they belong to, matched by free-text `organization_name` — no verification, same honesty as every other self-declared profile in this repo).
- `backend/routes/enterprise.js` — `POST /profile` + `GET /profile` (employer, `requireEnterpriseRole` gate, same pattern as `requireLenderRole`), `POST /employee-link` (any authenticated user, no role gate — self-declaration), `GET /workforce` (employer-only rollup: looks up the org's linked employees, pulls each one's latest `trust_scores` row + all their loans, calls `summarizeWorkforce`).
- `backend/tests/enterpriseAnalytics.test.js` — **passing**.
- `backend/package.json` — added `enterpriseAnalytics.test.js` to the `test` script chain.
- `backend/server.js` — wired `/api/enterprise`; health check now reports `checkpoint: 14`, `tier2Complete: true`, and `tier2Progress` marks enterprise view done (all five Tier 2 items complete).
- `frontend/index.html` — extended with an enterprise test section (save org profile, self-link as employee, get workforce rollup); title/heading bumped to reflect Checkpoints 1–14, Tier 2 complete.

**Built at surface level, on purpose:** same reasoning as Checkpoint 13 — org membership is a free-text match with zero verification (no work-email domain check, no invite flow), the rating distribution reuses the merchant rating bands as-is rather than defining enterprise-specific bands, and there's no pagination on the workforce query (fine for a hackathon-sized employee list, would need it for a real org). Good enough to demo end-to-end, not hardened — flag if judges probe edge cases.

**Verification done:** every file (existing + new) passes `node --check`; all 14 test suites pass via `npm test`, including new assertions in `enterpriseAnalytics.test.js` (profile/link validation reject empty/whitespace org names; zero-employee org returns headcount 0 with no crash; headcount can exceed scored-count when some employees have no trust score yet; rating distribution matches `scoreToMerchantHealthRating`'s bands one-for-one across all four bands; the loan side is a byte-for-byte reuse of `summarizePortfolio`, confirmed by checking its output fields directly rather than re-deriving them). The inline frontend JS was parsed with `new Function()` to confirm it's syntactically valid. **Not yet verified: a live run against an actual TimescaleDB instance** — same caveat as every checkpoint since Checkpoint 1, no Docker in the build sandbox. Run `docker compose up -d && npm run dev` and click through the full frontend harness (all 14 sections, in order) before deployment.

**Compliance reminder honored:** same as Checkpoints 10–13 — this checkpoint's files are reference material for the team to type/paste and commit live during hacking hours, not push verbatim.

**Tier 2 is now complete.** Per this handoff's own recommendation and the judging weights (Fruition 25% — a working demo — is the single biggest number), the next step should be deployment, not starting Tier 3. Reserve the 2–3 hours already set aside for it.

**⚠️ Team override, honored:** at the ~2–3-hours-to-judging mark, the team chose to spend the remaining time on one more Tier 3 checkpoint instead of deployment, explicitly scoped "surface level only, but every feature must actually work." Checkpoint 15 below was built to that instruction. This does not change the recommendation above for future sessions — it's a one-off, team-directed call for this specific judging round.

### ✅ Checkpoint 15 — Remaining Module 12 asset classes: retirement + REITs + goal-based framing (Tier 3, first item)
Files:
- `backend/services/advisoryService.js` — `validateAllocation()` extended from four buckets to six (added `retirementPct`, `reitsPct` — fixed income already shipped Checkpoint 4, so these were the two remaining asset classes named in the doc's Tier 3 list). **New**, pure, unit-tested: `computeGoalFraming()` — the "goal-based framing" item, done as a deterministic projection (fixed 15%-of-income illustrative contribution rate × a fixed illustrative per-bucket return assumption → a rough future-value estimate), not an LLM call, same "keep it explainable" choice as `fraudSignal.js`/`budgetService.js`. Guards no-income and zero/negative horizon; returns `{ok:false, note}` rather than crashing.
- `backend/adapters/gemini.js` — `generateInvestmentAdvice()` prompt extended to ask for the same six buckets; `mockAdvice()`'s three risk tiers updated to six buckets each, still summing to 100, stocks still capped at 40%.
- `backend/schema.sql` — added nullable `goal_framing JSONB` column to `investment_advice` (stores `computeGoalFraming()`'s output alongside the allocation it was computed from — history, not overwritten, same pattern as every other advice row).
- `backend/routes/advisory.js` — `POST /recommend` now also calls `computeGoalFraming()` (reusing the same `monthlyIncome` already pulled from `income_documents` — not re-asked) and persists/returns it; `GET /history` now selects `goal_framing` too. No new route — same two endpoints as Checkpoint 4.
- `backend/tests/advisoryService.test.js` — extended: six-bucket allocation validated, an old four-bucket allocation now correctly rejected (proves the new buckets are actually required, not silently optional), plus new `computeGoalFraming` assertions (no-income guarded, bad horizon guarded, contribution scales linearly with income, a growth-tilted allocation projects higher than all-money-market at equal contribution, a longer horizon projects higher — confirms the projection genuinely reads the allocation and horizon rather than returning a flat number).
- `backend/server.js` — health check now reports `checkpoint: 15` and a `tier3Progress` array (one item, done).
- `frontend/index.html` — no new section needed (the existing Investment Advisory section already dumps the full JSON response, so the new buckets and `goalFraming` field show up automatically); heading/title bumped to reflect Checkpoints 1–15, Tier 3 in progress.

**Built at surface level, on purpose:** the illustrative contribution rate (15%) and per-bucket return assumptions in `computeGoalFraming()` are fixed constants, not personalized or pulled from any real market-data feed — same honesty as the credit-line multiplier in `merchantAnalytics.js`. The explanation string says "educational estimate only — not a guarantee" for exactly this reason. Flag if judges probe where the 15%/return numbers come from — the honest answer is "a documented, hackathon-reasonable assumption," not a model.

**Verification done:** every file (existing + new) passes `node --check`; all 14 test suites still pass via `npm test`, including the extended `advisoryService.test.js` (8 new/changed assertions, described above). The inline frontend JS was parsed with `new Function()` to confirm it's syntactically valid. **Not yet verified: a live run against an actual TimescaleDB instance** — same caveat as every checkpoint since Checkpoint 1, no Docker in the build sandbox. Run `docker compose up -d && npm run dev` and click through the full frontend harness (all 15 sections, in order) before judging.

**Compliance reminder honored:** same as Checkpoints 10–14 — this checkpoint's files are reference material for the team to type/paste and commit live during hacking hours, not push verbatim.

**With judging now imminent:** no further checkpoints should be started without reserving time to actually deploy and smoke-test the running app — a Tier 3 item that never got wired to a live server helps the demo less than Tier 2 already does.

## 6. How to resume in a new chat

1. Attach/upload the current repo (zip) or paste the relevant files
2. Paste this whole document as the first message, plus say which checkpoint to build next
3. If product/scope questions come up that this file doesn't answer, attach the "Universal Finance Platform — Full Documentation" artifact too
4. Expect the new session to: run existing tests first to confirm nothing's broken, then build the next checkpoint's routes/services/adapters following the same pattern (pure logic functions unit-tested where possible, adapters with mock fallbacks, one commit per checkpoint with a descriptive message matching the Checkpoint 1 style above)

## 7. Known TODOs / things intentionally left rough

- No input validation library yet (e.g. zod/joi) — fine for hackathon pace, flag if it causes bugs
- `income_documents` and `trust_scores` have no foreign-key cascade/delete policy — irrelevant for a 36-hour demo
- Solana keypair handling in `.env` (raw JSON secret key) is fine for devnet/demo only — never do this for mainnet or real funds
- No rate limiting, no request logging middleware yet — add only if time remains, not a judging factor
