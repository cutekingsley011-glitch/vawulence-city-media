import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const spillMessagesTable = pgTable("spill_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  messageText: text("message_text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSpillMessageSchema = createInsertSchema(spillMessagesTable).omit({ id: true, createdAt: true });
export type InsertSpillMessage = z.infer<typeof insertSpillMessageSchema>;
export type SpillMessage = typeof spillMessagesTable.$inferSelect;
