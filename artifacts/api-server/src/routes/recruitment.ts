import { Router } from "express";
import { db } from "@workspace/db";
import { jobPostingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const fmt = (j: typeof jobPostingsTable.$inferSelect) => ({ ...j, createdAt: j.createdAt.toISOString() });

// GET /recruitment — open postings only
router.get("/recruitment", async (_req, res) => {
  const rows = await db.select().from(jobPostingsTable).where(eq(jobPostingsTable.status, "open")).orderBy(jobPostingsTable.createdAt);
  res.json(rows.map(fmt));
});

// GET /recruitment/:id
router.get("/recruitment/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(jobPostingsTable).where(eq(jobPostingsTable.id, id));
  if (!row || row.status === "closed") { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmt(row));
});

// GET /admin/recruitment — all postings
router.get("/admin/recruitment", async (_req, res) => {
  const rows = await db.select().from(jobPostingsTable).orderBy(jobPostingsTable.createdAt);
  res.json(rows.map(fmt));
});

// POST /admin/recruitment — create posting
router.post("/admin/recruitment", async (req, res) => {
  const { title, companyName, description, flyerImageUrl, requirements, applyMethod, applyContact } = req.body as {
    title: string; companyName: string; description: string; flyerImageUrl?: string;
    requirements?: string[]; applyMethod?: string; applyContact: string;
  };
  if (!title || !companyName || !description || !applyContact) {
    res.status(400).json({ error: "title, companyName, description, applyContact required" }); return;
  }
  const [row] = await db.insert(jobPostingsTable).values({
    title, companyName, description,
    flyerImageUrl: flyerImageUrl ?? null,
    requirements: requirements ?? [],
    applyMethod: applyMethod ?? "whatsapp",
    applyContact,
    status: "open",
  }).returning();
  res.status(201).json(fmt(row));
});

// POST /admin/recruitment/:id/close — close posting (hides from public, keeps record)
router.post("/admin/recruitment/:id/close", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.update(jobPostingsTable).set({ status: "closed" }).where(eq(jobPostingsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmt(row));
});

// DELETE /admin/recruitment/:id
router.delete("/admin/recruitment/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(jobPostingsTable).where(eq(jobPostingsTable.id, id));
  res.status(204).end();
});

export default router;
