# Reachmark FaceHub

A real-time AI character studio, built to work like senloface.com:

- **Marketing site**: home, pricing in naira, download, how-it-works and legal pages, cookie consent and a WhatsApp support button.
- **Accounts**: register, sign in, profile and password change. The first account becomes admin.
- **Studio**: free private camera preview, sample or uploaded characters (consent required), Signature/Nova models, a credit limit per take, **live AI transformation**, switching character mid-take, "keep my mouth", an "AI video" label, browser recording with mic, and a pop-out output window for calls and OBS.
- **Credits wallet**: packs plus custom amounts, **Paystack checkout** (redirect, verify and signed webhook, idempotent), per-second metering, rounding up to a whole credit, and automatic refund of unused reserved credits.
- **Admin**: revenue, users, credits sold and used, engine and payment status, manual credit adjustments, and disabling accounts.
- **GPU worker**: an InsightFace + inswapper real-time face engine (the same core Deep-Live-Cam uses) that streams JPEG frames over WebSocket.

```
Browser studio ──JPEG──▶ Web app (/ws/live, auth + metering) ──▶ GPU worker (/sessions/:id/stream)
               ◀─AI frames─                                   ◀──
```

The browser never talks to the worker directly. The web app authenticates the user, reserves credits, bills per second and relays frames.

---

## Quick start (local, about 2 minutes)

Requires **Node 20.10+**.

```bash
npm install
npm run setup      # creates .env with local defaults (demo payments + test engine)
npm run dev        # http://localhost:8080
```

Create an account (the first one is admin), buy a pack (demo mode credits it instantly), open **Studio** and press **Go live**.

With `TEST_ENGINE=true`, frames pass through unchanged and are clearly labelled. Everything else (credits, metering, recording, pop-out) works for real, so you can test the whole product before a GPU is connected.

Run the end-to-end test any time:

```bash
npm run smoke
```

## Going to production: three settings

Everything lives in **`.env`**. Brand, prices, models and sample characters live in **`config/site.json`**.

| What | Set in `.env` |
|---|---|
| **Payments** | `PAYSTACK_SECRET_KEY=sk_live_…`, `DEMO_PAYMENTS=false`, and in the Paystack dashboard set the webhook to `https://YOUR-DOMAIN/api/paystack/webhook` |
| **Live AI engine** | `GPU_WORKER_URL=https://your-worker:8787`, `GPU_WORKER_TOKEN=<same as worker>`, `TEST_ENGINE=false` |
| **Site** | `PUBLIC_URL=https://YOUR-DOMAIN`, `NODE_ENV=production`, `ADMIN_EMAILS=you@domain.com`, `SUPPORT_WHATSAPP=234…`, `SUPPORT_EMAIL=…` |

Then deploy using any one of these:

```bash
# A) Any VPS / server
npm ci && npm run build && npm start

# B) Docker
docker compose up -d                      # web app only (worker elsewhere)
docker compose --profile gpu up -d        # web app + GPU worker on the same NVIDIA machine

# C) Railway / Render / Fly: deploy the repo; the Dockerfile + railway.json are included.
#    Mount a volume at /data so accounts and uploads persist.
```

Put it behind HTTPS (Caddy, Nginx or the platform's TLS). The camera only works on HTTPS or localhost, and WebSockets (`/ws/live`) must be proxied.

## GPU worker

See [`worker/README.md`](worker/README.md). In short, on an NVIDIA machine:

```bash
cd worker
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install cython && pip install -r requirements.txt
python download_models.py                               # ~600 MB, one time
WORKER_TOKEN=change-me python gpu_worker.py             # listens on :8787
```

Or: `docker build -t facehub-worker worker && docker run --gpus all -p 8787:8787 -e WORKER_TOKEN=change-me facehub-worker`.

The studio shows **Engine online** once `/health` reports the model is loaded. As a rough guide, an RTX 3060-class GPU handles one live take at a smooth frame rate. Raise `MAX_SESSIONS` on bigger GPUs.

## Configuration reference

**`.env`** (see `.env.example` for every option)

- `SESSION_SECRET`: auto-generated and stored in `data/` if left blank.
- `SIGNUP_BONUS_CREDITS`: free credits for new accounts (default 0).
- `WINDOWS_APP_URL`: if you ship a Windows build, its link replaces "coming soon".
- `DATA_DIR`: where the SQLite database and uploaded portraits are stored (default `./data`).

**`config/site.json`**

- `brand`: name, tagline and description.
- `pricePerCreditKobo`, `packages[]`, `customCredits`: prices in kobo (₦1 = 100 kobo).
- `models[]`: `creditsPerSecond` and a `profile` (frame width, JPEG quality, mouth mask default).
- `sampleCharacters[]`: images live in `public/characters/`.

## Project layout

```
server/            Express API + WebSocket relay
  index.js         app entry (Vite middleware in dev, static build in prod)
  config.js        .env + site.json loader
  db.js            SQLite schema (users, sessions, characters, transactions, live_sessions)
  auth.js          scrypt passwords, HttpOnly session cookies, rate limits
  wallet.js        Paystack checkout / verify / webhook, ledger
  live.js          credit holds, per-second billing, engine adapters, /ws/live
  characters.js    portrait uploads (consent-gated, private)
  admin.js         admin API
src/               React front-end (public site + dark studio)
worker/            Python GPU engine
config/site.json   brand, prices, models, sample characters
scripts/           setup + end-to-end smoke test
```

## Billing rules (match the pricing page)

1. **Go live** reserves `min(balance, your limit)` credits.
2. Usage counts each second while AI frames are actually flowing. Loading time and stalls are not billed.
3. When the take ends (Stop, limit reached, tab closed or connection lost), the charge is `ceil(seconds × rate)` and the rest is refunded immediately.
4. If the server restarts mid-take, the take is settled on boot from the last recorded second.

## Responsible use

The product is built for comedy, creative streams and calls where everyone knows it's AI, and it keeps these safeguards on by default:

- Uploading a portrait requires an explicit permission confirmation, recorded with a timestamp.
- Sign-up requires accepting the terms and the acceptable use policy (no impersonation, fraud or scams).
- The "AI video" label is on by default and is burned into the output and recordings.
- Admins can disable accounts.

**Model licence:** the public `inswapper_128` weights are released by InsightFace for **non-commercial research use**. For a paid commercial service, get a commercial licence from InsightFace or swap in a commercially licensed model. The worker loads any compatible ONNX model from `worker/models/`.
