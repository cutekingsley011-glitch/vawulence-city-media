import { Router } from "express";
import { db } from "@workspace/db";
import {
  voteCardsTable,
  voteCardVotesTable,
  commentsTable,
  usersTable,
} from "@workspace/db";
import { eq, desc, sql, and, isNull } from "drizzle-orm";
import {
  ListVoteCardsQueryParams,
  CreateVoteCardBody,
  GetVoteCardParams,
  GetVoteCardQueryParams,
  UpdateVoteCardParams,
  UpdateVoteCardBody,
  DeleteVoteCardParams,
  ListVoteCardCommentsParams,
  CreateVoteCardCommentParams,
  CreateVoteCardCommentBody,
} from "@workspace/api-zod";
import { awardPoints } from "../lib/points";

const router = Router();

type VoteCardRow = typeof voteCardsTable.$inferSelect;
type CommentRow = typeof commentsTable.$inferSelect;

function cardToDto(card: VoteCardRow, commentCount = 0) {
  const total =
    card.option1Count +
    card.option2Count +
    (card.option3Count ?? 0) +
    (card.option4Count ?? 0);
  return {
    id: card.id,
    title: card.title,
    imageUrl: card.imageUrl ?? null,
    imageUrl2: card.imageUrl2 ?? null,
    option1Label: card.option1Label,
    option2Label: card.option2Label,
    option3Label: card.option3Label ?? null,
    option4Label: card.option4Label ?? null,
    option1Count: card.option1Count,
    option2Count: card.option2Count,
    option3Count: card.option3Count ?? null,
    option4Count: card.option4Count ?? null,
    isActive: card.isActive,
    createdAt: card.createdAt.toISOString(),
    totalVotes: total,
    commentCount,
  };
}

function cardDetailDto(card: VoteCardRow, userVote: number | null, commentCount = 0) {
  return { ...cardToDto(card, commentCount), userVote };
}

interface CommentDto {
  id: number;
  postId: number | null;
  voteCardId: number | null;
  userId: string | null;
  userName: string | null;
  parentCommentId: number | null;
  content: string;
  likeCount: number;
  createdAt: string;
  replies: CommentDto[];
}

function commentToDto(c: CommentRow, replies: CommentRow[] = []): CommentDto {
  return {
    id: c.id,
    postId: c.postId ?? null,
    voteCardId: c.voteCardId ?? null,
    userId: c.userId ?? null,
    userName: c.userName ?? null,
    parentCommentId: c.parentCommentId ?? null,
    content: c.content,
    likeCount: c.likeCount,
    createdAt: c.createdAt.toISOString(),
    replies: replies.map((r) => commentToDto(r)),
  };
}

// GET /vote-cards
router.get("/vote-cards", async (req, res) => {
  const query = ListVoteCardsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }

  const cards = query.data.all
    ? await db.select().from(voteCardsTable).orderBy(desc(voteCardsTable.createdAt))
    : await db
        .select()
        .from(voteCardsTable)
        .where(eq(voteCardsTable.isActive, true))
        .orderBy(desc(voteCardsTable.createdAt));

  const result = await Promise.all(
    cards.map(async (card) => {
      const [{ cnt }] = await db
        .select({ cnt: sql<number>`count(*)::int` })
        .from(commentsTable)
        .where(eq(commentsTable.voteCardId, card.id));
      return cardToDto(card, cnt ?? 0);
    })
  );

  res.json(result);
});

// POST /vote-cards (admin)
router.post("/vote-cards", async (req, res) => {
  const body = CreateVoteCardBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const [card] = await db
    .insert(voteCardsTable)
    .values({
      title: body.data.title,
      imageUrl: body.data.imageUrl ?? null,
      imageUrl2: body.data.imageUrl2 ?? null,
      option1Label: body.data.option1Label,
      option2Label: body.data.option2Label,
      option3Label: body.data.option3Label ?? null,
      option4Label: body.data.option4Label ?? null,
      option3Count: body.data.option3Label ? 0 : null,
      option4Count: body.data.option4Label ? 0 : null,
    })
    .returning();
  res.status(201).json(cardToDto(card));
});

