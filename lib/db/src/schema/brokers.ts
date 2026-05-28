import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const brokersTable = pgTable("brokers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  market: text("market"),
  specialty: text("specialty"),
  brokerType: text("broker_type"),
  relationshipStrength: text("relationship_strength").default("Cold"),
  trustRating: integer("trust_rating"),
  responsivenessRating: integer("responsiveness_rating"),
  dealQualityRating: integer("deal_quality_rating"),
  firstContactedDate: date("first_contacted_date"),
  lastContactedDate: date("last_contacted_date"),
  nextFollowUpDate: date("next_follow_up_date"),
  notes: text("notes"),
  tags: text("tags"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBrokerSchema = createInsertSchema(brokersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBroker = z.infer<typeof insertBrokerSchema>;
export type Broker = typeof brokersTable.$inferSelect;
