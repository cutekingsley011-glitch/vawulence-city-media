import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const marketplaceItemsTable = pgTable("marketplace_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  imageUrls: text("image_urls").array().notNull().default([]),
  category: text("category").notNull().default("General"),
  status: text("status").notNull().default("available"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
