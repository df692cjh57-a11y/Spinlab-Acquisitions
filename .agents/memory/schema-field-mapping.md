---
name: Schema field mapping
description: Which DB columns map to which financial concepts in deals table
---

**Why:** The deals table has overlapping/legacy field names that are easy to confuse.

Field mappings:
- `net_income` / `netIncome` = seller-claimed net income (what the seller says)
- `seller_claimed_net_income` / `sellerClaimedNetIncome` = same concept, preferred new field
- `adjusted_net_income` / `adjustedNetIncome` = manual Adjusted SDE override entered by buyer
- All calculated SDE is derived in `financialCalculations.ts`, NOT stored in DB

New fields added to deals table (May 2026):
- Revenue detail: washFoldRevenue, pickupDeliveryRevenue, commercialRevenue, vendingRevenue, otherRevenue
- Expense detail: payroll, water, gas, electric, insurance, repairsMaintenance, supplies, merchantFees, softwareFees, marketing, cleaning, accounting, licensesPermits, otherExpenses
- Buyer adjustments: adjustedPayroll, replacementManagerSalary, capexReserve, maintenanceReserve, otherBuyerAdjustments
- Financing: downPaymentPercent, interestRate, loanTermYears, amortizationYears, closingCostPercent, sbaFees, workingCapitalReserve, capexBudget, sellerFinancingAmount, sellerFinancingInterestRate, sellerFinancingAmortizationYears
- Equipment: averageWasherReplacementCost, averageDryerReplacementCost, percentMachinesNeedingReplacement, installationBudget, capexContingencyPercent
- Upside: washFoldRevenueIncrease, pickupDeliveryRevenueIncrease, commercialRevenueIncrease, priceIncreasePercent, hoursExpansionRevenueIncrease, laborSavings, utilitySavings, otherUpside
