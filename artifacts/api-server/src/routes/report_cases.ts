import { Router } from "express";
import { db } from "@workspace/db";
import { reportCasesTable, commentsTable, usersTable } from "@workspace/db";
import { eq, desc, and, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router = Router();

// GET /report-cases — approved cases, newest first (public)
router.get("/report-cases", async (_req, res) => {
  const cases = await db
    .select()
    .from(reportCasesTable)
    .where(eq(reportCasesTable.status, "approved"))
    .orderBy(desc(reportCasesTable.createdAt));
  res.json(cases.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })));
});

// POST /report-cases — anonymous submission
router.post("/report-cases", async (req, res) => {
  const { caseText, imageUrls } = req.body as { caseText?: string; imageUrls?: string[] };
  if (!caseText?.trim()) {
    res.status(400).json({ error: "caseText is required" });
    return;
  }
  const [rc] = await db
    .insert(reportCasesTable)
    .values({ caseText: caseText.trim(), imageUrls: imageUrls ?? [] })
    .returning();
  res.status(201).json({ ...rc, createdAt: rc.createdAt.toISOString() });
});

// GET /report-cases/:id/comments
router.get("/report-cases/:id/comments", async (req, res) => {
  const caseId = Number(req.params.id);
  if (!caseId) { res.status(400).json({ error: "Invalid id" }); return; }

  const all = await db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.reportCaseId, caseId))
    .orderBy(desc(commentsTable.likeCount), desc(commentsTable.createdAt));

  const topLevel = all.filter((c) => c.parentCommentId === null);
  const replies = all.filter((c) => c.parentCommentId !== null);
  const replyMap: Record<number, typeof all> = {};
  for (const r of replies) {
    const pid = r.parentCommentId!;
    if (!replyMap[pid]) replyMap[pid] = [];
    replyMap[pid].push(r);
  }

  res.json(topLevel.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    replies: (replyMap[c.id] ?? []).map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), replies: [] })),
  })));
});

// POST /report-cases/:id/comments
router.post("/report-cases/:id/comments", async (req, res) => {
  const caseId = Number(req.params.id);
  if (!caseId) { res.status(400).json({ error: "Invalid id" }); return; }
  const { userId, content, parentCommentId } = req.body as {
    userId?: string; content?: string; parentCommentId?: number;
  };
  if (!content?.trim()) { res.status(400).json({ error: "content required" }); return; }

  let userName: string | null = null;
  if (userId) {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    userName = u?.name ?? null;
  }

  const [comment] = await db
    .insert(commentsTable)
    .values({ reportCaseId: caseId, userId: userId ?? null, userName, parentCommentId: parentCommentId ?? null, content: content.trim() })
    .returning();

  res.status(201).json({ ...comment, createdAt: comment.createdAt.toISOString(), replies: [] });
});

// POST /report-cases/:id/comments/:commentId/like
router.post("/report-cases/:id/comments/:commentId/like", async (req, res) => {
  const commentId = Number(req.params.commentId);
  const [comment] = await db
    .update(commentsTable)
    .set({ likeCount: sql`${commentsTable.likeCount} + 1` })
    .where(eq(commentsTable.id, commentId))
    .returning();
  if (!comment) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...comment, createdAt: comment.createdAt.toISOString(), replies: [] });
});

// ── Admin routes ──────────────────────────────────────────────────────────────

// GET /admin/report-cases — all cases for admin review
router.get("/admin/report-cases", async (_req, res) => {
  const cases = await db
    .select()
    .from(reportCasesTable)
    .orderBy(desc(reportCasesTable.createdAt));
  res.json(cases.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })));
});

// PATCH /admin/report-cases/:id — approve or decline
router.patch("/admin/report-cases/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body as { status: "approved" | "declined" };
  if (!["approved", "declined"].includes(status)) {
    res.status(400).json({ error: "status must be approved or declined" });
    return;
  }
  const [rc] = await db
    .update(reportCasesTable)
    .set({ status })
    .where(eq(reportCasesTable.id, id))
    .returning();
  if (!rc) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...rc, createdAt: rc.createdAt.toISOString() });
});

export default router;
