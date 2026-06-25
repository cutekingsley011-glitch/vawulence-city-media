---
name: Stage 3 architecture
description: Paystack payments, Events Hub, Ticketing, Subscriptions, Ads, Contests — full feature map.
---

## New DB tables (all created via executeSql)
- `events` — title, description, venue, event_date, is_paid, ticket_price, restriction_tags[]
- `tickets` — event_id, user_id, ticket_code (VCM-EVT{id}-{seq 4-digit}), paystack_reference
- `transactions` — unified ledger; type in (ticket, subscription, ad, contest_entry); base_amount + service_fee + total_amount all in kobo
- `ads` + `ad_settings` — ad submissions with tier pricing (1week/2weeks/1month/2months); admin approve/reject with refund
- `contests` + `contest_entries` — paid entry contests with options, max entrants, auto-close
- `subscription_plans` — seeded with Monthly (30 days, ₦1000)

## Schema additions to existing tables
- `users`: `is_subscriber boolean DEFAULT false`, `subscription_expires_at timestamp`
- `posts`: `is_vip boolean DEFAULT false`

## New API routes (all registered in routes/index.ts)
- `artifacts/api-server/src/routes/events.ts`
- `artifacts/api-server/src/routes/transactions.ts`
- `artifacts/api-server/src/routes/ads.ts`
- `artifacts/api-server/src/routes/contests.ts`
- `artifacts/api-server/src/routes/subscriptions.ts`
- `artifacts/api-server/src/lib/paystack.ts` — shared Paystack helper

## New frontend pages
- `/events` → EventsPage, `/events/:id` → EventDetailPage
- `/advertise` → AdsPage
- `/contests` → ContestsPage
- `/vip` → VipPage
- `AdsBanner` component in HomePage (rotating live ads or placeholder promo)

## Admin new tabs
Events, Ads (approve/reject+refund), Contests (create/close), Ledger (all transactions)

**Why:** All tabs use lazy fetch (onClick triggers load) to avoid unnecessary API calls on page load.
