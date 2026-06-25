import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";

export const subscriptionPlansTable = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  durationDays: integer("duration_days").notNull(),
  price: integer("price").notNull(),
});
