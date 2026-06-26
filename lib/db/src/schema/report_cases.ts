import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const reportCasesTable = pgTable("report_cases", {
  id: serial("id").primaryKey(),
  caseText: text("case_text").notNull(),
  imageUrls: text("image_urls").array().notNull().default([]),
  status: text("status").notNull().default("pending"), // pending | approved | declined
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ReportCase = typeof reportCasesTable.$inferSelect;
