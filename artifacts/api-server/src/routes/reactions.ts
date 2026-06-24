import { Router } from "express";
import { db } from "@workspace/db";
import { reactionsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { GetReactionsParams, AddReactionParams, AddReactionBody } from "@workspace/api-zod";

const router = Router();

async function getReactionCounts(postId: number) {
  const rows = await db
    .select({ type: reactionsTable.type, cnt: count() })
    .from(reactionsTable)
    .where(eq(reactionsTable.postId, postId))
    .groupBy(reactionsTable.type);

  const map: Record<string, number> = { like: 0, laugh: 0, shock: 0, angry: 0 };
  for (const r of rows) {
    map[r.type] = Number(r.cnt);
  }
  return map;
}

// GET /posts/:postId/reactions
router.get("/posts/:postId/reactions", async (req, res) => {
  const params = GetReactionsParams.safeParse({ postId: Number(req.params.postId) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid postId" });
    return;
  }
  const counts = await getReactionCounts(params.data.postId);
  res.json(counts);
});

// POST /posts/:postId/reactions
router.post("/posts/:postId/reactions", async (req, res) => {
  const params = AddReactionParams.safeParse({ postId: Number(req.params.postId) });
  const body = AddReactionBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { postId } = params.data;
  const { type, userId } = body.data;

  // Toggle: remove if exists, add if not
  const existing = await db
    .select()
    .from(reactionsTable)
    .where(and(eq(reactionsTable.postId, postId), eq(reactionsTable.userId, userId), eq(reactionsTable.type, type)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(reactionsTable).where(eq(reactionsTable.id, existing[0].id));
  } else {
    await db.insert(reactionsTable).values({ postId, userId, type });
  }

  const counts = await getReactionCounts(postId);
  res.json(counts);
});

export default router;
