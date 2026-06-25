import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  type: text("type").notNull(),
  referenceId: text("reference_id"),
  referenceLabel: text("reference_label"),
  baseAmount: integer("base_amount").notNull(),
  serviceFee: integer("service_fee").notNull().default(50000),
  totalAmount: integer("total_amount").notNull(),
  paystackReference: text("paystack_reference").notNull().unique(),
  status: text("status").notNull().default("success"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
