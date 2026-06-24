import { pgTable, serial, text, boolean } from "drizzle-orm/pg-core";

export const breakingNewsTable = pgTable("breaking_news", {
  id: serial("id").primaryKey(),
  text: text("text").notNull().default(""),
  enabled: boolean("enabled").notNull().default(false),
});

export type BreakingNews = typeof breakingNewsTable.$inferSelect;
