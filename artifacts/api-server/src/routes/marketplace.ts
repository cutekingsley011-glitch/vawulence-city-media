import { Router } from "express";
import { db } from "@workspace/db";
import { marketplaceItemsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";

const router = Router();

// Strip private fields before sending to public callers
function toPublic(i: typeof marketplaceItemsTable.$inferSelect) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sellerWhatsapp, submittedByEmail, ...pub } = i;
  return { ...pub, createdAt: i.createdAt.toISOString() };
}

// GET /marketplace — available items only (public)
router.get("/marketplace", async (_req, res) => {
  const items = await db
    .select()
    .from(marketplaceItemsTable)
    .where(eq(marketplaceItemsTable.status, "available"))
    .orderBy(marketplaceItemsTable.createdAt);
  res.json(items.map(toPublic));
});

// GET /marketplace/:id
router.get("/marketplace/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [item] = await db.select().from(marketplaceItemsTable).where(eq(marketplaceItemsTable.id, id));
  if (!item || item.status === "sold" || item.status === "pending") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(toPublic(item));
});

// POST /marketplace — user-submitted listing (goes to pending queue)
router.post("/marketplace", async (req, res) => {
  const { name, description, price, imageUrls, category, submittedByName, submittedByEmail, howLongUsed, location, lastPrice, reasonForSale, sellerWhatsapp } = req.body as {
    name: string; description: string; price: number;
    imageUrls?: string[]; category?: string;
    submittedByName?: string; submittedByEmail?: string;
    howLongUsed?: string; location?: string; lastPrice?: number; reasonForSale?: string;
    sellerWhatsapp?: string;
  };
  if (!name || !description || !price) {
    res.status(400).json({ error: "name, description, price required" });
    return;
  }
  const [item] = await db.insert(marketplaceItemsTable).values({
    name, description, price,
    imageUrls: imageUrls ?? [],
    category: category ?? "General",
    status: "pending",
    submittedByName: submittedByName ?? null,
    submittedByEmail: submittedByEmail ?? null,
    howLongUsed: howLongUsed ?? null,
    location: location ?? null,
    lastPrice: lastPrice ?? null,
    reasonForSale: reasonForSale ?? null,
    sellerWhatsapp: sellerWhatsapp ?? null,
  }).returning();
  res.status(201).json(toPublic(item));
});

// GET /admin/marketplace — all items for admin (including pending)
router.get("/admin/marketplace", async (_req, res) => {
  const items = await db.select().from(marketplaceItemsTable).orderBy(marketplaceItemsTable.createdAt);
  res.json(items.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() })));
});

// POST /admin/marketplace — admin creates listing directly (goes live immediately)
router.post("/admin/marketplace", async (req, res) => {
  const { name, description, price, imageUrls, category } = req.body as {
    name: string; description: string; price: number; imageUrls?: string[]; category?: string;
  };
  if (!name || !description || !price) { res.status(400).json({ error: "name, description, price required" }); return; }
  const [item] = await db.insert(marketplaceItemsTable).values({
    name, description, price, imageUrls: imageUrls ?? [], category: category ?? "General",
    status: "available",
  }).returning();
  res.status(201).json({ ...item, createdAt: item.createdAt.toISOString() });
});

// PATCH /admin/marketplace/:id — approve (→ available) or decline (→ sold/delete)
router.patch("/admin/marketplace/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body as { status: "available" | "declined" };
  if (!["available", "declined"].includes(status)) {
    res.status(400).json({ error: "status must be available or declined" });
    return;
  }
  if (status === "declined") {
    await db.delete(marketplaceItemsTable).where(eq(marketplaceItemsTable.id, id));
    res.status(204).end();
    return;
  }
  const [item] = await db
    .update(marketplaceItemsTable)
    .set({ status: "available" })
    .where(eq(marketplaceItemsTable.id, id))
    .returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...item, createdAt: item.createdAt.toISOString() });
});

// POST /admin/marketplace/:id/sold — mark as sold
router.post("/admin/marketplace/:id/sold", async (req, res) => {
  const id = Number(req.params.id);
  const [item] = await db.update(marketplaceItemsTable).set({ status: "sold" }).where(eq(marketplaceItemsTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...item, createdAt: item.createdAt.toISOString() });
});

// DELETE /admin/marketplace/:id
router.delete("/admin/marketplace/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(marketplaceItemsTable).where(eq(marketplaceItemsTable.id, id));
  res.status(204).end();
});

export default router;
