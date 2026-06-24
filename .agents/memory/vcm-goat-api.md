---
name: VCM GOAT API shapes
description: useListGoatNominees returns a GoatCategoryWithNominees object, not a plain array; GoatVoteInput requires both userId AND nomineeId.
---

`useListGoatNominees(categoryId)` returns `GoatCategoryWithNominees`:
```ts
{ id: number; name: string; nominees: GoatNominee[]; userVotedNomineeId: number | null }
```
Access nominees via `catData.nominees`, not directly iterating `catData`.

`GoatVoteInput` requires BOTH `userId: string` AND `nomineeId: integer`. The `nomineeId` is the route param `:id` AND must be in the body.

`GoatNomineeInput`: `{goatCategoryId, name, photoUrl?, description?, submittedBy?}` — field is `goatCategoryId` (not `categoryId`), photo field is `photoUrl` (not `imageUrl`).

`GoatCategory` has NO `description` field — only `{id, name, createdAt}`. `GoatCategoryInput` only accepts `{name}`.

`GoatNominee` photo field is `photoUrl` (not `imageUrl`).

**Why:** The GOAT API was designed to return the full category-with-nominees in one call to avoid N+1 queries.

**How to apply:** Always destructure `.nominees` from the query result. Never try to map/iterate the result directly as if it's an array.
