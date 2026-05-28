import { Router } from "express";
import { db } from "@workspace/db";
import {
  dealsTable,
  brokersTable,
  remindersTable,
  redFlagsTable,
} from "@workspace/db";
import { eq, lt, lte, and, isNotNull, desc } from "drizzle-orm";

const router = Router();

const today = () => new Date().toISOString().split("T")[0];

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

    const askingPrices = deals
      .filter((d) => d.askingPrice)
      .map((d) => parseFloat(d.askingPrice!));
    const avgAskingPrice =
      askingPrices.length > 0
        ? askingPrices.reduce((a, b) => a + b, 0) / askingPrices.length
        : null;

    // Calculate avg asking multiple
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
        ? multiples.reduce((a, b) => a + b, 0) / multiples.length
        : null;

    // Recent deals (last 5)
    const recentDeals = deals
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5)
      .map((d) => ({
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
      }));

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
      avgAskingPrice: avgAskingPrice ? Math.round(avgAskingPrice) : null,
      avgAskingMultiple: avgAskingMultiple
        ? Math.round(avgAskingMultiple * 100) / 100
        : null,
      stalledDeals,
      recentDeals,
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
