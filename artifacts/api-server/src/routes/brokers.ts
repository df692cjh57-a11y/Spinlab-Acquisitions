import { Router } from "express";
import { db } from "@workspace/db";
import { brokersTable, dealsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import {
  ListBrokersQueryParams,
  CreateBrokerBody,
  UpdateBrokerBody,
} from "@workspace/api-zod";

const router = Router();

async function enrichBroker(broker: typeof brokersTable.$inferSelect) {
  const deals = await db
    .select()
    .from(dealsTable)
    .where(eq(dealsTable.brokerId, broker.id));
  const dealCount = deals.length;
  const hotDealCount = deals.filter((d) => d.priority === "Hot").length;

  return {
    ...broker,
    trustRating: broker.trustRating ?? null,
    responsivenessRating: broker.responsivenessRating ?? null,
    dealQualityRating: broker.dealQualityRating ?? null,
    dealCount,
    hotDealCount,
    createdAt: broker.createdAt.toISOString(),
    updatedAt: broker.updatedAt.toISOString(),
  };
}

// GET /brokers
router.get("/brokers", async (req, res) => {
  try {
    const params = ListBrokersQueryParams.parse(req.query);
    let brokers = await db.select().from(brokersTable).orderBy(desc(brokersTable.createdAt));

    if (params.market) {
      brokers = brokers.filter((b) =>
        b.market?.toLowerCase().includes(params.market!.toLowerCase())
      );
    }
    if (params.relationshipStrength) {
      brokers = brokers.filter((b) => b.relationshipStrength === params.relationshipStrength);
    }
    if (params.search) {
      const s = params.search.toLowerCase();
      brokers = brokers.filter(
        (b) =>
          b.name.toLowerCase().includes(s) ||
          b.company?.toLowerCase().includes(s) ||
          b.email?.toLowerCase().includes(s)
      );
    }
    const today = new Date().toISOString().split("T")[0];
    if (params.followUpToday) {
      brokers = brokers.filter((b) => b.nextFollowUpDate === today);
    }

    const enriched = await Promise.all(brokers.map(enrichBroker));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /brokers
router.post("/brokers", async (req, res) => {
  try {
    const body = CreateBrokerBody.parse(req.body);
    const [broker] = await db
      .insert(brokersTable)
      .values({ ...body, updatedAt: new Date() })
      .returning();
    const enriched = await enrichBroker(broker);
    res.status(201).json(enriched);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// GET /brokers/:id
router.get("/brokers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [broker] = await db.select().from(brokersTable).where(eq(brokersTable.id, id));
    if (!broker) return res.status(404).json({ error: "Not found" });
    const enriched = await enrichBroker(broker);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /brokers/:id
router.patch("/brokers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = UpdateBrokerBody.parse(req.body);
    const [broker] = await db
      .update(brokersTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(brokersTable.id, id))
      .returning();
    if (!broker) return res.status(404).json({ error: "Not found" });
    const enriched = await enrichBroker(broker);
    res.json(enriched);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// DELETE /brokers/:id
router.delete("/brokers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(brokersTable).where(eq(brokersTable.id, id));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /brokers/:id/deals
router.get("/brokers/:id/deals", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deals = await db
      .select()
      .from(dealsTable)
      .where(eq(dealsTable.brokerId, id))
      .orderBy(desc(dealsTable.createdAt));
    // Return simplified deals (no enrichment needed for broker view)
    res.json(
      deals.map((d) => ({
        ...d,
        askingPrice: d.askingPrice ? parseFloat(d.askingPrice) : null,
        grossRevenue: d.grossRevenue ? parseFloat(d.grossRevenue) : null,
        netIncome: d.netIncome ? parseFloat(d.netIncome) : null,
        adjustedNetIncome: d.adjustedNetIncome ? parseFloat(d.adjustedNetIncome) : null,
        monthlyRent: d.monthlyRent ? parseFloat(d.monthlyRent) : null,
        annualRent: d.monthlyRent ? parseFloat(d.monthlyRent) * 12 : null,
        leaseYearsRemaining: d.leaseYearsRemaining ? parseFloat(d.leaseYearsRemaining) : null,
        squareFootage: d.squareFootage ? parseFloat(d.squareFootage) : null,
        avgMachineAge: d.avgMachineAge ? parseFloat(d.avgMachineAge) : null,
        brokerName: null,
        askingMultiple: null,
        rentAsPercentGross: null,
        rentPerSqFt: null,
        redFlagScore: 0,
        redFlagLevel: "Clean",
        dealScore: 50,
        dealQuality: "Maybe",
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      }))
    );
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
