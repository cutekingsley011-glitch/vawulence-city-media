import { Router } from "express";
import { db } from "@workspace/db";
import { commentsTable, usersTable } from "@workspace/db";
import { eq, desc, sql, and, isNull, isNotNull } from "drizzle-orm";
import { ListCommentsParams, CreateCommentParams, CreateCommentBody, LikeCommentParams } from "@workspace/api-zod";
import { awardPoints } from "../lib/points";

const router = Router();

type CommentRow = typeof commentsTable.$inferSelect;

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

function toDto(c: CommentRow, replies: CommentRow[] = []): CommentDto {
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
    replies: replies.map((r) => toDto(r)),
  };
}

// GET /posts/:postId/comments
router.get("/posts/:postId/comments", async (req, res) => {
  const params = ListCommentsParams.safeParse({ postId: Number(req.params.postId) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid postId" });
    return;
  }

  const all = await db
    .select()
    .from(commentsTable)
    .where(
      and(
        eq(commentsTable.postId, params.data.postId),
        isNull(commentsTable.voteCardId)
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

  res.json(topLevel.map((c) => toDto(c, replyMap[c.id] ?? [])));
});

// POST /posts/:postId/comments
router.post("/posts/:postId/comments", async (req, res) => {
  const params = CreateCommentParams.safeParse({ postId: Number(req.params.postId) });
  const body = CreateCommentBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  // Fetch user name
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
      postId: params.data.postId,
      voteCardId: null,
      userId: body.data.userId,
      userName,
      parentCommentId: body.data.parentCommentId ?? null,
      content: body.data.content,
    })
    .returning();

  // Award +1 point and increment comment count
  if (body.data.userId) {
    await awardPoints(body.data.userId, 1).catch(() => {});
    await db
      .update(usersTable)
      .set({ commentCount: sql`${usersTable.commentCount} + 1` })
      .where(eq(usersTable.id, body.data.userId))
      .catch(() => {});
  }

  res.status(201).json(toDto(comment));
});

// POST /comments/:id/like
router.post("/comments/:id/like", async (req, res) => {
  const params = LikeCommentParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [comment] = await db
    .update(commentsTable)
    .set({ likeCount: sql`${commentsTable.likeCount} + 1` })
    .where(eq(commentsTable.id, params.data.id))
    .returning();

  if (!comment) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(toDto(comment));
});

export default router;
