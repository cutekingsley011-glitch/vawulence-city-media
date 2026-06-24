import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { getBadge } from "../lib/points";

const router = Router();

// GET /leaderboard
router.get("/leaderboard", async (_req, res) => {
  const users = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.totalPoints))
    .limit(50);

  const entries = users.map((u, i) => ({
    rank: i + 1,
    id: u.id,
    name: u.name,
    totalPoints: u.totalPoints,
    badge: getBadge(u.totalPoints),
    commentCount: u.commentCount,
    voteCount: u.voteCount,
  }));

  res.json(entries);
});

export default router;
