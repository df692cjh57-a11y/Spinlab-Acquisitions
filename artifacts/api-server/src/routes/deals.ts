import { Router } from "express";
import { db } from "@workspace/db";
import {
  dealsTable,
  redFlagsTable,
  documentsTable,
  brokersTable,
  RED_FLAG_ITEMS,
  DOCUMENT_ITEMS,
} from "@workspace/db";
import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";
import {
  ListDealsQueryParams,
  CreateDealBody,
  UpdateDealBody,
  UpdateDealRedFlagsBody,
} from "@workspace/api-zod";

const router = Router();

// ─── Numeric field names that must be stored as strings in Drizzle numeric cols ──
const NUMERIC_FIELDS = new Set([
  "askingPrice", "grossRevenue", "netIncome", "sellerClaimedNetIncome",
  "adjustedNetIncome", "targetMultiple",
  "washFoldRevenue", "pickupDeliveryRevenue", "commercialRevenue",
  "vendingRevenue", "otherRevenue",
  "payroll", "monthlyRent", "water", "gas", "electric", "insurance",
  "repairsMaintenance", "supplies", "merchantFees", "softwareFees",
  "marketing", "cleaning", "accounting", "licensesPermits", "otherExpenses",
  "adjustedPayroll", "replacementManagerSalary", "capexReserve",
  "maintenanceReserve", "otherBuyerAdjustments",
  "squareFootage", "leaseYearsRemaining",
  "downPaymentPercent", "interestRate", "loanTermYears", "amortizationYears",
  "closingCostPercent", "sbaFees", "workingCapitalReserve", "capexBudget",
  "sellerFinancingAmount", "sellerFinancingInterestRate",
  "sellerFinancingAmortizationYears",
  "avgMachineAge", "averageWasherReplacementCost", "averageDryerReplacementCost",
  "percentMachinesNeedingReplacement", "installationBudget", "capexContingencyPercent",
  "washFoldRevenueIncrease", "pickupDeliveryRevenueIncrease",
  "commercialRevenueIncrease", "priceIncreasePercent",
  "hoursExpansionRevenueIncrease", "laborSavings", "utilitySavings", "otherUpside",
]);

/** Convert a number → string for Drizzle numeric columns; null/undefined pass through. */
function numStr(v: number | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return String(v);
}

/** Parse a Drizzle numeric string back to number | null for API responses. */
function n(v: string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const f = parseFloat(v);
  return isFinite(f) ? f : null;
}

function calcAskingMultiple(askingPrice: string | null, adjustedNetIncome: string | null): number | null {
  const p = parseFloat(askingPrice ?? "");
  const ni = parseFloat(adjustedNetIncome ?? "");
  if (!p || !ni) return null;
  return Math.round((p / ni) * 100) / 100;
}

function calcRentAsPercentGross(annualRent: number | null, grossRevenue: string | null): number | null {
  const g = parseFloat(grossRevenue ?? "");
  if (!annualRent || !g) return null;
  return Math.round((annualRent / g) * 10000) / 100;
}

function calcDealScore(deal: typeof dealsTable.$inferSelect, redFlagScore: number): number {
  let score = 50;
  score -= redFlagScore * 3;
  const multiple = calcAskingMultiple(deal.askingPrice, deal.adjustedNetIncome);
  if (multiple !== null) {
    if (multiple < 2.5) score += 10;
    else if (multiple < 3.5) score += 5;
    else if (multiple > 5) score -= 10;
  }
  const annualRent = deal.monthlyRent ? parseFloat(deal.monthlyRent) * 12 : null;
  const rentPct = calcRentAsPercentGross(annualRent, deal.grossRevenue);
  if (rentPct !== null) {
    if (rentPct < 15) score += 10;
    else if (rentPct < 20) score += 5;
    else if (rentPct > 25) score -= 10;
  }
  const leaseYears = deal.leaseYearsRemaining ? parseFloat(deal.leaseYearsRemaining) : null;
  if (leaseYears !== null) {
    if (leaseYears >= 10) score += 10;
    else if (leaseYears >= 5) score += 5;
    else score -= 10;
  }
  const machineAge = deal.avgMachineAge ? parseFloat(deal.avgMachineAge) : null;
  if (machineAge !== null) {
    if (machineAge < 5) score += 5;
    else if (machineAge > 10) score -= 5;
  }
  if (deal.washAndFold) score += 3;
  if (deal.pickupDelivery) score += 3;
  if (deal.commercialAccounts) score += 3;
  return Math.max(0, Math.min(100, score));
}

