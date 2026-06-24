import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gistsTable = pgTable("gists", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  category: text("category").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
  publishedAt: timestamp("published_at"),
  publishAt: timestamp("publish_at"),
});

export const insertGistSchema = createInsertSchema(gistsTable).omit({ id: true, createdAt: true, publishedAt: true });
export type InsertGist = z.infer<typeof insertGistSchema>;
export type Gist = typeof gistsTable.$inferSelect;
