# API keys & env vars (Render + Vercel)

Set these in the hosting dashboards, then **redeploy**. Do not commit real keys.

Google Sign-In needs **both** a Google Cloud OAuth client **and** the same client ID on Render (and ideally Vercel). Keep `DEV_AUTH_BYPASS=true` so Google/email JWTs work on API routes.

---

## Google Cloud (create the OAuth client first)

1. Open [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials)
2. Create project → **Create credentials** → **OAuth client ID** → type **Web application**
3. **Authorized JavaScript origins** (no trailing slash):
   - `http://localhost:5173`
   - your Vercel URL, e.g. `https://frontend-one-phi-22.vercel.app`
4. Copy the **Client ID** (`….apps.googleusercontent.com`)

OAuth consent screen (if prompted): [APIs & Services → OAuth consent](https://console.cloud.google.com/apis/credentials/consent) — External, app name Valmont, your email. For a hackathon, Testing mode + adding judge Gmail as test users is enough.

---

## Render — Web Service (`backend/`)

Dashboard: [https://dashboard.render.com](https://dashboard.render.com)

| Variable | Required? | Where to get it | What it does |
|----------|-----------|-----------------|--------------|
| `DATABASE_URL` | **Yes** | [Neon console](https://console.neon.tech) → connection string | Postgres |
| `DATABASE_SSL` | **Yes** (`true`) | — | TLS to Neon |
| `DEV_AUTH_BYPASS` | **Yes** (`true`) | — | Validates Google/email JWTs. If `false`, only Auth0 tokens work. |
| `JWT_SECRET` | **Yes** | any long random string | Signs session tokens. Changing it logs everyone out. |
| `GOOGLE_CLIENT_ID` | **Yes** for Google | [Google credentials](https://console.cloud.google.com/apis/credentials) | Verifies Google ID tokens |
| `CORS_ORIGIN` | **Yes** | your Vercel origin, e.g. `https://frontend-one-phi-22.vercel.app` | Allows the UI to call the API |
| `GROQ_API_KEY` | Recommended | [Groq console](https://console.groq.com/keys) | Free-tier AI fallback |
| `GEMINI_API_KEY` | Optional (needed for income OCR photos) | [Google AI Studio](https://aistudio.google.com/apikey) | Primary AI + vision OCR |
| `ELEVENLABS_API_KEY` | Optional | [ElevenLabs](https://elevenlabs.io/app/settings/api-keys) | Tutorial narration |
| `ELEVENLABS_VOICE_ID` | Optional | same ElevenLabs app | Voice id for narration |
| `SOLANA_RPC_URL` | Optional | default `https://api.devnet.solana.com` | Trust-score attestation |
| `SOLANA_SECRET_KEY` | Optional | `solana-keygen` JSON array | Real devnet memo tx; mock if blank |
| `CRYPTO_PRICE_API_URL` | Optional | [CoinGecko](https://www.coingecko.com/en/api) e.g. `https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd` | SOL/USD; mock if blank |
| `FX_API_URL` | Optional | [exchangerate.host](https://exchangerate.host) e.g. `https://api.exchangerate.host/latest?base=USD` | Remittance FX; mock if blank |
| `GOLD_PRICE_API_URL` | Optional | [GoldAPI](https://www.goldapi.io) e.g. `https://www.goldapi.io/api/XAU/USD` | Gold/gram; mock if blank |
| `AUTH0_DOMAIN` | Optional | [Auth0 dashboard](https://manage.auth0.com) | Only if you flip bypass off |
| `AUTH0_AUDIENCE` | Optional | Auth0 API audience | Only if you flip bypass off |
| `PORT` | No | Render sets this | — |

---

## Vercel — Project (`frontend/`)

Dashboard: [https://vercel.com](https://vercel.com) → Project → Settings → Environment Variables. Redeploy after changes.

| Variable | Required? | Where to get it | What it does |
|----------|-----------|-----------------|--------------|
| `VITE_API_URL` | **Yes** | Render service URL, **no trailing slash**, e.g. `https://valmont-finance-api.onrender.com` | Browser → API |
| `VITE_GOOGLE_CLIENT_ID` | Recommended (same value as `GOOGLE_CLIENT_ID`) | [Google credentials](https://console.cloud.google.com/apis/credentials) | Renders the Google button (also loaded from `GET /api/auth/config`) |
| `VITE_DEMO_MODE` | Leave **unset or `false`** | — | If `true` **and** `VITE_API_URL` is empty, the UI uses mocks. Live deploys with `VITE_API_URL` always use the real API, including Google. |

Do **not** put database or Gemini/Groq keys on Vercel. Those belong on Render only.

---

## Minimum set for Google → quiz → live dashboard

1. Neon `DATABASE_URL` + `DATABASE_SSL=true` on Render  
2. `JWT_SECRET`, `DEV_AUTH_BYPASS=true`, `GOOGLE_CLIENT_ID`, `CORS_ORIGIN` on Render  
3. `VITE_API_URL` (+ `VITE_GOOGLE_CLIENT_ID`) on Vercel  
4. Google JS origins = Vercel URL + `http://localhost:5173`  
5. Optional: `GROQ_API_KEY` so Learn / Advisory are not `[MOCK]`

Then: landing → Google (or email) → onboarding quiz → welcome → dashboard.
