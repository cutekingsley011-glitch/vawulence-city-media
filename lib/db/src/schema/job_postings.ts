import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const jobPostingsTable = pgTable("job_postings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  companyName: text("company_name").notNull(),
  description: text("description").notNull(),
  flyerImageUrl: text("flyer_image_url"),
  requirements: text("requirements").array().notNull().default([]),
  applyMethod: text("apply_method").notNull().default("whatsapp"),
  applyContact: text("apply_contact").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
