# Assendia — Product Requirements Document

> AI-powered career platform for the Spanish-speaking market (launch focus: Peru).
> Build, parse, analyze, and improve your CV — then book human coaching to land the role.
>
> Product: **Assendia** (`assendia.com`) · Studio: **Stackk Studios** · Repo: `stackk-career`
> Status: this document reflects the system as built in the monorepo plus the explicitly
> staged "coming soon" surfaces. It is a living document — update it as scope changes.

---

## 1. Vision

Job seekers lose offers not because they lack ability, but because their CV fails to tell the
story, they walk into interviews unprepared, and they have no affordable access to expert
guidance. Assendia closes that gap with an AI co-pilot for the entire job search: it turns a raw
PDF or a blank page into a structured, analyzed, recruiter-ready CV, surfaces concrete edits, and
connects the candidate to human coaches at the moments that matter.

The long-term vision is a single workspace that follows a candidate from "I need a better CV" all
the way to "I signed the offer" — CV creation and analysis, tailored cover letters, recommended
job targets, conversational AI agents, and confidential 1:1 coaching, all in Spanish and priced
for the local market.

## 2. Mission & Positioning

- **Mission:** Give every candidate a CV and an interview strategy that competes with the best,
  without needing to pay for a private career consultant by the hour.
- **Audience:** Spanish-speaking job seekers, initially in Peru (Mercado Pago `MPE`, pricing in
  PEN). Built i18n-aware but Spanish-first in copy and UX.
- **Wedge:** AI CV parsing + structured analysis that produces *editable* output (not a static
  score), wrapped in a freemium model that converts into paid AI quota and human coaching.

## 3. Product Ideals & Principles

These are the non-negotiables that shape every decision in the codebase.

1. **Editable, not just graded.** Analysis must produce concrete, applicable edits against a
   structured CV model — never an opaque score the user can't act on.
2. **Confidentiality is a promise.** Coaching sessions are private between coach and candidate.
   "Nunca venderemos tus datos" is a product commitment, not a tagline.
3. **Single source of truth for entitlements.** `PLAN_CATALOG` is the only place plan limits live;
   every quota gate reads from it. No limit is hardcoded at a call site.
4. **Type safety end-to-end.** TypeScript + Zod + oRPC + Drizzle from DB row to React component.
   Contracts are shared packages, not duplicated shapes.
5. **Cache-first with explicit invalidation.** Usage counters and the viewer snapshot are read
   from Redis; any counted write must invalidate the matching viewer/usage tag. Stale billing is
   treated as a bug.
6. **Spanish-first UX, semantic HTML.** Reach for `section`/`article`/`footer`/`p`; drop redundant
   wrappers. Accessibility and meaningful markup are default, not afterthoughts.
7. **Clean cutover over compatibility cruft.** Fix data at the source; don't carry long-lived
   fallbacks for malformed historical rows unless the product explicitly requires it.
8. **Quota gates close to the mutation.** Every metered action asserts quota immediately before the
   write and re-invalidates cache immediately after.
9. **Code quality is automated.** Ultracite/Biome enforce formatting and lint; reviewers focus on
   business logic, naming, edge cases, and UX.

## 4. Goals

### Product goals
- Convert an uploaded PDF into a structured, editable CV with high-fidelity section extraction.
- Let users create, edit, and manage multiple CVs with a block-based editor and inline AI help.
- Give actionable resume analyses (fast + detailed) with apply/dismiss edit tracking.
- Offer confidential human coaching across a defined progression of session types.
- Monetize via a freemium subscription with clear, metered AI quotas (Free / Pro / Max).

### Business goals
- Free tier that delivers a real "wow" (one AI CV + analyses) to drive sign-up.
- Paid tiers that unlock meaningful AI volume, conversation agents, and coaching sessions.
- Recurring billing through Mercado Pago tuned for local card-approval realities.

