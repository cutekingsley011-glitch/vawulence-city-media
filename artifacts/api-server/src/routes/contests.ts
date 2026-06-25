import { Router } from "express";
import { db } from "@workspace/db";
import { contestsTable, contestEntriesTable, transactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { verifyTransaction, totalWithFee, SERVICE_FEE } from "../lib/paystack";

const router = Router();

// GET /contests
router.get("/contests", async (_req, res) => {
  const contests = await db.select().from(contestsTable).orderBy(desc(contestsTable.createdAt));
  res.json(contests.map(serializeContest));
});

// GET /contests/:id
router.get("/contests/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [contest] = await db.select().from(contestsTable).where(eq(contestsTable.id, id));
  if (!contest) { res.status(404).json({ error: "Contest not found" }); return; }
  const entries = await db.select().from(contestEntriesTable).where(eq(contestEntriesTable.contestId, id));
  res.json({ ...serializeContest(contest), entries: entries.map(serializeEntry) });
});

// POST /contests (admin)
router.post("/contests", async (req, res) => {
  const { title, description, imageUrl, entryFee, maxEntrants, options, hostCutPercentage, closesAt } = req.body;
  if (!title || !description || !entryFee || !maxEntrants || !closesAt) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }
  const [contest] = await db.insert(contestsTable).values({
    title, description, imageUrl,
    entryFee: Number(entryFee),
    maxEntrants: Number(maxEntrants),
    options: options ?? null,
    hostCutPercentage: hostCutPercentage ?? 10,
    closesAt: new Date(closesAt),
  }).returning();
  res.status(201).json(serializeContest(contest));
});

// PATCH /contests/:id (admin)
router.patch("/contests/:id", async (req, res) => {
  const id = Number(req.params.id);
  const updates: Record<string, unknown> = {};
  const allowed = ["title", "description", "imageUrl", "entryFee", "maxEntrants", "options", "status", "hostCutPercentage", "closesAt"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates[key] = key === "closesAt" ? new Date(req.body[key]) : req.body[key];
    }
  }
  const [contest] = await db.update(contestsTable).set(updates).where(eq(contestsTable.id, id)).returning();
  if (!contest) { res.status(404).json({ error: "Contest not found" }); return; }
  res.json(serializeContest(contest));
});

// DELETE /contests/:id (admin)
router.delete("/contests/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(contestsTable).where(eq(contestsTable.id, id));
  res.json({ success: true });
});

// POST /contests/:id/verify-entry-payment
router.post("/contests/:id/verify-entry-payment", async (req, res) => {
  const contestId = Number(req.params.id);
  const { reference, userId, userName, predictionOrNomineeChoice } = req.body;
  if (!reference || !userId || !userName) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }

  const [contest] = await db.select().from(contestsTable).where(eq(contestsTable.id, contestId));
  if (!contest) { res.status(404).json({ error: "Contest not found" }); return; }
  if (contest.status === "closed" || contest.currentEntrants >= contest.maxEntrants) {
    res.status(400).json({ error: "Contest is closed" }); return;
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY ?? "";
  let verified = true;
  if (secretKey && secretKey !== "sk_test_placeholder") {
    const result = await verifyTransaction(reference);
    verified = result.success;
  }
  if (!verified) { res.status(400).json({ error: "Payment verification failed" }); return; }

  const existing = await db.select().from(contestEntriesTable).where(eq(contestEntriesTable.paystackReference, reference));
  if (existing.length > 0) { res.json({ entry: serializeEntry(existing[0]) }); return; }

  const [entry] = await db.insert(contestEntriesTable).values({
    contestId, userId, userName, predictionOrNomineeChoice,
    paystackReference: reference,
  }).returning();

  await db.update(contestsTable)
    .set({ currentEntrants: contest.currentEntrants + 1 })
    .where(eq(contestsTable.id, contestId));

  // Auto-close if full
  if (contest.currentEntrants + 1 >= contest.maxEntrants) {
    await db.update(contestsTable).set({ status: "closed" }).where(eq(contestsTable.id, contestId));
  }

  await db.insert(transactionsTable).values({
    userId, userName,
    type: "contest_entry",
    referenceId: String(contestId),
    referenceLabel: contest.title,
    baseAmount: contest.entryFee,
    serviceFee: SERVICE_FEE,
    totalAmount: totalWithFee(contest.entryFee),
    paystackReference: reference,
    status: "success",
  }).onConflictDoNothing();

  res.status(201).json({ entry: serializeEntry(entry) });
});

// POST /admin/contest-entries/:id/mark-winner (admin)
router.post("/admin/contest-entries/:id/mark-winner", async (req, res) => {
  const id = Number(req.params.id);
  const { isWinner } = req.body;
  const [entry] = await db.update(contestEntriesTable).set({ isWinner: !!isWinner }).where(eq(contestEntriesTable.id, id)).returning();
  if (!entry) { res.status(404).json({ error: "Entry not found" }); return; }
  res.json(serializeEntry(entry));
});

function serializeContest(c: typeof contestsTable.$inferSelect) {
  return {
    ...c,
    closesAt: c.closesAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    spotsRemaining: c.maxEntrants - c.currentEntrants,
  };
}
function serializeEntry(e: typeof contestEntriesTable.$inferSelect) {
  return { ...e, paidAt: e.paidAt.toISOString() };
}

export default router;
