import { Router } from "express";
import { db } from "@workspace/db";
import { marketplaceItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /marketplace — available items only (sold hidden from public)
router.get("/marketplace", async (_req, res) => {
  const items = await db
    .select()
    .from(marketplaceItemsTable)
    .where(eq(marketplaceItemsTable.status, "available"))
    .orderBy(marketplaceItemsTable.createdAt);
  res.json(items.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() })));
});

// GET /marketplace/:id
router.get("/marketplace/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [item] = await db.select().from(marketplaceItemsTable).where(eq(marketplaceItemsTable.id, id));
  if (!item || item.status === "sold") { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...item, createdAt: item.createdAt.toISOString() });
});

// GET /admin/marketplace — all items for admin
router.get("/admin/marketplace", async (_req, res) => {
  const items = await db.select().from(marketplaceItemsTable).orderBy(marketplaceItemsTable.createdAt);
  res.json(items.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() })));
});

// POST /admin/marketplace — create listing
router.post("/admin/marketplace", async (req, res) => {
  const { name, description, price, imageUrls, category } = req.body as {
    name: string; description: string; price: number; imageUrls?: string[]; category?: string;
  };
  if (!name || !description || !price) { res.status(400).json({ error: "name, description, price required" }); return; }
  const [item] = await db.insert(marketplaceItemsTable).values({
    name, description, price, imageUrls: imageUrls ?? [], category: category ?? "General",
  }).returning();
  res.status(201).json({ ...item, createdAt: item.createdAt.toISOString() });
});

// POST /admin/marketplace/:id/sold — mark as sold (removes from public immediately)
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
