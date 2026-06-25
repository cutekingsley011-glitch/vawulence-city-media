---
name: Stage 4 architecture
description: Marketplace, Connections, Services (Escrow), Recruitment — tables, routes, pages, admin tabs added in Stage 4.
---

## New DB tables (all created via executeSql; Drizzle schemas in lib/db/src/schema/)
- `marketplace_items` — id, name, description, price (kobo), imageUrls, category, status ("available"|"sold"), createdAt
- `connections` — id, name, ageBracket, state, lookingFor, bioText, photoUrl, status ("pending"|"approved"|"rejected"), createdAt
- `escrow_requests` — id, description, amount (kobo), notes, status ("pending"|"paid_in"|"confirmed"|"released"), createdAt
- `job_postings` — id, title, companyName, description, flyerImageUrl, requirements (text[]), applyMethod ("whatsapp"|"office_address"), applyContact, status ("open"|"closed"), createdAt

## API routes (artifacts/api-server/src/routes/)
- marketplace.ts → /api/marketplace (public GET) + /api/admin/marketplace (POST, PATCH/:id/sold, DELETE/:id)
- connections.ts → /api/connections (public GET approved) + /api/connections (POST submit) + /api/admin/connections (GET all, POST approve, POST reject, DELETE)
- services.ts → /api/escrow-requests (public POST) + /api/admin/escrow-requests (GET, POST, PUT/:id/status)
- recruitment.ts → /api/recruitment (public GET open) + /api/admin/recruitment (GET all, POST, POST/:id/close, DELETE/:id)

## Frontend pages (artifacts/vcm/src/pages/)
- MarketplacePage.tsx — category filter chips, item cards with photo carousel on detail
- MarketplaceItemPage.tsx — full detail with photo carousel + WhatsApp purchase button
- ConnectionsPage.tsx — Browse Profiles tab + Submit Your Profile tab (Nigerian states list, consent checkbox)
- ServicesPage.tsx — static 4-card layout (Escrow, CAC Registration, Content Creation, Country Numbers) + escrow request modal
- RecruitmentPage.tsx — job listing cards, apply via WhatsApp or show office address

## Admin tabs added (AdminPage.tsx)
- "market" → loadMarket(), CRUD listings, mark sold
- "conn" → loadConnections(), approve/reject/delete profiles
- "escrow" → loadEscrow(), log deals, advance status (pending→paid_in→confirmed→released)
- "jobs" → loadJobs(), post jobs (whatsapp or office_address), close or delete

## Key env vars
- VITE_ADMIN_WA — admin WhatsApp number for purchase/escrow contact (set to placeholder "2348000000000"; **user must update to real number**)

**Why:** Services page is fully static — no DB backing for CAC/Content/Numbers; only Escrow has a DB table (for admin tracking). Prices always in kobo (×100), displayed dividing by 100.