// GET /vote-cards/:id
router.get("/vote-cards/:id", async (req, res) => {
  const params = GetVoteCardParams.safeParse({ id: Number(req.params.id) });
  const query = GetVoteCardQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [card] = await db
    .select()
    .from(voteCardsTable)
    .where(eq(voteCardsTable.id, params.data.id));
  if (!card) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  let userVote: number | null = null;
  const userId = query.success ? query.data.userId : undefined;
  if (userId) {
    const [vote] = await db
      .select()
      .from(voteCardVotesTable)
      .where(
        and(
          eq(voteCardVotesTable.voteCardId, params.data.id),
          eq(voteCardVotesTable.userId, userId)
        )
      )
      .limit(1);
    userVote = vote?.chosenOption ?? null;
  }

  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(commentsTable)
    .where(eq(commentsTable.voteCardId, params.data.id));

  res.json(cardDetailDto(card, userVote, cnt ?? 0));
});

// PATCH /vote-cards/:id (admin)
router.patch("/vote-cards/:id", async (req, res) => {
  const params = UpdateVoteCardParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateVoteCardBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const updates: Partial<VoteCardRow> = {};
  if (body.data.title !== undefined) updates.title = body.data.title;
  if (body.data.imageUrl !== undefined) updates.imageUrl = body.data.imageUrl;
  if (body.data.imageUrl2 !== undefined) updates.imageUrl2 = body.data.imageUrl2;
  if (body.data.option1Label !== undefined) updates.option1Label = body.data.option1Label;
  if (body.data.option2Label !== undefined) updates.option2Label = body.data.option2Label;
  if (body.data.option3Label !== undefined) updates.option3Label = body.data.option3Label;
  if (body.data.option4Label !== undefined) updates.option4Label = body.data.option4Label;
  if (body.data.isActive !== undefined) updates.isActive = body.data.isActive;

  const [card] = await db
    .update(voteCardsTable)
    .set(updates)
    .where(eq(voteCardsTable.id, params.data.id))
    .returning();

  if (!card) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(cardToDto(card));
});

// DELETE /vote-cards/:id (admin)
router.delete("/vote-cards/:id", async (req, res) => {
  const params = DeleteVoteCardParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(voteCardsTable).where(eq(voteCardsTable.id, params.data.id));
  res.status(204).send();
});

// POST /vote-cards/:id/vote
router.post("/vote-cards/:id/vote", async (req, res) => {
  const params = GetVoteCardParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const body = req.body as { userId?: string; chosenOption?: unknown };
  const chosenOption = Number(body.chosenOption);
  if (!body.userId || !chosenOption || ![1, 2, 3, 4].includes(chosenOption)) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const voteCardId = params.data.id;

  // Fetch card to verify option exists
  const [card] = await db
    .select()
    .from(voteCardsTable)
    .where(eq(voteCardsTable.id, voteCardId));
  if (!card) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  // Validate chosen option against card's actual options
  if (chosenOption === 3 && !card.option3Label) {
    res.status(400).json({ error: "Option 3 not available on this card" });
    return;
  }
  if (chosenOption === 4 && !card.option4Label) {
    res.status(400).json({ error: "Option 4 not available on this card" });
    return;
  }

  // Check existing vote
  const [existing] = await db
    .select()
    .from(voteCardVotesTable)
    .where(
      and(
        eq(voteCardVotesTable.voteCardId, voteCardId),
        eq(voteCardVotesTable.userId, body.userId)
      )
    )
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "Already voted" });
    return;
  }

  // Insert vote
  await db.insert(voteCardVotesTable).values({
    voteCardId,
    userId: body.userId,
    chosenOption,
  });

  // Increment the right count column
  const increment =
    chosenOption === 1 ? { option1Count: sql`COALESCE(${voteCardsTable.option1Count}, 0) + 1` }
    : chosenOption === 2 ? { option2Count: sql`COALESCE(${voteCardsTable.option2Count}, 0) + 1` }
    : chosenOption === 3 ? { option3Count: sql`COALESCE(${voteCardsTable.option3Count}, 0) + 1` }
    : { option4Count: sql`COALESCE(${voteCardsTable.option4Count}, 0) + 1` };

  const [updated] = await db
    .update(voteCardsTable)
    .set(increment)
    .where(eq(voteCardsTable.id, voteCardId))
    .returning();

  // Award +1 point
  await awardPoints(body.userId, 1).catch(() => {});

  // Increment user voteCount
  await db
    .update(usersTable)
    .set({ voteCount: sql`${usersTable.voteCount} + 1` })
    .where(eq(usersTable.id, body.userId))
    .catch(() => {});

  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(commentsTable)
    .where(eq(commentsTable.voteCardId, voteCardId));

  res.json(cardDetailDto(updated, chosenOption, cnt ?? 0));
});

