import { Router } from "express";
import { db } from "@workspace/db";
import {
  goatCategoriesTable,
  goatNomineesTable,
  goatVotesTable,
  usersTable,
} from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";
import {
  CreateGoatCategoryBody,
  DeleteGoatCategoryParams,
  ListGoatNomineesParams,
  ListGoatNomineesQueryParams,
  VoteGoatParams,
  VoteGoatBody,
  SubmitGoatNomineeBody,
  ApproveGoatNomineeParams,
  RejectGoatNomineeParams,
} from "@workspace/api-zod";
import { awardPoints } from "../lib/points";

const router = Router();

type NomineeRow = typeof goatNomineesTable.$inferSelect;
type CategoryRow = typeof goatCategoriesTable.$inferSelect;

function nomineeToDto(n: NomineeRow) {
  return {
    id: n.id,
    goatCategoryId: n.goatCategoryId,
    name: n.name,
    photoUrl: n.photoUrl ?? null,
    description: n.description ?? null,
    voteCount: n.voteCount,
    status: n.status,
    createdAt: n.createdAt.toISOString(),
  };
}

function categoryToDto(c: CategoryRow) {
  return { id: c.id, name: c.name, createdAt: c.createdAt.toISOString() };
}

// GET /goat/categories
router.get("/goat/categories", async (_req, res) => {
  const cats = await db
    .select()
    .from(goatCategoriesTable)
    .orderBy(desc(goatCategoriesTable.createdAt));
  res.json(cats.map(categoryToDto));
});

// POST /goat/categories (admin)
router.post("/goat/categories", async (req, res) => {
  const body = CreateGoatCategoryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const [cat] = await db
    .insert(goatCategoriesTable)
    .values({ name: body.data.name })
    .returning();
  res.status(201).json(categoryToDto(cat));
});

// DELETE /goat/categories/:id (admin)
router.delete("/goat/categories/:id", async (req, res) => {
  const params = DeleteGoatCategoryParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(goatCategoriesTable)
    .where(eq(goatCategoriesTable.id, params.data.id));
  res.status(204).send();
});

// GET /goat/categories/:id/nominees
router.get("/goat/categories/:id/nominees", async (req, res) => {
  const params = ListGoatNomineesParams.safeParse({ id: Number(req.params.id) });
  const query = ListGoatNomineesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const catId = params.data.id;
  const userId = query.success ? query.data.userId : undefined;

  const [cat] = await db
    .select()
    .from(goatCategoriesTable)
    .where(eq(goatCategoriesTable.id, catId))
    .limit(1);
  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  const nominees = await db
    .select()
    .from(goatNomineesTable)
    .where(
      and(
        eq(goatNomineesTable.goatCategoryId, catId),
        eq(goatNomineesTable.status, "approved")
      )
    )
    .orderBy(desc(goatNomineesTable.voteCount));

  let userVotedNomineeId: number | null = null;
  if (userId) {
    const [vote] = await db
      .select()
      .from(goatVotesTable)
      .where(
        and(
          eq(goatVotesTable.goatCategoryId, catId),
          eq(goatVotesTable.userId, userId)
        )
      )
      .limit(1);
    userVotedNomineeId = vote?.nomineeId ?? null;
  }

  res.json({
    id: cat.id,
    name: cat.name,
    nominees: nominees.map(nomineeToDto),
    userVotedNomineeId,
  });
});

// POST /goat/categories/:id/vote
router.post("/goat/categories/:id/vote", async (req, res) => {
  const params = VoteGoatParams.safeParse({ id: Number(req.params.id) });
  const body = VoteGoatBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const catId = params.data.id;
  const { userId, nomineeId } = body.data;

  // Check duplicate
  const [existing] = await db
    .select()
    .from(goatVotesTable)
    .where(
      and(
        eq(goatVotesTable.goatCategoryId, catId),
        eq(goatVotesTable.userId, userId)
      )
    )
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "Already voted in this category" });
    return;
  }

  // Verify nominee belongs to category
  const [nominee] = await db
    .select()
    .from(goatNomineesTable)
    .where(
      and(
        eq(goatNomineesTable.id, nomineeId),
        eq(goatNomineesTable.goatCategoryId, catId),
        eq(goatNomineesTable.status, "approved")
      )
    )
    .limit(1);

  if (!nominee) {
    res.status(404).json({ error: "Nominee not found" });
    return;
  }

  // Insert vote
  await db.insert(goatVotesTable).values({ goatCategoryId: catId, nomineeId, userId });

  // Increment nominee vote count
  await db
    .update(goatNomineesTable)
    .set({ voteCount: sql`${goatNomineesTable.voteCount} + 1` })
    .where(eq(goatNomineesTable.id, nomineeId));

  // Award +1 point
  await awardPoints(userId, 1).catch(() => {});

  // Return updated list
  const [cat] = await db
    .select()
    .from(goatCategoriesTable)
    .where(eq(goatCategoriesTable.id, catId))
    .limit(1);

  const nominees = await db
    .select()
    .from(goatNomineesTable)
    .where(
      and(
        eq(goatNomineesTable.goatCategoryId, catId),
        eq(goatNomineesTable.status, "approved")
      )
    )
    .orderBy(desc(goatNomineesTable.voteCount));

  res.json({
    id: cat!.id,
    name: cat!.name,
    nominees: nominees.map(nomineeToDto),
    userVotedNomineeId: nomineeId,
  });
});

// POST /goat/nominees (submit)
router.post("/goat/nominees", async (req, res) => {
  const body = SubmitGoatNomineeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const [nominee] = await db
    .insert(goatNomineesTable)
    .values({
      goatCategoryId: body.data.goatCategoryId,
      name: body.data.name,
      photoUrl: body.data.photoUrl ?? null,
      description: body.data.description ?? null,
      submittedBy: body.data.submittedBy ?? null,
      status: "pending",
    })
    .returning();

  res.status(201).json(nomineeToDto(nominee));
});

// GET /goat/pending (admin)
router.get("/goat/pending", async (_req, res) => {
  const nominees = await db
    .select()
    .from(goatNomineesTable)
    .where(eq(goatNomineesTable.status, "pending"))
    .orderBy(desc(goatNomineesTable.createdAt));
  res.json(nominees.map(nomineeToDto));
});

// POST /goat/nominees/:id/approve (admin)
router.post("/goat/nominees/:id/approve", async (req, res) => {
  const params = ApproveGoatNomineeParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [nominee] = await db
    .update(goatNomineesTable)
    .set({ status: "approved" })
    .where(eq(goatNomineesTable.id, params.data.id))
    .returning();
  if (!nominee) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(nomineeToDto(nominee));
});

// POST /goat/nominees/:id/reject (admin)
router.post("/goat/nominees/:id/reject", async (req, res) => {
  const params = RejectGoatNomineeParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [nominee] = await db
    .update(goatNomineesTable)
    .set({ status: "rejected" })
    .where(eq(goatNomineesTable.id, params.data.id))
    .returning();
  if (!nominee) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(nomineeToDto(nominee));
});

export default router;
