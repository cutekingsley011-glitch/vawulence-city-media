import { Router } from "express";
import { db } from "@workspace/db";
import { adsTable, adSettingsTable, transactionsTable } from "@workspace/db";
import { eq, lte, and } from "drizzle-orm";
import { verifyTransaction, refundTransaction, totalWithFee, SERVICE_FEE } from "../lib/paystack";

const router = Router();

// GET /ad-settings
router.get("/ad-settings", async (_req, res) => {
  const settings = await db.select().from(adSettingsTable).orderBy(adSettingsTable.tier);
  res.json(settings);
});

// PUT /admin/ad-settings (admin)
router.put("/admin/ad-settings", async (req, res) => {
  const { prices } = req.body as { prices: { tier: string; price: number }[] };
  if (!Array.isArray(prices)) { res.status(400).json({ error: "prices must be array" }); return; }
  for (const { tier, price } of prices) {
    await db.update(adSettingsTable).set({ price }).where(eq(adSettingsTable.tier, tier));
  }
  const settings = await db.select().from(adSettingsTable);
  res.json(settings);
});

// GET /ads/live — live ads for homepage rotating slot
router.get("/ads/live", async (_req, res) => {
  const now = new Date();
  const ads = await db
    .select()
    .from(adsTable)
    .where(and(eq(adsTable.status, "live"), lte(adsTable.submittedAt, now)));
  // Filter expired
  const live = ads.filter((a) => !a.expiresAt || a.expiresAt > now);
  res.json(live.map((a) => ({
    id: a.id, imageUrl: a.imageUrl, linkUrl: a.linkUrl, advertiserName: a.advertiserName,
  })));
});

// GET /admin/ads (admin)
router.get("/admin/ads", async (_req, res) => {
  const ads = await db.select().from(adsTable).orderBy(adsTable.submittedAt);
  res.json(ads.map((a) => ({
    ...a,
    submittedAt: a.submittedAt.toISOString(),
    expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
  })));
});

// POST /ads/verify-payment
router.post("/ads/verify-payment", async (req, res) => {
  const { reference, advertiserName, contactInfo, imageUrl, linkUrl, durationTier, userId, userName } = req.body;
  if (!reference || !advertiserName || !imageUrl || !durationTier) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }

  const [setting] = await db.select().from(adSettingsTable).where(eq(adSettingsTable.tier, durationTier));
  if (!setting) { res.status(400).json({ error: "Invalid tier" }); return; }

  const secretKey = process.env.PAYSTACK_SECRET_KEY ?? "";
  let verified = true;
  if (secretKey && secretKey !== "sk_test_placeholder") {
    const result = await verifyTransaction(reference);
    verified = result.success;
  }
  if (!verified) { res.status(400).json({ error: "Payment verification failed" }); return; }

  const existing = await db.select().from(adsTable).where(eq(adsTable.paystackReference, reference));
  if (existing.length > 0) { res.json({ ad: existing[0] }); return; }

  const [ad] = await db.insert(adsTable).values({
    advertiserName, contactInfo, imageUrl: imageUrl ?? "", linkUrl,
    durationTier, price: setting.price,
    status: "under_review",
    paystackReference: reference,
  }).returning();

  await db.insert(transactionsTable).values({
    userId: userId ?? "anon", userName: userName ?? advertiserName,
    type: "ad",
    referenceId: String(ad.id),
    referenceLabel: durationTier,
    baseAmount: setting.price,
    serviceFee: SERVICE_FEE,
    totalAmount: totalWithFee(setting.price),
    paystackReference: reference,
    status: "success",
  }).onConflictDoNothing();

  res.status(201).json({ ad: { ...ad, submittedAt: ad.submittedAt.toISOString(), expiresAt: null } });
});

// POST /admin/ads/:id/approve (admin)
router.post("/admin/ads/:id/approve", async (req, res) => {
  const id = Number(req.params.id);
  const [ad] = await db.select().from(adsTable).where(eq(adsTable.id, id));
  if (!ad) { res.status(404).json({ error: "Ad not found" }); return; }

  const daysMap: Record<string, number> = { "1week": 7, "2weeks": 14, "1month": 30, "2months": 60 };
  const days = daysMap[ad.durationTier] ?? 7;
  const expiresAt = new Date(Date.now() + days * 86400000);

  const [updated] = await db.update(adsTable).set({ status: "live", expiresAt }).where(eq(adsTable.id, id)).returning();
  res.json({ ...updated, submittedAt: updated.submittedAt.toISOString(), expiresAt: updated.expiresAt?.toISOString() });
});

// POST /admin/ads/:id/reject (admin)
router.post("/admin/ads/:id/reject", async (req, res) => {
  const id = Number(req.params.id);
  const [ad] = await db.select().from(adsTable).where(eq(adsTable.id, id));
  if (!ad) { res.status(404).json({ error: "Ad not found" }); return; }

  const secretKey = process.env.PAYSTACK_SECRET_KEY ?? "";
  let refunded = false;
  if (secretKey && secretKey !== "sk_test_placeholder") {
    refunded = await refundTransaction(ad.paystackReference, ad.price);
  } else {
    refunded = true; // simulate refund in dev
  }

  const [updated] = await db.update(adsTable).set({ status: "rejected" }).where(eq(adsTable.id, id)).returning();

  await db.update(transactionsTable)
    .set({ status: "refunded" })
    .where(eq(transactionsTable.paystackReference, ad.paystackReference));

  res.json({ ...updated, refunded, submittedAt: updated.submittedAt.toISOString(), expiresAt: null });
});

export default router;
