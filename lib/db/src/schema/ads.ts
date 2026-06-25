import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const adsTable = pgTable("ads", {
  id: serial("id").primaryKey(),
  advertiserName: text("advertiser_name").notNull(),
  contactInfo: text("contact_info").notNull(),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"),
  durationTier: text("duration_tier").notNull(),
  price: integer("price").notNull(),
  status: text("status").notNull().default("under_review"),
  paystackReference: text("paystack_reference").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const adSettingsTable = pgTable("ad_settings", {
  id: serial("id").primaryKey(),
  tier: text("tier").notNull().unique(),
  price: integer("price").notNull(),
});
