import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const escrowRequestsTable = pgTable("escrow_requests", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  description: text("description").notNull(),
  amount: integer("amount").notNull().default(0),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
