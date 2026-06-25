---
name: API server zod import
description: zod must be explicitly declared in api-server's package.json; it is not inherited from workspace root or api-zod package.
---

## Rule
Any new route in `artifacts/api-server` that imports `zod` directly must have `"zod": "catalog:"` listed under `dependencies` in `artifacts/api-server/package.json`.

**Why:** The api-server package only gets what it explicitly declares. Even though zod is in the workspace catalog and used by other packages, TypeScript and the bundler will fail with `Cannot find module 'zod'` if it's not in api-server's own `package.json`.

**How to apply:** After adding the dependency, run `pnpm install` at the workspace root before running typecheck.

Note: Existing routes in api-server use `@workspace/api-zod` (generated schemas) rather than raw zod — only new custom-validation routes need this.