function getDealQuality(score: number): string {
  if (score >= 80) return "Strong Target";
  if (score >= 60) return "Worth Underwriting";
  if (score >= 40) return "Maybe";
  return "Weak";
}

function getRedFlagLevel(score: number): string {
  if (score <= 2) return "Clean";
  if (score <= 5) return "Caution";
  if (score <= 8) return "High Risk";
  return "Dangerous";
}

async function enrichDeal(deal: typeof dealsTable.$inferSelect) {
  const annualRent = deal.monthlyRent ? parseFloat(deal.monthlyRent) * 12 : null;
  const rentPerSqFt =
    annualRent && deal.squareFootage
      ? Math.round((annualRent / parseFloat(deal.squareFootage)) * 100) / 100
      : null;

  const flags = await db
    .select()
    .from(redFlagsTable)
    .where(eq(redFlagsTable.dealId, deal.id));
  const redFlagScore = flags.filter((f) => f.checked).length;

  let brokerName: string | null = null;
  if (deal.brokerId) {
    const [broker] = await db
      .select({ name: brokersTable.name })
      .from(brokersTable)
      .where(eq(brokersTable.id, deal.brokerId));
    brokerName = broker?.name ?? null;
  }

  const dealScore = calcDealScore(deal, redFlagScore);

  return {
    ...deal,
    brokerName,
    annualRent,
    rentPerSqFt,
    // ── Basic financials ────────────────────────────────────────────────────
    askingPrice:               n(deal.askingPrice),
    grossRevenue:              n(deal.grossRevenue),
    netIncome:                 n(deal.netIncome),
    sellerClaimedNetIncome:    n(deal.sellerClaimedNetIncome),
    adjustedNetIncome:         n(deal.adjustedNetIncome),
    targetMultiple:            n(deal.targetMultiple),
    // ── Revenue detail ──────────────────────────────────────────────────────
    washFoldRevenue:           n(deal.washFoldRevenue),
    pickupDeliveryRevenue:     n(deal.pickupDeliveryRevenue),
    commercialRevenue:         n(deal.commercialRevenue),
    vendingRevenue:            n(deal.vendingRevenue),
    otherRevenue:              n(deal.otherRevenue),
    // ── Expense detail ──────────────────────────────────────────────────────
    payroll:                   n(deal.payroll),
    monthlyRent:               n(deal.monthlyRent),
    water:                     n(deal.water),
    gas:                       n(deal.gas),
    electric:                  n(deal.electric),
    insurance:                 n(deal.insurance),
    repairsMaintenance:        n(deal.repairsMaintenance),
    supplies:                  n(deal.supplies),
    merchantFees:              n(deal.merchantFees),
    softwareFees:              n(deal.softwareFees),
    marketing:                 n(deal.marketing),
    cleaning:                  n(deal.cleaning),
    accounting:                n(deal.accounting),
    licensesPermits:           n(deal.licensesPermits),
    otherExpenses:             n(deal.otherExpenses),
    // ── Buyer adjustments ───────────────────────────────────────────────────
    adjustedPayroll:           n(deal.adjustedPayroll),
    replacementManagerSalary:  n(deal.replacementManagerSalary),
    capexReserve:              n(deal.capexReserve),
    maintenanceReserve:        n(deal.maintenanceReserve),
    otherBuyerAdjustments:     n(deal.otherBuyerAdjustments),
    // ── Real estate / lease ─────────────────────────────────────────────────
    squareFootage:             n(deal.squareFootage),
    leaseYearsRemaining:       n(deal.leaseYearsRemaining),
    // ── Financing ───────────────────────────────────────────────────────────
    downPaymentPercent:              n(deal.downPaymentPercent),
    interestRate:                    n(deal.interestRate),
    loanTermYears:                   n(deal.loanTermYears),
    amortizationYears:               n(deal.amortizationYears),
    closingCostPercent:              n(deal.closingCostPercent),
    sbaFees:                         n(deal.sbaFees),
    workingCapitalReserve:           n(deal.workingCapitalReserve),
    capexBudget:                     n(deal.capexBudget),
    sellerFinancingAmount:           n(deal.sellerFinancingAmount),
    sellerFinancingInterestRate:     n(deal.sellerFinancingInterestRate),
    sellerFinancingAmortizationYears: n(deal.sellerFinancingAmortizationYears),
    // ── Equipment ───────────────────────────────────────────────────────────
    avgMachineAge:                       n(deal.avgMachineAge),
    averageWasherReplacementCost:        n(deal.averageWasherReplacementCost),
    averageDryerReplacementCost:         n(deal.averageDryerReplacementCost),
    percentMachinesNeedingReplacement:   n(deal.percentMachinesNeedingReplacement),
    installationBudget:                  n(deal.installationBudget),
    capexContingencyPercent:             n(deal.capexContingencyPercent),
    // ── Upside ──────────────────────────────────────────────────────────────
    washFoldRevenueIncrease:       n(deal.washFoldRevenueIncrease),
    pickupDeliveryRevenueIncrease: n(deal.pickupDeliveryRevenueIncrease),
    commercialRevenueIncrease:     n(deal.commercialRevenueIncrease),
    priceIncreasePercent:          n(deal.priceIncreasePercent),
    hoursExpansionRevenueIncrease: n(deal.hoursExpansionRevenueIncrease),
    laborSavings:                  n(deal.laborSavings),
    utilitySavings:                n(deal.utilitySavings),
    otherUpside:                   n(deal.otherUpside),
    // ── Computed ────────────────────────────────────────────────────────────
    askingMultiple: calcAskingMultiple(deal.askingPrice, deal.adjustedNetIncome),
    rentAsPercentGross: calcRentAsPercentGross(annualRent, deal.grossRevenue),
    redFlagScore,
    redFlagLevel: getRedFlagLevel(redFlagScore),
    dealScore,
    dealQuality: getDealQuality(dealScore),
    createdAt: deal.createdAt.toISOString(),
    updatedAt: deal.updatedAt.toISOString(),
    deletedAt: deal.deletedAt?.toISOString() ?? null,
    archivedAt: deal.archivedAt?.toISOString() ?? null,
  };
}

