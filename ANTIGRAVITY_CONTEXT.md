# Antigravity / Deploy Agent — Full Context Handoff

**Repo:** https://github.com/Debarun1205/valmont-financial-group  
**Local path (Windows):** `C:\Users\soumy\valmont-finance`  
**Zip backup:** `C:\Users\soumy\Downloads\valmont-financial-group-deploy-ready.zip`  
**Branch:** `main` (force-pushed deploy-ready build)  
**Goal:** ship a **public live URL** before midnight judging. Prefer **sponsor tracks**; if a sponsor is paid/slow/hard, use the **free-tier alternative** without dropping features.

---

## 1. Preference order (sponsors first, free fallback second)

| Concern | Prefer (sponsor / intended) | Use if hard / not free / too slow |
|---------|-----------------------------|-----------------------------------|
| **App hosting (API)** | **Vultr** Cloud Compute (Ubuntu + Node + PM2, or Docker) | **Render** free Web Service (`backend/`) |
| **Frontend hosting** | Same Vultr nginx reverse-proxy, or Vultr + static | **Vercel** (`frontend/` root directory) |
| **Database** | **Tiger Data / TimescaleDB** (Docker `timescale/timescaledb-ha:pg17` on Vultr, or Tiger Cloud trial) | **Neon** free Postgres (`DATABASE_SSL=true`) — app auto-falls back from `time_bucket` → `date_trunc` |
| **Auth** | **Auth0** (`DEV_AUTH_BYPASS=false` + domain/audience) | Keep `DEV_AUTH_BYPASS=true` for demo JWT signup/login |
| **AI text** | **Gemini** (`GEMINI_API_KEY`) | **Groq** free tier (`GROQ_API_KEY`) then mocks |
| **AI OCR (income docs)** | **Gemini** vision | Mock extraction (Groq is text-only) |
| **Voice** | **ElevenLabs** | Silent/mock narration |
| **Chain** | **Solana** devnet | Mock attestation (no secret key) |
| **Analytics warehouse** | **Snowflake** (portfolio ETL — still placeholder in code) | Current Postgres `summarizePortfolio()` (honest placeholder) |

**Fastest path that still preserves all dashboards (recommended if <90 minutes left):**

1. Neon free Postgres  
2. Render free API  
3. Vercel frontend  
4. Groq key for live AI feel  
5. Optional Gemini / ElevenLabs / Solana keys if already available  

**Do not drop features** to fit free tier. The codebase already runs with mocks and plain Postgres.

---

## 2. What the product is

Universal finance platform (“one engine, many lenses”):

- Trust score (income OCR + fraud window + Solana attestation)
- Wallet (USD + SOL + digital gold)
- Loans + lender dashboard
- Investment advisory (6 buckets + goal framing)
- Insurance, remittances, education, budgeting
- Student / merchant / enterprise surfaces
- Warm onboarding quiz → customer tiers (banks, organizations, big/small merchants, hackers, career professionals, students)
- AI Lab: model training + DS applications
- AI cascade: **Gemini → Groq → mock**

Judging weights: **Fruition (working demo) is #1**. Live link > perfect sponsor purity.

---

## 3. Repo layout

```
valmont-financial-group/
  README.md                 # product + docs index
  DEPLOY.md                 # Neon/Render/Vercel steps
  render.yaml               # Render blueprint
  docker-compose.yml        # local/Vultr TimescaleDB
  backend/                  # Express API, port PORT||4000
  frontend/                 # Vite React, Vercel root
  docs/                     # sync + handoff docs
  scripts/check-frontend-backend-sync.cjs
```

**API contract:** 61/61 frontend↔backend coverage (`npm run check:contracts` from `frontend/`).  
**Tests:** `cd backend && npm test` (15 suites).  
**Frontend build:** `cd frontend && npm run build` (must succeed).

---

## 4. Critical env vars

### Backend (`backend/.env` or Render/Vultr env)

| Variable | Required for live | Notes |
|----------|-------------------|--------|
| `DATABASE_URL` | **Yes** | Neon or Timescale connection string |
| `DATABASE_SSL` | Yes on Neon/Render | `true` |
| `DEV_AUTH_BYPASS` | Yes for fast demo | `true` unless Auth0 fully wired |
| `CORS_ORIGIN` | **Yes** after frontend URL exists | Exact Vercel/Vultr frontend origin(s), comma-separated, no trailing slash |
| `GROQ_API_KEY` | Strongly recommended | Free, powers advisory/education if Gemini missing |
| `GEMINI_API_KEY` | Prefer if available | Primary AI + OCR |
| `ELEVENLABS_API_KEY` | Optional | Narration |
| `SOLANA_RPC_URL` | Optional | Default devnet OK |
| `SOLANA_SECRET_KEY` | Optional | Mock attestation if blank |
| `PORT` | Auto | Render sets this |

