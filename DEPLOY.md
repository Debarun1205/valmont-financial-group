# Valmont Financial Group — Deploy Guide (live link)

Repo: https://github.com/Debarun1205/valmont-financial-group

**Fastest free stack for judging:** Neon (Postgres) → Render (API) → Vercel (UI)

Estimated time: **12–20 minutes** if accounts already exist.

---

## Prerequisites

- GitHub account with access to this repo
- Free accounts: [Neon](https://console.neon.tech) · [Render](https://dashboard.render.com) · [Vercel](https://vercel.com) · [Groq](https://console.groq.com) (recommended)

---

## A) Push code (already done if you used the agent force-push)

In **Git Bash**:

```bash
cd /c/Users/soumy/valmont-finance
git remote -v
# should show origin → https://github.com/Debarun1205/valmont-financial-group.git
```

If you need to push again later (normal push, not force):

```bash
git add -A
git commit -m "Update Valmont deploy-ready build"
git push -u origin main
```

> Only use `git push --force` when you intentionally want to overwrite remote history.

---

## B) Database — Neon (≈2 min)

1. Open https://console.neon.tech → **New Project**
2. Name: `valmont` → Create
3. Copy the connection string (starts with `postgresql://...`)
4. Keep it handy as `DATABASE_URL`

Neon already supports SSL — we set `DATABASE_SSL=true` on Render.

---

## C) Backend API — Render (≈5–8 min)

1. Open https://dashboard.render.com → **New** → **Web Service**
2. Connect GitHub → select **Debarun1205/valmont-financial-group**
3. Settings:
   - **Name:** `valmont-finance-api`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free
4. **Environment** variables:

| Key | Value |
|-----|--------|
| `DATABASE_URL` | (paste Neon URL) |
| `DATABASE_SSL` | `true` |
| `DEV_AUTH_BYPASS` | `true` |
| `GROQ_API_KEY` | (from https://console.groq.com) |
| `GEMINI_API_KEY` | (optional) |
| `CORS_ORIGIN` | leave blank for now — fill after Vercel |

5. Click **Create Web Service** → wait until deploy is Live
6. Open: `https://valmont-finance-api.onrender.com/health`  
   (use your real Render hostname)  
   Expect JSON with `"ok": true`

> Free Render sleeps after ~15 min idle. Hit `/health` once before the judging demo.

---

## D) Frontend — Vercel (≈3–5 min) → **this is your live link**

1. Open https://vercel.com/new
2. Import **Debarun1205/valmont-financial-group**
3. Configure:
   - **Root Directory:** `frontend` (click Edit → set to `frontend`)
   - Framework: Vite (auto-detected)
   - Build: `npm run build`
   - Output: `dist`
4. **Environment Variables:**

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://YOUR-API.onrender.com` (no trailing slash) |

5. Deploy → copy the URL, e.g. `https://valmont-financial-group.vercel.app`
6. **That Vercel URL is the live product link for judges.**

---

## E) Connect CORS (required for signup/login)

1. Render → your API → **Environment**
2. Set `CORS_ORIGIN` = `https://your-app.vercel.app`  
   (no trailing slash; comma-separate if you have preview + production)
3. **Manual Deploy** → Redeploy API
4. Soft-refresh the Vercel site and create an account

---

## F) Demo path for judges (2 minutes)

1. Open the **Vercel live link**
2. **Create** → complete warm onboarding quiz → Join Valmont
3. Click through: Overview → Identity → Wallet → Loans → Investments → Learn → **AI Lab** (Model training + DS applications)
4. Before the round, wake the API: open `/health` on Render once

---

## Emergency fallback (API cold / DB issues)

On Vercel → Project → Settings → Environment Variables:

```
VITE_DEMO_MODE=true
```

Redeploy. The UI runs with contract-matched mocks so the pitch still works.

---

## Local run (optional)

```bash
# Terminal 1 — DB (needs Docker)
cd /c/Users/soumy/valmont-finance
docker compose up -d

# Terminal 2 — API
cd backend
cp .env.example .env
npm install
npm start

# Terminal 3 — UI
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Signup fails / CORS error | Set `CORS_ORIGIN` on Render to exact Vercel URL, redeploy API |
| `/health` 502 / spinning | Wait for first Render boot (can take 1–2 min on free tier) |
| Blank dashboards | Confirm `VITE_API_URL` has no trailing slash; redeploy Vercel |
| AI always says MOCK | Add `GROQ_API_KEY` (or `GEMINI_API_KEY`) on Render and redeploy |
| DB connection refused | Check Neon URL; set `DATABASE_SSL=true` |

---

## Docs in this repo

- `README.md` — product + local stack
- `DEPLOY.md` — short deploy checklist
- `docs/frontend-backend-sync.md` — API contract coverage
- `docs/frontend-verification.md` — dashboard verification
- `docs/dev-context-handoff.md` — full hackathon build context
