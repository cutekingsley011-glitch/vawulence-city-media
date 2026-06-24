# Vawulence City Media (VCM)

A Nigerian entertainment, gossip, and news web app. Built with a React + Vite frontend, Express 5 backend, and PostgreSQL via Drizzle ORM.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/vcm run dev` — run the React frontend (port 23544)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18, Vite, Tailwind CSS v4, shadcn/ui, TanStack Query, Wouter (routing)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/vcm/src/` — React frontend
  - `pages/` — HomePage, PostPage, GistsPage, ComingSoonPage (Polls/Marketplace/Events), AdminPage
  - `components/` — Navigation (TopNav + BottomNav), BreakingTicker, PostCard, JoinModal
  - `lib/user.ts` — localStorage user management (`vcm_user` key)
- `artifacts/api-server/src/routes/` — Express route handlers
- `lib/db/src/schema/` — Drizzle ORM schema (users, posts, categories, reactions, comments, gists, site_visits, breaking_news)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/api.ts` — Generated React Query hooks

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval generates React Query hooks + Zod schemas
- No traditional auth: users identified by localStorage `vcm_user` (name + email), no password
- Admin protected by hardcoded password `vcmadmin2024` stored in sessionStorage key `vcm_admin`
- Breaking news route `/posts/breaking` registered BEFORE `/posts/:id` in Express (order matters)
- Gists are anonymous: submitted content is stored without user identity, published Saturdays after admin review

## Product

- **Home feed**: Browsable news/gossip posts filtered by category (Entertainment, Gossip, News, Politics, Relationship)
- **Post page**: Full article with emoji reactions (Like/Laugh/Shock/Angry), WhatsApp share, threaded comments
- **Gists**: Anonymous story submission page; published every Saturday after admin approval
- **Breaking news ticker**: Scrolling banner across the top of every page
- **Placeholder pages**: Polls, Marketplace, Events — all show "Coming Soon"
- **Admin dashboard** (`/admin`): Password-gated. Manage posts (CRUD), review gist queue (approve/reject), configure breaking news banner, manage categories. Stats: visitors, users, posts, comments, gists.

## User preferences

- Branding: white background, blue accent (#1D4ED8 / blue-700 / `primary` in Tailwind theme)
- Tagline: "Entertainment Without Border."

## Gotchas

- `pnpm run typecheck:libs` must be run after any lib/db schema changes before server typecheck
- Breaking news route `/posts/breaking` must be registered BEFORE `/posts/:id` in Express
- Never `console.log` in server code — use `req.log` (in handlers) or `logger` singleton
- Do not run `pnpm run dev` at workspace root — run workflows via Replit

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
