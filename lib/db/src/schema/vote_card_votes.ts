import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { voteCardsTable } from "./vote_cards";

export const voteCardVotesTable = pgTable(
  "vote_card_votes",
  {
    id: serial("id").primaryKey(),
    voteCardId: integer("vote_card_id")
      .notNull()
      .references(() => voteCardsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    chosenOption: text("chosen_option").notNull(), // 'a' | 'b'
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("vote_card_votes_unique").on(t.voteCardId, t.userId)]
);

export type VoteCardVote = typeof voteCardVotesTable.$inferSelect;
