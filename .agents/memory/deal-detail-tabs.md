---
name: Deal detail tab structure
description: Current tab order and component names in deal-detail.tsx after cleanup.
---

# Deal Detail Tab Structure

Tab order (defaultValue="overview"):
1. **Overview** — OverviewTab component: warnings + 10-metric key metrics grid + DealInfoForm
2. **Financials** — FinancialsWithAdvanced: FinancialsForm + collapsible "Show Advanced Underwriting Analysis" (UnderwritingTab)
3. **Lease** — LeaseForm
4. **Operations** — OperationsForm
5. **Red Flags** — RedFlagsTab
6. **Documents** — DocumentsTab
7. **Notes** — NotesTab
8. **Reminders** — RemindersTab

**Why:** Spec required collapsing standalone Underwriting + Deal Info tabs into a single Overview tab. Advanced underwriting is available but hidden by default to reduce clutter.

**How to apply:** When adding new deal sections, insert a new TabsTrigger + TabsContent in the main Tabs block around line 1370. OverviewTab accepts `{ deal, brokers, fin }` props.

# Broker Detail Tab Structure

Tab order (defaultValue="profile"):
1. **Overview** (trigger label changed from "Profile", value stays "profile")
2. **Deals**
3. **Notes**
4. **Reminders**
