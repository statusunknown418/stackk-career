# Subscription Layer Plan (`plans/subs.md`)

## Summary

Build a first-class subscriptions and entitlements layer for three tiers: `free`, `pro`, `max`, with Mercado Pago as billing provider, code-owned plan definitions, server-side enforcement, and UI visibility into current plan and remaining quota.

Use one canonical entitlement system that supports both:
- numeric quotas
- boolean/enum feature access

Enforcement rule: users keep access to existing data after downgrade or exhaustion, but all new quota-consuming actions are blocked until next cycle or upgrade.

Initial tier matrix:

| Tier | Resumes | Resume-Creation Generations / cycle | Conversation Generations / cycle | Resume Analyses / cycle | Messages / generation | Coaching |
|---|---:|---:|---:|---:|---:|---|
| Free | 1 | 1 | 0 | 3 | 10 | 0 sessions |
| Pro | 3 | 3 | unlimited | unlimited | 50 | 1 session total / cycle, any stage |
| Max | 100 | 100 | 100 | 500 | 500 | 3 sessions total / cycle, any stage distribution |

Billing cycle model:
- monthly UTC period
- usage resets by active subscription period, not calendar month
- every user gets a persisted `free` subscription record at signup
- upgrades mutate the existing subscription state; no synthetic fallback layer

## Implementation Changes

### 1. Canonical subscription domain
Add a dedicated subscriptions module shared by API and web with:
- `planId` enum: `free | pro | max`
- feature/limit keys:
  - `resumes_total`
  - `resume_creation_generations_per_cycle`
  - `conversation_generations_per_cycle`
  - `resume_analyses_per_cycle`
  - `messages_per_generation`
  - `coaching_sessions_per_cycle`
- limit value model: integer or `unlimited`
- code-owned catalog constant containing exact tier values above
- helper APIs:
  - `getActiveSubscriptionForUser(userId)`
  - `getEntitlements(planId)`
  - `getUsageSnapshot(userId, period)`
  - `assertQuota(userId, action, context?)`

Do not make plan values DB-editable in v1. Keep catalog in code as source of truth.

### 2. DB schema additions
Add persisted subscription state for every user:
- `user_subscriptions`
  - `id`
  - `userId`
  - `planId`
  - `status` (`active | past_due | canceled | expired | trialing`)
  - `provider` (`system | mercadopago`)
  - `providerCustomerId`
  - `providerSubscriptionId`
  - `providerPreapprovalId`
  - `currentPeriodStart`
  - `currentPeriodEnd`
  - `cancelAtPeriodEnd`
  - `createdAt`
  - `updatedAt`
- optional `billing_events`
  - append-only webhook/event audit table for Mercado Pago payload idempotency and debugging

Important initialization rule:
- on user signup, create one active `free` subscription row immediately
- because DB will be wiped, do not add backward-compat migration logic for legacy users with no subscription

Do not add a generic usage ledger in v1. Derive usage from existing domain tables.

### 3. Domain model updates needed for enforcement
Add missing classification fields so quotas can be counted correctly:
- `generations.kind` enum:
  - `resume-creation`
  - `conversation`
- `messages` already belongs to generation; use it for per-generation cap
- `resume_analyses` remains separate and is counted independently
- `coaching_sessions` keeps existing `stage`; quota is total scheduled sessions per cycle regardless of stage

Since DB reset is acceptable:
- no legacy backfill path needed
- seed schema directly with required fields and create clean data shape from day one

### 4. Enforcement layer in API
Centralize checks in one subscription service and call it from mutation entrypoints before writes/jobs:
- `resumes.create`
  - enforce total resume cap
- `generations.create`
  - require `kind`
  - enforce either `resume-creation` or `conversation` quota by current cycle
- `agents.initiateResumeAnalysis`
  - enforce `resume_analyses_per_cycle`
- `messages.create`
  - enforce `messages_per_generation` using count of messages in target generation
- coaching booking creation/webhook ingestion path
  - enforce `coaching_sessions_per_cycle` before creating/syncing bookable session
  - for `pro`, allow 1 total session in cycle, any stage
  - for `max`, allow 3 total sessions in cycle, any stage mix

Quota failures should return structured `FORBIDDEN` errors with:
- `code`
- `limitKey`
- `planId`
- `currentUsage`
- `limit`
- `currentPeriodEnd`

