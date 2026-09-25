# Valmont Frontend ↔ Backend Synchronization Check

Date: 2026-09-25

## Result

**51/51 backend route endpoints have a corresponding frontend call or dashboard action.**

Backend internal services are intentionally not imported by the frontend; the correct integration boundary is the Express route layer.

## Checks performed

1. Backend route discovery from `backend/server.js` mounts and every `backend/routes/*.js` file.
2. Frontend endpoint discovery from `frontend/src/main.jsx`, including dynamic paths for user IDs, loan IDs, policy IDs, and auth calls.
3. Backend JS syntax check: every `.js` file passed `node --check`.
4. Backend unit suite: all 14 suites passed with `npm test`.
5. Frontend JSX parser check: `frontend/src/main.jsx` parsed with zero TypeScript TSX parse diagnostics.
6. Response-shape reconciliation for the main nested responses (`trustScore`, `advice`, `portfolio`, `businessHealth`, `workforce`, `loans`, `policies`, `remittances`, education history, budget goal/nudge, and student score).

## Important sync fixes made

- Trust-score UI now reads the backend's `{ trustScore: ... }` envelope instead of expecting a flat score.
- Student starter score now reads `{ trustScore, startingLoanCapUsd }`.
- Investment advisory now reads `{ advice: ... }` and the persisted `goal_framing` field, and also loads `GET /api/advisory/history`.
- Lender dashboard now uses `totalOutstanding` and `weightedAvgExpectedLossPct` from `summarizePortfolio()`.
- Merchant dashboard now reads `{ businessHealth: ... }` and `{ weeklyRevenueTrend: ... }`.
- Enterprise dashboard now reads `{ workforce: ... }`, including `avgTrustScore`, `ratingDistribution`, and `loanPortfolio`.
- Wallet now covers USD history plus crypto/gold balances and quote/buy/sell routes.
- Insurance now covers quote, purchase, policy listing, and claim.
- Remittance now covers supported corridors, quote, send, and history.
- Education now covers tutorial/Q&A/learning-plan generation plus all three history endpoints.
- Budgeting now loads the saved goal, nudge, and spend trend.
- Loans now cover request, mine, marketplace, fund, repayment, and loan detail.

## Full backend route coverage

- Auth: signup, login
- Trust score: verify-income, compute, get-by-user
- Wallet: create, balance, transfer, vault deposit, history, crypto balance/quote/buy/sell, gold balance/quote/buy/sell
- Loans: request, mine, marketplace, fund, repay, detail
- Advisory: recommend, history
- Lender: risk, portfolio
- Insurance: quote, purchase, mine, claim
- Remittance: corridors, quote, send, mine
- Education: tutorial, tutorial history, Q&A, Q&A history, learning plan, learning-plan history
- Budget: goal create/get, nudge, spend trend
- Student: profile create/get, compute score
- Merchant: profile create/get, health, revenue trend
- Enterprise: profile create/get, employee link, workforce

## Environment limitation

A live Vite production build and live Express + TimescaleDB smoke test could not be executed in this sandbox because Docker is not installed and npm registry installation for frontend dependencies is unavailable here. The backend's pure-function test suite and syntax checks are green, and the frontend JSX parses cleanly. The repository includes `frontend/simulated-dashboard.html` for offline visual verification.
