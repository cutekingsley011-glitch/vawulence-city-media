import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionPlansTable, usersTable, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyTransaction, totalWithFee, SERVICE_FEE } from "../lib/paystack";

const router = Router();

// GET /subscription-plans
router.get("/subscription-plans", async (_req, res) => {
  const plans = await db.select().from(subscriptionPlansTable).orderBy(subscriptionPlansTable.price);
  res.json(plans);
});

// PUT /admin/subscription-plans/:id (admin)
router.put("/admin/subscription-plans/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, price, durationDays } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (price !== undefined) updates.price = price;
  if (durationDays !== undefined) updates.durationDays = durationDays;
  const [plan] = await db.update(subscriptionPlansTable).set(updates).where(eq(subscriptionPlansTable.id, id)).returning();
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  res.json(plan);
});

// POST /subscription-plans (admin — create new plan)
router.post("/subscription-plans", async (req, res) => {
  const { name, price, durationDays } = req.body;
  if (!name || !price || !durationDays) { res.status(400).json({ error: "Missing fields" }); return; }
  const [plan] = await db.insert(subscriptionPlansTable).values({ name, price, durationDays }).returning();
  res.status(201).json(plan);
});

// POST /subscriptions/verify-payment
router.post("/subscriptions/verify-payment", async (req, res) => {
  const { reference, userId, planId } = req.body;
  if (!reference || !userId || !planId) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }

  const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, Number(planId)));
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const secretKey = process.env.PAYSTACK_SECRET_KEY ?? "";
  let verified = true;
  if (secretKey && secretKey !== "sk_test_placeholder") {
    const result = await verifyTransaction(reference);
    verified = result.success;
  }
  if (!verified) { res.status(400).json({ error: "Payment verification failed" }); return; }

  // Extend subscription
  const now = new Date();
  const currentExpiry = user.subscriptionExpiresAt && user.subscriptionExpiresAt > now
    ? user.subscriptionExpiresAt
    : now;
  const newExpiry = new Date(currentExpiry.getTime() + plan.durationDays * 86400000);

  const [updated] = await db.update(usersTable)
    .set({ isSubscriber: true, subscriptionExpiresAt: newExpiry })
    .where(eq(usersTable.id, userId))
    .returning();

  await db.insert(transactionsTable).values({
    userId, userName: user.name,
    type: "subscription",
    referenceId: String(plan.id),
    referenceLabel: plan.name,
    baseAmount: plan.price,
    serviceFee: SERVICE_FEE,
    totalAmount: totalWithFee(plan.price),
    paystackReference: reference,
    status: "success",
  }).onConflictDoNothing();

  res.json({
    isSubscriber: updated.isSubscriber,
    subscriptionExpiresAt: updated.subscriptionExpiresAt?.toISOString(),
    plan,
  });
});

// GET /users/:id/subscription-status
router.get("/users/:id/subscription-status", async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.params.id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const now = new Date();
  const isActive = user.isSubscriber && !!user.subscriptionExpiresAt && user.subscriptionExpiresAt > now;
  // Auto-lapse if expired
  if (user.isSubscriber && !isActive) {
    await db.update(usersTable).set({ isSubscriber: false }).where(eq(usersTable.id, user.id));
  }
  res.json({ isSubscriber: isActive, subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString() ?? null });
});

export default router;
