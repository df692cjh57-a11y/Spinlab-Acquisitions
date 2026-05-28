// ─────────────────────────────────────────────────────────────────────────────
// Spinlab Financial Calculation Helpers
// All calculations are pure functions — safe, no NaN, no Infinity.
// ─────────────────────────────────────────────────────────────────────────────

/** Safely parse a value to a number, returning null if invalid / zero-length */
export function toNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isFinite(n) ? n : null;
}

/** Returns null instead of Infinity / NaN on division-by-zero or bad inputs */
export function safeDivide(num: number | null, den: number | null): number | null {
  if (num === null || den === null || den === 0) return null;
  const result = num / den;
  return isFinite(result) ? result : null;
}

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
  const payment = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return isFinite(payment) ? payment : null;
}

// ─── Deal input type (flexible — handles string numerics from DB) ─────────────
export type DealInput = {
  // Basic
  askingPrice?: string | number | null;
  grossRevenue?: string | number | null;
  netIncome?: string | number | null;
  sellerClaimedNetIncome?: string | number | null;
  adjustedNetIncome?: string | number | null;   // manual override
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
  // Scoring (passed in from API)
  dealScore?: string | number | null;
  redFlagScore?: string | number | null;
};

// ─── Full results type ────────────────────────────────────────────────────────
export type DealFinancials = {
  // Core inputs (resolved)
  askingPrice: number | null;
  grossRevenue: number | null;
  adjustedSDE: number | null;          // final adjusted SDE used for all calcs
  sellerClaimedNetIncome: number | null;
  targetMultiple: number;
  annualRent: number | null;

  // Revenue
  revenueBreakdownTotal: number | null;

  // Expenses
  totalUtilities: number | null;
  totalOperatingExpenses: number | null;
  adjustedOperatingExpenses: number | null;

  // Ratios
  netMargin: number | null;
  expenseRatio: number | null;
  utilityPctGross: number | null;
  payrollPctGross: number | null;
  rentPctGross: number | null;
  rentPerSqFt: number | null;

  // Valuation
  askingMultiple: number | null;
  sellerClaimedMultiple: number | null;
  revenueMultiple: number | null;
  maxOffer: number | null;
  priceGap: number | null;
  priceGapPct: number | null;
  lowValuation: number | null;
  baseValuation: number | null;
  aggressiveValuation: number | null;

  // Financing
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
  dscr: number | null;
  cashOnCashReturn: number | null;
  breakEvenRevenue: number | null;
  breakEvenRevenuePct: number | null;

  // Equipment capex
  washerReplacementCost: number | null;
  dryerReplacementCost: number | null;
  capexSubtotal: number | null;
  capexContingency: number | null;
  totalEquipmentCapex: number | null;
  capexAdjustedCashNeeded: number | null;
  capexAdjustedCashOnCash: number | null;

  // Upside model
  revenueUpside: number | null;
  priceIncreaseUpside: number | null;
  costSavings: number | null;
  projectedRevenue: number | null;
  projectedAdjustedSDE: number | null;
  projectedMultiple: number | null;
  projectedCashFlowAfterDebt: number | null;
  projectedCashOnCash: number | null;

  // Scenarios
  scenarios: ScenarioResult[];

  // Offer recommendation
  suggestedMultiple: number;
  suggestedOffer: number | null;
  offerRecommendation: string;

  // Warnings
  warnings: WarningItem[];
};

export type ScenarioResult = {
  label: string;
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
};

