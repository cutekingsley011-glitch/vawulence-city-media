import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, postsTable, voteCardsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// GET /notifications?userId=:id
router.get("/notifications", async (req, res) => {
  const userId = String(req.query.userId ?? "");
  if (!userId) { res.json({ notifications: [], unreadCount: 0 }); return; }

  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(60);

  const unreadCount = rows.filter((n) => !n.isRead).length;

  // Enrich with post/votecard titles
  const postIds = [...new Set(rows.map((n) => n.targetPostId).filter(Boolean) as number[])];
  const vcIds = [...new Set(rows.map((n) => n.targetVoteCardId).filter(Boolean) as number[])];

  const postTitles: Record<number, string> = {};
  const vcTitles: Record<number, string> = {};

  if (postIds.length > 0) {
    const posts = await db.select({ id: postsTable.id, title: postsTable.title }).from(postsTable);
    for (const p of posts) postTitles[p.id] = p.title;
  }
  if (vcIds.length > 0) {
    const vcs = await db.select({ id: voteCardsTable.id, title: voteCardsTable.title }).from(voteCardsTable);
    for (const v of vcs) vcTitles[v.id] = v.title;
  }

  const notifications = rows.map((n) => ({
    id: n.id,
    type: n.type,
    actorName: n.actorName,
    targetCommentId: n.targetCommentId,
    targetPostId: n.targetPostId,
    targetVoteCardId: n.targetVoteCardId,
    postTitle: n.targetPostId ? (postTitles[n.targetPostId] ?? null) : null,
    vcTitle: n.targetVoteCardId ? (vcTitles[n.targetVoteCardId] ?? null) : null,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }));

  res.json({ notifications, unreadCount });
});

// GET /notifications/unread-count?userId=:id
router.get("/notifications/unread-count", async (req, res) => {
  const userId = String(req.query.userId ?? "");
  if (!userId) { res.json({ count: 0 }); return; }
  const rows = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));
  res.json({ count: rows.length });
});

// POST /notifications/mark-read
router.post("/notifications/mark-read", async (req, res) => {
  const { userId } = z.object({ userId: z.string() }).parse(req.body);
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, userId));
  res.json({ ok: true });
});

export default router;
