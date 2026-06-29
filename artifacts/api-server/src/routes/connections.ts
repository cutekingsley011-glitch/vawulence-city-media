import { Router } from "express";
import { db } from "@workspace/db";
import { connectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const fmt = (c: typeof connectionsTable.$inferSelect) => ({ ...c, createdAt: c.createdAt.toISOString() });

// Public fmt — strips private whatsappNumber before sending to users
const fmtPublic = (c: typeof connectionsTable.$inferSelect) => {
  const { whatsappNumber: _w, ...rest } = fmt(c);
  return rest;
};

// GET /connections — approved only (no private fields)
router.get("/connections", async (_req, res) => {
  const rows = await db.select().from(connectionsTable).where(eq(connectionsTable.status, "approved")).orderBy(connectionsTable.createdAt);
  res.json(rows.map(fmtPublic));
});

// POST /connections — submit a profile (goes to pending)
router.post("/connections", async (req, res) => {
  const { userId, name, ageBracket, gender, state, photoUrl, lookingFor, lookingForAge, preferredLocation, whatsappNumber, bioText, consentGiven } = req.body as {
    userId?: string; name: string; ageBracket: string; gender?: string; state: string;
    photoUrl?: string; lookingFor: string; lookingForAge?: string; preferredLocation?: string;
    whatsappNumber?: string; bioText: string; consentGiven: boolean;
  };
  if (!name || !ageBracket || !state || !lookingFor || !bioText) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }
  if (!consentGiven) { res.status(400).json({ error: "Consent required" }); return; }
  const [row] = await db.insert(connectionsTable).values({
    userId: userId ?? null, name, ageBracket, gender: gender ?? null, state, photoUrl: photoUrl ?? null,
    lookingFor, lookingForAge: lookingForAge ?? null, preferredLocation: preferredLocation ?? null,
    whatsappNumber: whatsappNumber ?? null, bioText, consentGiven: true, status: "pending",
  }).returning();
  res.status(201).json(fmtPublic(row));
});

// GET /admin/connections
router.get("/admin/connections", async (_req, res) => {
  const rows = await db.select().from(connectionsTable).orderBy(connectionsTable.createdAt);
  res.json(rows.map(fmt));
});

// POST /admin/connections/:id/approve
router.post("/admin/connections/:id/approve", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.update(connectionsTable).set({ status: "approved" }).where(eq(connectionsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmt(row));
});

// POST /admin/connections/:id/reject
router.post("/admin/connections/:id/reject", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.update(connectionsTable).set({ status: "rejected" }).where(eq(connectionsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmt(row));
});

// DELETE /admin/connections/:id — remove approved card (complaints/disputes)
router.delete("/admin/connections/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(connectionsTable).where(eq(connectionsTable.id, id));
  res.status(204).end();
});

export default router;
