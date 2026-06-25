import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const contestsTable = pgTable("contests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  entryFee: integer("entry_fee").notNull(),
  maxEntrants: integer("max_entrants").notNull(),
  currentEntrants: integer("current_entrants").default(0).notNull(),
  options: text("options").array(),
  status: text("status").notNull().default("open"),
  hostCutPercentage: integer("host_cut_percentage").notNull().default(10),
  closesAt: timestamp("closes_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contestEntriesTable = pgTable("contest_entries", {
  id: serial("id").primaryKey(),
  contestId: integer("contest_id").references(() => contestsTable.id),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  predictionOrNomineeChoice: text("prediction_or_nominee_choice"),
  paystackReference: text("paystack_reference").notNull(),
  paidAt: timestamp("paid_at").defaultNow().notNull(),
  isWinner: boolean("is_winner"),
});
