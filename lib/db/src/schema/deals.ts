import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dealsTable = pgTable("deals", {
  id: serial("id").primaryKey(),
  dealName: text("deal_name").notNull(),
  businessName: text("business_name"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  assetType: text("asset_type").default("Laundromat"),
  source: text("source"),
  brokerId: integer("broker_id"),
  sellerName: text("seller_name"),
  askingPrice: numeric("asking_price", { precision: 14, scale: 2 }),
  grossRevenue: numeric("gross_revenue", { precision: 14, scale: 2 }),
  netIncome: numeric("net_income", { precision: 14, scale: 2 }),
  adjustedNetIncome: numeric("adjusted_net_income", { precision: 14, scale: 2 }),
  monthlyRent: numeric("monthly_rent", { precision: 14, scale: 2 }),
  leaseYearsRemaining: numeric("lease_years_remaining", { precision: 5, scale: 1 }),
  renewalOptions: text("renewal_options"),
  squareFootage: numeric("square_footage", { precision: 10, scale: 0 }),
  numWashers: integer("num_washers"),
  numDryers: integer("num_dryers"),
  machineBrand: text("machine_brand"),
  avgMachineAge: numeric("avg_machine_age", { precision: 5, scale: 1 }),
  cardOrCoin: text("card_or_coin"),
  washAndFold: boolean("wash_and_fold").default(false),
  pickupDelivery: boolean("pickup_delivery").default(false),
  commercialAccounts: boolean("commercial_accounts").default(false),
  hoursOfOperation: text("hours_of_operation"),
  staffCount: integer("staff_count"),
  ownerOperated: boolean("owner_operated").default(true),
  status: text("status").notNull().default("New Lead"),
  priority: text("priority").notNull().default("Medium"),
  nextAction: text("next_action"),
  nextActionDueDate: date("next_action_due_date"),
  lastContactedDate: date("last_contacted_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDealSchema = createInsertSchema(dealsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof dealsTable.$inferSelect;