### Engineering goals
- A typesafe monorepo where API, schemas, DB, auth, and jobs are shared packages.
- Durable, observable AI pipelines (Trigger.dev + Axiom/evlog) with real-time progress.
- Predictable billing/usage accounting with cache discipline and idempotent provider webhooks.

## 5. Personas

- **The Re-entry Candidate** — has an old CV PDF, needs it modernized, analyzed, and tightened
  fast. Primary path: upload → parse → analysis → edit.
- **The Builder** — starting fresh, wants to assemble a CV block-by-block with AI suggestions per
  section. Primary path: blank create → inline AI → analysis.
- **The Interview-Bound Candidate** — has a target role and an interview soon; needs coaching
  (mock interview, pre-interview training). Primary path: coaching timeline.
- **The Power User** — managing multiple targeted CVs and high AI volume; needs Max-tier quotas.

## 6. Current Feature Set (Built)

### 6.1 Authentication & Onboarding
- Better-Auth with Google OAuth and email; sessions persisted in SQLite/Turso.
- Every signed-up user is provisioned a `free` subscription row at signup.
- Onboarding captures an `onboarding_profile`: experience, industry, target role, urgency,
  location — plus a guided chat and a first resume analysis.

### 6.2 AI Resume Parsing ("resume-creation")
- Upload a PDF (via UploadThing); a Trigger.dev `resume-parser` task runs the pipeline:
  1. Resolve the PDF (by file id or URL).
  2. Agent validation gate + **9 parallel section extractions** (outline, header, experience,
     education, certifications, projects, volunteering, skills).
  3. Create `generation` + `resume` rows.
  4. Insert root blocks (contact + one per planned section), then children in parallel.
- Each phase emits a progress event streamed to the client in real time (`@trigger.dev/react-hooks`).
- Counts against `resume_creation_generations_per_cycle` **and** `resumes_total`.

### 6.3 Manual Resume Creation & Block Editor
- Blank-editor CVs (`resume-manual` generation) bounded only by `resumes_total`.
- Block-based model: `contact`, `section`, `entry`, `bullet`, `paragraph`, `skill_line`,
  `skill_item`. Rich text via TipTap; ordering via lexicographical position keys (drag-friendly).
- Blocks are versioned and soft-deletable; content stored as JSON.
- CV metadata: title/display name, status (`draft` / `ready` / `archived`), primary flag,
  target role, targeted company, optional template, and AI metadata (agent score / agent-created).

### 6.4 Resume Analysis ("K02" agents)
- **Fast analysis** and **Detailed analysis** Trigger.dev tasks produce structured analysis objects
  tied to a generation and (optionally) a resume.
- Analyses support a parent/child chain (re-runs) and track `appliedEditIndices` /
  `dismissedEditIndices` so suggested edits are actionable and stateful.
- Counts against `resume_analyses_per_cycle` (failed analyses excluded from the count).

### 6.5 Inline AI Suggestions
- Per-block "Generar" suggestions (descriptions, summaries, etc.) requested from the editor.
- Counts against `resume_inline_ai_suggestions` (per cycle) and one `messages_per_generation`.

### 6.6 Coaching / Asesorías
- Confidential 1:1 coaching booked through Cal.com (embed + webhooks).
- Defined session ladder with recommended next stage:
  `cv-analysis` → `pre-interview-training` → `general-coaching` → `mock-interview` → `follow-up`.
- Bookings stored in `coaching_sessions` (Cal booking uid, event type, start/end, video URL,
  status). Coaching dashboard recommends the next uncompleted stage.
- Gated by `coaching_sessions_per_cycle` (Free 0 / Pro 1 / Max 3).

### 6.7 Subscriptions, Billing & Usage Metering
- Plans: **Free**, **Pro (PEN 79/mo)**, **Max (PEN 179/mo)** — see §9.
- Recurring billing via **Mercado Pago** preapprovals (Checkout Bricks card token + device session
  id for antifraud). Operations: create subscription, change plan, pause.
