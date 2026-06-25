import { Router } from "express";
import { db } from "@workspace/db";
import {
  postsTable,
  reactionsTable,
  commentsTable,
  breakingNewsTable,
} from "@workspace/db";
import { eq, desc, sql, count } from "drizzle-orm";
import {
  ListPostsQueryParams,
  CreatePostBody,
  GetPostParams,
  UpdatePostParams,
  UpdatePostBody,
  DeletePostParams,
} from "@workspace/api-zod";

const router = Router();

// GET /posts
router.get("/posts", async (req, res) => {
  const query = ListPostsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { category, limit = 20, offset = 0 } = query.data;

  const rows = await db
    .select({
      id: postsTable.id,
      title: postsTable.title,
      content: postsTable.content,
      excerpt: postsTable.excerpt,
      imageUrl: postsTable.imageUrl,
      videoUrl: postsTable.videoUrl,
      category: postsTable.category,
      isBreaking: postsTable.isBreaking,
      createdAt: postsTable.createdAt,
    })
    .from(postsTable)
    .where(category ? eq(postsTable.category, category) : undefined)
    .orderBy(desc(postsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const ids = rows.map((r) => r.id);

  const reactionCounts = ids.length
    ? await db
        .select({ postId: reactionsTable.postId, cnt: count() })
        .from(reactionsTable)
        .where(sql`${reactionsTable.postId} = ANY(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`)
        .groupBy(reactionsTable.postId)
    : [];

  const commentCounts = ids.length
    ? await db
        .select({ postId: commentsTable.postId, cnt: count() })
        .from(commentsTable)
        .where(sql`${commentsTable.postId} = ANY(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`)
        .groupBy(commentsTable.postId)
    : [];

  const rcMap = Object.fromEntries(reactionCounts.map((r) => [r.postId, Number(r.cnt)]));
  const ccMap = Object.fromEntries(commentCounts.map((r) => [r.postId, Number(r.cnt)]));

  const result = rows.map((p) => ({
    ...p,
    imageUrl: p.imageUrl ?? null,
    excerpt: p.excerpt ?? null,
    createdAt: p.createdAt.toISOString(),
    reactionCount: rcMap[p.id] ?? 0,
    commentCount: ccMap[p.id] ?? 0,
  }));

  res.json(result);
});

// POST /posts
router.post("/posts", async (req, res) => {
  const body = CreatePostBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const [post] = await db
    .insert(postsTable)
    .values({
      title: body.data.title,
      content: body.data.content,
      excerpt: body.data.excerpt ?? null,
      imageUrl: body.data.imageUrl ?? null,
      videoUrl: (req.body as Record<string, unknown>).videoUrl as string ?? null,
      category: body.data.category,
      isBreaking: body.data.isBreaking ?? false,
    })
    .returning();
  res.status(201).json({
    ...post,
    imageUrl: post.imageUrl ?? null,
    excerpt: post.excerpt ?? null,
    createdAt: post.createdAt.toISOString(),
    reactionCount: 0,
    commentCount: 0,
  });
});

// GET /posts/breaking — must come before /:id
router.get("/posts/breaking", async (_req, res) => {
  const [row] = await db.select().from(breakingNewsTable).limit(1);
  if (!row) {
    res.json({ text: "", enabled: false });
    return;
  }
  res.json({ text: row.text, enabled: row.enabled });
});

// GET /posts/stats
router.get("/posts/stats", async (_req, res) => {
  const totalResult = await db.select({ cnt: count() }).from(postsTable);
  const total = Number(totalResult[0]?.cnt ?? 0);

  const byCategory = await db
    .select({ category: postsTable.category, cnt: count() })
    .from(postsTable)
    .groupBy(postsTable.category);

  res.json({
    totalPosts: total,
    byCategory: byCategory.map((r) => ({ category: r.category, count: Number(r.cnt) })),
  });
});

// GET /posts/:id
router.get("/posts/:id", async (req, res) => {
  const params = GetPostParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, params.data.id));
  if (!post) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [rc] = await db
    .select({ cnt: count() })
    .from(reactionsTable)
    .where(eq(reactionsTable.postId, post.id));
  const [cc] = await db
    .select({ cnt: count() })
    .from(commentsTable)
    .where(eq(commentsTable.postId, post.id));

  res.json({
    ...post,
    imageUrl: post.imageUrl ?? null,
    excerpt: post.excerpt ?? null,
    createdAt: post.createdAt.toISOString(),
    reactionCount: Number(rc?.cnt ?? 0),
    commentCount: Number(cc?.cnt ?? 0),
  });
});

// PATCH /posts/:id
router.patch("/posts/:id", async (req, res) => {
  const params = UpdatePostParams.safeParse({ id: Number(req.params.id) });
  const body = UpdatePostBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const updates: Partial<typeof postsTable.$inferInsert> = {};
  if (body.data.title !== undefined) updates.title = body.data.title;
  if (body.data.content !== undefined) updates.content = body.data.content;
  if (body.data.excerpt !== undefined) updates.excerpt = body.data.excerpt;
  if (body.data.imageUrl !== undefined) updates.imageUrl = body.data.imageUrl;
  if (body.data.category !== undefined) updates.category = body.data.category;
  if (body.data.isBreaking !== undefined) updates.isBreaking = body.data.isBreaking;
  const rawVideoUrl = (req.body as Record<string, unknown>).videoUrl;
  if (rawVideoUrl !== undefined) updates.videoUrl = (rawVideoUrl as string | null) ?? null;

  const [post] = await db
    .update(postsTable)
    .set(updates)
    .where(eq(postsTable.id, params.data.id))
    .returning();

  if (!post) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [rc] = await db.select({ cnt: count() }).from(reactionsTable).where(eq(reactionsTable.postId, post.id));
  const [cc] = await db.select({ cnt: count() }).from(commentsTable).where(eq(commentsTable.postId, post.id));

  res.json({
    ...post,
    imageUrl: post.imageUrl ?? null,
    excerpt: post.excerpt ?? null,
    createdAt: post.createdAt.toISOString(),
    reactionCount: Number(rc?.cnt ?? 0),
    commentCount: Number(cc?.cnt ?? 0),
  });
});

// DELETE /posts/:id
router.delete("/posts/:id", async (req, res) => {
  const params = DeletePostParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(postsTable).where(eq(postsTable.id, params.data.id));
  res.status(204).send();
});

export default router;
