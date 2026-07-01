import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  postsTable,
  gistsTable,
  commentsTable,
  siteVisitsTable,
  breakingNewsTable,
  voteCardsTable,
  reactionsTable,
} from "@workspace/db";
import { eq, count, sum, desc } from "drizzle-orm";
import { SetBreakingNewsBannerBody } from "@workspace/api-zod";

const router = Router();

// GET /admin/stats
router.get("/admin/stats", async (_req, res) => {
  const [visitors] = await db.select({ cnt: count() }).from(siteVisitsTable);
  const [users] = await db.select({ cnt: count() }).from(usersTable);
  const [posts] = await db.select({ cnt: count() }).from(postsTable);
  const [gistsPublished] = await db
    .select({ cnt: count() })
    .from(gistsTable)
    .where(eq(gistsTable.status, "approved"));
  const [comments] = await db.select({ cnt: count() }).from(commentsTable);
  const [pendingGists] = await db
    .select({ cnt: count() })
    .from(gistsTable)
    .where(eq(gistsTable.status, "pending"));
  const [voteCards] = await db.select({ cnt: count() }).from(voteCardsTable);
  const [commentLikes] = await db.select({ total: sum(commentsTable.likeCount) }).from(commentsTable);
  const [reactionCount] = await db.select({ cnt: count() }).from(reactionsTable);

  res.json({
    totalVisitors: Number(visitors?.cnt ?? 0),
    registeredUsers: Number(users?.cnt ?? 0),
    totalPosts: Number(posts?.cnt ?? 0),
    totalGistsPublished: Number(gistsPublished?.cnt ?? 0),
    totalComments: Number(comments?.cnt ?? 0),
    pendingGists: Number(pendingGists?.cnt ?? 0),
    totalVoteCards: Number(voteCards?.cnt ?? 0),
    totalLikes: Number(commentLikes?.total ?? 0) + Number(reactionCount?.cnt ?? 0),
  });
});

// PUT /admin/breaking
router.put("/admin/breaking", async (req, res) => {
  const body = SetBreakingNewsBannerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const existing = await db.select().from(breakingNewsTable).limit(1);
  let row;
  if (existing.length > 0) {
    [row] = await db
      .update(breakingNewsTable)
      .set({ text: body.data.text, enabled: body.data.enabled })
      .where(eq(breakingNewsTable.id, existing[0].id))
      .returning();
  } else {
    [row] = await db
      .insert(breakingNewsTable)
      .values({ text: body.data.text, enabled: body.data.enabled })
      .returning();
  }

  res.json({ text: row.text, enabled: row.enabled });
});

// GET /admin/users — list all registered users
router.get("/admin/users", async (_req, res) => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(users.map((u) => ({
    id: u.id, name: u.name, email: u.email,
    isBanned: u.isBanned, commentCount: u.commentCount,
    voteCount: u.voteCount, totalPoints: u.totalPoints,
    createdAt: u.createdAt.toISOString(),
  })));
});

// POST /admin/users/:id/ban
router.post("/admin/users/:id/ban", async (req, res) => {
  await db.update(usersTable).set({ isBanned: true }).where(eq(usersTable.id, req.params.id));
  res.json({ success: true });
});

// POST /admin/users/:id/unban
router.post("/admin/users/:id/unban", async (req, res) => {
  await db.update(usersTable).set({ isBanned: false }).where(eq(usersTable.id, req.params.id));
  res.json({ success: true });
});

export default router;