// GET /admin/vote-cards/:id/voters (admin only)
router.get("/admin/vote-cards/:id/voters", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const rows = await db
    .select({
      userId: voteCardVotesTable.userId,
      chosenOption: voteCardVotesTable.chosenOption,
      votedAt: voteCardVotesTable.createdAt,
      name: usersTable.name,
    })
    .from(voteCardVotesTable)
    .leftJoin(usersTable, eq(voteCardVotesTable.userId, usersTable.id))
    .where(eq(voteCardVotesTable.voteCardId, id))
    .orderBy(desc(voteCardVotesTable.createdAt));

  res.json({
    totalVoters: rows.length,
    voters: rows.map((r) => ({
      userId: r.userId,
      name: r.name ?? "Unknown",
      chosenOption: r.chosenOption,
      votedAt: r.votedAt.toISOString(),
    })),
  });
});

// GET /vote-cards/:voteCardId/comments
router.get("/vote-cards/:voteCardId/comments", async (req, res) => {
  const params = ListVoteCardCommentsParams.safeParse({
    voteCardId: Number(req.params.voteCardId),
  });
  if (!params.success) {
    res.status(400).json({ error: "Invalid voteCardId" });
    return;
  }

  const all = await db
    .select()
    .from(commentsTable)
    .where(
      and(
        eq(commentsTable.voteCardId, params.data.voteCardId),
        isNull(commentsTable.postId)
      )
    )
    .orderBy(desc(commentsTable.likeCount), desc(commentsTable.createdAt));

  const topLevel = all.filter((c) => c.parentCommentId === null);
  const replies = all.filter((c) => c.parentCommentId !== null);

  const replyMap: Record<number, CommentRow[]> = {};
  for (const r of replies) {
    const pid = r.parentCommentId!;
    if (!replyMap[pid]) replyMap[pid] = [];
    replyMap[pid].push(r);
  }

  res.json(topLevel.map((c) => commentToDto(c, replyMap[c.id] ?? [])));
});

// POST /vote-cards/:voteCardId/comments
router.post("/vote-cards/:voteCardId/comments", async (req, res) => {
  const params = CreateVoteCardCommentParams.safeParse({
    voteCardId: Number(req.params.voteCardId),
  });
  const body = CreateVoteCardCommentBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  let userName: string | null = null;
  if (body.data.userId) {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, body.data.userId))
      .limit(1);
    userName = user?.name ?? null;
  }

  const [comment] = await db
    .insert(commentsTable)
    .values({
      voteCardId: params.data.voteCardId,
      postId: null,
      userId: body.data.userId,
      userName,
      parentCommentId: body.data.parentCommentId ?? null,
      content: body.data.content,
    })
    .returning();

  if (body.data.userId) {
    await awardPoints(body.data.userId, 1).catch(() => {});
    await db
      .update(usersTable)
      .set({ commentCount: sql`${usersTable.commentCount} + 1` })
      .where(eq(usersTable.id, body.data.userId))
      .catch(() => {});
  }

  res.status(201).json(commentToDto(comment));
});

export default router;
