import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, commentsTable, postsTable, voteCardsTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { RegisterUserBody } from "@workspace/api-zod";
import { randomUUID } from "crypto";
import { getBadge, awardPoints } from "../lib/points";
import { z } from "zod";

const router = Router();

function toDto(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    commentCount: u.commentCount,
    voteCount: u.voteCount,
    totalPoints: u.totalPoints,
    badge: getBadge(u.totalPoints),
    createdAt: u.createdAt.toISOString(),
  };
}

// POST /users/register
router.post("/users/register", async (req, res) => {
  const body = RegisterUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  // Upsert: return existing user or create new
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, body.data.email))
    .limit(1);

  if (existing.length > 0) {
    res.json(toDto(existing[0]));
    return;
  }

  const referredBy = (body.data as Record<string, unknown>)["referredBy"] as string | undefined;

  const [user] = await db
    .insert(usersTable)
    .values({
      id: randomUUID(),
      name: body.data.name,
      email: body.data.email,
      referredBy: referredBy ?? null,
    })
    .returning();

  // Award +5 points to referrer if referral link was used
  if (referredBy) {
    await awardPoints(referredBy, 5).catch(() => {});
  }

  res.json(toDto(user));
});

// GET /users/:id/profile
router.get("/users/:id/profile", async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.params.id)).limit(1);
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toDto(user));
});

// PATCH /users/:id/name
router.patch("/users/:id/name", async (req, res) => {
  const { name } = z.object({ name: z.string().min(1).max(80) }).parse(req.body);
  const [user] = await db
    .update(usersTable)
    .set({ name: name.trim() })
    .where(eq(usersTable.id, req.params.id))
    .returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toDto(user));
});

// GET /users/:id/activity  — user's recent comments with context
router.get("/users/:id/activity", async (req, res) => {
  const userId = req.params.id;
  const comments = await db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.userId, userId))
    .orderBy(desc(commentsTable.createdAt))
    .limit(30);

  const postIds = [...new Set(comments.map((c) => c.postId).filter(Boolean) as number[])];
  const vcIds = [...new Set(comments.map((c) => c.voteCardId).filter(Boolean) as number[])];

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

  const activity = comments.map((c) => ({
    id: c.id,
    content: c.content,
    likeCount: c.likeCount,
    createdAt: c.createdAt.toISOString(),
    postId: c.postId ?? null,
    voteCardId: c.voteCardId ?? null,
    postTitle: c.postId ? (postTitles[c.postId] ?? null) : null,
    vcTitle: c.voteCardId ? (vcTitles[c.voteCardId] ?? null) : null,
  }));

  res.json(activity);
});

export default router;