### 5. Subscription lifecycle
Create explicit lifecycle flows:
- signup
  - create active `free` subscription with fresh monthly period
- upgrade to `pro` or `max`
  - update subscription provider fields
  - switch `planId`
  - set period dates from Mercado Pago recurring plan
- renewal
  - roll subscription period forward
  - quota resets because period window changes
- cancel / expire
  - transition plan back to active `free` subscription state at end of paid period, or mutate same row back to `free` if that is simpler and kept consistent across codepaths

Implementation should pick one persistence approach and use it consistently:
- either keep one row per user and mutate it across lifecycle
- or append rows per lifecycle change and define one active row invariant

Preferred v1 choice:
- one active subscription row per user, mutated in place

### 6. Read APIs and UI surface
Expand viewer/subscription read model so frontend can render plan + limits:
- add `viewer.subscription` or new `subscription` router with:
  - current plan
  - subscription status
  - provider
  - billing period dates
  - entitlement map
  - usage snapshot for each tracked limit
  - remaining quota derived server-side
- keep `viewer.usage` backward-compatible only if needed during implementation; main UI should read new subscription response
- web UI should show:
  - current plan badge
  - remaining quotas
  - upgrade prompts on locked actions
  - limit-reached messaging tied to returned server error metadata

### 7. Mercado Pago integration
Plan Mercado Pago as provider adapter behind subscription service:
- create checkout/subscribe flow for `pro` and `max`
- persist provider customer/subscription identifiers
- add webhook endpoint for recurring payment/subscription lifecycle updates
- handle idempotent event processing
- update subscription state on:
  - subscription created
  - payment approved
  - payment failed / past due
  - canceled / expired
  - renewal period rollover

Do not let webhook payload shape leak into rest of app. Normalize provider state inside adapter.

## Public APIs / Types

Add or change these interfaces:
- `Generation.kind` becomes required on create flow
- new subscription types:
  - `PlanId`
  - `SubscriptionStatus`
  - `SubscriptionProvider`
  - `LimitKey`
  - `LimitValue`
  - `UsageSnapshot`
  - `EntitlementMap`
- new read endpoint shape for current subscription and usage
- structured quota error contract returned by protected mutations
- signup/auth flow gains subscription bootstrap step that creates `free` row

## Test Plan

### Unit tests
- plan catalog returns exact values for `free`, `pro`, `max`
- entitlement resolver treats `unlimited` correctly
- signup bootstrap creates active `free` subscription with valid monthly period
- usage snapshot counts each metric from correct tables and period boundaries
- period matching uses subscription window, not calendar month

### API tests
- new signup gets active `free` subscription automatically
- `resumes.create` blocks at 1 on Free, 3 on Pro, 100 on Max
- `generations.create` blocks by `kind`
  - Free: 1 `resume-creation`, 0 `conversation`
  - Pro: 3 `resume-creation`, unlimited `conversation`
  - Max: 100 `resume-creation`, 100 `conversation`
- `agents.initiateResumeAnalysis`
  - Free blocks after 3 in-cycle analyses
  - Pro never blocks on analysis count
  - Max blocks after 500 in-cycle analyses
- `messages.create`
  - Free blocks after 10 messages in generation
  - Pro blocks after 50
  - Max blocks after 500
- coaching scheduling
  - Free always blocked
  - Pro allows 1 session total in cycle, any stage
  - Max allows 3 total in cycle, any stage mix
- downgrade behavior
  - existing data remains readable
  - new writes block when over new plan limits
- Mercado Pago webhook idempotency ignores duplicate events

### Integration / scenario tests
- signup -> user lands on active Free plan with zeroed usage
- Free -> Pro upgrade unlocks blocked actions immediately after activation
- Pro -> Max upgrade expands caps without data migration concerns
- renewal advances period and resets counted quota
- paid subscription end returns user to Free plan state cleanly
- past-due / expired subscription does not leave user without any active subscription row

## Assumptions

- implementation should create `./plans/subs.md` and use this plan content there
- DB will be wiped before rollout, so no backward-compat handling is required
- every user always has exactly one active subscription record
- existing data access remains allowed after exhaustion; only new quota-consuming actions are blocked
- coaching quota is total sessions per cycle, not per stage, for both Pro and Max
- Free has no conversation generations in v1
- plan catalog remains internal code, not admin-managed
