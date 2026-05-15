# Coaching Timeline Realtime — Handoff

Branch: `main`
Plan file: `/Users/a3tech/.claude/plans/we-currently-have-update-enumerated-waterfall.md`
Commit: `31edb0f feat: new /coaches page setup + linkage to our system`

## Scope

The cal.com sync landed previously (webhook → `captureBooking` / `rescheduleBooking` / `cancelBooking` → `coaching_sessions` table). This session connects that data back to the UI:

1. For each step in `CoachingTimeline`, show a `Frame` card with the user's currently scheduled event (title + datetime + join link) instead of the Booker when a non-cancelled future booking exists for that stage.
2. When a cal webhook updates the DB (created / rescheduled / cancelled — whether from the embedded Booker or a cal.com email link), the timeline UI updates live without manual refresh.

Transport: **Trigger.dev realtime** (already installed, used by `useRealtimeRunWithStreams` in `setup.tsx`). Webhook triggers a tiny broadcast task tagged `user:${userId}`; the frontend subscribes by tag using a public access token issued from the API on page load.

## Decisions locked with the user

- Card content: title + datetime + join link (Spanish locale).
- Empty state: show the existing `Booker` (current behavior). No placeholder Frame.
- Transport: Trigger.dev realtime, not SSE — Vercel serverless friendly, no Postgres LISTEN/NOTIFY (project is SQLite/Turso, no native pub/sub).
- Race condition acceptable for v1: webhook → DB → trigger task → realtime push has ~1–2s latency. If snappier UX wanted later, layer a cal embed `bookingSuccessful` event listener on top — no rewrite needed.
- User identification: cal.com sometimes drops `metadata.userId` from webhook payloads. Server-side fallback resolves user by matching `attendees[].email` against `auth.user.email`. Booker prefills `email` + `name` so the booker's auth email reaches the webhook reliably.

## Files changed

### `packages/schemas/src/jobs/coaching-booking-changed.ts` *(new)*
- Input schema for the broadcast task. Fields: `action` (`"created" | "rescheduled" | "cancelled"`), `calBookingUid`, `stage` (from `coachingStageEnum`), `userId`.
- Exports `coachingBookingChangedActionEnum`, `coachingBookingChangedInputSchema`, types.

### `packages/jobs/src/trigger/tasks/coaching-booking-changed.ts` *(new)*
- `schemaTask` with `id: "coaching-booking-changed"`, `maxDuration: 10`.
- Body is a near no-op (logs and returns the payload). The task exists for its run lifecycle + tags so realtime subscribers see a new run when a booking changes.

### `packages/api/src/services/coaching-bookings.ts` *(extended)*
- Added `broadcastBookingChange(input, log?)` — fires `tasks.trigger<typeof coachingBookingChangedTask>` with tags `[user:${userId}, coaching-changed]`. Wrapped in try/catch so trigger failures don't drop the webhook 200.
- Added `lookupBookingOwner(calBookingUid)` — queries `coachingSessions` by uid, returns `{ stage, userId } | null`. Used by reschedule/cancel paths so the broadcast knows who to tag.
- Added `resolveUserId(payload)` async — tries `payload.metadata.userId` first via the existing sync `readUserId`, then falls back to matching `payload.attendees[].email` against `auth.user.email`. Needed because cal.com periodically drops metadata.
- The sync `readUserId(payload)` is kept for the metadata-only fast path (not currently consumed externally, but exported as a primitive).

