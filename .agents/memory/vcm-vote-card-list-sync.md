---
name: VCM vote card list vs detail sync
description: Why polls could appear to "unvote" themselves on refresh in the feed even though the detail page was correct.
---

# VCM vote card list vs detail sync

**Why:** `VoteCardDetailPage` always passed `userId` to `GET /vote-cards/:id` and synced `voted` state from the server's `userVote`. But the feed (`VoteCardsPage`/`VoteCardItem`) tracked `voted` in local `useState(null)` only, and neither `GET /vote-cards` nor its list DTO exposed `userVote` at all. Any refresh of the feed made every poll look un-voted, and picking a new option would silently fail with a 409 that reverted the UI back to "unvoted" — which read to the user as "my vote got removed and moved to another option."

**How to apply:** Any list-style endpoint that mirrors a detail endpoint's per-user state (vote status, like status, etc.) must accept the same `userId`/auth context and return the same per-user field, or the two views will drift. When optimistic UI hits a 409 "already voted/liked" conflict, treat it as authoritative confirmation (refetch) rather than reverting to the unvoted state — reverting on 409 is what produces the "flip back and forth" symptom.
