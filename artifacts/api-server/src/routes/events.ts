import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, ticketsTable, transactionsTable } from "@workspace/db";
import { eq, desc, count, gt } from "drizzle-orm";
import { verifyTransaction, totalWithFee, SERVICE_FEE } from "../lib/paystack";

const router = Router();

// GET /events
router.get("/events", async (req, res) => {
  const { status } = req.query;
  const now = new Date();
  const events = await db.select().from(eventsTable).orderBy(desc(eventsTable.eventDate));
  const filtered = events.filter((e) => {
    if (status === "upcoming") return e.eventDate >= now;
    if (status === "past") return e.eventDate < now;
    return true;
  });
  res.json(
    filtered.map((e) => ({
      ...e,
      eventDate: e.eventDate.toISOString(),
      createdAt: e.createdAt.toISOString(),
      status: e.eventDate >= now ? "upcoming" : "past",
    }))
  );
});

// GET /events/:id
router.get("/events/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }
  const [{ sold }] = await db.select({ sold: count() }).from(ticketsTable).where(eq(ticketsTable.eventId, id));
  const now = new Date();
  res.json({
    ...event,
    eventDate: event.eventDate.toISOString(),
    createdAt: event.createdAt.toISOString(),
    status: event.eventDate >= now ? "upcoming" : "past",
    ticketsSold: Number(sold),
  });
});

// POST /events (admin)
router.post("/events", async (req, res) => {
  const { title, description, imageUrl, venue, eventDate, restrictionTags, isPaid, ticketPrice } = req.body;
  if (!title || !description || !venue || !eventDate) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }
  const [event] = await db.insert(eventsTable).values({
    title, description, imageUrl, venue,
    eventDate: new Date(eventDate),
    restrictionTags: restrictionTags ?? [],
    isPaid: !!isPaid,
    ticketPrice: isPaid ? ticketPrice : null,
  }).returning();
  res.status(201).json({ ...event, eventDate: event.eventDate.toISOString(), createdAt: event.createdAt.toISOString() });
});

// PATCH /events/:id (admin)
router.patch("/events/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { title, description, imageUrl, venue, eventDate, restrictionTags, isPaid, ticketPrice } = req.body;
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  if (venue !== undefined) updates.venue = venue;
  if (eventDate !== undefined) updates.eventDate = new Date(eventDate);
  if (restrictionTags !== undefined) updates.restrictionTags = restrictionTags;
  if (isPaid !== undefined) updates.isPaid = isPaid;
  if (ticketPrice !== undefined) updates.ticketPrice = ticketPrice;
  const [event] = await db.update(eventsTable).set(updates).where(eq(eventsTable.id, id)).returning();
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }
  res.json({ ...event, eventDate: event.eventDate.toISOString(), createdAt: event.createdAt.toISOString() });
});

// DELETE /events/:id (admin)
router.delete("/events/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(eventsTable).where(eq(eventsTable.id, id));
  res.json({ success: true });
});

// POST /events/:id/verify-ticket-payment
router.post("/events/:id/verify-ticket-payment", async (req, res) => {
  const eventId = Number(req.params.id);
  const { reference, userId, userName, userEmail } = req.body;
  if (!reference || !userId || !userName) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  // Verify with Paystack (skip if placeholder keys)
  const secretKey = process.env.PAYSTACK_SECRET_KEY ?? "";
  let verified = true;
  if (secretKey && secretKey !== "sk_test_placeholder") {
    const result = await verifyTransaction(reference);
    verified = result.success;
  }
  if (!verified) { res.status(400).json({ error: "Payment verification failed" }); return; }

  // Check if already processed
  const existing = await db.select().from(ticketsTable).where(eq(ticketsTable.paystackReference, reference));
  if (existing.length > 0) {
    res.json({ ticket: existing[0], alreadyIssued: true }); return;
  }

  // Generate ticket code
  const [{ seqNum }] = await db.select({ seqNum: count() }).from(ticketsTable).where(eq(ticketsTable.eventId, eventId));
  const seq = Number(seqNum) + 1;
  const ticketCode = `VCM-EVT${eventId}-${String(seq).padStart(4, "0")}`;

  const [ticket] = await db.insert(ticketsTable).values({
    eventId, userId, userName, ticketCode, sequenceNumber: seq,
    paystackReference: reference,
  }).returning();

  // Log transaction
  const baseAmount = event.ticketPrice ?? 0;
  await db.insert(transactionsTable).values({
    userId, userName,
    type: "ticket",
    referenceId: String(eventId),
    referenceLabel: event.title,
    baseAmount,
    serviceFee: SERVICE_FEE,
    totalAmount: totalWithFee(baseAmount),
    paystackReference: reference,
    status: "success",
  }).onConflictDoNothing();

  res.json({
    ticket: { ...ticket, createdAt: ticket.createdAt.toISOString() },
    event: { title: event.title, venue: event.venue, eventDate: event.eventDate.toISOString() },
  });
});

// GET /events/:id/tickets (admin)
router.get("/events/:id/tickets", async (req, res) => {
  const eventId = Number(req.params.id);
  const tickets = await db.select().from(ticketsTable).where(eq(ticketsTable.eventId, eventId)).orderBy(ticketsTable.sequenceNumber);
  res.json(tickets.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })));
});

export default router;
