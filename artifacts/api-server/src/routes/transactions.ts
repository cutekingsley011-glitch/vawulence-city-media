import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

// GET /admin/transactions
router.get("/admin/transactions", async (req, res) => {
  const { type } = req.query;
  let query = db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt));
  const all = await query;
  const filtered = type ? all.filter((t) => t.type === type) : all;
  res.json(
    filtered.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      baseAmountNaira: t.baseAmount / 100,
      serviceFeeNaira: t.serviceFee / 100,
      totalAmountNaira: t.totalAmount / 100,
      description: buildDescription(t),
    }))
  );
});

function buildDescription(t: {
  userName: string;
  totalAmount: number;
  baseAmount: number;
  type: string;
  referenceLabel: string | null;
  serviceFee: number;
}) {
  const total = `₦${(t.totalAmount / 100).toLocaleString("en-NG")}`;
  const base = `₦${(t.baseAmount / 100).toLocaleString("en-NG")}`;
  const label = t.referenceLabel ?? "Unknown";
  const typeLabel =
    t.type === "ticket" ? `ticket for ${label}`
    : t.type === "subscription" ? `subscription (${label})`
    : t.type === "ad" ? `ad placement (${label})`
    : t.type === "contest_entry" ? `contest entry for ${label}`
    : t.type;
  return `${t.userName} paid ${total} → ${base} for ${typeLabel} + ₦${(t.serviceFee / 100).toLocaleString("en-NG")} service fee`;
}

export default router;
