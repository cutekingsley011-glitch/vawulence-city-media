import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  commentCount: integer("comment_count").notNull().default(0),
  voteCount: integer("vote_count").notNull().default(0),
  totalPoints: integer("total_points").notNull().default(0),
  referredBy: text("referred_by"),
  isSubscriber: boolean("is_subscriber").notNull().default(false),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  pushToken: text("push_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
