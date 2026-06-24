import { pgTable, serial, timestamp } from "drizzle-orm/pg-core";

export const siteVisitsTable = pgTable("site_visits", {
  id: serial("id").primaryKey(),
  visitedAt: timestamp("visited_at").notNull().defaultNow(),
});

export type SiteVisit = typeof siteVisitsTable.$inferSelect;
