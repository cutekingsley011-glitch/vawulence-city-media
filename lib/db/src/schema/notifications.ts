import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // 'reply' | 'like'
  actorName: text("actor_name").notNull(),
  targetCommentId: integer("target_comment_id"),
  targetPostId: integer("target_post_id"),
  targetVoteCardId: integer("target_vote_card_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
