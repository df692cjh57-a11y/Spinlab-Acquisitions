---
name: Deal detail import pattern
description: Where calculateFullUnderwriting is called in deal-detail.tsx
---

## Rule
`deal-detail.tsx` has three call sites — all must use `calculateFullUnderwriting`:
1. `UnderwritingTab` component (~line 113)
2. `FinancialsForm` read-only view (~line 473)
3. `DealDetail` main component (~line 1136)

**Why:** `calculateDealFinancials` was the old name — any stale reference causes a runtime crash because it is not exported from financialCalculations.ts.

**How to apply:** if adding a new call site in deal-detail.tsx, always use `calculateFullUnderwriting`.
