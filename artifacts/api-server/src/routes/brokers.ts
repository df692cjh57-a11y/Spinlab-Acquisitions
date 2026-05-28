import { Router } from "express";
import { db } from "@workspace/db";
import { brokersTable, dealsTable } from "@workspace/db";
import { eq, desc, isNull, isNotNull, and } from "drizzle-orm";
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
    .where(and(eq(dealsTable.brokerId, broker.id), isNull(dealsTable.deletedAt), isNull(dealsTable.archivedAt)));
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
    deletedAt: broker.deletedAt?.toISOString() ?? null,
    archivedAt: broker.archivedAt?.toISOString() ?? null,
  };
}

// GET /brokers — active only
router.get("/brokers", async (req, res) => {
  try {
    const params = ListBrokersQueryParams.parse(req.query);
    let brokers = await db
      .select()
      .from(brokersTable)
      .where(and(isNull(brokersTable.deletedAt), isNull(brokersTable.archivedAt)))
      .orderBy(desc(brokersTable.createdAt));

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

// GET /brokers/deleted — soft-deleted brokers
router.get("/brokers/deleted", async (req, res) => {
  try {
    const brokers = await db
      .select()
      .from(brokersTable)
      .where(isNotNull(brokersTable.deletedAt))
      .orderBy(desc(brokersTable.deletedAt));
    const enriched = await Promise.all(brokers.map(enrichBroker));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /brokers/archived — archived brokers
router.get("/brokers/archived", async (req, res) => {
  try {
    const brokers = await db
      .select()
      .from(brokersTable)
      .where(and(isNotNull(brokersTable.archivedAt), isNull(brokersTable.deletedAt)))
      .orderBy(desc(brokersTable.archivedAt));
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

// DELETE /brokers/:id — soft delete
router.delete("/brokers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [broker] = await db
      .update(brokersTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(brokersTable.id, id))
      .returning();
    if (!broker) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /brokers/:id/archive
router.post("/brokers/:id/archive", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [broker] = await db
      .update(brokersTable)
      .set({ archivedAt: new Date(), deletedAt: null, updatedAt: new Date() })
      .where(eq(brokersTable.id, id))
      .returning();
    if (!broker) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /brokers/:id/restore
router.post("/brokers/:id/restore", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [broker] = await db
      .update(brokersTable)
      .set({ deletedAt: null, archivedAt: null, updatedAt: new Date() })
      .where(eq(brokersTable.id, id))
      .returning();
    if (!broker) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /brokers/:id/permanent — hard delete
router.delete("/brokers/:id/permanent", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(brokersTable).where(eq(brokersTable.id, id));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /brokers/:id/linked-deals — returns linked active deals for safety check
router.get("/brokers/:id/linked-deals", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deals = await db
      .select({ id: dealsTable.id, dealName: dealsTable.dealName, status: dealsTable.status, askingPrice: dealsTable.askingPrice })
      .from(dealsTable)
      .where(and(eq(dealsTable.brokerId, id), isNull(dealsTable.deletedAt), isNull(dealsTable.archivedAt)));
    res.json(deals.map((d) => ({ ...d, askingPrice: d.askingPrice ? parseFloat(d.askingPrice) : null })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /brokers/:id/delete-unlink — unlink all deals then soft-delete broker
router.post("/brokers/:id/delete-unlink", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(dealsTable).set({ brokerId: null, updatedAt: new Date() }).where(eq(dealsTable.brokerId, id));
    await db.update(brokersTable).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(brokersTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /brokers/:id/delete-reassign — reassign linked deals to another broker, then soft-delete
router.post("/brokers/:id/delete-reassign", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { reassignToBrokerId } = req.body as { reassignToBrokerId: number };
    if (!reassignToBrokerId) return res.status(400).json({ error: "reassignToBrokerId required" });
    await db.update(dealsTable).set({ brokerId: reassignToBrokerId, updatedAt: new Date() }).where(eq(dealsTable.brokerId, id));
    await db.update(brokersTable).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(brokersTable.id, id));
    res.json({ success: true });
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
        deletedAt: d.deletedAt?.toISOString() ?? null,
        archivedAt: d.archivedAt?.toISOString() ?? null,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
