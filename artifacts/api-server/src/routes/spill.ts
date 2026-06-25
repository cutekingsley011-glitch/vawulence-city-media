import { Router } from "express";
import { db } from "@workspace/db";
import { spillSessionsTable, spillMessagesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// GET /spill/sessions/current — active or most-recent session
router.get("/spill/sessions/current", async (req, res) => {
  const live = await db
    .select()
    .from(spillSessionsTable)
    .where(eq(spillSessionsTable.isLive, true))
    .limit(1);
  if (live.length) { res.json(live[0]); return; }
  const latest = await db
    .select()
    .from(spillSessionsTable)
    .orderBy(desc(spillSessionsTable.createdAt))
    .limit(1);
  res.json(latest[0] ?? null);
});

// GET /spill/sessions/:id/messages
router.get("/spill/sessions/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const msgs = await db
    .select({ id: spillMessagesTable.id, messageText: spillMessagesTable.messageText, createdAt: spillMessagesTable.createdAt })
    .from(spillMessagesTable)
    .where(eq(spillMessagesTable.sessionId, id))
    .orderBy(desc(spillMessagesTable.createdAt))
    .limit(200);
  res.json(msgs);
});

// POST /spill/sessions/:id/messages — anonymous submission
router.post("/spill/sessions/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const session = await db.select().from(spillSessionsTable).where(eq(spillSessionsTable.id, id)).limit(1);
  if (!session.length || !session[0].isLive) {
    res.status(400).json({ error: "Session is not live" }); return;
  }
  const body = z.object({ messageText: z.string().min(1).max(500) }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid body" }); return; }
  const [msg] = await db.insert(spillMessagesTable).values({ sessionId: id, messageText: body.data.messageText }).returning();
  res.status(201).json(msg);
});

// ── Admin routes ──

// GET /admin/spill/sessions
router.get("/admin/spill/sessions", async (req, res) => {
  const sessions = await db.select().from(spillSessionsTable).orderBy(desc(spillSessionsTable.createdAt)).limit(50);
  res.json(sessions);
});

// POST /admin/spill/sessions — create/schedule
router.post("/admin/spill/sessions", async (req, res) => {
  const body = z.object({
    questionText: z.string().min(1),
    scheduledTime: z.string().optional().nullable(),
  }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid body" }); return; }
  const [session] = await db.insert(spillSessionsTable).values({
    questionText: body.data.questionText,
    scheduledTime: body.data.scheduledTime ? new Date(body.data.scheduledTime) : null,
  }).returning();
  res.status(201).json(session);
});

// POST /admin/spill/sessions/:id/go-live
router.post("/admin/spill/sessions/:id/go-live", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  // Close any other live sessions first
  await db.update(spillSessionsTable).set({ isLive: false }).where(eq(spillSessionsTable.isLive, true));
  const [s] = await db.update(spillSessionsTable).set({ isLive: true }).where(eq(spillSessionsTable.id, id)).returning();
  res.json(s);
});

// POST /admin/spill/sessions/:id/end
router.post("/admin/spill/sessions/:id/end", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [s] = await db.update(spillSessionsTable).set({ isLive: false }).where(eq(spillSessionsTable.id, id)).returning();
  res.json(s);
});

// DELETE /admin/spill/sessions/:id
router.delete("/admin/spill/sessions/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(spillMessagesTable).where(eq(spillMessagesTable.sessionId, id));
  await db.delete(spillSessionsTable).where(eq(spillSessionsTable.id, id));
  res.json({ ok: true });
});

export default router;
