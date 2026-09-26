# Valmont Financial Group — Universal Finance Platform

HackNex 2026 submission. **Live deploy guide:** [`DEPLOY.md`](./DEPLOY.md)

**GitHub:** https://github.com/Debarun1205/valmont-financial-group

## What you get

A universal finance app: portable trust score, multi-asset wallet, loans, AI advisory (Gemini → Groq fallback), insurance, remittances, education, budgeting, merchant/enterprise lenses, warm onboarding customer tiers, and an AI Lab (model training + DS applications).

## Stack

- **Backend:** Node.js + Express
- **Database:** MongoDB (Atlas or local). Set `MONGODB_URI`.
- **Auth:** Auth0-ready + local JWT bypass for demos (`DEV_AUTH_BYPASS=true`)
- **AI:** Gemini primary → **Groq free-tier fallback** → mocks
- **Voice:** ElevenLabs (optional narration)
- **Chain:** Solana devnet trust-score attestation
- **Frontend:** Vite + React
- **Deploy (fastest free):** Vercel (UI) + Render (API) + MongoDB Atlas

## Live links

- **Frontend (Live Demo):** https://frontend-one-phi-22.vercel.app
- **API Health:** `https://YOUR-API.onrender.com/health`    

*(See [`DEPLOY.md`](./DEPLOY.md) for backend deployment instructions).*

## Documentation

| File | Purpose |
|------|---------|
| [`DEPLOY.md`](./DEPLOY.md) | MongoDB Atlas → Render → Vercel walkthrough |
| [`docs/frontend-backend-sync.md`](./docs/frontend-backend-sync.md) | Endpoint coverage (61/61) |
| [`docs/frontend-verification.md`](./docs/frontend-verification.md) | Dashboard verification |
| [`docs/dev-context-handoff.md`](./docs/dev-context-handoff.md) | Full product/build handoff |

## Running locally

```bash
# Optional local MongoDB
docker compose up -d

cd backend
cp .env.example .env
# set MONGODB_URI=mongodb://127.0.0.1:27017/valmont
npm install
npm start

# New terminal
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173  
Set `VITE_DEMO_MODE=true` in `frontend/.env` for an offline mock UI.

## Verification

```bash
cd backend && npm test
cd frontend && npm run check:contracts   # expects 61/61
cd frontend && npm run build
```

## Checkpoint log

- [x] **1** — Identity & Trust Score (Gemini OCR, MongoDB fraud signal, Solana attestation)
- [x] **2** — Wallet (ledger balance, transfer, vault)
- [x] **3** — Loan Marketplace (score-priced request/fund/repay)
- [x] **4** — Investment Advisory (six-bucket allocation + goal framing)
- [x] **5** — Lender Dashboard (expected-loss lens) — **Tier 0 complete**
- [x] **6** — Insurance (premium multiplier lens)
- [x] **7** — Crypto (SOL) as second wallet asset
- [x] **8** — Remittances (quote + debit)
- [x] **9** — Financial Education (tutorial / Q&A / learning plan + ElevenLabs) — **Tier 1 complete**
- [x] **10** — Digital gold
- [x] **11** — Budgeting nudge
- [x] **12** — Student starter-identity
- [x] **13** — Merchant health lens
- [x] **14** — Enterprise workforce view
- [x] **15** — Retirement + REITs + goal framing
- [x] **16** — Deploy-ready: Groq fallback, onboarding tiers, ML lab, DS apps, free-tier Postgres

## Optional sponsor keys

Every adapter has a mock fallback. Fill in as available:

`GEMINI_API_KEY`, `GROQ_API_KEY`, `ELEVENLABS_API_KEY`, `SOLANA_SECRET_KEY`, Auth0 domain/audience, price/FX feed URLs.

## Vultr (later / sponsor track)

See historical Vultr steps in `docs/dev-context-handoff.md`. For midnight judging, prefer free Neon + Render + Vercel in `DEPLOY.md`.