- Idempotent provider webhooks recorded in `billing_events`; local state lives in a single
  `user_subscriptions` row per user mirrored from provider state.
- Billing window derivation guards against bad provider `next_payment_date` values
  (`deriveBillingWindow` falls back to `addMonths(start, 1)`).
- Usage snapshot (plan + status + window + entitlements + usage + remaining) is composed
  cache-first in Redis with a TTL and per-user tag invalidation.

### 6.8 Platform & Observability
- Structured wide-event logging (evlog) shipped to **Axiom**; every router action sets log context.
- Documentation site (`apps/fumadocs`) for product/engineering docs.

## 7. Future Vision / Roadmap

These surfaces are already routed and gated in the app as **"Próximamente" (coming soon)**, with
entitlements and navigation wired ahead of implementation:

- **Agentes (Conversational AI agents)** — chat agents that power the job search end-to-end.
  Backed by the `conversation` generation type and `conversation_generations_per_cycle`
  (Free 0 / Pro 75 / Max 150) and `messages_per_generation`.
- **Targets (Recommended vacancies)** — job postings recommended from the user's profile and CV;
  paid feature.
- **Cartas de presentación (Cover letters)** — cover letters tailored per vacancy; paid feature.

Direction beyond the staged surfaces:
- Tighter loop between Targets and CV/cover-letter tailoring (one target → tailored CV + letter).
- Coaching that consumes CV analysis context to brief the coach automatically.
- A real marketing/landing experience (the current landing route is a minimal placeholder).
- Broader Latin American market expansion (additional Mercado Pago sites/currencies, i18n copy).

## 8. Architecture Overview

Monorepo managed with **Turborepo + pnpm**.

```
stackk-career/
├── apps/
│   ├── web/         # TanStack Start (SSR) + React 19, coss UI, the product app
│   └── fumadocs/    # Next.js + Fumadocs documentation site
└── packages/
    ├── api/         # oRPC routers, services (subscriptions, mercadopago, coaching), caching
    ├── auth/        # Better-Auth configuration
    ├── db/          # Drizzle schema, migrations, libSQL/Turso clients
    ├── env/         # Typed env schemas (server + web) via @t3-oss/env-core + Zod
    ├── jobs/        # Trigger.dev tasks + AI agents (resume-parser, K02 analyses)
    ├── schemas/     # Shared Zod contracts (plan catalog, entitlements, API/job IO)
    └── config/      # Shared tsconfig / tooling
```

**Stack highlights**
- **Frontend:** TanStack Start/Router/Query/Form, React 19, Vite, Nitro, Zustand; coss UI on
  Base UI (shadcn-compatible `@coss/style`), TailwindCSS v4, Geist/Inter, Motion, Rive, TipTap.
- **API:** oRPC (end-to-end typesafe, OpenAPI), Zod validation, protected/public procedures.
- **Data:** SQLite/Turso (libSQL) + Drizzle ORM; Upstash Redis for cached usage/snapshots.
- **Auth:** Better-Auth + Google OAuth.
- **AI & jobs:** Trigger.dev orchestration; Vercel AI Gateway via the AI SDK; structured object
  generation; real-time run streaming to the client.
- **Integrations:** UploadThing (files), Mercado Pago (payments), Cal.com (coaching bookings).
- **Observability:** Axiom + evlog structured logs.
- **Quality:** Biome / Ultracite, Husky git hooks.

### Data model (key tables)
`user`, `session`, `account`, `verification` (auth) · `onboarding_profile` · `generations` ·
`messages` · `resumes` · `resumeBlocks` · `resume_analyses` · `coaching_sessions` ·
`user_subscriptions` · `billing_events` · `file_metadata`.

### Integrations & required configuration
Database (Turso `DATABASE_URL` + auth token), Upstash Redis, Better-Auth (secret/url + Google
OAuth), Vercel AI Gateway key, UploadThing token, Trigger.dev (secret + project), Axiom
(token + dataset), Cal.com webhook secret, Mercado Pago (access token, public key, webhook
secret, Pro & Max plan ids).

