import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, reactionsTable, commentsTable, voteCardVotesTable, voteCardsTable } from "@workspace/db";
import { desc, gte, sql, eq } from "drizzle-orm";
import { GetTrendingQueryParams } from "@workspace/api-zod";

const router = Router();

// GET /trending
router.get("/trending", async (req, res) => {
  const query = GetTrendingQueryParams.safeParse(req.query);
  const limit = query.success ? (query.data.limit ?? 20) : 20;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Get posts from last 7 days with engagement scores
  const posts = await db
    .select({
      id: postsTable.id,
      title: postsTable.title,
      excerpt: postsTable.excerpt,
      imageUrl: postsTable.imageUrl,
      category: postsTable.category,
      createdAt: postsTable.createdAt,
    })
    .from(postsTable)
    .where(gte(postsTable.createdAt, sevenDaysAgo))
    .orderBy(desc(postsTable.createdAt));

  const postItems = await Promise.all(
    posts.map(async (p) => {
      const [{ reactions }] = await db
        .select({ reactions: sql<number>`count(*)::int` })
        .from(reactionsTable)
        .where(eq(reactionsTable.postId, p.id));

      const [{ comments }] = await db
        .select({ comments: sql<number>`count(*)::int` })
        .from(commentsTable)
        .where(eq(commentsTable.postId, p.id));

      const score = (reactions ?? 0) + (comments ?? 0);

      return {
        type: "post" as const,
        id: p.id,
        title: p.title,
        imageUrl: p.imageUrl ?? null,
        category: p.category ?? null,
        engagementScore: score,
        createdAt: p.createdAt.toISOString(),
        excerpt: p.excerpt ?? null,
      };
    })
  );

  // Get vote cards from last 7 days with engagement scores
  const voteCards = await db
    .select({
      id: voteCardsTable.id,
      title: voteCardsTable.title,
      imageUrl: voteCardsTable.imageUrl,
      option1Count: voteCardsTable.option1Count,
      option2Count: voteCardsTable.option2Count,
      option3Count: voteCardsTable.option3Count,
      option4Count: voteCardsTable.option4Count,
      createdAt: voteCardsTable.createdAt,
    })
    .from(voteCardsTable)
    .where(gte(voteCardsTable.createdAt, sevenDaysAgo));

  const voteCardItems = await Promise.all(
    voteCards.map(async (vc) => {
      const [{ comments }] = await db
        .select({ comments: sql<number>`count(*)::int` })
        .from(commentsTable)
        .where(eq(commentsTable.voteCardId, vc.id));

      const votes = (vc.option1Count ?? 0) + (vc.option2Count ?? 0) + (vc.option3Count ?? 0) + (vc.option4Count ?? 0);
      const score = votes + (comments ?? 0);

      return {
        type: "vote_card" as const,
        id: vc.id,
        title: vc.title,
        imageUrl: vc.imageUrl ?? null,
        category: null,
        engagementScore: score,
        createdAt: vc.createdAt.toISOString(),
        excerpt: null,
      };
    })
  );

  // Combine and sort by engagement
  const combined = [...postItems, ...voteCardItems]
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, limit);

  res.json(combined);
});

export default router;
