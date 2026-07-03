---
name: VCM Railway Deployment
description: VCM is deployed on Railway, not Replit's built-in deployment system.
---

# VCM Railway Deployment

**Why:** The project has always been deployed on Railway. Replit's `suggest_deploy` tool and its built-in publish flow are irrelevant for this project.

**How to apply:**
- When the user reports production/deployment issues, think Railway (env vars, DATABASE_URL, health checks, build logs) — not Replit's deployment system.
- Production `DATABASE_URL` and other secrets are configured in the Railway dashboard, not Replit's secrets panel.
- Railway auto-injects `DATABASE_URL` when a PostgreSQL service is added to the project.
- Schema changes to production: run SQL via Railway's Postgres service (not `pnpm run push`, which needs a TTY).
- Health check endpoint: `GET /api/healthz` → 200 `{"status":"ok"}`.
