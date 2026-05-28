import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const DOCUMENT_ITEMS = [
  { key: "tax_returns", label: "Tax returns" },
  { key: "pl_statement", label: "P&L" },
  { key: "utility_bills", label: "Utility bills" },
  { key: "lease", label: "Lease" },
  { key: "equipment_list", label: "Equipment list" },
  { key: "machine_age_report", label: "Machine age report" },
  { key: "card_system_reports", label: "Card system reports" },
  { key: "bank_statements", label: "Bank statements" },
  { key: "payroll_records", label: "Payroll records" },
  { key: "insurance", label: "Insurance" },
  { key: "repair_invoices", label: "Repair invoices" },
  { key: "water_bills", label: "Water bills" },
  { key: "gas_bills", label: "Gas bills" },
  { key: "electric_bills", label: "Electric bills" },
  { key: "sales_tax_filings", label: "Sales tax filings" },
  { key: "employee_schedule", label: "Employee schedule" },
  { key: "vendor_contracts", label: "Vendor contracts" },
  { key: "pos_card_login", label: "POS/card system login" },
  { key: "landlord_consent", label: "Landlord consent" },
  { key: "ucc_lien_search", label: "UCC/lien search" },
];

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  docKey: text("doc_key").notNull(),
  docLabel: text("doc_label").notNull(),
  status: text("status").notNull().default("Not requested"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({
  id: true,
  updatedAt: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
