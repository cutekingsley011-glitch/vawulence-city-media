import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { RegisterUserBody } from "@workspace/api-zod";
import { randomUUID } from "crypto";
import { getBadge, awardPoints } from "../lib/points";

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

export default router;
