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

  // ── Basic Financials ──────────────────────────────────────────────────────
  askingPrice: numeric("asking_price", { precision: 14, scale: 2 }),
  grossRevenue: numeric("gross_revenue", { precision: 14, scale: 2 }),
  netIncome: numeric("net_income", { precision: 14, scale: 2 }),          // seller-claimed
  sellerClaimedNetIncome: numeric("seller_claimed_net_income", { precision: 14, scale: 2 }),
  adjustedNetIncome: numeric("adjusted_net_income", { precision: 14, scale: 2 }),  // manual adjusted SDE override
  targetMultiple: numeric("target_multiple", { precision: 5, scale: 2 }).default("3.5"),

  // ── Revenue Detail ────────────────────────────────────────────────────────
  washFoldRevenue: numeric("wash_fold_revenue", { precision: 14, scale: 2 }),
  pickupDeliveryRevenue: numeric("pickup_delivery_revenue", { precision: 14, scale: 2 }),
  commercialRevenue: numeric("commercial_revenue", { precision: 14, scale: 2 }),
  vendingRevenue: numeric("vending_revenue", { precision: 14, scale: 2 }),
  otherRevenue: numeric("other_revenue", { precision: 14, scale: 2 }),

  // ── Expense Detail ────────────────────────────────────────────────────────
  payroll: numeric("payroll", { precision: 14, scale: 2 }),
  monthlyRent: numeric("monthly_rent", { precision: 14, scale: 2 }),
  water: numeric("water", { precision: 14, scale: 2 }),
  gas: numeric("gas", { precision: 14, scale: 2 }),
  electric: numeric("electric", { precision: 14, scale: 2 }),
  insurance: numeric("insurance", { precision: 14, scale: 2 }),
  repairsMaintenance: numeric("repairs_maintenance", { precision: 14, scale: 2 }),
  supplies: numeric("supplies", { precision: 14, scale: 2 }),
  merchantFees: numeric("merchant_fees", { precision: 14, scale: 2 }),
  softwareFees: numeric("software_fees", { precision: 14, scale: 2 }),
  marketing: numeric("marketing", { precision: 14, scale: 2 }),
  cleaning: numeric("cleaning", { precision: 14, scale: 2 }),
  accounting: numeric("accounting", { precision: 14, scale: 2 }),
  licensesPermits: numeric("licenses_permits", { precision: 14, scale: 2 }),
  otherExpenses: numeric("other_expenses", { precision: 14, scale: 2 }),

  // ── Buyer Adjustments ─────────────────────────────────────────────────────
  adjustedPayroll: numeric("adjusted_payroll", { precision: 14, scale: 2 }),
  replacementManagerSalary: numeric("replacement_manager_salary", { precision: 14, scale: 2 }),
  capexReserve: numeric("capex_reserve", { precision: 14, scale: 2 }),
  maintenanceReserve: numeric("maintenance_reserve", { precision: 14, scale: 2 }),
  otherBuyerAdjustments: numeric("other_buyer_adjustments", { precision: 14, scale: 2 }),

  // ── Real Estate / Lease ───────────────────────────────────────────────────
  squareFootage: numeric("square_footage", { precision: 10, scale: 0 }),
  leaseYearsRemaining: numeric("lease_years_remaining", { precision: 5, scale: 1 }),
  renewalOptions: text("renewal_options"),
  realEstateIncluded: boolean("real_estate_included").default(false),

  // ── Financing ─────────────────────────────────────────────────────────────
  downPaymentPercent: numeric("down_payment_percent", { precision: 5, scale: 2 }).default("10"),
  interestRate: numeric("interest_rate", { precision: 5, scale: 2 }).default("10"),
  loanTermYears: numeric("loan_term_years", { precision: 5, scale: 1 }).default("10"),
  amortizationYears: numeric("amortization_years", { precision: 5, scale: 1 }).default("10"),
  closingCostPercent: numeric("closing_cost_percent", { precision: 5, scale: 2 }).default("3"),
  sbaFees: numeric("sba_fees", { precision: 14, scale: 2 }),
  workingCapitalReserve: numeric("working_capital_reserve", { precision: 14, scale: 2 }),
  capexBudget: numeric("capex_budget", { precision: 14, scale: 2 }),
  sellerFinancingAmount: numeric("seller_financing_amount", { precision: 14, scale: 2 }),
  sellerFinancingInterestRate: numeric("seller_financing_interest_rate", { precision: 5, scale: 2 }),
  sellerFinancingAmortizationYears: numeric("seller_financing_amortization_years", { precision: 5, scale: 1 }),

  // ── Equipment ─────────────────────────────────────────────────────────────
  numWashers: integer("num_washers"),
  numDryers: integer("num_dryers"),
  machineBrand: text("machine_brand"),
  avgMachineAge: numeric("avg_machine_age", { precision: 5, scale: 1 }),
  averageWasherReplacementCost: numeric("average_washer_replacement_cost", { precision: 14, scale: 2 }).default("8000"),
  averageDryerReplacementCost: numeric("average_dryer_replacement_cost", { precision: 14, scale: 2 }).default("5000"),
  percentMachinesNeedingReplacement: numeric("percent_machines_needing_replacement", { precision: 5, scale: 2 }),
  installationBudget: numeric("installation_budget", { precision: 14, scale: 2 }),
  capexContingencyPercent: numeric("capex_contingency_percent", { precision: 5, scale: 2 }).default("10"),

  // ── Upside ────────────────────────────────────────────────────────────────
  washFoldRevenueIncrease: numeric("wash_fold_revenue_increase", { precision: 14, scale: 2 }),
  pickupDeliveryRevenueIncrease: numeric("pickup_delivery_revenue_increase", { precision: 14, scale: 2 }),
  commercialRevenueIncrease: numeric("commercial_revenue_increase", { precision: 14, scale: 2 }),
  priceIncreasePercent: numeric("price_increase_percent", { precision: 5, scale: 2 }),
  hoursExpansionRevenueIncrease: numeric("hours_expansion_revenue_increase", { precision: 14, scale: 2 }),
  laborSavings: numeric("labor_savings", { precision: 14, scale: 2 }),
  utilitySavings: numeric("utility_savings", { precision: 14, scale: 2 }),
  otherUpside: numeric("other_upside", { precision: 14, scale: 2 }),

  // ── Operations ────────────────────────────────────────────────────────────
  cardOrCoin: text("card_or_coin"),
  washAndFold: boolean("wash_and_fold").default(false),
  pickupDelivery: boolean("pickup_delivery").default(false),
  commercialAccounts: boolean("commercial_accounts").default(false),
  hoursOfOperation: text("hours_of_operation"),
  staffCount: integer("staff_count"),
  ownerOperated: boolean("owner_operated").default(true),

  // ── Deal Management ───────────────────────────────────────────────────────
  status: text("status").notNull().default("New Lead"),
  priority: text("priority").notNull().default("Medium"),
  nextAction: text("next_action"),
  nextActionDueDate: date("next_action_due_date"),
  lastContactedDate: date("last_contacted_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
  archivedAt: timestamp("archived_at"),
});

export const insertDealSchema = createInsertSchema(dealsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof dealsTable.$inferSelect;
