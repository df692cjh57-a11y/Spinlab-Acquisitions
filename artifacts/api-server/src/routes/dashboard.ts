import { Router } from "express";
import { db } from "@workspace/db";
import {
  dealsTable,
  brokersTable,
  remindersTable,
  redFlagsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const today = () => new Date().toISOString().split("T")[0];

function calcAskingMultiple(askingPrice: string | null, adjustedNetIncome: string | null): number | null {
  const p = parseFloat(askingPrice ?? "");
  const n = parseFloat(adjustedNetIncome ?? "");
  if (!p || !n) return null;
  return Math.round((p / n) * 100) / 100;
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
  const g = parseFloat(deal.grossRevenue ?? "");
  if (annualRent && g) {
    const rentPct = (annualRent / g) * 100;
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
  if (deal.washAndFold) score += 3;
  if (deal.pickupDelivery) score += 3;
  if (deal.commercialAccounts) score += 3;
  return Math.max(0, Math.min(100, score));
}

// GET /dashboard/summary
router.get("/dashboard/summary", async (req, res) => {
  try {
    const t = today();

    const [deals, brokers, reminders, redFlags] = await Promise.all([
      db.select().from(dealsTable),
      db.select().from(brokersTable),
      db.select().from(remindersTable),
      db.select().from(redFlagsTable),
    ]);

    const activeDeals = deals.filter(
      (d) => !["Dead Deal", "Closed"].includes(d.status)
    );
    const hotDeals = deals.filter((d) => d.priority === "Hot").length;
    const followUpToday = deals.filter(
      (d) => d.nextActionDueDate === t && !["Dead Deal", "Closed"].includes(d.status)
    ).length;
    const overdueReminders = reminders.filter(
      (r) => !r.completed && r.dueDate < t
    ).length;
    const brokersNeedingFollowUp = brokers.filter(
      (b) => b.nextFollowUpDate && b.nextFollowUpDate <= t
    ).length;
    const dealsInUnderwriting = deals.filter(
      (d) => d.status === "Underwriting"
    ).length;
    const loisSent = deals.filter((d) => d.status === "LOI Sent").length;
    const deadDeals = deals.filter((d) => d.status === "Dead Deal").length;
    const stalledDeals = deals.filter((d) => d.status === "Stalled").length;

    const totalPipelineValue = activeDeals
      .filter((d) => d.askingPrice)
      .reduce((sum, d) => sum + parseFloat(d.askingPrice!), 0);

    const multiples: number[] = [];
    for (const deal of deals) {
      if (deal.askingPrice && deal.adjustedNetIncome) {
        const p = parseFloat(deal.askingPrice);
        const n = parseFloat(deal.adjustedNetIncome);
        if (n > 0) multiples.push(p / n);
      }
    }
    const avgAskingMultiple =
      multiples.length > 0
        ? Math.round((multiples.reduce((a, b) => a + b, 0) / multiples.length) * 100) / 100
        : null;

    // Build a redFlagScore map per dealId
    const flagsByDeal: Record<number, number> = {};
    for (const f of redFlags) {
      if (f.checked) {
        flagsByDeal[f.dealId] = (flagsByDeal[f.dealId] ?? 0) + 1;
      }
    }

    // Broker name map
    const brokerMap: Record<number, string> = {};
    for (const b of brokers) {
      brokerMap[b.id] = b.name;
    }

    function enrichLite(d: typeof dealsTable.$inferSelect) {
      const rfScore = flagsByDeal[d.id] ?? 0;
      return {
        id: d.id,
        dealName: d.dealName,
        city: d.city,
        state: d.state,
        status: d.status,
        priority: d.priority,
        askingPrice: d.askingPrice ? parseFloat(d.askingPrice) : null,
        adjustedNetIncome: d.adjustedNetIncome ? parseFloat(d.adjustedNetIncome) : null,
        askingMultiple: calcAskingMultiple(d.askingPrice, d.adjustedNetIncome),
        dealScore: calcDealScore(d, rfScore),
        brokerName: d.brokerId ? (brokerMap[d.brokerId] ?? null) : null,
        nextAction: d.nextAction,
        nextActionDueDate: d.nextActionDueDate,
      };
    }

    // Hot deals list (top 5)
    const hotDealsList = deals
      .filter((d) => d.priority === "Hot" && !["Dead Deal", "Closed"].includes(d.status))
      .slice(0, 5)
      .map(enrichLite);

    // Overdue follow-ups: deals with a past due nextActionDueDate
    const overdueFollowUpsList = deals
      .filter((d) => d.nextActionDueDate && d.nextActionDueDate < t && !["Dead Deal", "Closed"].includes(d.status))
      .slice(0, 5)
      .map(enrichLite);

    // Recently added (last 5)
    const recentlyAddedDeals = [...deals]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(enrichLite);

    // Top brokers by deal count
    const brokerDealCounts: Record<number, number> = {};
    for (const d of deals) {
      if (d.brokerId) {
        brokerDealCounts[d.brokerId] = (brokerDealCounts[d.brokerId] ?? 0) + 1;
      }
    }
    const topBrokers = brokers
      .map((b) => ({
        id: b.id,
        name: b.name,
        company: b.company,
        market: b.market,
        relationshipStrength: b.relationshipStrength,
        dealCount: brokerDealCounts[b.id] ?? 0,
        lastContactedDate: b.lastContactedDate,
        nextFollowUpDate: b.nextFollowUpDate,
      }))
      .sort((a, b) => b.dealCount - a.dealCount)
      .slice(0, 5);

    // Today's reminders
    const todayReminders = reminders
      .filter((r) => !r.completed && r.dueDate === t)
      .map((r) => ({
        ...r,
        linkedName: null,
        completedAt: r.completedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));

    res.json({
      totalActiveDeals: activeDeals.length,
      hotDeals,
      followUpToday,
      overdueReminders,
      brokersNeedingFollowUp,
      dealsInUnderwriting,
      loisSent,
      deadDeals,
      stalledDeals,
      totalPipelineValue: totalPipelineValue > 0 ? totalPipelineValue : null,
      avgAskingMultiple,
      hotDealsList,
      overdueFollowUpsList,
      recentlyAddedDeals,
      topBrokers,
      todayReminders,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /dashboard/pipeline
router.get("/dashboard/pipeline", async (req, res) => {
  try {
    const deals = await db.select().from(dealsTable);
    const stages = [
      "New Lead",
      "Contacted Broker",
      "NDA Sent",
      "Financials Requested",
      "Financials Received",
      "Underwriting",
      "Site Visit Scheduled",
      "LOI Sent",
      "Negotiation",
      "Under Contract",
      "Due Diligence",
      "Financing",
      "Closed",
      "Dead Deal",
      "Follow Up Later",
      "Stalled",
    ];

    const pipeline = stages.map((status) => {
      const stageDeals = deals.filter((d) => d.status === status);
      const totalValue = stageDeals.reduce((sum, d) => {
        return sum + (d.askingPrice ? parseFloat(d.askingPrice) : 0);
      }, 0);
      return {
        status,
        count: stageDeals.length,
        totalValue: totalValue > 0 ? totalValue : null,
      };
    });

    res.json(pipeline);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
