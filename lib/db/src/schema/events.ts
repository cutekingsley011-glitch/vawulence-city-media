import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  venue: text("venue").notNull(),
  eventDate: timestamp("event_date").notNull(),
  restrictionTags: text("restriction_tags").array().default([]),
  isPaid: boolean("is_paid").default(false).notNull(),
  ticketPrice: integer("ticket_price"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ticketsTable = pgTable("tickets", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => eventsTable.id),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  ticketCode: text("ticket_code").notNull().unique(),
  sequenceNumber: integer("sequence_number").notNull(),
  paystackReference: text("paystack_reference").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
