import { Router } from "express";
import { db } from "@workspace/db";
import { chatMessagesTable, chatMessageReactionsTable, usersTable } from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";

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
  return hour >= 18 && hour < 22;
}

// Ms until next 6PM WAT from now
function msUntilNextOpen(): number {
  const now = new Date();
  const { hour, minute } = watParts(now);
  if (hour < 18) {
    const minsUntil = (18 - hour) * 60 - minute;
    return minsUntil * 60 * 1000;
  }
  // After 10PM (chat closed) — next open is tomorrow at 6PM WAT
  const msUntilMidnight = (24 * 60 - (hour * 60 + minute)) * 60 * 1000;
  const msFrom6amToOpen = 18 * 60 * 60 * 1000;
  return msUntilMidnight + msFrom6amToOpen;
}

// Build reaction summary: { "👍": 3, "😂": 1, ... } per message
async function getReactionsByMessageIds(messageIds: number[]): Promise<Record<number, Record<string, number>>> {
  if (messageIds.length === 0) return {};
  const rows = await db
    .select({
      messageId: chatMessageReactionsTable.messageId,
      emoji: chatMessageReactionsTable.emoji,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(chatMessageReactionsTable)
    .where(inArray(chatMessageReactionsTable.messageId, messageIds))
    .groupBy(chatMessageReactionsTable.messageId, chatMessageReactionsTable.emoji);

  const map: Record<number, Record<string, number>> = {};
  for (const row of rows) {
    if (!map[row.messageId]) map[row.messageId] = {};
    map[row.messageId][row.emoji] = row.count;
  }
  return map;
}

// Get the reactions a specific user has placed
async function getUserReactions(messageIds: number[], userId: string): Promise<Record<number, string>> {
  if (messageIds.length === 0 || !userId) return {};
  const rows = await db
    .select({ messageId: chatMessageReactionsTable.messageId, emoji: chatMessageReactionsTable.emoji })
    .from(chatMessageReactionsTable)
    .where(and(
      inArray(chatMessageReactionsTable.messageId, messageIds),
      eq(chatMessageReactionsTable.userId, userId),
    ));
  const map: Record<number, string> = {};
  for (const row of rows) map[row.messageId] = row.emoji;
  return map;
}

// ── GET /chat/status ──────────────────────────────────────────────────────────
router.get("/chat/status", (_req, res) => {
  const open = isChatOpen();
  res.json({ isOpen: open, msUntilOpen: open ? 0 : msUntilNextOpen() });
});

// ── GET /chat/messages ────────────────────────────────────────────────────────
router.get("/chat/messages", async (req, res) => {
  const { userId } = req.query as { userId?: string };

  const rows = await db
    .select({
      id: chatMessagesTable.id,
      userId: chatMessagesTable.userId,
      messageText: chatMessagesTable.messageText,
      replyToId: chatMessagesTable.replyToId,
      createdAt: chatMessagesTable.createdAt,
      senderName: usersTable.name,
    })
    .from(chatMessagesTable)
    .leftJoin(usersTable, eq(chatMessagesTable.userId, usersTable.id))
    .orderBy(chatMessagesTable.createdAt);

  if (rows.length === 0) { res.json([]); return; }

  const messageIds = rows.map((r) => r.id);
  const [reactionMap, userReactionMap] = await Promise.all([
    getReactionsByMessageIds(messageIds),
    userId ? getUserReactions(messageIds, userId) : Promise.resolve({} as Record<number, string>),
  ]);

  // Build a quick lookup for reply context
  const byId: Record<number, { senderName: string | null; messageText: string }> = {};
  for (const r of rows) byId[r.id] = { senderName: r.senderName, messageText: r.messageText };

  res.json(rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    replyTo: r.replyToId && byId[r.replyToId]
      ? { id: r.replyToId, senderName: byId[r.replyToId].senderName, messageText: byId[r.replyToId].messageText }
      : null,
    reactions: reactionMap[r.id] ?? {},
    myReaction: userReactionMap[r.id] ?? null,
  })));
});

// ── POST /chat/messages ───────────────────────────────────────────────────────
router.post("/chat/messages", async (req, res) => {
  if (!isChatOpen()) {
    res.status(403).json({ error: "Chat is closed. Come back at 6:00 PM WAT." });
    return;
  }
  const { userId, messageText, replyToId } = req.body as {
    userId?: string;
    messageText?: string;
    replyToId?: number | null;
  };
  if (!userId || !messageText?.trim()) {
    res.status(400).json({ error: "Missing userId or messageText" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.isBanned) { res.status(403).json({ error: "You have been banned from the chat room." }); return; }
  if (user.mutedUntil && user.mutedUntil > new Date()) {
    res.status(403).json({ error: `You are muted until ${user.mutedUntil.toISOString()}` });
    return;
  }

  // Validate replyToId if provided
  let validReplyToId: number | null = null;
  if (replyToId) {
    const [replied] = await db.select({ id: chatMessagesTable.id }).from(chatMessagesTable).where(eq(chatMessagesTable.id, replyToId));
    if (replied) validReplyToId = replied.id;
  }

  const [row] = await db.insert(chatMessagesTable).values({
    userId,
    messageText: messageText.trim().slice(0, 500),
    replyToId: validReplyToId,
  }).returning();

  res.status(201).json({
    ...row,
    createdAt: row.createdAt.toISOString(),
    senderName: user.name,
    replyTo: null,
    reactions: {},
    myReaction: null,
  });
});

// ── POST /chat/messages/:id/react ─────────────────────────────────────────────
router.post("/chat/messages/:id/react", async (req, res) => {
  const messageId = Number(req.params.id);
  const { userId, emoji } = req.body as { userId?: string; emoji?: string };
  if (!userId || !emoji) { res.status(400).json({ error: "Missing userId or emoji" }); return; }

  const allowed = ["👍", "😂", "😡"];
  if (!allowed.includes(emoji)) { res.status(400).json({ error: "Invalid emoji" }); return; }

  // Check if user already reacted
  const [existing] = await db
    .select()
    .from(chatMessageReactionsTable)
    .where(and(eq(chatMessageReactionsTable.messageId, messageId), eq(chatMessageReactionsTable.userId, userId)));

  if (existing) {
    if (existing.emoji === emoji) {
      // Toggle off — remove the reaction
      await db.delete(chatMessageReactionsTable).where(eq(chatMessageReactionsTable.id, existing.id));
      res.json({ ok: true, removed: true });
    } else {
      // Switch to new emoji
      await db.update(chatMessageReactionsTable).set({ emoji }).where(eq(chatMessageReactionsTable.id, existing.id));
      res.json({ ok: true, removed: false });
    }
    return;
  }

  await db.insert(chatMessageReactionsTable).values({ messageId, userId, emoji });
  res.status(201).json({ ok: true, removed: false });
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
  await db.delete(chatMessageReactionsTable).where(eq(chatMessageReactionsTable.messageId, id));
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
