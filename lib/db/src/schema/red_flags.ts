import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const RED_FLAG_ITEMS = [
  { key: "handwritten_financials", label: "Financials are handwritten" },
  { key: "cash_income_claim", label: "Seller claims cash income" },
  { key: "no_tax_returns", label: "No tax returns" },
  { key: "old_machines", label: "Old machines" },
  { key: "short_lease", label: "Short lease" },
  { key: "high_rent", label: "Rent above 20% of gross" },
  { key: "low_utilities", label: "Utilities look too low" },
  { key: "low_payroll", label: "Payroll looks too low" },
  { key: "owner_works_hours", label: "Owner works many hours" },
  { key: "no_card_data", label: "No card system data" },
  { key: "bad_reviews", label: "Bad reviews" },
  { key: "poor_visibility", label: "Poor location visibility" },
  { key: "weak_parking", label: "Weak parking" },
  { key: "equipment_eol", label: "Equipment near end of life" },
  { key: "landlord_approval", label: "Landlord approval uncertain" },
  { key: "seller_financing_refused", label: "Seller financing refused" },
  { key: "price_too_high", label: "Asking price too high" },
  { key: "no_reason_for_sale", label: "No clear reason for sale" },
  { key: "lease_assignment_unclear", label: "Lease assignment unclear" },
  { key: "revenue_declining", label: "Revenue declining" },
  { key: "strong_competition", label: "Competition nearby is stronger" },
];

export const redFlagsTable = pgTable("red_flags", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  flagKey: text("flag_key").notNull(),
  flagLabel: text("flag_label").notNull(),
  checked: boolean("checked").notNull().default(false),
});

export const insertRedFlagSchema = createInsertSchema(redFlagsTable).omit({
  id: true,
});

export type InsertRedFlag = z.infer<typeof insertRedFlagSchema>;
export type RedFlag = typeof redFlagsTable.$inferSelect;
