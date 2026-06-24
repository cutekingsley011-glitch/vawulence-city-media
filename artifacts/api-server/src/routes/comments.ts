import { Router } from "express";
import { db } from "@workspace/db";
import { commentsTable } from "@workspace/db";
import { eq, desc, isNull, sql } from "drizzle-orm";
import { ListCommentsParams, CreateCommentParams, CreateCommentBody, LikeCommentParams } from "@workspace/api-zod";

const router = Router();

type CommentRow = typeof commentsTable.$inferSelect;

interface CommentDto {
  id: number;
  postId: number;
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
    postId: c.postId,
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
    .where(eq(commentsTable.postId, params.data.postId))
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

  const [comment] = await db
    .insert(commentsTable)
    .values({
      postId: params.data.postId,
      userId: body.data.userId,
      parentCommentId: body.data.parentCommentId ?? null,
      content: body.data.content,
    })
    .returning();

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
