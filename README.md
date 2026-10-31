# DIA (Do-It Agent)

> **From "What should I do?" to "It's done."**

DIA is a multilingual, voice-first autonomous business teammate for small merchants
(Paytm Build for India Hackathon, Track 3: Autonomous AI Teammates). A merchant speaks
naturally in Hindi, English, Hinglish, Marathi, Tamil, Telugu or Bengali, and DIA
investigates real business data, decides what to do, prepares the action, and executes
it after human approval.

## Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS (khata world on a dark desk).
- Backend: Node.js + TypeScript + Fastify.
- Database: SQLite by default (zero setup); PostgreSQL supported by changing the Prisma
  provider. Schema in `prisma/schema.prisma`.
- AI: provider-independent LLM service (OpenAI chat-completions + tools). Defaults to
  Google Gemini free tier; falls back to a deterministic mock agent.
- Voice: Sarvam AI (Saaras STT, Bulbul TTS, Mayura translation), all server-side, with
  mock providers when credentials are missing.
- Merchant data: mock Paytm adapter with a documented real-integration boundary.

## Quick start

```bash
# 1. Install backend deps
cd backend && npm install

# 2. Create and seed the database (SQLite, zero setup)
npm run db:setup

# 3. Install frontend deps
cd ../frontend && npm install

# 4. Configure env
cd .. && cp .env.example .env
# edit .env: add SARVAM_API_KEY and/or LLM_API_KEY if you have them (optional)

# 5. Run backend (port 8787)
cd backend && npm run dev

# 6. Run frontend (port 5173) in another terminal
cd frontend && npm run dev
```

Open http://localhost:5173. The app auto-creates a demo session for Sharma Electronics.

## Deploy

The frontend and the API deploy separately. The frontend is static; the API needs
a persistent disk because it keeps its SQLite database and records every approval.

### Frontend on Vercel

1. Import the repository in Vercel and set **Root Directory** to `frontend`.
2. Framework preset is Vite. Build `npm run build`, output `dist`.
3. Add the environment variable `VITE_API_URL=https://<your-api-host>`.
4. `frontend/vercel.json` already handles the SPA rewrite, so `/history` and
   `/settings` resolve on refresh.

### API on Render

1. Create a new **Blueprint** from this repository. `render.yaml` defines the
   service, the build, the health check, and a 1GB disk at `/var/data`.
2. The blueprint uses the Starter plan because persistent disks are not available
   on the free plan. Free Render services also sleep and lose their local disk.
3. Fill the secret variables when prompted: `SARVAM_API_KEY`, `LLM_API_KEY`, and
   `FRONTEND_ORIGIN` set to your Vercel URL.
4. On the first boot, `backend/start.sh` creates the schema and seeds the shop if
   `/var/data/dev.db` is missing. Later boots keep the existing data.

### Before sharing the URL

- `/api/auth/demo` issues a session to anyone who opens the app. Put a password
  gate in front of a public deployment, or keep it unlisted.
- Rotate the Sarvam and Gemini keys if they have ever been pasted into a chat.
- The free Gemini tier allows about 20 requests per day per model, and one
  multi-tool question uses several. Use a billed key for a live demo.

## Environment variables

See `.env.example`. All external integrations are optional; the app runs in demo mode
without credentials. Model IDs stay configurable: `SARVAM_STT_MODEL`, `SARVAM_TTS_MODEL`,
`SARVAM_TRANSLATE_MODEL`, `LLM_MODEL`, `LLM_PROVIDER`, `LLM_BASE_URL`.

## LLM providers

Set `LLM_PROVIDER` to one of: `gemini`, `groq`, `openrouter`, `openai`, `custom`, `mock`.
Any provider with an empty `LLM_API_KEY` falls back to `mock`. All use the OpenAI
chat-completions + tools wire format.

The default Gemini model is `gemini-3.1-flash-lite`. Gemini 3 models spend several
seconds "thinking" unless `LLM_REASONING_EFFORT=none` is set, and the demo needs
the fast path. One multi-tool question makes several model calls, so a free-tier
key (about 20 requests per day per model) runs out quickly during rehearsal. Use a
billed key for a live demo.

If the provider fails before any tool has run in a turn, the agent retries that
turn on the deterministic local planner, so a quota error or an outage does not
break the flow. Failures after a write has started return a short, localized
message instead of an English error.

## Sarvam AI

All Sarvam calls happen server-side through `backend/src/services/sarvam/*`.
- STT: `POST /api/sarvam`-backed `/speech-to-text`, multipart, model `saaras:v4`.
- TTS: `/text-to-speech`, JSON, model `bulbul:v3`, returns base64 WAV.
- Translate: `/translate`, JSON, model `mayura:v1`.
- Voice: `SARVAM_TTS_SPEAKER` defaults to `priya`, an Indian female Hindi voice.
  It also reads Tamil, Telugu, Marathi and Bengali. Other valid `bulbul:v3`
  speakers include `neha`, `ishita`, `pooja`, `shreya`, `kavya`, `ritu`,
  `simran`, `roopa`, `tanya`, `shruti`, `suhani`, `kavitha`.

## Database

```bash
cd backend
npm run db:generate   # generate Prisma client
npm run db:push       # sync schema (SQLite)
npm run db:seed       # seed Sharma Electronics data
npm run db:setup      # all three
```

For PostgreSQL, change `provider = "sqlite"` to `provider = "postgresql"` in
`prisma/schema.prisma`, set `DATABASE_URL` to a `postgresql://` URL, then run
`npm run db:push && npm run db:seed`.

## Tests

```bash
cd backend && npm test
```

Runs the mock-LLM plan builder tests and a Fastify health smoke test.

## Demo script (under 5 minutes)

1. Open the dashboard. Today's revenue, orders, segments and the weekend signal are
   real seeded data.
2. Start a voice conversation (or type) in Hinglish:
   "Last weekend sales kam ho gayi hain. Check karo kya problem hai aur inactive
   customers ko wapas lane ke liye ek offer banao."
3. DIA retrieves sales, compares weekends, analyses customer segments, creates an
   inactive-customer segment, prepares an 8% comeback offer, and generates a
   WhatsApp campaign. Watch the tool timeline.
4. Ask for a Marathi campaign. DIA generates the message in Marathi via Sarvam.
5. Review the approval card (audience, offer, estimated cost, message preview) and
   approve.
6. DIA executes through the mock Paytm adapter; a real execution record appears in
   Campaigns and Activity History.
7. DIA replies with a voice confirmation in the chosen language.

## Architecture

See `docs/` (if present) and the source tree:

```
backend/src/agent/        tool-calling agent, 10 tools, approval state machine
backend/src/services/     llm (gemini/groq/openrouter/openai/custom/mock),
                          sarvam (stt/tts/translate), analytics
backend/src/integrations/ paytm mock adapter, n8n adapter (optional)
backend/src/routes/       REST + SSE
frontend/src/pages/       Overview, Assistant, Customers, Campaigns, Offers,
                          Analytics, Activity, Settings
prisma/                   schema + seed
```

## n8n

Optional. Set `N8N_WEBHOOK_BASE_URL` to route campaign execution and reports through
n8n workflows. When unset, the backend's built-in mock workflow adapter runs them.
Exported workflow JSONs live under `n8n/workflows/`.

## Security notes

- API keys are server-side only.
- Demo session is a signed cookie; all data queries are scoped by `merchantId`.
- Rate limiting on all routes; audio uploads capped at 10 MB / 30 seconds.
- PII (phone numbers) is never logged in plain text.
- Campaign execution requires server-side approval validation; the LLM cannot
  self-approve.
