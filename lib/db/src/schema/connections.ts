import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const connectionsTable = pgTable("connections", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  ageBracket: text("age_bracket").notNull(),
  state: text("state").notNull(),
  photoUrl: text("photo_url"),
  lookingFor: text("looking_for").notNull(),
  bioText: text("bio_text").notNull(),
  consentGiven: boolean("consent_given").notNull().default(false),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
