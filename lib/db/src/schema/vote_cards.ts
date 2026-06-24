import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const voteCardsTable = pgTable("vote_cards", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  imageUrl: text("image_url"),
  imageUrl2: text("image_url_2"),
  optionALabel: text("option_a_label").notNull(),
  optionBLabel: text("option_b_label").notNull(),
  optionACount: integer("option_a_count").notNull().default(0),
  optionBCount: integer("option_b_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type VoteCard = typeof voteCardsTable.$inferSelect;
