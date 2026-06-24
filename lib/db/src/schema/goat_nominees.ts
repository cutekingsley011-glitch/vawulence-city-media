import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { goatCategoriesTable } from "./goat_categories";

export const goatNomineesTable = pgTable("goat_nominees", {
  id: serial("id").primaryKey(),
  goatCategoryId: integer("goat_category_id")
    .notNull()
    .references(() => goatCategoriesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  photoUrl: text("photo_url"),
  description: text("description"),
  voteCount: integer("vote_count").notNull().default(0),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  submittedBy: text("submitted_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type GoatNominee = typeof goatNomineesTable.$inferSelect;
