# Paste this prompt into Antigravity

---

You are deploying **Valmont Financial Group** for a hackathon midnight judging round. Fruition (working live demo) matters most.

## Read first
Open and follow this file in the repo as your source of truth:

**`ANTIGRAVITY_CONTEXT.md`**

Also use: `DEPLOY.md`, `README.md`, `backend/.env.example`, `frontend/.env.example`, `render.yaml`.

**Repo:** https://github.com/Debarun1205/valmont-financial-group  
**Branch:** `main`

## Mission
Produce a **public live HTTPS link** for the frontend that judges can open, with the API reachable and all existing dashboards/features working. Do not remove features.

## Preference policy (strict)
1. **Prefer sponsor tracks** when free/trial and deployable within ~30–40 minutes:
   - Hosting: **Vultr**
   - DB: **Tiger Data / TimescaleDB** (Docker on Vultr or Tiger Cloud trial)
   - Auth: **Auth0** (only if already easy)
   - AI: **Gemini**
   - Voice: **ElevenLabs**
   - Chain: **Solana** devnet
2. **If a sponsor is paid, slow, blocked, or hard** → immediately use free fallbacks **without dropping features**:
   - API: **Render** free (`backend/`)
   - Frontend: **Vercel** (`frontend/` as root directory)
   - DB: **Neon** free Postgres + `DATABASE_SSL=true`
   - AI: **Groq** free tier (`GROQ_API_KEY`) after/instead of Gemini
   - Auth: keep `DEV_AUTH_BYPASS=true`
3. If API is cold/broken near deadline: set Vercel `VITE_DEMO_MODE=true` so the UI still demos, but try to keep real API first.

## Required outcomes
- Live frontend URL (judge link)
- Live API `/health` → `{ "ok": true }`
- `CORS_ORIGIN` set to the frontend origin
- `VITE_API_URL` set to API origin (no trailing slash) at Vercel build time
- Signup + warm onboarding quiz works
- Smoke-check main dashboards + AI Lab
- Write `LIVE_URLS.md` with final URLs, path chosen (sponsor vs free), and keys used; commit + push to `main` if you have git access

## Do not
- Do not refactor the app for fun
- Do not delete modules/dashboards
- Do not block on Snowflake
- Do not force Auth0 if it delays the live link
- Do not commit secrets

## Start now
1. Clone/pull latest `main`
2. Decide Path A (Neon+Render+Vercel) vs Path B (Vultr+Timescale) using the preference policy and remaining time
3. Deploy end-to-end
4. Return the live URLs and a short deploy report

---
