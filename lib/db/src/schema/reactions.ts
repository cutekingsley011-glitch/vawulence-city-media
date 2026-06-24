import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { postsTable } from "./posts";

export const reactionsTable = pgTable("reactions", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // like | laugh | shock | angry
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Reaction = typeof reactionsTable.$inferSelect;
