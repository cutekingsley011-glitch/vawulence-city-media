import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, isNotNull } from "drizzle-orm";
import webpush from "web-push";
import { z } from "zod";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? "mailto:admin@vcm.ng",
  process.env.VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? "",
);

const router = Router();

// POST /push/subscribe
router.post("/push/subscribe", async (req, res) => {
  const body = z.object({
    userId: z.string(),
    subscription: z.any(),
  }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid body" }); return; }
  await db.update(usersTable)
    .set({ pushToken: JSON.stringify(body.data.subscription) })
    .where(eq(usersTable.id, body.data.userId));
  res.json({ ok: true });
});

// POST /push/unsubscribe
router.post("/push/unsubscribe", async (req, res) => {
  const body = z.object({ userId: z.string() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid body" }); return; }
  await db.update(usersTable).set({ pushToken: null }).where(eq(usersTable.id, body.data.userId));
  res.json({ ok: true });
});

// POST /admin/push/send — broadcast to all subscribers
router.post("/admin/push/send", async (req, res) => {
  const body = z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    url: z.string().optional(),
  }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const subscribers = await db
    .select({ id: usersTable.id, pushToken: usersTable.pushToken })
    .from(usersTable)
    .where(isNotNull(usersTable.pushToken));

  const payload = JSON.stringify({
    title: body.data.title,
    body: body.data.body,
    url: body.data.url ?? "/",
    icon: "/vcm-icon.png",
  });

  let sent = 0;
  let failed = 0;
  for (const sub of subscribers) {
    try {
      await webpush.sendNotification(JSON.parse(sub.pushToken!), payload);
      sent++;
    } catch {
      // Subscription expired or invalid — clean it up
      await db.update(usersTable).set({ pushToken: null }).where(eq(usersTable.id, sub.id));
      failed++;
    }
  }

  res.json({ sent, failed, total: subscribers.length });
});

export default router;