### Frontend (Vercel env)

| Variable | Required | Notes |
|----------|----------|--------|
| `VITE_API_URL` | **Yes** | `https://api-host` **no trailing slash** |
| `VITE_DEMO_MODE` | Emergency only | `true` = offline mocks if API cold |

---

## 5. Deploy procedures

### Path A — Free / fastest (Neon + Render + Vercel)

1. **Neon:** create project → copy `DATABASE_URL`
2. **Render:** New Web Service → repo `Debarun1205/valmont-financial-group`
   - Root: `backend`
   - Build: `npm install`
   - Start: `npm start`
   - Env: `DATABASE_URL`, `DATABASE_SSL=true`, `DEV_AUTH_BYPASS=true`, `GROQ_API_KEY`
3. Confirm `GET https://<api>.onrender.com/health` → `{ ok: true }`
4. **Vercel:** Import same repo → Root Directory **`frontend`**
   - Env: `VITE_API_URL=https://<api>.onrender.com`
5. Set Render `CORS_ORIGIN=https://<app>.vercel.app` → redeploy API
6. **Live link for judges = Vercel URL**

### Path B — Sponsor hosting (Vultr + Timescale preferred)

1. Vultr Ubuntu 22.04 instance, open 80/443 (and 4000 if needed)
2. Install Docker + Node 20
3. `git clone` repo → `docker compose up -d` (Timescale)
4. `cd backend && npm install && cp .env.example .env` → fill keys → `pm2 start server.js`
5. Serve `frontend` via `npm run build` + nginx, **or** still put frontend on Vercel pointing at Vultr API
6. Set `CORS_ORIGIN` to the real frontend origin
7. Prefer Auth0 + Gemini + ElevenLabs + Solana keys when available

### Emergency (<60s)

Vercel: `VITE_DEMO_MODE=true` → redeploy. All dashboards still demoable offline.

---

## 6. Acceptance checklist (must pass)

- [ ] Public HTTPS frontend URL opens without login wall errors
- [ ] `/health` on API returns `ok: true`
- [ ] Signup with onboarding quiz works (Create → quiz → Join)
- [ ] After login: Overview, Identity, Wallet, Loans, Investments, Insurance, Remittances, Learn, Budget
- [ ] AI Lab → Model training + DS applications load
- [ ] Merchant + Enterprise reachable (enterprise needs enterprise-tier/role)
- [ ] No CORS errors in browser console on auth API calls
- [ ] Prefer real Groq/Gemini responses over `[MOCK]` when keys set
- [ ] Document the final URLs in `LIVE_URLS.md` at repo root

---

## 7. Known behaviors / pitfalls

- Render **free tier sleeps**; wake with `/health` before judging.
- First schema boot creates tables; Timescale extension is **optional**.
- OCR needs Gemini; without it, income verify returns mock `$650`.
- `CORS_ORIGIN` must match the browser origin exactly (scheme + host, no path).
- Do **not** commit `.env` secrets.
- Frontend must be built with `VITE_API_URL` set at **build time** on Vercel (Vite inlines it).

---

## 8. Commands cheat sheet

```bash
# clone
git clone https://github.com/Debarun1205/valmont-financial-group.git
cd valmont-financial-group

# verify locally
cd backend && npm install && npm test
cd ../frontend && npm install && npm run check:contracts && npm run build
```

---

## 9. Deliverable format for Antigravity

When done, return:

1. **Frontend live URL** (primary judge link)
2. **API health URL**
3. Which path was used (A free / B Vultr sponsor / hybrid)
4. Which sponsor keys were wired vs free fallbacks
5. Any blockers remaining
6. Optional: commit `LIVE_URLS.md` and push to `main`

---

## 10. Non-goals for this deploy pass

- Do not rebuild the product or remove dashboards
- Do not wait on Snowflake ETL
- Do not require Auth0 if tenant setup is slow — use bypass for judging
- Do not spend time on Vultr if DNS/SSH will blow the deadline; fall back to Path A immediately
