---
name: Financial calculations architecture
description: How financialCalculations.ts is structured and what fields it produces
---

## Rule
`calculateFullUnderwriting(deal)` is the single authoritative entry point. `calculateDealFinancials` is a re-export alias kept for backward compat — never add new logic there.

## Key output fields
- `adjustedSDE` + `sdeSource` — tracks which path produced the SDE ("manual" | "calculated_buyer" | "calculated_total" | "insufficient")
- `sellerSDE` = sellerClaimedNetIncome + sellerClaimedAddBacks
- `calculatedAdjustedSDE` = grossRevenue - totalOperatingExpenses (buyer bottom-up)
- `calculatedDealScore` — starts at 100, deducts per DSCR/CoC/rent/multiple/machine age/lease/priceGap/red flags
- `debtYield`, `ltv`, `debtServicePctGross` — new lender metrics
- `rentPerMachine`, `revPerMachine`, `revPerSqFt`, `sdePerSqFt` — space/machine efficiency
- `scenarios` — array of 4: Stress / Downside / Base / Upside

**Why:** single source of truth for all computed metrics prevents drift between table, dashboard, and detail views.

**How to apply:** always import `calculateFullUnderwriting` — never call `calculateDealFinancials` in new code.
