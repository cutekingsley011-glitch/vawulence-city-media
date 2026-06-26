/**
 * Scheduled jobs — runs in process alongside the Express server.
 * Currently: send push notification at 6:00 PM WAT every day.
 */
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { isNotNull } from "drizzle-orm";
import { eq } from "drizzle-orm";
import webpush from "web-push";
import { logger } from "./lib/logger";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? "mailto:admin@vcm.ng",
  process.env.VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? "",
);

function watHour(date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  return parseInt(parts.find((p) => p.type === "hour")!.value);
}

function todayWatDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(date); // YYYY-MM-DD
}

let lastNotifiedDate = "";

async function sendChatOpenNotification() {
  const payload = JSON.stringify({
    title: "Chat Room is Live! 🔥",
    body: "Live chat is open now on Vawulence City Media — join the conversation!",
    url: "/chat",
    icon: "/vcm-icon.png",
  });

  const subscribers = await db
    .select({ id: usersTable.id, pushToken: usersTable.pushToken })
    .from(usersTable)
    .where(isNotNull(usersTable.pushToken));

  let sent = 0;
  for (const sub of subscribers) {
    try {
      await webpush.sendNotification(JSON.parse(sub.pushToken!), payload);
      sent++;
    } catch {
      await db.update(usersTable).set({ pushToken: null }).where(eq(usersTable.id, sub.id));
    }
  }
  logger.info({ sent, total: subscribers.length }, "Chat-open push notifications sent");
}

export function startScheduler() {
  // Check every minute
  setInterval(async () => {
    try {
      const now = new Date();
      const hour = watHour(now);
      const todayStr = todayWatDate(now);

      // Fire at exactly 18:xx WAT, once per day
      if (hour === 18 && lastNotifiedDate !== todayStr) {
        lastNotifiedDate = todayStr;
        await sendChatOpenNotification();
      }
    } catch (err) {
      logger.error({ err }, "Scheduler error");
    }
  }, 60_000);

  logger.info("Scheduler started — chat-open push fires daily at 6 PM WAT");
}
