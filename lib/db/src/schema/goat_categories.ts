import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const goatCategoriesTable = pgTable("goat_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type GoatCategory = typeof goatCategoriesTable.$inferSelect;
