import { Router } from "express";
import { db } from "@workspace/db";
import {
  dealsTable,
  brokersTable,
  remindersTable,
  notesTable,
  redFlagsTable,
  documentsTable,
  RED_FLAG_ITEMS,
  DOCUMENT_ITEMS,
} from "@workspace/db";

const router = Router();

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}
function daysAgo(n: number): string {
  return daysFromNow(-n);
}

// POST /seed — clear and re-seed all data
router.post("/seed", async (req, res) => {
  try {
    // Clear in FK order
    await db.delete(documentsTable);
    await db.delete(redFlagsTable);
    await db.delete(notesTable);
    await db.delete(remindersTable);
    await db.delete(dealsTable);
    await db.delete(brokersTable);

    // --- Brokers ---
    const [michaelStein] = await db.insert(brokersTable).values({
      name: "Michael Stein",
      company: "Metro Business Brokers",
      phone: "212-555-0101",
      email: "mstein@metrobiz.com",
      market: "NYC / NJ",
      specialty: "Laundromat specialist",
      brokerType: "Business Broker",
      relationshipStrength: "Warm",
      trustRating: 4,
      responsivenessRating: 4,
      dealQualityRating: 4,
      firstContactedDate: daysAgo(90),
      lastContactedDate: daysAgo(7),
      nextFollowUpDate: daysFromNow(3),
      notes: "Strong laundromat book. Has closed 3 deals in Brooklyn/Queens YTD. Prefers email first contact.",
    }).returning();

    const [davidKlein] = await db.insert(brokersTable).values({
      name: "David Klein",
      company: "Empire Commercial Realty",
      phone: "718-555-0202",
      email: "dklein@empirecre.com",
      market: "Brooklyn / Queens",
      specialty: "Commercial Real Estate",
      brokerType: "CRE Broker",
      relationshipStrength: "Cold",
      trustRating: 2,
      responsivenessRating: 2,
      dealQualityRating: 3,
      firstContactedDate: daysAgo(30),
      lastContactedDate: daysAgo(25),
      nextFollowUpDate: daysFromNow(1),
      notes: "Reached out cold. Haven't spoken yet. Has one Queens listing that looks interesting.",
    }).returning();

    const [rachelCohen] = await db.insert(brokersTable).values({
      name: "Rachel Cohen",
      company: "Garden State Business Sales",
      phone: "201-555-0303",
      email: "rcohen@gardenstatebiz.com",
      market: "New Jersey",
      specialty: "Business Broker – Laundromats & Dry Cleaning",
      brokerType: "Business Broker",
      relationshipStrength: "Strong",
      trustRating: 5,
      responsivenessRating: 5,
      dealQualityRating: 4,
      firstContactedDate: daysAgo(180),
      lastContactedDate: daysAgo(3),
      nextFollowUpDate: daysFromNow(7),
      notes: "Best source in NJ. Proactively sends new listings. Closed one deal together last year. Trust her numbers.",
    }).returning();

    // --- Deals ---
    const [deal1] = await db.insert(dealsTable).values({
      dealName: "Brooklyn Coin Laundry",
      businessName: "Brooklyn Coin Laundry LLC",
      address: "1420 Flatbush Ave",
      city: "Brooklyn",
      state: "NY",
      assetType: "Laundromat",
      source: "Broker",
      brokerId: michaelStein.id,
      sellerName: "Anthony Russo",
      askingPrice: "950000",
      grossRevenue: "450000",
      netIncome: "120000",
      adjustedNetIncome: "145000",
      monthlyRent: "10000",
      leaseYearsRemaining: "6",
      renewalOptions: "Two 5-year options",
      squareFootage: "3000",
      numWashers: 52,
      numDryers: 55,
      machineBrand: "Dexter",
      avgMachineAge: "16",
      cardOrCoin: "Coin",
      washAndFold: false,
      pickupDelivery: false,
      commercialAccounts: false,
      hoursOfOperation: "6am–10pm daily",
      staffCount: 2,
      ownerOperated: false,
      status: "Underwriting",
      priority: "High",
      nextAction: "Complete underwriting model and determine max offer",
      nextActionDueDate: daysFromNow(3),
      lastContactedDate: daysAgo(5),
      notes: "Old machines are a concern. Seller claims revenue is all cash. Need to verify with utility bills.",
    }).returning();

    const [deal2] = await db.insert(dealsTable).values({
      dealName: "Queens Wash Center",
      businessName: "Queens Wash Center Inc",
      address: "89-14 Jamaica Ave",
      city: "Queens",
      state: "NY",
      assetType: "Laundromat",
      source: "Broker",
      brokerId: davidKlein.id,
      sellerName: "Sung Park",
      askingPrice: "625000",
      grossRevenue: "380000",
      netIncome: "110000",
      adjustedNetIncome: "135000",
      monthlyRent: "6500",
      leaseYearsRemaining: "9",
      renewalOptions: "One 5-year option",
      squareFootage: "2400",
      numWashers: 34,
      numDryers: 38,
      machineBrand: "Speed Queen",
      avgMachineAge: "8",
      cardOrCoin: "Card",
      washAndFold: true,
      pickupDelivery: false,
      commercialAccounts: false,
      hoursOfOperation: "7am–11pm daily",
      staffCount: 3,
      ownerOperated: false,
      status: "Financials Received",
      priority: "Hot",
      nextAction: "Schedule site visit and verify card system revenue",
      nextActionDueDate: daysFromNow(2),
      lastContactedDate: daysAgo(2),
      notes: "Best deal in pipeline. Newer machines, card system, strong margins. Move fast.",
    }).returning();

    const [deal3] = await db.insert(dealsTable).values({
      dealName: "Jersey City Laundromat",
      businessName: "JC Clean Wash LLC",
      address: "543 Newark Ave",
      city: "Jersey City",
      state: "NJ",
      assetType: "Laundromat",
      source: "Broker",
      brokerId: rachelCohen.id,
      sellerName: "Maria Santos",
      askingPrice: "725000",
      grossRevenue: "520000",
      netIncome: "155000",
      adjustedNetIncome: "175000",
      monthlyRent: "8200",
      leaseYearsRemaining: "11",
      renewalOptions: "Two 5-year options",
      squareFootage: "2800",
      numWashers: 40,
      numDryers: 44,
      machineBrand: "Huebsch",
      avgMachineAge: "10",
      cardOrCoin: "Card",
      washAndFold: true,
      pickupDelivery: true,
      commercialAccounts: true,
      hoursOfOperation: "Open 24 hours",
      staffCount: 4,
      ownerOperated: false,
      status: "Contacted Broker",
      priority: "Medium",
      nextAction: "Request 3 years of tax returns and utility bills",
      nextActionDueDate: daysAgo(1),
      lastContactedDate: daysAgo(8),
      notes: "Good location, pickup/delivery upside. Rachel sent the package 2 days ago. Follow up.",
    }).returning();

    // --- Red Flags ---
    // Brooklyn: old machines, cash income claim, no card data
    // Queens: old_machines flag only (minor)
    // Jersey City: clean
    const deal1Flags = new Set(["old_machines", "cash_income_claim", "equipment_eol"]);
    const deal2Flags = new Set(["cash_income_claim"]);

    for (const deal of [deal1, deal2, deal3]) {
      const flagSet = deal.id === deal1.id ? deal1Flags : deal.id === deal2.id ? deal2Flags : new Set<string>();
      await db.insert(redFlagsTable).values(
        RED_FLAG_ITEMS.map((item) => ({
          dealId: deal.id,
          flagKey: item.key,
          flagLabel: item.label,
          checked: flagSet.has(item.key),
        }))
      );
    }

    // --- Documents ---
    for (const deal of [deal1, deal2, deal3]) {
      // Queens has received more docs since it's further along
      const received = deal.id === deal2.id
        ? new Set(["tax_returns", "pl_statement", "utility_bills", "lease", "bank_statements"])
        : deal.id === deal1.id
        ? new Set(["utility_bills", "lease"])
        : new Set<string>();

      await db.insert(documentsTable).values(
        DOCUMENT_ITEMS.map((item) => ({
          dealId: deal.id,
          docKey: item.key,
          docLabel: item.label,
          status: received.has(item.key) ? "Received" : "Not requested",
        }))
      );
    }

    // --- Notes ---
    await db.insert(notesTable).values([
      {
        linkedType: "deal",
        linkedId: deal1.id,
        noteType: "Underwriting",
        noteText: "Pulled PGE bills — gas usage is consistent with $450K gross. Machine age is the biggest concern: 16-year average on Dexter coin units. Budget $120K for full reequip in year 3.",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        linkedType: "deal",
        linkedId: deal1.id,
        noteType: "Call",
        noteText: "Call with Anthony (seller). Confirmed 2 staff, no W-2 employees — all cash. He's motivated to close by end of Q3. Wants $950K firm, not much room to negotiate.",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        linkedType: "deal",
        linkedId: deal2.id,
        noteType: "Site Visit",
        noteText: "Property looks clean. Card system is a newer Turns model. Wash-and-fold counter is active — staff said they do ~$2K/week in WDF. Owner manages remotely, not on-site.",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        linkedType: "deal",
        linkedId: deal2.id,
        noteType: "Research",
        noteText: "Comp check: 3 other laundromats within 0.5 miles. One is a chain (SpinCycle), one is an older coin-op. This location has the best machines and foot traffic per Google reviews.",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        linkedType: "deal",
        linkedId: deal3.id,
        noteType: "General note",
        noteText: "Rachel sent over the package. Solid gross for NJ. Pickup/delivery and commercial accounts are real upside — probably $30–40K untapped if scaled properly. JC zoning should be fine.",
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
    ]);

    // --- Reminders ---
    await db.insert(remindersTable).values([
      {
        title: "Submit underwriting model to partner",
        linkedType: "deal",
        linkedId: deal1.id,
        dueDate: daysFromNow(3),
        priority: "High",
        reminderType: "Task",
        notes: "Model needs to show max offer at 4.0x and 4.5x target multiple",
        completed: false,
      },
      {
        title: "Schedule site visit — Queens Wash Center",
        linkedType: "deal",
        linkedId: deal2.id,
        dueDate: daysFromNow(2),
        priority: "High",
        reminderType: "Site Visit",
        notes: "Confirm with David Klein. Bring utility bill checklist.",
        completed: false,
      },
      {
        title: "Request tax returns from Rachel",
        linkedType: "deal",
        linkedId: deal3.id,
        dueDate: daysAgo(1),
        priority: "High",
        reminderType: "Follow Up",
        notes: "3 years of personal + business returns. Also request lease.",
        completed: false,
      },
      {
        title: "Follow up with David Klein — Q status",
        linkedType: "broker",
        linkedId: davidKlein.id,
        dueDate: daysFromNow(1),
        priority: "Medium",
        reminderType: "Broker Follow Up",
        notes: "Cold relationship — stay top of mind without being pushy.",
        completed: false,
      },
      {
        title: "Send LOI term sheet to Michael Stein",
        linkedType: "broker",
        linkedId: michaelStein.id,
        dueDate: daysFromNow(5),
        priority: "Medium",
        reminderType: "LOI",
        notes: "Draft based on 4.2x multiple, SBA financing structure.",
        completed: false,
      },
      {
        title: "Review lease renewal terms — Brooklyn Coin",
        linkedType: "deal",
        linkedId: deal1.id,
        dueDate: daysFromNow(7),
        priority: "Low",
        reminderType: "Lease Review",
        notes: "6 years remaining. Two 5-year options. Check rent escalation clause.",
        completed: false,
      },
    ]);

    res.json({ success: true, message: "Database seeded: 3 deals, 3 brokers, 6 reminders, 5 notes" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
