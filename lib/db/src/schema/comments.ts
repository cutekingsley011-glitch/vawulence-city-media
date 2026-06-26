import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { postsTable } from "./posts";
import { voteCardsTable } from "./vote_cards";

export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => postsTable.id, { onDelete: "cascade" }),
  voteCardId: integer("vote_card_id").references(() => voteCardsTable.id, { onDelete: "cascade" }),
  reportCaseId: integer("report_case_id"),
  userId: text("user_id"),
  userName: text("user_name"),
  parentCommentId: integer("parent_comment_id"),
  content: text("content").notNull(),
  likeCount: integer("like_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Comment = typeof commentsTable.$inferSelect;