### `apps/web/src/routes/api/webhooks/cal/$.ts` *(modified)*
- `handleBookingCreated` now `await resolveUserId(payload)` instead of sync `readUserId`. After `captureBooking`, fires `broadcastBookingChange({ action: "created", ... })`.
- `handleBookingRescheduled` — if `rescheduleBooking` finds a row, calls `lookupBookingOwner(payload.uid)` for the userId/stage and broadcasts `"rescheduled"`. Fallback recreation path also broadcasts `"rescheduled"` with the resolved user.
- `handleBookingCancelled` — calls `lookupBookingOwner` **before** `cancelBooking` (status flip doesn't affect the row), then broadcasts `"cancelled"`.

### `packages/schemas/src/api/coaching.ts` *(extended)*
- Added `coachingRealtimeTokenSchema = z.object({ expiresAtMs, token })`.

### `packages/api/src/routers/coaching.ts` *(extended)*
- New `realtimeToken` procedure (`protectedProcedure`). Calls `triggerAuth.createPublicToken({ scopes: { read: { tags: [user:${userId}] } }, expirationTime: "30m" })`. Returns `{ token, expiresAtMs }`.
- Constants `REALTIME_TOKEN_TTL_MS = 30 * 60 * 1000`, `REALTIME_TOKEN_EXPIRATION = "30m"`.

### `apps/web/src/components/domains/coaching/scheduled-event-card.tsx` *(new)*
- `<ScheduledEventCard booking={CoachingBookingSummary} />`.
- Renders `Frame` → `FrameHeader` with `FrameTitle` (booking title or fallback `"Sesión agendada"`) + `FrameDescription` (date via `Intl.DateTimeFormat("es", { dateStyle: "full", timeStyle: "short" })`).
- `FrameFooter` has `Button` rendered as `<a>` via `render={<a ...>}` for "Unirse a la llamada" (when `videoCallUrl`) and ghost-variant "Gestionar en Cal" (always, links to `https://cal.com/booking/${calBookingUid}`).
- `target="_blank" rel="noopener"` on both.

### `apps/web/src/components/domains/coaching/coaching-timeline.tsx` *(modified)*
- Added `stage: CoachingStage` to each `StepDef`. Mapping: step 1 → `general-coaching`, step 2 → `pre-interview-training`, step 3 → `mock-interview`, step 4 → `follow-up` (matches the webhook handler's `SLUG_TO_STAGE`).
- New `pickStageBooking(bookings, stage)` helper — filters by stage + non-cancelled + `startsAt >= now`, sorts ascending by `startsAt`, returns the earliest match.
- Fetches `orpc.coaching.dashboard.queryOptions()` and `orpc.coaching.realtimeToken.queryOptions()` (with `staleTime` + `refetchInterval` of 25min so token refreshes before its 30min expiry).
- Subscribes via `useRealtimeRunsWithTag<typeof coachingBookingChangedTask>(tag, { accessToken, enabled })`. Tag is `user:${userId}` or `"user:pending"` when userId not yet known (`enabled` gates the actual subscription).
- `lastRunCountRef` tracks the previous `runs.length`; an effect invalidates `dashboard` queryKey when count increases. Uses ref (not state) to avoid render loops; deps on `runs.length` (not `runs`) so identity changes alone don't fire.
- Conditional render inside `FramePanel`: `stageBooking` → `<ScheduledEventCard />`; else the existing `<Booker />`.

### `apps/web/src/components/domains/coaching/booker.tsx` *(modified)*
- New props `email: string`, `name: string` (plus existing `eventSlug`, `userId`).
- Prefills `<Cal config={{ email, name, metadata: { userId }, ... }} />`. Belt-and-suspenders: metadata is the canonical path; email lets `resolveUserId` succeed when cal drops metadata.
- Caller (`CoachingTimeline`) reads from `authClient.useSession()` and guards on `session?.user` before rendering Booker.

## Flow

1. User opens `/coaching`. `CoachingTimeline` mounts, fetches dashboard + token, subscribes to `user:${userId}`.
2. User picks a slot in the embedded `Booker` (prefilled email/name).
3. Cal.com hits webhook at `/api/webhooks/cal/$`. Handler verifies signature, calls `captureBooking`, then `broadcastBookingChange({ action: "created", ... })`.
4. Trigger.dev fires the `coaching-booking-changed` task tagged `user:${userId}`. Run appears in `useRealtimeRunsWithTag`'s `runs` array on the frontend.
5. Effect detects `runs.length` increased → `queryClient.invalidateQueries({ queryKey: orpc.coaching.dashboard.queryOptions().queryKey })`.
6. Dashboard refetch returns the new booking. `pickStageBooking` finds the match. `Booker` swaps to `ScheduledEventCard`.
7. Same path for cancel (card disappears, Booker returns) and reschedule (datetime updates).

## Verification

- `npx tsc --noEmit` from `packages/api` — clean for the new code.
- `npx tsc --noEmit` from `apps/web` — clean for `coaching-timeline.tsx`, `scheduled-event-card.tsx`, `webhooks/cal/$.ts`.
- `pnpm dlx ultracite check` — clean on all 8 touched files.
- Manual test confirmed working end-to-end: cal booking → webhook → trigger task → realtime → dashboard refetch → card render.

## Manual test plan

1. **First booking** — open `/coaching`, all 4 steps show `Booker`. Pick a slot in step 2 (Prep pre-entrevista). Within ~2s, step 2 swaps from Booker → `ScheduledEventCard` with title + datetime + Join button. Other steps still show Booker.
2. **Cancel via cal.com email link** — open the cancel link from the cal confirmation email, cancel. Within ~2s, card disappears and Booker returns to step 2.
3. **Reschedule via cal.com email link** — reschedule from the email link to a different time. Card datetime updates without page reload.
4. **Two tabs** — same user logged in on two tabs. Trigger a booking from cal.com side. Both tabs update simultaneously.
5. **Trigger.dev dashboard** — verify `coaching-booking-changed` runs appear with `user:<id>` tag for each cal event.
6. **Token expiry** — leave the page open >30 min. React Query refetches `realtimeToken` at the 25min `refetchInterval`. The realtime hook re-inits with the fresh token without dropping the subscription.

## Operational notes

- **Cal webhook URL**: must include `/api` prefix. The route file `apps/web/src/routes/api/webhooks/cal/$.ts` is a TanStack splat route, so the URL hit must end with a splat segment. Acceptable forms: `/api/webhooks/cal/$` (literal `$`) or any non-empty segment. Bare `/api/webhooks/cal` returns 307. Consider renaming to `cal.ts` (without the `$/` folder) for a clean `/api/webhooks/cal` URL.
- **Ngrok + Vite 403**: Vite blocks unknown `Host` headers by default. If cal webhooks hit ngrok in dev and return 403 "Blocked request. This host is not allowed.", add `server.allowedHosts: [".ngrok-free.app", ".ngrok.app", ".ngrok.io"]` (or `true` for dev-only) to `apps/web/vite.config.ts`.
- **Cal embed `metadata` reliability**: cal.com sometimes drops custom `metadata` keys unless they're allowlisted on the event type's metadata schema in the cal admin. This is why we layer the email fallback in `resolveUserId`. Prefer auth-email matching over metadata for any new fields.

## Critical files

- `packages/schemas/src/jobs/coaching-booking-changed.ts` *(new)*
- `packages/jobs/src/trigger/tasks/coaching-booking-changed.ts` *(new)*
- `packages/api/src/services/coaching-bookings.ts` — `broadcastBookingChange`, `lookupBookingOwner`, `resolveUserId`.
- `apps/web/src/routes/api/webhooks/cal/$.ts` — webhook handler.
- `packages/api/src/routers/coaching.ts` — `realtimeToken` procedure.
- `packages/schemas/src/api/coaching.ts` — `coachingRealtimeTokenSchema`.
- `apps/web/src/components/domains/coaching/scheduled-event-card.tsx` *(new)*
- `apps/web/src/components/domains/coaching/coaching-timeline.tsx` — main wiring.
- `apps/web/src/components/domains/coaching/booker.tsx` — prefill props.

## Reused utilities

- `useRealtimeRunsWithTag` from `@trigger.dev/react-hooks` (pattern from `apps/web/src/routes/_protected/setup.tsx`).
- `auth.createPublicToken` from `@trigger.dev/sdk` (imported as `triggerAuth` to avoid clash with `@stackk-career/auth`).
- `Frame`, `FrameHeader`, `FrameTitle`, `FrameDescription`, `FrameFooter` — `apps/web/src/components/ui/frame.tsx`.
- `Button` (base-ui `render={<a />}` prop) — `apps/web/src/components/ui/button.tsx`.
- `captureBooking` / `rescheduleBooking` / `cancelBooking` from prior cal sync work — unchanged.
- `orpc.coaching.dashboard` query — already returned shaped bookings (id, stage, startsAt, endsAt, title, videoCallUrl, bookingStatus, calBookingUid, calLink, calEventTypeId, calEventTypeSlug, createdAt).
- `authClient.useSession()` — `apps/web/src/lib/auth-client.ts`.

## Open items / follow-ups

- **Webhook URL cleanup** — rename `apps/web/src/routes/api/webhooks/cal/$.ts` → `apps/web/src/routes/api/webhooks/cal.ts` (drop the splat) so the cal-side URL is the cleaner `/api/webhooks/cal`. Update `createFileRoute("/api/webhooks/cal/$")` → `createFileRoute("/api/webhooks/cal")`.
- **Vite `allowedHosts`** — add ngrok hosts to `apps/web/vite.config.ts` for smoother local webhook testing.
- **Optimistic UX layer (optional)** — listen for cal embed `bookingSuccessful` event in `Booker` and immediately invalidate dashboard query, so the card appears instantly when the user books via the embed (instead of waiting on webhook → trigger → realtime). Worth doing only if the ~1–2s lag feels off.
- **Cancel button on `ScheduledEventCard`** — current footer only has "Unirse" + "Gestionar en Cal". Consider a direct in-app cancel/reschedule flow if the cal.com hosted page is friction.
- **Multiple-bookings-per-stage** — `pickStageBooking` returns the earliest future non-cancelled. If a user books a second session for the same stage before the first one elapses, the second is hidden until the first completes. Probably correct, but flag for product.
- **`startsAt` null** — bookings without `startsAt` are treated as "no scheduled event" and the Booker shows. If cal ever sends a confirmed booking without `startsAt`, the user will see the Booker even though a session exists. Currently no observed case.