## 9. Plans & Entitlements

`PLAN_CATALOG` is the single source of truth (`packages/schemas/src/subscriptions/catalog.ts`).
A number is a hard cap; `"unlimited"` means no cap. Per-cycle limits reset on the billing window;
`resumes_total` is all-time.

| Entitlement | Scope | Free | Pro (PEN 79) | Max (PEN 179) |
|---|---|---|---|---|
| `resumes_total` | all-time CVs (manual + AI) | 2 | 3 | 100 |
| `resume_creation_generations_per_cycle` | AI CVs from upload | 1 | 3 | 100 |
| `conversation_generations_per_cycle` | chat agent generations | 0 | 75 | 150 |
| `resume_analyses_per_cycle` | fast + detailed analyses | 3 | 50 | 500 |
| `resume_inline_ai_suggestions` | per-block "Generar" | 3 | 150 | 500 |
| `messages_per_generation` | user messages in one generation | 10 | 50 | 500 |
| `coaching_sessions_per_cycle` | coaching bookings | 0 | 1 | 3 |

**Enforcement map**
- `resumes.create` → `resumes_total`
- `generations.create` (`resume-creation`) → `resume_creation_generations_per_cycle`
- `generations.create` (`conversation`) → `conversation_generations_per_cycle`
- `agents.triggerK02ParseResume` → `resumes_total` + `resume_creation_generations_per_cycle`
- `agents.triggerK02FastAnalysis` / `triggerK02DetailedAnalysis` → `resume_analyses_per_cycle`
- `suggestions.prepareSuggestion` → `resume_inline_ai_suggestions` + `messages_per_generation`
- `messages.create` → `messages_per_generation`
- `coaching` (`captureBooking`) → `coaching_sessions_per_cycle`

## 10. Key User Flows

1. **Upload → AI CV:** sign in → onboarding profile → upload PDF → parser pipeline (live progress)
   → structured CV in editor → fast/detailed analysis → apply/dismiss edits.
2. **Build from scratch:** create blank CV → add/edit blocks → inline AI suggestions → analysis.
3. **Coaching:** open "Agenda tu asesoría" → recommended next stage → Cal.com booking → session
   tracked in timeline.
4. **Upgrade/billing:** hit a quota gate → upgrade dialog → Mercado Pago checkout → snapshot &
   usage refresh → unlocked quota.

## 11. Non-Goals (current)

- No backwards-compatibility logic for malformed historical billing rows (repair at source).
- No committed test files in current workflow (verification via REPL replicas, lint, typecheck,
  builds, and in-browser checks per team preference).
- No React Context / prop drilling for cross-component state — local cache/hook reads instead.
- Not yet a multi-region/multi-currency product (Peru/PEN first).

## 12. Success Metrics (proposed)

- **Activation:** % of new users who complete one AI CV (parse or build) within first session.
- **Analysis engagement:** edits applied per analysis; analyses per active user.
- **Conversion:** free → paid rate; quota-gate → upgrade conversion.
- **Coaching:** booking rate among paid users; stage-progression completion.
- **Reliability:** parser success rate; billing/webhook idempotency (no stale-usage incidents).

## 13. Open Questions / Risks

- **Mercado Pago card approval:** recurring micro-charges can trip antifraud (`CC_VAL_433`);
  device session id is sent, but plan charge floor and bank declines remain levers to monitor.
- **Coming-soon scope:** Agents, Targets, and Cover letters need defined IO contracts and quotas
  beyond the entitlements already reserved.
- **Marketing surface:** the public landing page is a placeholder and needs a real funnel before
  growth efforts.
- **Quota tuning:** Free-tier limits (esp. `resumes_total: 2`, one AI CV) should be validated
  against activation/conversion data.
