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
import { eq, and, lte, sql, desc } from "drizzle-orm";
import {
  ListDealsQueryParams,
  CreateDealBody,
  UpdateDealBody,
  UpdateDealRedFlagsBody,
} from "@workspace/api-zod";

const router = Router();

function calcAskingMultiple(askingPrice: string | null, adjustedNetIncome: string | null): number | null {
  const p = parseFloat(askingPrice ?? "");
  const n = parseFloat(adjustedNetIncome ?? "");
  if (!p || !n) return null;
  return Math.round((p / n) * 100) / 100;
}

function calcRentAsPercentGross(annualRent: number | null, grossRevenue: string | null): number | null {
  const g = parseFloat(grossRevenue ?? "");
  if (!annualRent || !g) return null;
  return Math.round((annualRent / g) * 10000) / 100;
}

function calcDealScore(deal: typeof dealsTable.$inferSelect, redFlagScore: number): number {
  let score = 50;
  // Red flag penalty
  score -= redFlagScore * 3;
  // Asking multiple
  const multiple = calcAskingMultiple(deal.askingPrice, deal.adjustedNetIncome);
  if (multiple !== null) {
    if (multiple < 2.5) score += 10;
    else if (multiple < 3.5) score += 5;
    else if (multiple > 5) score -= 10;
  }
  // Rent as % of gross
  const annualRent = deal.monthlyRent ? parseFloat(deal.monthlyRent) * 12 : null;
  const rentPct = calcRentAsPercentGross(annualRent, deal.grossRevenue);
  if (rentPct !== null) {
    if (rentPct < 15) score += 10;
    else if (rentPct < 20) score += 5;
    else if (rentPct > 25) score -= 10;
  }
  // Lease years
  const leaseYears = deal.leaseYearsRemaining ? parseFloat(deal.leaseYearsRemaining) : null;
  if (leaseYears !== null) {
    if (leaseYears >= 10) score += 10;
    else if (leaseYears >= 5) score += 5;
    else score -= 10;
  }
  // Machine age
  const machineAge = deal.avgMachineAge ? parseFloat(deal.avgMachineAge) : null;
  if (machineAge !== null) {
    if (machineAge < 5) score += 5;
    else if (machineAge > 10) score -= 5;
  }
  // Upside
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

  // Get red flag score
  const flags = await db
    .select()
    .from(redFlagsTable)
    .where(eq(redFlagsTable.dealId, deal.id));
  const redFlagScore = flags.filter((f) => f.checked).length;

  // Get broker name
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
    askingPrice: deal.askingPrice ? parseFloat(deal.askingPrice) : null,
    grossRevenue: deal.grossRevenue ? parseFloat(deal.grossRevenue) : null,
    netIncome: deal.netIncome ? parseFloat(deal.netIncome) : null,
    adjustedNetIncome: deal.adjustedNetIncome ? parseFloat(deal.adjustedNetIncome) : null,
    monthlyRent: deal.monthlyRent ? parseFloat(deal.monthlyRent) : null,
    leaseYearsRemaining: deal.leaseYearsRemaining ? parseFloat(deal.leaseYearsRemaining) : null,
    squareFootage: deal.squareFootage ? parseFloat(deal.squareFootage) : null,
    avgMachineAge: deal.avgMachineAge ? parseFloat(deal.avgMachineAge) : null,
    askingMultiple: calcAskingMultiple(deal.askingPrice, deal.adjustedNetIncome),
    rentAsPercentGross: calcRentAsPercentGross(annualRent, deal.grossRevenue),
    redFlagScore,
    redFlagLevel: getRedFlagLevel(redFlagScore),
    dealScore,
    dealQuality: getDealQuality(dealScore),
    createdAt: deal.createdAt.toISOString(),
    updatedAt: deal.updatedAt.toISOString(),
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

// GET /deals
router.get("/deals", async (req, res) => {
  try {
    const params = ListDealsQueryParams.parse(req.query);
    let deals = await db.select().from(dealsTable).orderBy(desc(dealsTable.createdAt));

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

// POST /deals
router.post("/deals", async (req, res) => {
  try {
    const body = CreateDealBody.parse(req.body);
    const [deal] = await db
      .insert(dealsTable)
      .values({
        ...body,
        askingPrice: body.askingPrice != null ? String(body.askingPrice) : undefined,
        grossRevenue: body.grossRevenue != null ? String(body.grossRevenue) : undefined,
        netIncome: body.netIncome != null ? String(body.netIncome) : undefined,
        adjustedNetIncome: body.adjustedNetIncome != null ? String(body.adjustedNetIncome) : undefined,
        monthlyRent: body.monthlyRent != null ? String(body.monthlyRent) : undefined,
        leaseYearsRemaining: body.leaseYearsRemaining != null ? String(body.leaseYearsRemaining) : undefined,
        squareFootage: body.squareFootage != null ? String(body.squareFootage) : undefined,
        avgMachineAge: body.avgMachineAge != null ? String(body.avgMachineAge) : undefined,
        updatedAt: new Date(),
      })
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
    if (!deal) return res.status(404).json({ error: "Not found" });
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
    const updateData: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (body.askingPrice != null) updateData.askingPrice = String(body.askingPrice);
    if (body.grossRevenue != null) updateData.grossRevenue = String(body.grossRevenue);
    if (body.netIncome != null) updateData.netIncome = String(body.netIncome);
    if (body.adjustedNetIncome != null) updateData.adjustedNetIncome = String(body.adjustedNetIncome);
    if (body.monthlyRent != null) updateData.monthlyRent = String(body.monthlyRent);
    if (body.leaseYearsRemaining != null) updateData.leaseYearsRemaining = String(body.leaseYearsRemaining);
    if (body.squareFootage != null) updateData.squareFootage = String(body.squareFootage);
    if (body.avgMachineAge != null) updateData.avgMachineAge = String(body.avgMachineAge);

    const [deal] = await db
      .update(dealsTable)
      .set(updateData as Parameters<typeof dealsTable.$inferSelect>[0])
      .where(eq(dealsTable.id, id))
      .returning();
    if (!deal) return res.status(404).json({ error: "Not found" });
    const enriched = await enrichDeal(deal);
    res.json(enriched);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// DELETE /deals/:id
router.delete("/deals/:id", async (req, res) => {
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
    // Also update deal updatedAt so score recalculates
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
