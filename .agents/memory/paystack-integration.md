---
name: Paystack integration pattern
description: How Paystack is wired in VCM — placeholder keys, payment verify flow, DB migration approach.
---

## Keys
- `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_SUBACCOUNT_CODE` stored as shared env vars (not secrets)
- `VITE_PAYSTACK_PUBLIC_KEY` stored as shared env var for the frontend
- All set to `*_placeholder` until user provides real keys
- Routes skip real verification when key equals `*_placeholder`

## Verify-then-record pattern
Every payment route:
1. Receives `reference` from frontend (Paystack inline callback)
2. Calls `verifyTransaction(reference)` — skipped in dev/placeholder mode
3. Checks for duplicate `paystack_reference` before inserting
4. Inserts the domain record (ticket, ad, contest_entry) 
5. Inserts a `transactions` row with `onConflictDoNothing`

## Service fee
- `SERVICE_FEE = 50000` kobo = ₦500 flat on every transaction
- `totalWithFee(baseKobo)` = baseKobo + 50000
- Subaccount split: ₦500 goes to platform subaccount (only when real keys present)

## DB migration
- `pnpm --filter @workspace/db run push` requires interactive TTY — fails in bash
- Use `executeSql` directly in code_execution sandbox to run DDL instead
- Pattern: `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`

**Why:** drizzle-kit push prompts for conflict resolution when tables already exist partially, which needs a real terminal.
