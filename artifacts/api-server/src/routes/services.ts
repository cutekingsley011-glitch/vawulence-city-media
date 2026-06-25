import { Router } from "express";
import { db } from "@workspace/db";
import { escrowRequestsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const fmt = (r: typeof escrowRequestsTable.$inferSelect) => ({ ...r, createdAt: r.createdAt.toISOString() });

// GET /admin/escrow-requests
router.get("/admin/escrow-requests", async (_req, res) => {
  const rows = await db.select().from(escrowRequestsTable).orderBy(escrowRequestsTable.createdAt);
  res.json(rows.map(fmt));
});

// POST /admin/escrow-requests — create a tracking record
router.post("/admin/escrow-requests", async (req, res) => {
  const { userId, description, amount, notes } = req.body as {
    userId?: string; description: string; amount?: number; notes?: string;
  };
  if (!description) { res.status(400).json({ error: "description required" }); return; }
  const [row] = await db.insert(escrowRequestsTable).values({
    userId: userId ?? null,
    description,
    amount: amount ?? 0,
    notes: notes ?? null,
    status: "pending",
  }).returning();
  res.status(201).json(fmt(row));
});

// PUT /admin/escrow-requests/:id/status — update deal status
router.put("/admin/escrow-requests/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const { status, notes } = req.body as { status: string; notes?: string };
  const allowed = ["pending", "paid_in", "confirmed", "released"];
  if (!allowed.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
  const updates: Record<string, unknown> = { status };
  if (notes !== undefined) updates.notes = notes;
  const [row] = await db.update(escrowRequestsTable).set(updates).where(eq(escrowRequestsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmt(row));
});

export default router;
