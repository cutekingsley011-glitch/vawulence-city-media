import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const spillSessionsTable = pgTable("spill_sessions", {
  id: serial("id").primaryKey(),
  questionText: text("question_text").notNull(),
  scheduledTime: timestamp("scheduled_time"),
  isLive: boolean("is_live").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSpillSessionSchema = createInsertSchema(spillSessionsTable).omit({ id: true, createdAt: true });
export type InsertSpillSession = z.infer<typeof insertSpillSessionSchema>;
export type SpillSession = typeof spillSessionsTable.$inferSelect;
