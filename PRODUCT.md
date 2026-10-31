# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Greenfield build with the stack pinned by the original brief: React + TypeScript + Vite + Tailwind CSS on the frontend; Node.js + TypeScript + Fastify on the backend; PostgreSQL via Prisma; Recharts, Lucide, shadcn-style components where useful; browser MediaRecorder for audio capture; SSE for streaming agent state.

## Users

Primary audience: small-shop owners such as the fictional Sharma Electronics
merchant in Mumbai, who speaks natural Hindi, English, Hinglish or another
Indian language and is not comfortable with dense payment dashboards, filters,
charts, or AI vocabulary. They may have limited literacy in English and will use
the app one-handed on a phone behind a counter. The demo is shown to hackathon
judges, but the judges are watching a merchant's experience, not a dashboard.

Single merchant per deployment; the schema and API are merchant-scoped even
though the UI has no merchant switcher.

## Product Purpose

DIA is a voice-first autonomous business teammate for Paytm merchants. A merchant states a business goal in everyday speech and DIA investigates real transaction and customer data, identifies insights, decides on an action, prepares it, asks for approval, executes the approved action through a merchant integration adapter, then reports results. Success for this build: a judge sees the full loop (voice request, agent reasoning with visible tool activity, localized campaign, human approval, persistent execution record, voice confirmation) run live and correctly in under five minutes, with mock integrations covering any missing credentials.

## Positioning

Existing dashboards report what happened; DIA answers what to do next and then does it, as an autonomous teammate rather than a chatbot. Its verifiable differentiators: a real tool-calling agent grounded in SQL-backed business data (never fabricated metrics), server-side approval enforcement (the LLM cannot self-approve writes), and Sarvam AI voice in Hindi/Hinglish/Marathi/Tamil/Telugu/Bengali as a first-class surface, not an afterthought microphone button.

## Operating Context

Demo is run from a laptop: dashboard on a projector-friendly screen, spoken Hinglish request recorded through the browser microphone, agent progress streamed as tool-event timeline, campaign preview approved by click, execution recorded in activity history, voice confirmation in Marathi via TTS. All demo data is a seeded fictional 90-day history with deliberately embedded patterns (recent weekend decline, inactive customer cohort, mixed past campaign results). Internet may deliver real Sarvam STT/TTS; when credentials are absent, mock providers keep every step demonstrable.

## Capabilities and Constraints

Confirmed capabilities: 10 agent tools (sales metrics, transaction history, customer segments, sales-performance analysis, offer creation with margin math, segment creation, campaign generation, campaign preview, campaign execution, campaign performance); approval state machine (pending_approval, approved, rejected, executing, completed, failed) enforced server-side with per-action IDs; read-only tools run automatically, external-effect writes require merchant approval; conversation and tool-run persistence; activity history and audit trail; demo-mode fallbacks for LLM, STT, TTS and translation; rate limiting, secure audio upload limits, PII-safe logging.

Hard constraints: never invent Paytm APIs (mock Paytm adapter with a documented real-integration boundary); never fabricate transaction data, customer counts, campaign results or business metrics; Sarvam and LLM keys live only server-side; model IDs stay env-configurable; the app must run without external credentials.

## Brand Commitments

Name: DIA (Do-It Agent). Tagline statement: "From 'What should I do?' to 'It's done.'" Neutral own-brand identity for DIA itself; no binding visual assets exist yet (the visual world is decided by the design roll in new-work). Keep Paytm brand assets out of the product identity.

## Evidence on Hand

The seed dataset is authored (documented in the repo): 90 days of transactions, 100+ customers with spending patterns, product catalog with margins, past campaigns with real outcome rows. No customer testimonials, benchmark numbers or press: do not fabricate any for the demo. Sonar/text claims in UI must quote agent tool results only.

## Product Principles

1. Show real work: agent progress comes from actual tool executions and DB queries, never staged animations. Explain that work in the merchant's words ("I checked your sales"), never in tool or API names.
2. Ground truth over generation: every number on screen is a number from the database or a tool result.
3. Human in the loop for impact: read actions flow, write actions wait for approval.
4. Voice as the front door: voice is the primary interaction path; text is the fallback, both share one agent loop.
5. Simple enough to use without instruction: three screens, one primary action per screen, no dashboards, no charts, no AI vocabulary. If a merchant has to learn the interface, the interface is wrong.
6. Demo-proof resilience: every external dependency has a mock path so the five-minute demo cannot break on venue Wi-Fi.

## Accessibility & Inclusion

No formal WCAG level is pinned, but inclusion is the product thesis: voice-first interaction for merchants who prefer speaking over reading dashboards; responses in the merchant's chosen language; clear spoken summaries instead of long technical text read aloud; the UI stays readable at 1280px projector widths and on mobile. Body text never drops below 16px, and the primary answer is 19px, because the merchant may read it in a bright shop or on a projector from across a room.
