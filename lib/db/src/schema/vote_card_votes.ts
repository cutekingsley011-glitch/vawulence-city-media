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
    chosenOption: integer("chosen_option").notNull(), // 1 | 2 | 3 | 4
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("vote_card_votes_unique").on(t.voteCardId, t.userId)]
);

export type VoteCardVote = typeof voteCardVotesTable.$inferSelect;
