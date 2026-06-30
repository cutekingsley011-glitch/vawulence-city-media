import { Router } from "express";
import { db } from "@workspace/db";
import { gistsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { awardPoints } from "../lib/points";
import {
  ListPublicGistsQueryParams,
  SubmitGistBody,
  ApproveGistParams,
  RejectGistParams,
} from "@workspace/api-zod";

const router = Router();

function toDto(g: typeof gistsTable.$inferSelect) {
  return {
    id: g.id,
    content: g.content,
    imageUrl: g.imageUrl ?? null,
    category: g.category,
    status: g.status,
    createdAt: g.createdAt.toISOString(),
    publishedAt: g.publishedAt ? g.publishedAt.toISOString() : null,
    publishAt: g.publishAt ? g.publishAt.toISOString() : null,
  };
}

// GET /gists (public approved)
router.get("/gists", async (req, res) => {
  const query = ListPublicGistsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }
  const { category, limit = 20, offset = 0 } = query.data;

  const rows = await db
    .select()
    .from(gistsTable)
    .where(
      category
        ? eq(gistsTable.category, category)
        : eq(gistsTable.status, "approved")
    )
    .orderBy(desc(gistsTable.publishedAt))
    .limit(limit)
    .offset(offset);

  // If filtering by category, also filter for approved
  const filtered = category ? rows.filter((r) => r.status === "approved") : rows;
  res.json(filtered.map(toDto));
});

// POST /gists (submit anonymous gist)
router.post("/gists", async (req, res) => {
  const body = SubmitGistBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const userId = (req.body as Record<string, unknown>)["userId"] as string | undefined;
  const [gist] = await db
    .insert(gistsTable)
    .values({
      content: body.data.content,
      imageUrl: null,
      category: body.data.category ?? "Gist",
      status: "pending",
    })
    .returning();

  // Award +2 points to submitter if userId provided
  if (userId) {
    await awardPoints(userId, 2).catch(() => {});
  }

  res.status(201).json(toDto(gist));
});

// GET /gists/pending (admin)
router.get("/gists/pending", async (_req, res) => {
  const rows = await db
    .select()
    .from(gistsTable)
    .where(eq(gistsTable.status, "pending"))
    .orderBy(desc(gistsTable.createdAt));
  res.json(rows.map(toDto));
});

// POST /gists/:id/approve
router.post("/gists/:id/approve", async (req, res) => {
  const params = ApproveGistParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [gist] = await db
    .update(gistsTable)
    .set({ status: "approved", publishedAt: new Date() })
    .where(eq(gistsTable.id, params.data.id))
    .returning();
  if (!gist) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(toDto(gist));
});

// POST /gists/:id/reject
router.post("/gists/:id/reject", async (req, res) => {
  const params = RejectGistParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [gist] = await db
    .update(gistsTable)
    .set({ status: "rejected" })
    .where(eq(gistsTable.id, params.data.id))
    .returning();
  if (!gist) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(toDto(gist));
});

export default router;
