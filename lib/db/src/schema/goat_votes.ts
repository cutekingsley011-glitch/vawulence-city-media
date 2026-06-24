import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { goatCategoriesTable } from "./goat_categories";
import { goatNomineesTable } from "./goat_nominees";

export const goatVotesTable = pgTable(
  "goat_votes",
  {
    id: serial("id").primaryKey(),
    goatCategoryId: integer("goat_category_id")
      .notNull()
      .references(() => goatCategoriesTable.id, { onDelete: "cascade" }),
    nomineeId: integer("nominee_id")
      .notNull()
      .references(() => goatNomineesTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("goat_votes_unique").on(t.goatCategoryId, t.userId)]
);

export type GoatVote = typeof goatVotesTable.$inferSelect;
