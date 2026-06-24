---
name: VCM Vote Card schema
description: Vote cards are binary A/B comparisons; field names differ from what multi-option logic would assume.
---

VoteCard schema fields: `id, title, optionALabel, optionBLabel, optionACount, optionBCount, isActive, totalVotes, createdAt, commentCount?, imageUrl?, imageUrl2?`

VoteCardInput: `{title, optionALabel, optionBLabel, imageUrl?, imageUrl2?}` — no `question`, no array `options`, no `expiresAt`.

VoteCardVoteInput: `{userId: string, chosenOption: "a" | "b"}` — NOT `optionIndex`. Both fields required.

ListVoteCardsParams: `{all?: boolean}` — `all: true` includes inactive cards (admin). No `status` filter param.

**Why:** The vote card concept is an A vs B face-off (Wizkid vs Burna Boy), not a general multi-option poll.

**How to apply:** Any new vote card UI or mutation must use these field names. The cast-vote endpoint takes `chosenOption: "a" | "b"`, not an index.
