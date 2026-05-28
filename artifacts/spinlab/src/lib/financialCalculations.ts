// ─────────────────────────────────────────────────────────────────────────────
// Spinlab Financial Underwriting Engine
// All calculations are pure functions — safe, no NaN, no Infinity.
// Main export: calculateFullUnderwriting(deal)
// ─────────────────────────────────────────────────────────────────────────────

// ─── Primitive helpers ────────────────────────────────────────────────────────

/** Safely parse a value to a number; returns null on invalid / empty input */
export function toNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isFinite(n) ? n : null;
}

/** Alias — spec names */
export const parseNumber = toNum;
export const safeNumber  = toNum;

/** Returns null instead of Infinity / NaN on division-by-zero or invalid inputs */
export function safeDivide(num: number | null, den: number | null): number | null {
  if (num === null || den === null || den === 0) return null;
  const r = num / den;
  return isFinite(r) ? r : null;
}

// ─── Formatter helpers ────────────────────────────────────────────────────────

export function formatCurrencyCalc(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

export function formatPercentCalc(v: number | null | undefined, decimals = 1): string {
  if (v === null || v === undefined) return "—";
  return `${(v * 100).toFixed(decimals)}%`;
}

export function formatMultipleCalc(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${v.toFixed(2)}x`;
}

export function formatDSCR(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${v.toFixed(2)}x`;
}

// ─── Amortizing payment ───────────────────────────────────────────────────────

/**
 * Standard amortizing monthly payment.
 * If rate === 0: simple P/n.
 */
export function calculateMonthlyPayment(
  principal: number | null,
  annualRatePct: number | null,
  amortizationYears: number | null
): number | null {
  if (!principal || principal <= 0) return null;
  if (!amortizationYears || amortizationYears <= 0) return null;
  const n = amortizationYears * 12;
  const rate = toNum(annualRatePct) ?? 0;
  if (rate === 0) return principal / n;
  const r = rate / 100 / 12;
  const pmt = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return isFinite(pmt) ? pmt : null;
}

// ─── Input type ───────────────────────────────────────────────────────────────

export type DealInput = {
  // Basic
  askingPrice?: string | number | null;
  grossRevenue?: string | number | null;
  netIncome?: string | number | null;
  sellerClaimedNetIncome?: string | number | null;
  sellerClaimedAddBacks?: string | number | null;
  adjustedNetIncome?: string | number | null;
  targetMultiple?: string | number | null;
  // Revenue detail
  washFoldRevenue?: string | number | null;
  pickupDeliveryRevenue?: string | number | null;
  commercialRevenue?: string | number | null;
  vendingRevenue?: string | number | null;
  otherRevenue?: string | number | null;
  // Expense detail
  payroll?: string | number | null;
  monthlyRent?: string | number | null;
  water?: string | number | null;
  gas?: string | number | null;
  electric?: string | number | null;
  insurance?: string | number | null;
  repairsMaintenance?: string | number | null;
  supplies?: string | number | null;
  merchantFees?: string | number | null;
  softwareFees?: string | number | null;
  marketing?: string | number | null;
  cleaning?: string | number | null;
  accounting?: string | number | null;
  licensesPermits?: string | number | null;
  otherExpenses?: string | number | null;
  // Buyer adjustments
  adjustedPayroll?: string | number | null;
  replacementManagerSalary?: string | number | null;
  capexReserve?: string | number | null;
  maintenanceReserve?: string | number | null;
  otherBuyerAdjustments?: string | number | null;
  // Real estate
  squareFootage?: string | number | null;
  leaseYearsRemaining?: string | number | null;
  // Financing
  downPaymentPercent?: string | number | null;
  interestRate?: string | number | null;
  loanTermYears?: string | number | null;
  amortizationYears?: string | number | null;
  closingCostPercent?: string | number | null;
  sbaFees?: string | number | null;
  workingCapitalReserve?: string | number | null;
  capexBudget?: string | number | null;
  sellerFinancingAmount?: string | number | null;
  sellerFinancingInterestRate?: string | number | null;
  sellerFinancingAmortizationYears?: string | number | null;
  // Equipment
  numWashers?: string | number | null;
  numDryers?: string | number | null;
  avgMachineAge?: string | number | null;
  averageWasherReplacementCost?: string | number | null;
  averageDryerReplacementCost?: string | number | null;
  percentMachinesNeedingReplacement?: string | number | null;
  installationBudget?: string | number | null;
  capexContingencyPercent?: string | number | null;
  // Upside
  washFoldRevenueIncrease?: string | number | null;
  pickupDeliveryRevenueIncrease?: string | number | null;
  commercialRevenueIncrease?: string | number | null;
  priceIncreasePercent?: string | number | null;
  hoursExpansionRevenueIncrease?: string | number | null;
  laborSavings?: string | number | null;
  utilitySavings?: string | number | null;
  otherUpside?: string | number | null;
  // External score inputs (pass-through from DB if already calculated)
  dealScore?: string | number | null;
  redFlagScore?: string | number | null;
};

// ─── Result types ─────────────────────────────────────────────────────────────

export type ScenarioResult = {
  label: string;
  revMultiplier: number;
  expMultiplier: number;
  revenue: number | null;
  adjustedSDE: number | null;
  annualDebtService: number | null;
  cashFlowAfterDebt: number | null;
  dscr: number | null;
  cashOnCash: number | null;
};

export type WarningItem = {
  message: string;
  level: "info" | "warn" | "danger";
  category?: "financing" | "valuation" | "rent" | "revenue" | "capex" | "lease" | "data";
};

export type DealFinancials = {
  // ── Core inputs ──────────────────────────────────────────────────────────────
  askingPrice: number | null;
  grossRevenue: number | null;
  targetMultiple: number;
  annualRent: number | null;
  numMachines: number;

  // ── SDE reconciliation ───────────────────────────────────────────────────────
  sellerClaimedNetIncome: number | null;
  sellerClaimedAddBacks: number | null;
  sellerSDE: number | null;                 // sellerClaimedNetIncome + sellerClaimedAddBacks
  calculatedAdjustedSDE: number | null;     // computed from expense detail (buyer-adjusted)
  adjustedSDE: number | null;               // final SDE used in all calcs (manual override → calculated → null)
  sdeSource: "manual" | "calculated_buyer" | "calculated_total" | "none";

  // ── Revenue analysis ─────────────────────────────────────────────────────────
  revenueBreakdownTotal: number | null;
  revenueBreakdownDiff: number | null;      // grossRevenue - breakdownTotal
  revenueBreakdownDiffPct: number | null;   // diff / grossRevenue
  washFoldRevPct: number | null;            // washFoldRevenue / grossRevenue
  pickupDeliveryRevPct: number | null;
  commercialRevPct: number | null;

  // ── Expense analysis ─────────────────────────────────────────────────────────
  totalUtilities: number | null;
  totalOperatingExpenses: number | null;
  adjustedOperatingExpenses: number | null;
  expenseRatio: number | null;              // totalOpExp / grossRevenue
  utilityPctGross: number | null;
  payrollPctGross: number | null;
  rentPctGross: number | null;
  netMargin: number | null;                 // adjustedSDE / grossRevenue

  // ── Real estate metrics ──────────────────────────────────────────────────────
  rentPerSqFt: number | null;
  rentPerMachine: number | null;
  revPerSqFt: number | null;
  revPerMachine: number | null;
  sdePerSqFt: number | null;

  // ── Valuation ────────────────────────────────────────────────────────────────
  askingMultiple: number | null;
  sellerClaimedMultiple: number | null;
  revenueMultiple: number | null;
  maxOffer: number | null;
  priceGap: number | null;                  // askingPrice - maxOffer
  priceGapPct: number | null;              // priceGap / askingPrice
  lowValuation: number | null;             // adjustedSDE × 2.5
  baseValuation: number | null;            // adjustedSDE × 3.5
  aggressiveValuation: number | null;      // adjustedSDE × 4.5
  valuationSpread: number | null;          // aggressiveValuation - lowValuation

  // ── Financing ────────────────────────────────────────────────────────────────
  downPayment: number | null;
  loanAmount: number | null;
  closingCosts: number | null;
  totalCashNeeded: number | null;
  bankMonthlyDebtService: number | null;
  sellerFinancingMonthlyPayment: number | null;
  totalMonthlyDebtService: number | null;
  annualDebtService: number | null;
  cashFlowAfterDebt: number | null;
  monthlyNetCashFlow: number | null;

  // ── Return metrics ───────────────────────────────────────────────────────────
  dscr: number | null;
  cashOnCashReturn: number | null;
  breakEvenRevenue: number | null;
  breakEvenRevenuePct: number | null;
  debtYield: number | null;                // adjustedSDE / loanAmount
  ltv: number | null;                      // loanAmount / askingPrice
  debtServicePctGross: number | null;      // annualDebtService / grossRevenue

  // ── Equipment capex ──────────────────────────────────────────────────────────
  washerReplacementCount: number;
  dryerReplacementCount: number;
  washerReplacementCost: number | null;
  dryerReplacementCost: number | null;
  capexSubtotal: number | null;
  capexContingency: number | null;
  totalEquipmentCapex: number | null;
  capexPerMachine: number | null;
  capexAdjustedCashNeeded: number | null;
  capexAdjustedCashOnCash: number | null;

  // ── Upside model ─────────────────────────────────────────────────────────────
  revenueUpside: number | null;
  priceIncreaseUpside: number | null;
  costSavings: number | null;
  totalUpside: number | null;
  upsidePctGross: number | null;
  projectedRevenue: number | null;
  projectedAdjustedSDE: number | null;
  projectedMultiple: number | null;
  projectedCashFlowAfterDebt: number | null;
  projectedCashOnCash: number | null;

  // ── Scenario analysis ────────────────────────────────────────────────────────
  scenarios: ScenarioResult[];

  // ── Deal scoring ─────────────────────────────────────────────────────────────
  calculatedDealScore: number;             // computed internally from financials
  dealQuality: string;

  // ── Offer recommendation ─────────────────────────────────────────────────────
  suggestedMultiple: number;
  suggestedOffer: number | null;
  suggestedOfferGap: number | null;        // askingPrice - suggestedOffer
  suggestedOfferGapPct: number | null;     // suggestedOfferGap / askingPrice
  offerRecommendation: string;

  // ── Warnings ─────────────────────────────────────────────────────────────────
  warnings: WarningItem[];
};

// ─── Main function ────────────────────────────────────────────────────────────

export function calculateFullUnderwriting(deal: DealInput): DealFinancials {

  // ── Parse all inputs ─────────────────────────────────────────────────────────
  const askingPrice      = toNum(deal.askingPrice);
  const grossRevenue     = toNum(deal.grossRevenue);
  const sellerClaimedNI  = toNum(deal.sellerClaimedNetIncome) ?? toNum(deal.netIncome);
  const sellerAddBacks   = toNum(deal.sellerClaimedAddBacks) ?? 0;
  const manualAdjSDE     = toNum(deal.adjustedNetIncome);
  const targetMultiple   = toNum(deal.targetMultiple) ?? 3.5;
  const squareFeet       = toNum(deal.squareFootage);
  const leaseYears       = toNum(deal.leaseYearsRemaining);
  const avgMachineAge    = toNum(deal.avgMachineAge);
  const externalRedFlag  = toNum(deal.redFlagScore);

  // Financing defaults
  const downPaymentPct        = toNum(deal.downPaymentPercent)  ?? 10;
  const interestRate          = toNum(deal.interestRate)         ?? 10;
  const amortYears            = toNum(deal.amortizationYears)    ?? 10;
  const closingCostPct        = toNum(deal.closingCostPercent)   ?? 3;
  const sbaFees               = toNum(deal.sbaFees)              ?? 0;
  const workingCapital        = toNum(deal.workingCapitalReserve) ?? 0;
  const capexBudget           = toNum(deal.capexBudget)          ?? 0;
  const sellerFinAmt          = toNum(deal.sellerFinancingAmount) ?? 0;
  const sellerFinRate         = toNum(deal.sellerFinancingInterestRate) ?? 0;
  const sellerFinAmort        = toNum(deal.sellerFinancingAmortizationYears) ?? 10;

  // Equipment defaults
  const washerCount    = toNum(deal.numWashers)  ?? 0;
  const dryerCount     = toNum(deal.numDryers)   ?? 0;
  const numMachines    = washerCount + dryerCount;
  const avgWasherCost  = toNum(deal.averageWasherReplacementCost) ?? 8000;
  const avgDryerCost   = toNum(deal.averageDryerReplacementCost)  ?? 5000;
  const pctNeedReplace = toNum(deal.percentMachinesNeedingReplacement) ?? 0;
  const installBudget  = toNum(deal.installationBudget) ?? 0;
  const capexContPct   = toNum(deal.capexContingencyPercent) ?? 10;

  // ── Revenue detail ───────────────────────────────────────────────────────────
  const washFoldRev   = toNum(deal.washFoldRevenue)         ?? 0;
  const pickupDelRev  = toNum(deal.pickupDeliveryRevenue)   ?? 0;
  const commRev       = toNum(deal.commercialRevenue)       ?? 0;
  const vendingRev    = toNum(deal.vendingRevenue)          ?? 0;
  const otherRev      = toNum(deal.otherRevenue)            ?? 0;

  const revBDTotal = washFoldRev + pickupDelRev + commRev + vendingRev + otherRev;
  const revenueBreakdownTotal  = revBDTotal > 0 ? revBDTotal : null;
  const revenueBreakdownDiff   = (grossRevenue !== null && revenueBreakdownTotal !== null)
    ? grossRevenue - revenueBreakdownTotal : null;
  const revenueBreakdownDiffPct = safeDivide(revenueBreakdownDiff, grossRevenue);
  const washFoldRevPct         = grossRevenue && washFoldRev > 0 ? safeDivide(washFoldRev, grossRevenue) : null;
  const pickupDelRevPct        = grossRevenue && pickupDelRev > 0 ? safeDivide(pickupDelRev, grossRevenue) : null;
  const commRevPct             = grossRevenue && commRev > 0 ? safeDivide(commRev, grossRevenue) : null;

  // ── Expense detail ───────────────────────────────────────────────────────────
  const annualRent     = toNum(deal.monthlyRent) !== null ? (toNum(deal.monthlyRent)! * 12) : null;
  const payroll        = toNum(deal.payroll)             ?? 0;
  const water          = toNum(deal.water)               ?? 0;
  const gas            = toNum(deal.gas)                 ?? 0;
  const electric       = toNum(deal.electric)            ?? 0;
  const insurance      = toNum(deal.insurance)           ?? 0;
  const repairsMaint   = toNum(deal.repairsMaintenance)  ?? 0;
  const supplies       = toNum(deal.supplies)            ?? 0;
  const merchantFees   = toNum(deal.merchantFees)        ?? 0;
  const softwareFees   = toNum(deal.softwareFees)        ?? 0;
  const marketing      = toNum(deal.marketing)           ?? 0;
  const cleaning       = toNum(deal.cleaning)            ?? 0;
  const accounting     = toNum(deal.accounting)          ?? 0;
  const licensesPerms  = toNum(deal.licensesPermits)     ?? 0;
  const otherExp       = toNum(deal.otherExpenses)       ?? 0;

  const annualRentVal      = annualRent ?? 0;
  const totalUtilitiesVal  = water + gas + electric;
  const totalUtilities     = totalUtilitiesVal > 0 ? totalUtilitiesVal : null;

  const totalOpExpVal =
    payroll + annualRentVal + water + gas + electric + insurance +
    repairsMaint + supplies + merchantFees + softwareFees +
    marketing + cleaning + accounting + licensesPerms + otherExp;
  const totalOperatingExpenses = totalOpExpVal > 0 ? totalOpExpVal : null;

  // ── Buyer adjustments ────────────────────────────────────────────────────────
  const adjPayroll      = toNum(deal.adjustedPayroll) ?? payroll;
  const replMgrSalary   = toNum(deal.replacementManagerSalary) ?? 0;
  const capexReserve    = toNum(deal.capexReserve)    ?? 0;
  const maintReserve    = toNum(deal.maintenanceReserve) ?? 0;
  const otherBuyerAdj   = toNum(deal.otherBuyerAdjustments) ?? 0;

  const adjOpExpVal =
    adjPayroll + annualRentVal + water + gas + electric + insurance +
    repairsMaint + supplies + merchantFees + softwareFees +
    marketing + cleaning + accounting + licensesPerms +
    replMgrSalary + capexReserve + maintReserve + otherBuyerAdj;
  const adjustedOperatingExpenses = adjOpExpVal > 0 ? adjOpExpVal : null;

  // ── Adjusted SDE — priority chain ────────────────────────────────────────────
  let adjustedSDE: number | null = null;
  let sdeSource: DealFinancials["sdeSource"] = "none";

  if (manualAdjSDE !== null) {
    adjustedSDE = manualAdjSDE;
    sdeSource = "manual";
  } else if (grossRevenue !== null && adjOpExpVal > 0) {
    adjustedSDE = grossRevenue - adjOpExpVal;
    sdeSource = "calculated_buyer";
  } else if (grossRevenue !== null && totalOpExpVal > 0) {
    adjustedSDE = grossRevenue - totalOpExpVal;
    sdeSource = "calculated_total";
  }

  const calculatedAdjustedSDE = (grossRevenue !== null && adjOpExpVal > 0)
    ? grossRevenue - adjOpExpVal
    : (grossRevenue !== null && totalOpExpVal > 0)
      ? grossRevenue - totalOpExpVal
      : null;

  const sellerSDE = sellerClaimedNI !== null ? sellerClaimedNI + sellerAddBacks : null;

  // ── Ratios ───────────────────────────────────────────────────────────────────
  const netMargin         = safeDivide(adjustedSDE, grossRevenue);
  const expenseRatio      = safeDivide(totalOperatingExpenses, grossRevenue);
  const utilityPctGross   = safeDivide(totalUtilities, grossRevenue);
  const payrollPctGross   = payroll > 0 ? safeDivide(payroll, grossRevenue) : null;
  const rentPctGross      = safeDivide(annualRent, grossRevenue);

  // Real estate metrics
  const rentPerSqFt  = safeDivide(annualRent, squareFeet);
  const rentPerMachine  = (annualRent !== null && numMachines > 0) ? annualRent / numMachines : null;
  const revPerSqFt   = safeDivide(grossRevenue, squareFeet);
  const revPerMachine   = (grossRevenue !== null && numMachines > 0) ? grossRevenue / numMachines : null;
  const sdePerSqFt   = safeDivide(adjustedSDE, squareFeet);

  // ── Valuation ────────────────────────────────────────────────────────────────
  const askingMultiple        = safeDivide(askingPrice, adjustedSDE);
  const sellerClaimedMultiple = safeDivide(askingPrice, sellerClaimedNI);
  const revenueMultiple       = safeDivide(askingPrice, grossRevenue);
  const maxOffer              = adjustedSDE !== null ? adjustedSDE * targetMultiple : null;
  const priceGap              = (askingPrice !== null && maxOffer !== null) ? askingPrice - maxOffer : null;
  const priceGapPct           = safeDivide(priceGap, askingPrice);
  const lowValuation          = adjustedSDE !== null ? adjustedSDE * 2.5 : null;
  const baseValuation         = adjustedSDE !== null ? adjustedSDE * 3.5 : null;
  const aggressiveValuation   = adjustedSDE !== null ? adjustedSDE * 4.5 : null;
  const valuationSpread       = (aggressiveValuation !== null && lowValuation !== null) ? aggressiveValuation - lowValuation : null;

  // ── Financing ────────────────────────────────────────────────────────────────
  const downPayment  = askingPrice !== null ? (askingPrice * downPaymentPct) / 100 : null;
  const loanAmount   = (askingPrice !== null && downPayment !== null)
    ? Math.max(0, askingPrice - downPayment - sellerFinAmt)
    : null;
  const closingCosts = askingPrice !== null ? (askingPrice * closingCostPct) / 100 : null;
  const totalCashNeeded = (downPayment !== null && closingCosts !== null)
    ? downPayment + closingCosts + sbaFees + workingCapital + capexBudget
    : null;

  const bankMonthlyDS = calculateMonthlyPayment(loanAmount, interestRate, amortYears);
  const sellerFinMthlyPmt = sellerFinAmt > 0
    ? calculateMonthlyPayment(sellerFinAmt, sellerFinRate, sellerFinAmort)
    : null;

  const bankDS   = bankMonthlyDS   ?? 0;
  const sellerDS = sellerFinMthlyPmt ?? 0;
  const totalMonthlyDS = (bankDS + sellerDS) > 0 ? bankDS + sellerDS : null;
  const annualDebtService = totalMonthlyDS !== null ? totalMonthlyDS * 12 : null;

  const cashFlowAfterDebt   = (adjustedSDE !== null && annualDebtService !== null) ? adjustedSDE - annualDebtService : null;
  const monthlyNetCashFlow  = cashFlowAfterDebt !== null ? cashFlowAfterDebt / 12 : null;
  const dscr                = safeDivide(adjustedSDE, annualDebtService);
  const cashOnCashReturn    = safeDivide(cashFlowAfterDebt, totalCashNeeded);

  const breakEvenRevenue    = (totalOperatingExpenses !== null && annualDebtService !== null)
    ? totalOperatingExpenses + annualDebtService : null;
  const breakEvenRevenuePct = safeDivide(breakEvenRevenue, grossRevenue);

  // New lender metrics
  const debtYield          = safeDivide(adjustedSDE, loanAmount);
  const ltv                = safeDivide(loanAmount, askingPrice);
  const debtServicePctGross = safeDivide(annualDebtService, grossRevenue);

  // ── Equipment capex ──────────────────────────────────────────────────────────
  const machPct               = pctNeedReplace / 100;
  const washerReplCount       = Math.round(washerCount * machPct);
  const dryerReplCount        = Math.round(dryerCount * machPct);
  const washerReplCost        = washerReplCount * avgWasherCost;
  const dryerReplCost         = dryerReplCount * avgDryerCost;
  const capexSubtotalVal      = washerReplCost + dryerReplCost + installBudget;
  const capexContingencyVal   = capexSubtotalVal * (capexContPct / 100);
  const totalEquipmentCapex   = capexSubtotalVal > 0 ? capexSubtotalVal + capexContingencyVal : null;
  const capexPerMachine       = (totalEquipmentCapex !== null && numMachines > 0) ? totalEquipmentCapex / numMachines : null;
  const capexAdjCashNeeded    = (totalCashNeeded !== null && totalEquipmentCapex !== null) ? totalCashNeeded + totalEquipmentCapex : null;
  const capexAdjCashOnCash    = safeDivide(cashFlowAfterDebt, capexAdjCashNeeded);

  // ── Upside model ─────────────────────────────────────────────────────────────
  const wfIncrease    = toNum(deal.washFoldRevenueIncrease)         ?? 0;
  const pdIncrease    = toNum(deal.pickupDeliveryRevenueIncrease)   ?? 0;
  const commIncrease  = toNum(deal.commercialRevenueIncrease)       ?? 0;
  const hoursIncrease = toNum(deal.hoursExpansionRevenueIncrease)   ?? 0;
  const otherUp       = toNum(deal.otherUpside)                     ?? 0;
  const laborSav      = toNum(deal.laborSavings)                    ?? 0;
  const utilitySav    = toNum(deal.utilitySavings)                  ?? 0;
  const priceIncrPct  = toNum(deal.priceIncreasePercent)            ?? 0;

  const revenueUpsideVal     = wfIncrease + pdIncrease + commIncrease + hoursIncrease + otherUp;
  const priceIncUpsideVal    = grossRevenue !== null ? (grossRevenue * priceIncrPct) / 100 : 0;
  const costSavingsVal       = laborSav + utilitySav;
  const totalUpsideVal       = revenueUpsideVal + priceIncUpsideVal + costSavingsVal;

  const revenueUpside        = revenueUpsideVal > 0 ? revenueUpsideVal : null;
  const priceIncreaseUpside  = priceIncUpsideVal > 0 ? priceIncUpsideVal : null;
  const costSavings          = costSavingsVal > 0 ? costSavingsVal : null;
  const totalUpside          = totalUpsideVal > 0 ? totalUpsideVal : null;
  const upsidePctGross       = grossRevenue && totalUpsideVal > 0 ? safeDivide(totalUpsideVal, grossRevenue) : null;

  const projectedRevenue     = grossRevenue !== null ? grossRevenue + revenueUpsideVal + priceIncUpsideVal : null;
  const projectedAdjustedSDE = adjustedSDE !== null ? adjustedSDE + revenueUpsideVal + priceIncUpsideVal + costSavingsVal : null;
  const projectedMultiple    = safeDivide(askingPrice, projectedAdjustedSDE);
  const projectedCFAD        = (projectedAdjustedSDE !== null && annualDebtService !== null) ? projectedAdjustedSDE - annualDebtService : null;
  const projectedCashOnCash  = safeDivide(projectedCFAD, totalCashNeeded);

  // ── Scenario analysis ────────────────────────────────────────────────────────
  const makeScenario = (
    label: string, revMult: number, expMult: number
  ): ScenarioResult => {
    const sRev = grossRevenue !== null ? grossRevenue * revMult : null;
    const sExp = totalOperatingExpenses !== null ? totalOperatingExpenses * expMult : null;
    const sSDE = sRev !== null && sExp !== null ? sRev - sExp : null;
    const sCFAD = sSDE !== null && annualDebtService !== null ? sSDE - annualDebtService : null;
    return {
      label,
      revMultiplier: revMult,
      expMultiplier: expMult,
      revenue: sRev,
      adjustedSDE: sSDE,
      annualDebtService,
      cashFlowAfterDebt: sCFAD,
      dscr: safeDivide(sSDE, annualDebtService),
      cashOnCash: safeDivide(sCFAD, totalCashNeeded),
    };
  };

  const scenarios: ScenarioResult[] = [
    makeScenario("Stress",   0.80, 1.10),
    makeScenario("Downside", 0.90, 1.05),
    makeScenario("Base",     1.00, 1.00),
    makeScenario("Upside",   1.15, 1.00),
  ];

  // ── Deal score — start at 100, subtract ──────────────────────────────────────
  let score = 100;

  // DSCR penalty
  if (dscr !== null && dscr < 1.0) {
    score -= 30;
  } else if (dscr !== null && dscr < 1.25) {
    score -= 20;
  } else if (dscr !== null && dscr >= 1.50) {
    score += 5;
  }

  // Cash-on-cash penalty
  if (cashOnCashReturn !== null && cashOnCashReturn < 0.05) {
    score -= 15;
  } else if (cashOnCashReturn !== null && cashOnCashReturn < 0.10) {
    score -= 10;
  } else if (cashOnCashReturn !== null && cashOnCashReturn >= 0.20) {
    score += 5;
  }

  // Rent penalty
  if (rentPctGross !== null && rentPctGross > 0.30) {
    score -= 20;
  } else if (rentPctGross !== null && rentPctGross > 0.25) {
    score -= 15;
  } else if (rentPctGross !== null && rentPctGross > 0.20) {
    score -= 10;
  }

  // Valuation penalty
  if (askingMultiple !== null && askingMultiple > 5.0) {
    score -= 15;
  } else if (askingMultiple !== null && askingMultiple > 4.0) {
    score -= 5;
  }

  // Machine age penalty
  if (avgMachineAge !== null && avgMachineAge > 16) {
    score -= 15;
  } else if (avgMachineAge !== null && avgMachineAge > 12) {
    score -= 10;
  } else if (avgMachineAge !== null && avgMachineAge <= 7) {
    score += 5;
  }

  // Lease penalty
  if (leaseYears !== null && leaseYears < 3) {
    score -= 20;
  } else if (leaseYears !== null && leaseYears < 5) {
    score -= 10;
  } else if (leaseYears !== null && leaseYears >= 10) {
    score += 5;
  }

  // Price gap penalty
  if (priceGap !== null && priceGap > 0) {
    score -= 5;
    if (priceGapPct !== null && priceGapPct > 0.30) score -= 5;
  }

  // Revenue data quality penalty
  if (revenueBreakdownDiffPct !== null && Math.abs(revenueBreakdownDiffPct) > 0.20) {
    score -= 5;
  }

  // External red flags
  if (externalRedFlag !== null && externalRedFlag >= 4) score -= 10;
  if (externalRedFlag !== null && externalRedFlag >= 6) score -= 10;

  // Upside bonus
  if (upsidePctGross !== null && upsidePctGross > 0.15) score += 5;

  const calculatedDealScore = Math.max(0, Math.min(100, Math.round(score)));

  const dealQuality =
    calculatedDealScore >= 80 ? "Strong" :
    calculatedDealScore >= 65 ? "Good"   :
    calculatedDealScore >= 50 ? "Fair"   :
    calculatedDealScore >= 35 ? "Weak"   : "Poor";

  // ── Offer recommendation ──────────────────────────────────────────────────────
  let suggestedMultiple = 3.5;

  // Positive adjustments
  if (calculatedDealScore >= 80)                             suggestedMultiple += 0.50;
  if (leaseYears !== null && leaseYears >= 10)              suggestedMultiple += 0.25;
  if (avgMachineAge !== null && avgMachineAge <= 7)         suggestedMultiple += 0.25;
  if (dscr !== null && dscr >= 1.50)                        suggestedMultiple += 0.25;
  if (cashOnCashReturn !== null && cashOnCashReturn >= 0.20) suggestedMultiple += 0.25;

  // Negative adjustments
  if (externalRedFlag !== null && externalRedFlag >= 6)    suggestedMultiple -= 0.50;
  if (rentPctGross !== null && rentPctGross >= 0.20)        suggestedMultiple -= 0.50;
  if (leaseYears !== null && leaseYears < 5)                suggestedMultiple -= 0.50;
  if (avgMachineAge !== null && avgMachineAge > 12)         suggestedMultiple -= 0.25;
  if (dscr !== null && dscr < 1.25)                         suggestedMultiple -= 0.50;
  if (cashOnCashReturn !== null && cashOnCashReturn < 0.10) suggestedMultiple -= 0.25;

  suggestedMultiple = Math.max(2.0, Math.min(5.0, parseFloat(suggestedMultiple.toFixed(2))));

  const suggestedOffer       = adjustedSDE !== null ? adjustedSDE * suggestedMultiple : null;
  const suggestedOfferGap    = (askingPrice !== null && suggestedOffer !== null) ? askingPrice - suggestedOffer : null;
  const suggestedOfferGapPct = safeDivide(suggestedOfferGap, askingPrice);

  let offerRecommendation = "Not enough data to make a recommendation.";
  if (askingPrice !== null && suggestedOffer !== null) {
    if (askingPrice <= suggestedOffer) {
      offerRecommendation = "Price is at or below suggested offer. Move forward.";
    } else if (suggestedOfferGapPct !== null && suggestedOfferGapPct <= 0.10) {
      offerRecommendation = "Small gap — negotiate. May close with concessions.";
    } else if (suggestedOfferGapPct !== null && suggestedOfferGapPct <= 0.20) {
      offerRecommendation = "Moderate gap — negotiate hard or request seller financing.";
    } else if (suggestedOfferGapPct !== null && suggestedOfferGapPct <= 0.35) {
      offerRecommendation = "Large pricing gap. Needs seller financing or exceptional upside.";
    } else {
      offerRecommendation = "Likely overpriced. Unless seller numbers are proven, this deal needs heavy discounting.";
    }
  }

  // ── Warnings ─────────────────────────────────────────────────────────────────
  const warnings: WarningItem[] = [];

  // DSCR warnings
  if (dscr !== null && dscr < 1.0) {
    warnings.push({ level: "danger", message: "DSCR below 1.0x — deal does not cover debt service at current numbers.", category: "financing" });
  } else if (dscr !== null && dscr < 1.25) {
    warnings.push({ level: "warn", message: `DSCR is ${dscr.toFixed(2)}x — below 1.25x minimum. Financing may be difficult.`, category: "financing" });
  }

  // CoC warnings
  if (cashOnCashReturn !== null && cashOnCashReturn < 0.0) {
    warnings.push({ level: "danger", message: "Negative cash-on-cash return — deal loses money after debt service.", category: "financing" });
  } else if (cashOnCashReturn !== null && cashOnCashReturn < 0.08) {
    warnings.push({ level: "warn", message: `Cash-on-cash return is ${(cashOnCashReturn * 100).toFixed(1)}% — below 8% threshold for laundromat acquisitions.`, category: "financing" });
  }

  // Rent warnings
  if (rentPctGross !== null && rentPctGross > 0.30) {
    warnings.push({ level: "danger", message: `Rent is ${(rentPctGross * 100).toFixed(1)}% of gross — critically high. Business may not be viable long-term.`, category: "rent" });
  } else if (rentPctGross !== null && rentPctGross > 0.20) {
    warnings.push({ level: "warn", message: `Rent is ${(rentPctGross * 100).toFixed(1)}% of gross — high. Target is ≤ 20%.`, category: "rent" });
  }

  // Valuation warnings
  if (askingMultiple !== null && askingMultiple > 5.0) {
    warnings.push({ level: "warn", message: `Asking multiple of ${askingMultiple.toFixed(2)}x is aggressive. Laundromats rarely justify above 5x.`, category: "valuation" });
  }

  // Machine age warning
  if (avgMachineAge !== null && avgMachineAge > 15) {
    warnings.push({ level: "warn", message: `Average machine age of ${avgMachineAge} years — significant replacement capex likely in year 1–2.`, category: "capex" });
  }

  // Lease warning
  if (leaseYears !== null && leaseYears < 3) {
    warnings.push({ level: "danger", message: `Only ${leaseYears} years left on lease — major re-negotiation risk and potential business loss.`, category: "lease" });
  } else if (leaseYears !== null && leaseYears < 5) {
    warnings.push({ level: "warn", message: `${leaseYears} years remaining on lease — verify renewal options before closing.`, category: "lease" });
  }

  // Revenue data quality warnings
  if (
    sellerClaimedNI !== null && adjustedSDE !== null &&
    adjustedSDE < sellerClaimedNI * 0.80
  ) {
    warnings.push({ level: "warn", message: "Adjusted SDE is significantly lower than seller's claimed income. Verify add-backs and expenses carefully.", category: "revenue" });
  }

  if (revenueBreakdownDiffPct !== null && Math.abs(revenueBreakdownDiffPct) > 0.50) {
    warnings.push({ level: "info", message: "Revenue breakdown accounts for less than half of reported gross revenue. Consider entering self-service revenue separately.", category: "data" });
  }

  // Capex warning
  if (totalEquipmentCapex !== null && askingPrice !== null && totalEquipmentCapex > askingPrice * 0.25) {
    warnings.push({ level: "warn", message: `Equipment capex estimate (${formatCurrencyCalc(totalEquipmentCapex)}) exceeds 25% of asking price — factor into total investment.`, category: "capex" });
  }

  // Cash needed warning
  if (totalCashNeeded !== null && askingPrice !== null && totalCashNeeded > askingPrice * 0.20) {
    warnings.push({ level: "info", message: `Total cash needed (${formatCurrencyCalc(totalCashNeeded)}) is high relative to asking price.`, category: "financing" });
  }

  return {
    askingPrice,
    grossRevenue,
    targetMultiple,
    annualRent,
    numMachines,

    sellerClaimedNetIncome: sellerClaimedNI,
    sellerClaimedAddBacks: sellerAddBacks,
    sellerSDE,
    calculatedAdjustedSDE,
    adjustedSDE,
    sdeSource,

    revenueBreakdownTotal,
    revenueBreakdownDiff,
    revenueBreakdownDiffPct,
    washFoldRevPct,
    pickupDeliveryRevPct: pickupDelRevPct,
    commercialRevPct: commRevPct,

    totalUtilities,
    totalOperatingExpenses,
    adjustedOperatingExpenses,
    expenseRatio,
    utilityPctGross,
    payrollPctGross,
    rentPctGross,
    netMargin,

    rentPerSqFt,
    rentPerMachine,
    revPerSqFt,
    revPerMachine,
    sdePerSqFt,

    askingMultiple,
    sellerClaimedMultiple,
    revenueMultiple,
    maxOffer,
    priceGap,
    priceGapPct,
    lowValuation,
    baseValuation,
    aggressiveValuation,
    valuationSpread,

    downPayment,
    loanAmount,
    closingCosts,
    totalCashNeeded,
    bankMonthlyDebtService: bankMonthlyDS,
    sellerFinancingMonthlyPayment: sellerFinMthlyPmt,
    totalMonthlyDebtService: totalMonthlyDS,
    annualDebtService,
    cashFlowAfterDebt,
    monthlyNetCashFlow,

    dscr,
    cashOnCashReturn,
    breakEvenRevenue,
    breakEvenRevenuePct,
    debtYield,
    ltv,
    debtServicePctGross,

    washerReplacementCount: washerReplCount,
    dryerReplacementCount: dryerReplCount,
    washerReplacementCost: washerReplCost > 0 ? washerReplCost : null,
    dryerReplacementCost: dryerReplCost > 0 ? dryerReplCost : null,
    capexSubtotal: capexSubtotalVal > 0 ? capexSubtotalVal : null,
    capexContingency: capexContingencyVal > 0 ? capexContingencyVal : null,
    totalEquipmentCapex,
    capexPerMachine,
    capexAdjustedCashNeeded: capexAdjCashNeeded,
    capexAdjustedCashOnCash: capexAdjCashOnCash,

    revenueUpside,
    priceIncreaseUpside,
    costSavings,
    totalUpside,
    upsidePctGross,
    projectedRevenue,
    projectedAdjustedSDE,
    projectedMultiple,
    projectedCashFlowAfterDebt: projectedCFAD,
    projectedCashOnCash,

    scenarios,

    calculatedDealScore,
    dealQuality,

    suggestedMultiple,
    suggestedOffer,
    suggestedOfferGap,
    suggestedOfferGapPct,
    offerRecommendation,

    warnings,
  };
}

/** Backward-compatible alias */
export const calculateDealFinancials = calculateFullUnderwriting;
