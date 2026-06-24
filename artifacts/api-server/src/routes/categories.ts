import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateCategoryBody, DeleteCategoryParams } from "@workspace/api-zod";

const router = Router();

// GET /categories
router.get("/categories", async (_req, res) => {
  const rows = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  res.json(rows);
});

// POST /categories
router.post("/categories", async (req, res) => {
  const body = CreateCategoryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const [cat] = await db
    .insert(categoriesTable)
    .values({ name: body.data.name })
    .onConflictDoNothing()
    .returning();
  if (!cat) {
    res.status(409).json({ error: "Category already exists" });
    return;
  }
  res.status(201).json(cat);
});

// DELETE /categories/:id
router.delete("/categories/:id", async (req, res) => {
  const params = DeleteCategoryParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(categoriesTable).where(eq(categoriesTable.id, params.data.id));
  res.status(204).send();
});

export default router;
