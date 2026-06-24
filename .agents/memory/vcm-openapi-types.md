---
name: VCM OpenAPI type verification discipline
description: Always read openapi.yaml schema shapes before writing frontend pages; generated TypeScript names often don't match intuitive field names.
---

The VCM project uses contract-first API design. The OpenAPI spec at `lib/api-spec/openapi.yaml` is the source of truth. Generated React Query hooks + Zod schemas live in `lib/api-client-react/src/generated/api.ts`.

Field names in the spec often differ from "obvious" intuitions:
- TrendingItem: `engagementScore` (not `score`)
- LeaderboardEntry: `id` (not `userId`), has `rank` field
- GoatCategory: no `description` field
- VoteCard: `title` + `optionALabel`/`optionBLabel` (not `question` + `options[]`)

**Why:** Writing frontend pages with assumed field names causes many type errors that require a second pass to fix.

**How to apply:** Before writing any new page that consumes API data, grep `lib/api-spec/openapi.yaml` for the relevant schema definition and read the actual properties. Takes 30 seconds vs. fixing 20+ type errors.