// ─── Main calculation function ────────────────────────────────────────────────
export function calculateDealFinancials(deal: DealInput): DealFinancials {
  // ── Parse all inputs ────────────────────────────────────────────────────────
  const askingPrice = toNum(deal.askingPrice);
  const grossRevenue = toNum(deal.grossRevenue);
  const sellerClaimedNetIncome = toNum(deal.sellerClaimedNetIncome) ?? toNum(deal.netIncome);
  const manualAdjustedSDE = toNum(deal.adjustedNetIncome);
  const targetMultiple = toNum(deal.targetMultiple) ?? 3.5;
  const squareFeet = toNum(deal.squareFootage);
  const leaseYearsRemaining = toNum(deal.leaseYearsRemaining);

  // Financing defaults
  const downPaymentPct = toNum(deal.downPaymentPercent) ?? 10;
  const interestRate = toNum(deal.interestRate) ?? 10;
  const amortizationYears = toNum(deal.amortizationYears) ?? 10;
  const closingCostPct = toNum(deal.closingCostPercent) ?? 3;
  const sbaFees = toNum(deal.sbaFees) ?? 0;
  const workingCapitalReserve = toNum(deal.workingCapitalReserve) ?? 0;
  const capexBudget = toNum(deal.capexBudget) ?? 0;
  const sellerFinancingAmount = toNum(deal.sellerFinancingAmount) ?? 0;
  const sellerFinancingInterestRate = toNum(deal.sellerFinancingInterestRate) ?? 0;
  const sellerFinancingAmortYears = toNum(deal.sellerFinancingAmortizationYears) ?? 10;

  // Equipment defaults
  const washerCount = toNum(deal.numWashers) ?? 0;
  const dryerCount = toNum(deal.numDryers) ?? 0;
  const avgWasherCost = toNum(deal.averageWasherReplacementCost) ?? 8000;
  const avgDryerCost = toNum(deal.averageDryerReplacementCost) ?? 5000;
  const pctNeedingReplacement = toNum(deal.percentMachinesNeedingReplacement) ?? 0;
  const installationBudget = toNum(deal.installationBudget) ?? 0;
  const capexContingencyPct = toNum(deal.capexContingencyPercent) ?? 10;

  const avgMachineAge = toNum(deal.avgMachineAge);
  const dealScore = toNum(deal.dealScore);
  const redFlagScore = toNum(deal.redFlagScore);

  // ── Revenue detail ──────────────────────────────────────────────────────────
  const washFoldRev = toNum(deal.washFoldRevenue) ?? 0;
  const pickupDelRev = toNum(deal.pickupDeliveryRevenue) ?? 0;
  const commercialRev = toNum(deal.commercialRevenue) ?? 0;
  const vendingRev = toNum(deal.vendingRevenue) ?? 0;
  const otherRev = toNum(deal.otherRevenue) ?? 0;
  const revenueBreakdownTotal =
    washFoldRev + pickupDelRev + commercialRev + vendingRev + otherRev;
  const revenueBreakdownTotalOrNull = revenueBreakdownTotal > 0 ? revenueBreakdownTotal : null;

  // ── Expense detail ──────────────────────────────────────────────────────────
  const annualRent = toNum(deal.monthlyRent) != null ? (toNum(deal.monthlyRent)! * 12) : null;
  const payroll = toNum(deal.payroll) ?? 0;
  const water = toNum(deal.water) ?? 0;
  const gas = toNum(deal.gas) ?? 0;
  const electric = toNum(deal.electric) ?? 0;
  const insurance = toNum(deal.insurance) ?? 0;
  const repairsMaint = toNum(deal.repairsMaintenance) ?? 0;
  const supplies = toNum(deal.supplies) ?? 0;
  const merchantFees = toNum(deal.merchantFees) ?? 0;
  const softwareFees = toNum(deal.softwareFees) ?? 0;
  const marketing = toNum(deal.marketing) ?? 0;
  const cleaning = toNum(deal.cleaning) ?? 0;
  const accounting = toNum(deal.accounting) ?? 0;
  const licensesPermits = toNum(deal.licensesPermits) ?? 0;
  const otherExpenses = toNum(deal.otherExpenses) ?? 0;

  const totalUtilitiesVal = water + gas + electric;
  const totalUtilities = totalUtilitiesVal > 0 ? totalUtilitiesVal : null;

  const annualRentVal = annualRent ?? 0;
  const totalOpExpVal =
    payroll + annualRentVal + water + gas + electric + insurance +
    repairsMaint + supplies + merchantFees + softwareFees +
    marketing + cleaning + accounting + licensesPermits + otherExpenses;
  const totalOperatingExpenses = totalOpExpVal > 0 ? totalOpExpVal : null;

  // ── Buyer adjustments ────────────────────────────────────────────────────────
  const adjustedPayroll = toNum(deal.adjustedPayroll) ?? payroll;
  const replacementManagerSalary = toNum(deal.replacementManagerSalary) ?? 0;
  const capexReserve = toNum(deal.capexReserve) ?? 0;
  const maintenanceReserve = toNum(deal.maintenanceReserve) ?? 0;
  const otherBuyerAdj = toNum(deal.otherBuyerAdjustments) ?? 0;

  const adjOpExpVal =
    adjustedPayroll + annualRentVal + water + gas + electric + insurance +
    repairsMaint + supplies + merchantFees + softwareFees +
    marketing + cleaning + accounting + licensesPermits +
    replacementManagerSalary + capexReserve + maintenanceReserve + otherBuyerAdj;
  const adjustedOperatingExpenses = adjOpExpVal > 0 ? adjOpExpVal : null;

  // ── Adjusted SDE ─────────────────────────────────────────────────────────────
  // Priority: manual entry → calculated from adjusted expenses → calculated from total expenses
  let adjustedSDE: number | null = manualAdjustedSDE;
  if (adjustedSDE === null && grossRevenue !== null && adjOpExpVal > 0) {
    adjustedSDE = grossRevenue - adjOpExpVal;
  }
  if (adjustedSDE === null && grossRevenue !== null && totalOpExpVal > 0) {
    adjustedSDE = grossRevenue - totalOpExpVal;
  }

  // ── Ratios ───────────────────────────────────────────────────────────────────
  const netMargin = safeDivide(adjustedSDE, grossRevenue);
  const expenseRatio = safeDivide(totalOperatingExpenses, grossRevenue);
  const utilityPctGross = safeDivide(totalUtilities, grossRevenue);
  const payrollPctGross = safeDivide(payroll > 0 ? payroll : null, grossRevenue);
  const rentPctGross = safeDivide(annualRent, grossRevenue);
  const rentPerSqFt = safeDivide(annualRent, squareFeet);

  // ── Valuation ────────────────────────────────────────────────────────────────
  const askingMultiple = safeDivide(askingPrice, adjustedSDE);
  const sellerClaimedMultiple = safeDivide(askingPrice, sellerClaimedNetIncome);
  const revenueMultiple = safeDivide(askingPrice, grossRevenue);
  const maxOffer = adjustedSDE !== null ? adjustedSDE * targetMultiple : null;
  const priceGap = askingPrice !== null && maxOffer !== null ? askingPrice - maxOffer : null;
  const priceGapPct = safeDivide(priceGap, askingPrice);
  const lowValuation = adjustedSDE !== null ? adjustedSDE * 2.5 : null;
  const baseValuation = adjustedSDE !== null ? adjustedSDE * 3.5 : null;
  const aggressiveValuation = adjustedSDE !== null ? adjustedSDE * 4.5 : null;

  // ── Financing ────────────────────────────────────────────────────────────────
  const downPayment = askingPrice !== null ? (askingPrice * downPaymentPct) / 100 : null;
  const loanAmount =
    askingPrice !== null && downPayment !== null
      ? askingPrice - downPayment - sellerFinancingAmount
      : null;
  const closingCosts = askingPrice !== null ? (askingPrice * closingCostPct) / 100 : null;
  const totalCashNeeded =
    downPayment !== null && closingCosts !== null
      ? downPayment + closingCosts + sbaFees + workingCapitalReserve + capexBudget
      : null;

  const bankMonthlyDebtService = calculateMonthlyPayment(loanAmount, interestRate, amortizationYears);
  const sellerFinancingMonthlyPayment =
    sellerFinancingAmount > 0
      ? calculateMonthlyPayment(sellerFinancingAmount, sellerFinancingInterestRate, sellerFinancingAmortYears)
      : null;

  const bankDS = bankMonthlyDebtService ?? 0;
  const sellerDS = sellerFinancingMonthlyPayment ?? 0;
  const totalMonthlyDebtService = bankDS + sellerDS > 0 ? bankDS + sellerDS : null;
  const annualDebtService = totalMonthlyDebtService !== null ? totalMonthlyDebtService * 12 : null;

  const cashFlowAfterDebt =
    adjustedSDE !== null && annualDebtService !== null ? adjustedSDE - annualDebtService : null;
  const monthlyNetCashFlow = cashFlowAfterDebt !== null ? cashFlowAfterDebt / 12 : null;
  const dscr = safeDivide(adjustedSDE, annualDebtService);
  const cashOnCashReturn = safeDivide(cashFlowAfterDebt, totalCashNeeded);

  const breakEvenRevenue =
    totalOperatingExpenses !== null && annualDebtService !== null
      ? totalOperatingExpenses + annualDebtService
      : null;
  const breakEvenRevenuePct = safeDivide(breakEvenRevenue, grossRevenue);

  // ── Equipment capex ──────────────────────────────────────────────────────────
  const machPct = pctNeedingReplacement / 100;
  const washerReplacementCost = washerCount * machPct * avgWasherCost;
  const dryerReplacementCost = dryerCount * machPct * avgDryerCost;
  const capexSubtotal = washerReplacementCost + dryerReplacementCost + installationBudget;
  const capexContingency = capexSubtotal * (capexContingencyPct / 100);
  const totalEquipmentCapex = capexSubtotal + capexContingency;
  const capexAdjustedCashNeeded =
    totalCashNeeded !== null ? totalCashNeeded + totalEquipmentCapex : null;
  const capexAdjustedCashOnCash = safeDivide(cashFlowAfterDebt, capexAdjustedCashNeeded);

  // ── Upside model ──────────────────────────────────────────────────────────────
  const wfIncrease = toNum(deal.washFoldRevenueIncrease) ?? 0;
  const pdIncrease = toNum(deal.pickupDeliveryRevenueIncrease) ?? 0;
  const commIncrease = toNum(deal.commercialRevenueIncrease) ?? 0;
  const hoursIncrease = toNum(deal.hoursExpansionRevenueIncrease) ?? 0;
  const otherUp = toNum(deal.otherUpside) ?? 0;
  const laborSav = toNum(deal.laborSavings) ?? 0;
  const utilitySav = toNum(deal.utilitySavings) ?? 0;
  const priceIncreasePct = toNum(deal.priceIncreasePercent) ?? 0;

  const revenueUpside = wfIncrease + pdIncrease + commIncrease + hoursIncrease + otherUp;
  const priceIncreaseUpside =
    grossRevenue !== null ? (grossRevenue * priceIncreasePct) / 100 : 0;
  const costSavings = laborSav + utilitySav;
  const revenueUpsideOrNull = revenueUpside > 0 ? revenueUpside : null;
  const priceIncUpsideOrNull = priceIncreaseUpside > 0 ? priceIncreaseUpside : null;
  const costSavingsOrNull = costSavings > 0 ? costSavings : null;

  const projectedRevenue =
    grossRevenue !== null ? grossRevenue + revenueUpside + priceIncreaseUpside : null;
  const projectedAdjustedSDE =
    adjustedSDE !== null
      ? adjustedSDE + revenueUpside + priceIncreaseUpside + costSavings
      : null;
  const projectedMultiple = safeDivide(askingPrice, projectedAdjustedSDE);
  const projectedCashFlowAfterDebt =
    projectedAdjustedSDE !== null && annualDebtService !== null
      ? projectedAdjustedSDE - annualDebtService
      : null;
  const projectedCashOnCash = safeDivide(projectedCashFlowAfterDebt, totalCashNeeded);

  // ── Scenario analysis ─────────────────────────────────────────────────────────
  const scenarioADS = annualDebtService;

  const makeScenario = (
    label: string,
    revMult: number,
    expMult: number
  ): ScenarioResult => {
    const sRevenue = grossRevenue !== null ? grossRevenue * revMult : null;
    const sExpenses = totalOperatingExpenses !== null ? totalOperatingExpenses * expMult : null;
    const sSDE =
      sRevenue !== null && sExpenses !== null ? sRevenue - sExpenses : null;
    const sCFAD =
      sSDE !== null && scenarioADS !== null ? sSDE - scenarioADS : null;
    const sDSCR = safeDivide(sSDE, scenarioADS);
    const sCoC = safeDivide(sCFAD, totalCashNeeded);
    return { label, revenue: sRevenue, adjustedSDE: sSDE, annualDebtService: scenarioADS, cashFlowAfterDebt: sCFAD, dscr: sDSCR, cashOnCash: sCoC };
  };

  const scenarios: ScenarioResult[] = [
    makeScenario("Downside", 0.90, 1.05),
    makeScenario("Base", 1.0, 1.0),
    makeScenario("Upside", 1.15, 1.05),
  ];

  // ── Offer recommendation ──────────────────────────────────────────────────────
  let suggestedMultiple = 3.5;
  if (dealScore !== null && dealScore >= 80) suggestedMultiple += 0.5;
  if (leaseYearsRemaining !== null && leaseYearsRemaining >= 10) suggestedMultiple += 0.25;
  if (avgMachineAge !== null && avgMachineAge <= 7) suggestedMultiple += 0.25;
  if (redFlagScore !== null && redFlagScore >= 6) suggestedMultiple -= 0.5;
  if (rentPctGross !== null && rentPctGross >= 0.20) suggestedMultiple -= 0.5;
  if (leaseYearsRemaining !== null && leaseYearsRemaining < 5) suggestedMultiple -= 0.5;
  if (avgMachineAge !== null && avgMachineAge > 12) suggestedMultiple -= 0.25;
  if (dscr !== null && dscr < 1.25) suggestedMultiple -= 0.5;
  if (cashOnCashReturn !== null && cashOnCashReturn < 0.10) suggestedMultiple -= 0.25;
  suggestedMultiple = Math.max(2.0, Math.min(5.0, suggestedMultiple));

  const suggestedOffer = adjustedSDE !== null ? adjustedSDE * suggestedMultiple : null;

  let offerRecommendation = "Not enough data to make a recommendation.";
  if (askingPrice !== null && suggestedOffer !== null) {
    const gap = (askingPrice - suggestedOffer) / suggestedOffer;
    if (askingPrice <= suggestedOffer) {
      offerRecommendation = "Price may be workable.";
    } else if (gap <= 0.15) {
      offerRecommendation = "Negotiate. Gap is not impossible.";
    } else if (gap <= 0.35) {
      offerRecommendation = "Large pricing gap. Needs seller financing or major upside.";
    } else {
      offerRecommendation = "Likely overpriced unless seller numbers are proven or upside is exceptional.";
    }
  }

  // ── Warnings ──────────────────────────────────────────────────────────────────
  const warnings: WarningItem[] = [];

  if (dscr !== null && dscr < 1.10) {
    warnings.push({ level: "danger", message: "High risk: deal may not support debt." });
  } else if (dscr !== null && dscr < 1.25) {
    warnings.push({ level: "warn", message: "DSCR below 1.25x. Financing may be difficult." });
  }

  if (cashOnCashReturn !== null && cashOnCashReturn < 0.10) {
    warnings.push({ level: "warn", message: "Low cash-on-cash return relative to acquisition risk." });
  }

  if (totalCashNeeded !== null && askingPrice !== null && totalCashNeeded > askingPrice * 0.25) {
    warnings.push({ level: "warn", message: "High cash requirement." });
  }

  if (rentPctGross !== null && rentPctGross > 0.20) {
    warnings.push({ level: "warn", message: "Rent is high relative to revenue." });
  }

  if (askingMultiple !== null && askingMultiple > 5) {
    warnings.push({ level: "warn", message: "Asking multiple is aggressive." });
  }

  if (
    sellerClaimedNetIncome !== null && adjustedSDE !== null &&
    adjustedSDE < sellerClaimedNetIncome * 0.75
  ) {
    warnings.push({ level: "danger", message: "Seller net income may be overstated. Adjusted SDE is 25%+ lower." });
  }

  if (avgMachineAge !== null && avgMachineAge > 12) {
    warnings.push({ level: "warn", message: "Machine age suggests possible major capex." });
  }

  if (totalEquipmentCapex > 0 && askingPrice !== null && totalEquipmentCapex > askingPrice * 0.20) {
    warnings.push({ level: "danger", message: "Equipment replacement may materially change the deal." });
  }

  if (leaseYearsRemaining !== null && leaseYearsRemaining < 5) {
    warnings.push({ level: "danger", message: "Lease term may be too short for acquisition financing." });
  }

  if (!grossRevenue) warnings.push({ level: "info", message: "Gross revenue missing." });
  if (!adjustedSDE) warnings.push({ level: "info", message: "Adjusted SDE missing." });
  if (!toNum(deal.monthlyRent)) warnings.push({ level: "info", message: "Rent missing." });

  return {
    askingPrice,
    grossRevenue,
    adjustedSDE,
    sellerClaimedNetIncome,
    targetMultiple,
    annualRent,
    revenueBreakdownTotal: revenueBreakdownTotalOrNull,
    totalUtilities,
    totalOperatingExpenses,
    adjustedOperatingExpenses,
    netMargin,
    expenseRatio,
    utilityPctGross,
    payrollPctGross,
    rentPctGross,
    rentPerSqFt,
    askingMultiple,
    sellerClaimedMultiple,
    revenueMultiple,
    maxOffer,
    priceGap,
    priceGapPct,
    lowValuation,
    baseValuation,
    aggressiveValuation,
    downPayment,
    loanAmount,
    closingCosts,
    totalCashNeeded,
    bankMonthlyDebtService,
    sellerFinancingMonthlyPayment,
    totalMonthlyDebtService,
    annualDebtService,
    cashFlowAfterDebt,
    monthlyNetCashFlow,
    dscr,
    cashOnCashReturn,
    breakEvenRevenue,
    breakEvenRevenuePct,
    washerReplacementCost: washerReplacementCost > 0 ? washerReplacementCost : null,
    dryerReplacementCost: dryerReplacementCost > 0 ? dryerReplacementCost : null,
    capexSubtotal: capexSubtotal > 0 ? capexSubtotal : null,
    capexContingency: capexContingency > 0 ? capexContingency : null,
    totalEquipmentCapex: totalEquipmentCapex > 0 ? totalEquipmentCapex : null,
    capexAdjustedCashNeeded,
    capexAdjustedCashOnCash,
    revenueUpside: revenueUpsideOrNull,
    priceIncreaseUpside: priceIncUpsideOrNull,
    costSavings: costSavingsOrNull,
    projectedRevenue,
    projectedAdjustedSDE,
    projectedMultiple,
    projectedCashFlowAfterDebt,
    projectedCashOnCash,
    scenarios,
    suggestedMultiple,
    suggestedOffer,
    offerRecommendation,
    warnings,
  };
}
