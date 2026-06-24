import { Router } from "express";
import { db } from "@workspace/db";
import { siteVisitsTable } from "@workspace/db";

const router = Router();

// POST /visits
router.post("/visits", async (_req, res) => {
  await db.insert(siteVisitsTable).values({});
  res.status(204).send();
});

export default router;
