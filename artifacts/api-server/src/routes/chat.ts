import { Router } from "express";
import { db } from "@workspace/db";
import { chatMessagesTable, usersTable } from "@workspace/db";
import { eq, desc, and, gte } from "drizzle-orm";

const router = Router();

// ── WAT timezone helpers ──────────────────────────────────────────────────────
function watParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    hour: "numeric", minute: "numeric", hour12: false,
  }).formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === "hour")!.value);
  const minute = parseInt(parts.find((p) => p.type === "minute")!.value);
  return { hour, minute };
}

function isChatOpen(date = new Date()): boolean {
  const { hour } = watParts(date);
  return hour >= 18 && hour < 20;
}

// Ms until next 6PM WAT from now
function msUntilNextOpen(): number {
  const now = new Date();
  const { hour, minute } = watParts(now);
  // Minutes remaining in current day until 18:00 WAT
  const minutesPast6pm = (hour - 18) * 60 + minute;
  if (hour < 18) {
    // Still before 6PM today
    const minsUntil = (18 - hour) * 60 - minute;
    return minsUntil * 60 * 1000;
  }
  // After 6PM — next open is tomorrow at 6PM WAT
  const msUntilMidnight = (24 * 60 - (hour * 60 + minute)) * 60 * 1000;
  const msFrom6amToOpen = 18 * 60 * 60 * 1000;
  return msUntilMidnight + msFrom6amToOpen;
}

// ── GET /chat/status ──────────────────────────────────────────────────────────
router.get("/chat/status", (_req, res) => {
  const open = isChatOpen();
  res.json({ isOpen: open, msUntilOpen: open ? 0 : msUntilNextOpen() });
});

// ── GET /chat/messages ────────────────────────────────────────────────────────
router.get("/chat/messages", async (_req, res) => {
  const rows = await db
    .select({
      id: chatMessagesTable.id,
      userId: chatMessagesTable.userId,
      messageText: chatMessagesTable.messageText,
      createdAt: chatMessagesTable.createdAt,
      senderName: usersTable.name,
    })
    .from(chatMessagesTable)
    .leftJoin(usersTable, eq(chatMessagesTable.userId, usersTable.id))
    .orderBy(chatMessagesTable.createdAt);
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

// ── POST /chat/messages ───────────────────────────────────────────────────────
router.post("/chat/messages", async (req, res) => {
  if (!isChatOpen()) {
    res.status(403).json({ error: "Chat is closed. Come back at 6:00 PM WAT." });
    return;
  }
  const { userId, messageText } = req.body as { userId?: string; messageText?: string };
  if (!userId || !messageText?.trim()) {
    res.status(400).json({ error: "Missing userId or messageText" });
    return;
  }
  // Check user moderation status
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.isBanned) { res.status(403).json({ error: "You have been banned from the chat room." }); return; }
  if (user.mutedUntil && user.mutedUntil > new Date()) {
    res.status(403).json({ error: `You are muted until ${user.mutedUntil.toISOString()}` });
    return;
  }
  const [row] = await db.insert(chatMessagesTable).values({
    userId,
    messageText: messageText.trim().slice(0, 500),
  }).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString(), senderName: user.name });
});

// ── Admin: GET /admin/chat/messages ──────────────────────────────────────────
router.get("/admin/chat/messages", async (_req, res) => {
  const rows = await db
    .select({
      id: chatMessagesTable.id,
      userId: chatMessagesTable.userId,
      messageText: chatMessagesTable.messageText,
      createdAt: chatMessagesTable.createdAt,
      senderName: usersTable.name,
      isBanned: usersTable.isBanned,
      mutedUntil: usersTable.mutedUntil,
    })
    .from(chatMessagesTable)
    .leftJoin(usersTable, eq(chatMessagesTable.userId, usersTable.id))
    .orderBy(chatMessagesTable.createdAt);
  res.json(rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    mutedUntil: r.mutedUntil?.toISOString() ?? null,
  })));
});

// ── Admin: DELETE /admin/chat/messages/:id ────────────────────────────────────
router.delete("/admin/chat/messages/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.id, id));
  res.status(204).end();
});

// ── Admin: POST /admin/chat/users/:userId/mute ────────────────────────────────
router.post("/admin/chat/users/:userId/mute", async (req, res) => {
  const { userId } = req.params;
  const { hours } = req.body as { hours?: number };
  if (!hours || hours <= 0) { res.status(400).json({ error: "Invalid hours" }); return; }
  const mutedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
  await db.update(usersTable).set({ mutedUntil }).where(eq(usersTable.id, userId));
  res.json({ ok: true, mutedUntil: mutedUntil.toISOString() });
});

// ── Admin: POST /admin/chat/users/:userId/unmute ──────────────────────────────
router.post("/admin/chat/users/:userId/unmute", async (req, res) => {
  const { userId } = req.params;
  await db.update(usersTable).set({ mutedUntil: null }).where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

// ── Admin: POST /admin/chat/users/:userId/ban ─────────────────────────────────
router.post("/admin/chat/users/:userId/ban", async (req, res) => {
  const { userId } = req.params;
  await db.update(usersTable).set({ isBanned: true }).where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

// ── Admin: POST /admin/chat/users/:userId/unban ───────────────────────────────
router.post("/admin/chat/users/:userId/unban", async (req, res) => {
  const { userId } = req.params;
  await db.update(usersTable).set({ isBanned: false }).where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

export { isChatOpen };
export default router;
