---
name: Underwriting calculations
description: Where all deal financial math lives and how it's structured
---

All laundromat deal math is in `artifacts/spinlab/src/lib/financialCalculations.ts`.

**Rule:** Never duplicate formulas in components. Always call `calculateDealFinancials(deal)` and destructure results.

**Why:** Single source of truth prevents drift between the Underwriting display tab and the Financials summary view. The function is pure — safe for hot re-computation on every render.

**How to apply:** Import `calculateDealFinancials` and `DealInput`/`DealFinancials` types from `@/lib/financialCalculations`. Pass the raw deal object (string numerics from DB are handled internally via `toNum()`). Never pre-parse before passing.

Key behaviors:
- `adjustedSDE` priority: manual `adjustedNetIncome` override → calculated from adjusted expenses → calculated from total expenses
- `safeDivide()` returns null (never NaN/Infinity) on zero/missing denominators
- All null results should display "—" or "Not enough data" in UI
- Suggested multiple is clamped to [2.0, 5.0]