async function initDealRedFlags(dealId: number) {
  const existing = await db
    .select()
    .from(redFlagsTable)
    .where(eq(redFlagsTable.dealId, dealId));
  if (existing.length > 0) return;
  await db.insert(redFlagsTable).values(
    RED_FLAG_ITEMS.map((item) => ({
      dealId,
      flagKey: item.key,
      flagLabel: item.label,
      checked: false,
    }))
  );
}

async function initDealDocuments(dealId: number) {
  const existing = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.dealId, dealId));
  if (existing.length > 0) return;
  await db.insert(documentsTable).values(
    DOCUMENT_ITEMS.map((item) => ({
      dealId,
      docKey: item.key,
      docLabel: item.label,
      status: "Not requested",
    }))
  );
}

/** Build an insert/update payload, converting all numeric fields to strings for Drizzle. */
function toDbValues(body: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(body)) {
    if (val === undefined) continue;
    if (NUMERIC_FIELDS.has(key)) {
      result[key] = val === null ? null : String(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

// GET /deals — active only (not deleted, not archived)
router.get("/deals", async (req, res) => {
  try {
    const params = ListDealsQueryParams.parse(req.query);
    let deals = await db
      .select()
      .from(dealsTable)
      .where(and(isNull(dealsTable.deletedAt), isNull(dealsTable.archivedAt)))
      .orderBy(desc(dealsTable.createdAt));

    if (params.status) deals = deals.filter((d) => d.status === params.status);
    if (params.priority) deals = deals.filter((d) => d.priority === params.priority);
    if (params.brokerId) deals = deals.filter((d) => d.brokerId === Number(params.brokerId));
    if (params.city) deals = deals.filter((d) => d.city?.toLowerCase().includes(params.city!.toLowerCase()));
    if (params.state) deals = deals.filter((d) => d.state?.toLowerCase() === params.state!.toLowerCase());
    if (params.hotOnly) deals = deals.filter((d) => d.priority === "Hot");
    if (params.deadOnly) deals = deals.filter((d) => d.status === "Dead Deal");
    if (params.search) {
      const s = params.search.toLowerCase();
      deals = deals.filter(
        (d) =>
          d.dealName.toLowerCase().includes(s) ||
          d.businessName?.toLowerCase().includes(s) ||
          d.city?.toLowerCase().includes(s)
      );
    }
    const today = new Date().toISOString().split("T")[0];
    if (params.followUpToday)
      deals = deals.filter((d) => d.nextActionDueDate === today);
    if (params.overdueOnly)
      deals = deals.filter((d) => d.nextActionDueDate && d.nextActionDueDate < today);

    const enriched = await Promise.all(deals.map(enrichDeal));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /deals/deleted — soft-deleted deals
router.get("/deals/deleted", async (req, res) => {
  try {
    const deals = await db
      .select()
      .from(dealsTable)
      .where(isNotNull(dealsTable.deletedAt))
      .orderBy(desc(dealsTable.deletedAt));
    const enriched = await Promise.all(deals.map(enrichDeal));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /deals/archived — archived deals
router.get("/deals/archived", async (req, res) => {
  try {
    const deals = await db
      .select()
      .from(dealsTable)
      .where(and(isNotNull(dealsTable.archivedAt), isNull(dealsTable.deletedAt)))
      .orderBy(desc(dealsTable.archivedAt));
    const enriched = await Promise.all(deals.map(enrichDeal));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /deals
router.post("/deals", async (req, res) => {
  try {
    const body = CreateDealBody.parse(req.body);
    const values = toDbValues(body as Record<string, unknown>);
    const [deal] = await db
      .insert(dealsTable)
      .values({ ...values, updatedAt: new Date() } as typeof dealsTable.$inferInsert)
      .returning();
    await initDealRedFlags(deal.id);
    await initDealDocuments(deal.id);
    const enriched = await enrichDeal(deal);
    res.status(201).json(enriched);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// GET /deals/:id
router.get("/deals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deal] = await db.select().from(dealsTable).where(eq(dealsTable.id, id));
    if (!deal) res.status(404).json({ error: "Not found" }); return;
    await initDealRedFlags(deal.id);
    await initDealDocuments(deal.id);
    const enriched = await enrichDeal(deal);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /deals/:id
router.patch("/deals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = UpdateDealBody.parse(req.body);
    const updateData = {
      ...toDbValues(body as Record<string, unknown>),
      updatedAt: new Date(),
    };

    const [deal] = await db
      .update(dealsTable)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set(updateData as any)
      .where(eq(dealsTable.id, id))
      .returning();
    if (!deal) res.status(404).json({ error: "Not found" }); return;
    const enriched = await enrichDeal(deal);
    res.json(enriched);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// DELETE /deals/:id — soft delete
router.delete("/deals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deal] = await db
      .update(dealsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(dealsTable.id, id))
      .returning();
    if (!deal) res.status(404).json({ error: "Not found" }); return;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /deals/:id/archive
router.post("/deals/:id/archive", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deal] = await db
      .update(dealsTable)
      .set({ archivedAt: new Date(), deletedAt: null, updatedAt: new Date() })
      .where(eq(dealsTable.id, id))
      .returning();
    if (!deal) res.status(404).json({ error: "Not found" }); return;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /deals/:id/restore
router.post("/deals/:id/restore", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deal] = await db
      .update(dealsTable)
      .set({ deletedAt: null, archivedAt: null, updatedAt: new Date() })
      .where(eq(dealsTable.id, id))
      .returning();
    if (!deal) res.status(404).json({ error: "Not found" }); return;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /deals/:id/permanent — hard delete
router.delete("/deals/:id/permanent", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(redFlagsTable).where(eq(redFlagsTable.dealId, id));
    await db.delete(documentsTable).where(eq(documentsTable.dealId, id));
    await db.delete(dealsTable).where(eq(dealsTable.id, id));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /deals/:id/red-flags
router.get("/deals/:id/red-flags", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await initDealRedFlags(id);
    const flags = await db
      .select()
      .from(redFlagsTable)
      .where(eq(redFlagsTable.dealId, id));
    res.json(flags);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT /deals/:id/red-flags
router.put("/deals/:id/red-flags", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = UpdateDealRedFlagsBody.parse(req.body);
    for (const flag of body.flags) {
      await db
        .update(redFlagsTable)
        .set({ checked: flag.checked })
        .where(
          and(eq(redFlagsTable.dealId, id), eq(redFlagsTable.flagKey, flag.flagKey))
        );
    }
    await db.update(dealsTable).set({ updatedAt: new Date() }).where(eq(dealsTable.id, id));
    const flags = await db
      .select()
      .from(redFlagsTable)
      .where(eq(redFlagsTable.dealId, id));
    res.json(flags);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;
