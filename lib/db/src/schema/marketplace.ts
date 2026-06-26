import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const marketplaceItemsTable = pgTable("marketplace_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  imageUrls: text("image_urls").array().notNull().default([]),
  category: text("category").notNull().default("General"),
  // status: available | sold | pending (user-submitted, awaiting admin approval)
  status: text("status").notNull().default("available"),
  // nullable — set when submitted by a community user (not admin)
  submittedByName: text("submitted_by_name"),
  submittedByEmail: text("submitted_by_email"),
  // Seller-provided product details
  howLongUsed: text("how_long_used"),
  location: text("location"),
  lastPrice: integer("last_price"),
  reasonForSale: text("reason_for_sale"),
  sellerWhatsapp: text("seller_whatsapp"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
