import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const voteCardsTable = pgTable("vote_cards", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  imageUrl: text("image_url"),
  imageUrl2: text("image_url_2"),
  imageUrl3: text("image_url_3"),
  imageUrl4: text("image_url_4"),
  option1Label: text("option_1_label").notNull(),
  option2Label: text("option_2_label").notNull(),
  option3Label: text("option_3_label"),
  option4Label: text("option_4_label"),
  option1Count: integer("option_1_count").notNull().default(0),
  option2Count: integer("option_2_count").notNull().default(0),
  option3Count: integer("option_3_count"),
  option4Count: integer("option_4_count"),
  isActive: boolean("is_active").notNull().default(false),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type VoteCard = typeof voteCardsTable.$inferSelect;
