import { useParams, Link } from "wouter";
import {
  useGetDeal, useUpdateDeal, getGetDealQueryKey,
  useGetDealRedFlags, useUpdateDealRedFlags, getGetDealRedFlagsQueryKey,
  useListDocuments, useUpdateDocument, getListDocumentsQueryKey,
  useListNotes, useCreateNote, getListNotesQueryKey,
  useListReminders, useCreateReminder, useCompleteReminder, getListRemindersQueryKey,
  useListBrokers
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatCurrency, formatDateShort, isOverdue } from "@/lib/format";
import { calculateFullUnderwriting } from "@/lib/financialCalculations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle, FileCheck,
  CircleDashed, TrendingUp, DollarSign, Zap, AlertOctagon, Info
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ALL_STATUSES = [
  "New Lead","Contacted Broker","NDA Sent","Financials Requested","Financials Received",
  "Underwriting","Site Visit Scheduled","LOI Sent","Negotiation","Under Contract",
  "Due Diligence","Financing","Closed","Dead Deal","Follow Up Later","Stalled",
];

function nd(v: string | number | null | undefined, fmt?: (n: number) => string): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (!isFinite(n)) return "Not enough data";
  return fmt ? fmt(n) : String(n);
}

function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function fmtX(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${v.toFixed(2)}x`;
}

function Metric({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent?: "green" | "red" | "amber" | "blue" }) {
  const cls = accent === "green" ? "text-emerald-600" : accent === "red" ? "text-red-600" : accent === "amber" ? "text-amber-600" : accent === "blue" ? "text-primary" : "text-foreground";
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className={`text-lg font-bold ${cls}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/20">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function WarningBadge({ level, message }: { level: "info" | "warn" | "danger"; message: string }) {
  const conf = {
    info: { cls: "bg-blue-50 text-blue-700 border-blue-200", Icon: Info },
    warn: { cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: AlertTriangle },
    danger: { cls: "bg-red-50 text-red-700 border-red-200", Icon: AlertOctagon },
  }[level];
  return (
    <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded border text-xs font-medium ${conf.cls}`}>
      <conf.Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      {message}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === "Closed" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : ["Dead Deal","Stalled"].includes(status) ? "bg-red-50 text-red-600 border-red-200"
    : ["Under Contract","Due Diligence","Financing","LOI Sent","Negotiation"].includes(status) ? "bg-purple-50 text-purple-700 border-purple-200"
    : "bg-blue-50 text-blue-700 border-blue-200";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${cls}`}>{status}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls = priority === "Hot" ? "bg-rose-50 text-rose-700 border-rose-200"
    : priority === "High" ? "bg-amber-50 text-amber-700 border-amber-200"
    : priority === "Medium" ? "bg-blue-50 text-blue-700 border-blue-100"
    : "bg-gray-50 text-gray-500 border-gray-200";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${cls}`}>{priority}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Underwriting Tab
// ─────────────────────────────────────────────────────────────────────────────

function UnderwritingTab({ deal }: { deal: any }) {
  const fin = calculateFullUnderwriting({
    ...deal,
    redFlagScore: deal.redFlagScore,
  });

  const offerColor = fin.offerRecommendation.startsWith("Price is at")
    ? "text-emerald-600"
    : fin.offerRecommendation.startsWith("Small gap") || fin.offerRecommendation.startsWith("Moderate gap")
    ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-5">
      {/* Warnings — show at top if any exist */}
      {fin.warnings.length > 0 && (
        <SectionCard title={`Warnings · ${fin.warnings.length}`}>
          <div className="space-y-2">
            {fin.warnings.map((w, i) => <WarningBadge key={i} level={w.level} message={w.message} />)}
          </div>
        </SectionCard>
      )}

      {/* Summary Metrics */}
      <SectionCard title="Summary Metrics">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-5">
          <Metric label="Asking Price" value={formatCurrency(fin.askingPrice)} />
          <Metric label="Gross Revenue" value={formatCurrency(fin.grossRevenue)} />
          <Metric label="Adjusted SDE" value={formatCurrency(fin.adjustedSDE)} accent="blue" />
          <Metric
            label="Asking Multiple"
            value={fmtX(fin.askingMultiple)}
            accent={fin.askingMultiple ? fin.askingMultiple > 5 ? "red" : fin.askingMultiple < 3.5 ? "green" : undefined : undefined}
          />
          <Metric
            label="Rent % of Gross"
            value={fmtPct(fin.rentPctGross)}
            accent={fin.rentPctGross ? fin.rentPctGross > 0.20 ? "red" : fin.rentPctGross < 0.12 ? "green" : undefined : undefined}
          />
          <Metric
            label="DSCR"
            value={fin.dscr !== null ? fin.dscr.toFixed(2) + "x" : "—"}
            accent={fin.dscr ? fin.dscr >= 1.5 ? "green" : fin.dscr < 1.25 ? "red" : "amber" : undefined}
          />
          <Metric
            label="Cash-on-Cash"
            value={fmtPct(fin.cashOnCashReturn)}
            accent={fin.cashOnCashReturn ? fin.cashOnCashReturn >= 0.15 ? "green" : fin.cashOnCashReturn < 0.10 ? "red" : "amber" : undefined}
          />
          <Metric label="Max Offer" value={formatCurrency(fin.maxOffer)} sub={`at ${fin.targetMultiple}x`} />
          <Metric label="Suggested Offer" value={formatCurrency(fin.suggestedOffer)} sub={`at ${fin.suggestedMultiple.toFixed(2)}x`} accent="blue" />
          <Metric
            label="Price Gap"
            value={fin.priceGap !== null ? formatCurrency(fin.priceGap) : "—"}
            sub={fin.priceGapPct !== null ? fmtPct(fin.priceGapPct) + " above max" : undefined}
            accent={fin.priceGap !== null ? fin.priceGap > 0 ? "red" : "green" : undefined}
          />
        </div>
      </SectionCard>

      {/* Revenue */}
      <SectionCard title="Revenue">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metric label="Gross Revenue" value={formatCurrency(fin.grossRevenue)} />
          <Metric label="Revenue Breakdown Total" value={fin.revenueBreakdownTotal ? formatCurrency(fin.revenueBreakdownTotal) : "—"} sub={fin.revenueBreakdownTotal ? "from entered line items" : "no breakdown entered"} />
          <Metric label="Unallocated Revenue" value={fin.revenueBreakdownDiff ? formatCurrency(fin.revenueBreakdownDiff) : "—"} sub={fin.revenueBreakdownDiffPct ? fmtPct(fin.revenueBreakdownDiffPct) + " unallocated" : undefined} />
          <Metric label="Net Margin" value={fmtPct(fin.netMargin)} accent={fin.netMargin ? fin.netMargin >= 0.3 ? "green" : fin.netMargin < 0.15 ? "red" : undefined : undefined} />
          <Metric label="Revenue Multiple" value={fmtX(fin.revenueMultiple)} />
          {fin.washFoldRevPct !== null && <Metric label="W&F % of Gross" value={fmtPct(fin.washFoldRevPct)} />}
          {fin.pickupDeliveryRevPct !== null && <Metric label="PD % of Gross" value={fmtPct(fin.pickupDeliveryRevPct)} />}
          {fin.commercialRevPct !== null && <Metric label="Commercial % of Gross" value={fmtPct(fin.commercialRevPct)} />}
        </div>
      </SectionCard>

      {/* Adjusted SDE Reconciliation */}
      <SectionCard title="Adjusted SDE Reconciliation">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metric
            label="Seller Claimed Income"
            value={formatCurrency(fin.sellerClaimedNetIncome)}
            sub="from seller P&L"
          />
          <Metric
            label="Seller SDE (w/ add-backs)"
            value={formatCurrency(fin.sellerSDE)}
            sub={fin.sellerClaimedAddBacks ? `+${formatCurrency(fin.sellerClaimedAddBacks)} add-backs` : "no add-backs entered"}
          />
          <Metric
            label="Buyer-Calculated SDE"
            value={formatCurrency(fin.calculatedAdjustedSDE)}
            sub="from expense line items"
            accent={
              fin.calculatedAdjustedSDE !== null && fin.sellerSDE !== null
                ? fin.calculatedAdjustedSDE < fin.sellerSDE * 0.85 ? "red"
                : fin.calculatedAdjustedSDE > fin.sellerSDE * 1.15 ? "amber"
                : "green"
                : undefined
            }
          />
          <Metric
            label="Adjusted SDE Used"
            value={formatCurrency(fin.adjustedSDE)}
            sub={fin.sdeSource === "manual" ? "manual override" : fin.sdeSource === "calculated_buyer" ? "buyer expenses" : fin.sdeSource === "calculated_total" ? "seller expenses" : "insufficient data"}
            accent="blue"
          />
        </div>
      </SectionCard>

      {/* Expenses */}
      <SectionCard title="Expenses">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metric label="Total Op. Expenses" value={formatCurrency(fin.totalOperatingExpenses)} />
          <Metric label="Adj. Op. Expenses" value={formatCurrency(fin.adjustedOperatingExpenses)} sub="buyer-adjusted" />
          <Metric label="Expense Ratio" value={fmtPct(fin.expenseRatio)} accent={fin.expenseRatio ? fin.expenseRatio > 0.7 ? "red" : undefined : undefined} />
          <Metric label="Annual Rent" value={formatCurrency(fin.annualRent)} />
          <Metric label="Total Utilities" value={formatCurrency(fin.totalUtilities)} />
          <Metric label="Utility % of Gross" value={fmtPct(fin.utilityPctGross)} />
          <Metric label="Payroll % of Gross" value={fmtPct(fin.payrollPctGross)} />
          <Metric label="Rent / Sq Ft" value={fin.rentPerSqFt ? `$${fin.rentPerSqFt.toFixed(2)}/sqft` : "—"} />
        </div>
      </SectionCard>

      {/* Rent & Lease Risk */}
      <SectionCard title="Rent & Lease Risk">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metric
            label="Rent % of Gross"
            value={fmtPct(fin.rentPctGross)}
            sub="target: ≤ 20%"
            accent={fin.rentPctGross !== null ? fin.rentPctGross > 0.25 ? "red" : fin.rentPctGross > 0.20 ? "amber" : "green" : undefined}
          />
          <Metric
            label="Annual Rent"
            value={formatCurrency(fin.annualRent)}
          />
          <Metric
            label="Rent / Sq Ft / Yr"
            value={fin.rentPerSqFt ? `$${fin.rentPerSqFt.toFixed(2)}/sqft` : "—"}
          />
          <Metric
            label="Rent / Machine / Yr"
            value={fin.rentPerMachine ? formatCurrency(fin.rentPerMachine) : "—"}
            sub={fin.numMachines > 0 ? `${fin.numMachines} total machines` : undefined}
          />
          <Metric
            label="Rev / Machine / Yr"
            value={fin.revPerMachine ? formatCurrency(fin.revPerMachine) : "—"}
          />
          <Metric
            label="Rev / Sq Ft / Yr"
            value={fin.revPerSqFt ? `$${fin.revPerSqFt.toFixed(2)}/sqft` : "—"}
          />
          <Metric
            label="SDE / Sq Ft / Yr"
            value={fin.sdePerSqFt ? `$${fin.sdePerSqFt.toFixed(2)}/sqft` : "—"}
          />
          <Metric
            label="Debt Service % Gross"
            value={fmtPct(fin.debtServicePctGross)}
            sub="debt burden on revenue"
            accent={fin.debtServicePctGross !== null ? fin.debtServicePctGross > 0.25 ? "red" : undefined : undefined}
          />
        </div>
      </SectionCard>

      {/* Valuation */}
      <SectionCard title="Valuation">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metric label="Asking Multiple" value={fmtX(fin.askingMultiple)} />
          <Metric label="Seller Claimed Multiple" value={fmtX(fin.sellerClaimedMultiple)} />
          <Metric label="Revenue Multiple" value={fmtX(fin.revenueMultiple)} />
          <Metric label="Target Multiple" value={fmtX(fin.targetMultiple)} />
          <Metric label="Low Valuation (2.5x)" value={formatCurrency(fin.lowValuation)} />
          <Metric label="Base Valuation (3.5x)" value={formatCurrency(fin.baseValuation)} accent="blue" />
          <Metric label="Aggressive (4.5x)" value={formatCurrency(fin.aggressiveValuation)} />
          <Metric label="Max Offer" value={formatCurrency(fin.maxOffer)} sub={`at ${fin.targetMultiple}x target`} />
          <Metric label="Price Gap" value={fin.priceGap !== null ? formatCurrency(fin.priceGap) : "—"} accent={fin.priceGap !== null ? fin.priceGap > 0 ? "red" : "green" : undefined} />
          <Metric label="Price Gap %" value={fmtPct(fin.priceGapPct)} />
        </div>
      </SectionCard>

      {/* Financing */}
      <SectionCard title="Financing">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metric label="Down Payment" value={formatCurrency(fin.downPayment)} />
          <Metric label="Loan Amount" value={formatCurrency(fin.loanAmount)} />
          <Metric label="Closing Costs" value={formatCurrency(fin.closingCosts)} />
          <Metric label="Total Cash Needed" value={formatCurrency(fin.totalCashNeeded)} accent="amber" />
          <Metric label="Bank Monthly Payment" value={formatCurrency(fin.bankMonthlyDebtService)} />
          {fin.sellerFinancingMonthlyPayment !== null && (
            <Metric label="Seller Fin. Monthly" value={formatCurrency(fin.sellerFinancingMonthlyPayment)} />
          )}
          <Metric label="Total Monthly Debt" value={formatCurrency(fin.totalMonthlyDebtService)} />
          <Metric label="Annual Debt Service" value={formatCurrency(fin.annualDebtService)} />
        </div>
      </SectionCard>

      {/* Returns */}
      <SectionCard title="Returns">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metric
            label="Cash Flow After Debt"
            value={formatCurrency(fin.cashFlowAfterDebt)}
            accent={fin.cashFlowAfterDebt !== null ? fin.cashFlowAfterDebt >= 0 ? "green" : "red" : undefined}
          />
          <Metric label="Monthly Net Cash Flow" value={formatCurrency(fin.monthlyNetCashFlow)} />
          <Metric
            label="DSCR"
            value={fin.dscr !== null ? fin.dscr.toFixed(2) + "x" : "—"}
            sub="≥ 1.25x preferred"
            accent={fin.dscr !== null ? fin.dscr >= 1.5 ? "green" : fin.dscr < 1.25 ? "red" : "amber" : undefined}
          />
          <Metric
            label="Cash-on-Cash Return"
            value={fmtPct(fin.cashOnCashReturn)}
            sub="≥ 15% target"
            accent={fin.cashOnCashReturn !== null ? fin.cashOnCashReturn >= 0.15 ? "green" : fin.cashOnCashReturn < 0.10 ? "red" : "amber" : undefined}
          />
          <Metric label="Break-Even Revenue" value={formatCurrency(fin.breakEvenRevenue)} sub={fin.breakEvenRevenuePct ? fmtPct(fin.breakEvenRevenuePct) + " of gross" : undefined} />
          <Metric
            label="Debt Yield"
            value={fin.debtYield !== null ? fmtPct(fin.debtYield) : "—"}
            sub="SDE / loan amount"
            accent={fin.debtYield !== null ? fin.debtYield >= 0.10 ? "green" : fin.debtYield < 0.07 ? "red" : "amber" : undefined}
          />
          <Metric
            label="LTV"
            value={fin.ltv !== null ? fmtPct(fin.ltv) : "—"}
            sub="loan / asking price"
            accent={fin.ltv !== null ? fin.ltv > 0.80 ? "red" : fin.ltv < 0.70 ? "green" : undefined : undefined}
          />
          <Metric
            label="Debt Service % Gross"
            value={fmtPct(fin.debtServicePctGross)}
            sub="annual debt / gross revenue"
            accent={fin.debtServicePctGross !== null ? fin.debtServicePctGross > 0.30 ? "red" : undefined : undefined}
          />
        </div>
      </SectionCard>

      {/* Scenario Analysis */}
      <SectionCard title="Scenario Analysis">
        {fin.scenarios.every((s) => s.adjustedSDE === null) ? (
          <div className="text-sm text-muted-foreground py-2">Not enough data for scenario analysis.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">Scenario</th>
                <th className="text-right py-2 px-3 text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">Revenue</th>
                <th className="text-right py-2 px-3 text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">Adj. SDE</th>
                <th className="text-right py-2 px-3 text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">Debt Service</th>
                <th className="text-right py-2 px-3 text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">Cash Flow</th>
                <th className="text-right py-2 px-3 text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">DSCR</th>
                <th className="text-right py-2 pl-3 text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">CoC Return</th>
              </tr>
            </thead>
            <tbody>
              {fin.scenarios.map((s) => {
                const isBase = s.label === "Base";
                const cfColor = s.cashFlowAfterDebt !== null ? s.cashFlowAfterDebt >= 0 ? "text-emerald-600" : "text-red-600" : "text-muted-foreground";
                const dscrColor = s.dscr !== null ? s.dscr >= 1.5 ? "text-emerald-600" : s.dscr < 1.25 ? "text-red-600" : "text-amber-600" : "text-muted-foreground";
                return (
                  <tr key={s.label} className={`border-b border-border/50 last:border-0 ${isBase ? "bg-blue-50/40" : ""}`}>
                    <td className="py-3 pr-4">
                      <span className={`text-sm font-semibold ${isBase ? "text-primary" : "text-foreground"}`}>{s.label}</span>
                    </td>
                    <td className="py-3 px-3 text-right text-sm">{formatCurrency(s.revenue)}</td>
                    <td className="py-3 px-3 text-right text-sm font-medium">{formatCurrency(s.adjustedSDE)}</td>
                    <td className="py-3 px-3 text-right text-sm text-muted-foreground">{formatCurrency(s.annualDebtService)}</td>
                    <td className={`py-3 px-3 text-right text-sm font-semibold ${cfColor}`}>{formatCurrency(s.cashFlowAfterDebt)}</td>
                    <td className={`py-3 px-3 text-right text-sm font-semibold ${dscrColor}`}>
                      {s.dscr !== null ? s.dscr.toFixed(2) + "x" : "—"}
                    </td>
                    <td className="py-3 pl-3 text-right text-sm">{fmtPct(s.cashOnCash)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* Upside Model */}
      <SectionCard title="Upside Model">
        {fin.projectedRevenue === null && fin.projectedAdjustedSDE === null ? (
          <div className="text-sm text-muted-foreground py-2">Enter upside inputs in the Financials tab to model upside.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Metric label="Revenue Upside" value={formatCurrency(fin.revenueUpside)} />
            <Metric label="Price Increase Upside" value={formatCurrency(fin.priceIncreaseUpside)} />
            <Metric label="Cost Savings" value={formatCurrency(fin.costSavings)} />
            <Metric label="Projected Revenue" value={formatCurrency(fin.projectedRevenue)} accent="green" />
            <Metric label="Projected Adj. SDE" value={formatCurrency(fin.projectedAdjustedSDE)} accent="green" />
            <Metric label="Projected Multiple" value={fmtX(fin.projectedMultiple)} />
            <Metric label="Projected CF After Debt" value={formatCurrency(fin.projectedCashFlowAfterDebt)} accent={fin.projectedCashFlowAfterDebt !== null ? fin.projectedCashFlowAfterDebt >= 0 ? "green" : "red" : undefined} />
            <Metric label="Projected CoC Return" value={fmtPct(fin.projectedCashOnCash)} />
          </div>
        )}
      </SectionCard>

      {/* Equipment Capex */}
      <SectionCard title="Equipment Capex">
        {!fin.totalEquipmentCapex ? (
          <div className="text-sm text-muted-foreground py-2">Enter equipment data (washer/dryer count, % needing replacement) to estimate capex.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Metric label="Washer Replacement" value={formatCurrency(fin.washerReplacementCost)} />
            <Metric label="Dryer Replacement" value={formatCurrency(fin.dryerReplacementCost)} />
            <Metric label="Capex Subtotal" value={formatCurrency(fin.capexSubtotal)} />
            <Metric label="Contingency" value={formatCurrency(fin.capexContingency)} />
            <Metric label="Total Equipment Capex" value={formatCurrency(fin.totalEquipmentCapex)} accent={fin.totalEquipmentCapex !== null && fin.askingPrice !== null && fin.totalEquipmentCapex > fin.askingPrice * 0.20 ? "red" : undefined} />
            <Metric label="Capex Adj. Cash Needed" value={formatCurrency(fin.capexAdjustedCashNeeded)} />
            <Metric label="Capex Adj. CoC Return" value={fmtPct(fin.capexAdjustedCashOnCash)} />
          </div>
        )}
      </SectionCard>

      {/* Suggested Offer */}
      <SectionCard title="Suggested Offer">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Suggested Multiple</div>
                <div className="text-3xl font-bold text-foreground">{fin.suggestedMultiple.toFixed(2)}x</div>
              </div>
              <div className="w-px h-12 bg-border" />
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Suggested Offer</div>
                <div className="text-3xl font-bold text-primary">{formatCurrency(fin.suggestedOffer)}</div>
              </div>
              {fin.askingPrice && fin.suggestedOffer && (
                <>
                  <div className="w-px h-12 bg-border" />
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">vs. Asking</div>
                    <div className={`text-lg font-bold ${fin.askingPrice <= fin.suggestedOffer ? "text-emerald-600" : "text-red-600"}`}>
                      {formatCurrency(fin.askingPrice - fin.suggestedOffer)}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className={`text-sm font-semibold ${offerColor}`}>{fin.offerRecommendation}</div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Financials Form (full input — all sections)
// ─────────────────────────────────────────────────────────────────────────────

const BLANK_FIN = (deal: any) => ({
  askingPrice: deal.askingPrice ?? "",
  grossRevenue: deal.grossRevenue ?? "",
  netIncome: deal.netIncome ?? "",
  sellerClaimedNetIncome: deal.sellerClaimedNetIncome ?? "",
  adjustedNetIncome: deal.adjustedNetIncome ?? "",
  targetMultiple: deal.targetMultiple ?? "3.5",
  // Revenue
  washFoldRevenue: deal.washFoldRevenue ?? "",
  pickupDeliveryRevenue: deal.pickupDeliveryRevenue ?? "",
  commercialRevenue: deal.commercialRevenue ?? "",
  vendingRevenue: deal.vendingRevenue ?? "",
  otherRevenue: deal.otherRevenue ?? "",
  // Expenses
  payroll: deal.payroll ?? "",
  monthlyRent: deal.monthlyRent ?? "",
  water: deal.water ?? "",
  gas: deal.gas ?? "",
  electric: deal.electric ?? "",
  insurance: deal.insurance ?? "",
  repairsMaintenance: deal.repairsMaintenance ?? "",
  supplies: deal.supplies ?? "",
  merchantFees: deal.merchantFees ?? "",
  softwareFees: deal.softwareFees ?? "",
  marketing: deal.marketing ?? "",
  cleaning: deal.cleaning ?? "",
  accounting: deal.accounting ?? "",
  licensesPermits: deal.licensesPermits ?? "",
  otherExpenses: deal.otherExpenses ?? "",
  // Buyer adjustments
  adjustedPayroll: deal.adjustedPayroll ?? "",
  replacementManagerSalary: deal.replacementManagerSalary ?? "",
  capexReserve: deal.capexReserve ?? "",
  maintenanceReserve: deal.maintenanceReserve ?? "",
  otherBuyerAdjustments: deal.otherBuyerAdjustments ?? "",
  // Financing
  downPaymentPercent: deal.downPaymentPercent ?? "10",
  interestRate: deal.interestRate ?? "10",
  loanTermYears: deal.loanTermYears ?? "10",
  amortizationYears: deal.amortizationYears ?? "10",
  closingCostPercent: deal.closingCostPercent ?? "3",
  sbaFees: deal.sbaFees ?? "",
  workingCapitalReserve: deal.workingCapitalReserve ?? "",
  capexBudget: deal.capexBudget ?? "",
  sellerFinancingAmount: deal.sellerFinancingAmount ?? "",
  sellerFinancingInterestRate: deal.sellerFinancingInterestRate ?? "",
  sellerFinancingAmortizationYears: deal.sellerFinancingAmortizationYears ?? "",
  // Equipment
  percentMachinesNeedingReplacement: deal.percentMachinesNeedingReplacement ?? "",
  averageWasherReplacementCost: deal.averageWasherReplacementCost ?? "8000",
  averageDryerReplacementCost: deal.averageDryerReplacementCost ?? "5000",
  installationBudget: deal.installationBudget ?? "",
  capexContingencyPercent: deal.capexContingencyPercent ?? "10",
  // Upside
  washFoldRevenueIncrease: deal.washFoldRevenueIncrease ?? "",
  pickupDeliveryRevenueIncrease: deal.pickupDeliveryRevenueIncrease ?? "",
  commercialRevenueIncrease: deal.commercialRevenueIncrease ?? "",
  priceIncreasePercent: deal.priceIncreasePercent ?? "",
  hoursExpansionRevenueIncrease: deal.hoursExpansionRevenueIncrease ?? "",
  laborSavings: deal.laborSavings ?? "",
  utilitySavings: deal.utilitySavings ?? "",
  otherUpside: deal.otherUpside ?? "",
});

function numField(v: string) { return v === "" ? null : Number(v); }

function FieldRow({ label, name, value, onChange, type = "number" }: { label: string; name: string; value: string; onChange: (k: string, v: string) => void; type?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-border/40 last:border-0">
      <label className="text-xs text-muted-foreground shrink-0 w-48">{label}</label>
      <Input type={type} value={value} className="h-7 text-xs w-36 text-right" onChange={(e) => onChange(name, e.target.value)} />
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}

function FinancialsForm({ deal }: { deal: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [fd, setFd] = useState(() => BLANK_FIN(deal));
  const updateDeal = useUpdateDeal();
  const qc = useQueryClient();
  const set = (k: string, v: string) => setFd((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(fd)) {
      payload[k] = v === "" ? null : Number(v);
    }
    updateDeal.mutate({ id: deal.id, data: payload }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetDealQueryKey(deal.id) }); setIsEditing(false); },
    });
  };

  const handleEdit = () => { setFd(BLANK_FIN(deal)); setIsEditing(true); };

  if (!isEditing) {
    const f = calculateFullUnderwriting({ ...deal });
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleEdit}>Edit Financials</Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metric label="Asking Price" value={formatCurrency(f.askingPrice)} />
          <Metric label="Gross Revenue" value={formatCurrency(f.grossRevenue)} />
          <Metric label="Seller Claimed Net" value={formatCurrency(f.sellerClaimedNetIncome)} />
          <Metric label="Adjusted SDE" value={formatCurrency(f.adjustedSDE)} accent="blue" />
          <Metric label="Monthly Rent" value={formatCurrency(deal.monthlyRent ? Number(deal.monthlyRent) : null)} />
          <Metric label="Annual Rent" value={formatCurrency(f.annualRent)} />
          <Metric label="Asking Multiple" value={fmtX(f.askingMultiple)} />
          <Metric label="Target Multiple" value={fmtX(f.targetMultiple)} />
          <Metric label="Total Op. Expenses" value={formatCurrency(f.totalOperatingExpenses)} />
          <Metric label="Net Margin" value={fmtPct(f.netMargin)} />
          <Metric label="Rent % of Gross" value={fmtPct(f.rentPctGross)} />
          <Metric label="Max Offer" value={formatCurrency(f.maxOffer)} />
        </div>
        <div className="mt-3 text-xs text-muted-foreground border border-border rounded px-3 py-2 bg-muted/20">
          Click "Edit Financials" to enter detailed revenue breakdown, expenses, buyer adjustments, financing, equipment, and upside data.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Edit Financial Inputs</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={updateDeal.isPending}>{updateDeal.isPending ? "Saving..." : "Save"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-lg p-4 space-y-1">
          <SubSection title="Basic Financials">
            <FieldRow label="Asking Price" name="askingPrice" value={fd.askingPrice} onChange={set} />
            <FieldRow label="Gross Revenue" name="grossRevenue" value={fd.grossRevenue} onChange={set} />
            <FieldRow label="Seller Claimed Net Income" name="sellerClaimedNetIncome" value={fd.sellerClaimedNetIncome} onChange={set} />
            <FieldRow label="Adjusted SDE (manual override)" name="adjustedNetIncome" value={fd.adjustedNetIncome} onChange={set} />
            <FieldRow label="Monthly Rent" name="monthlyRent" value={fd.monthlyRent} onChange={set} />
            <FieldRow label="Target Multiple" name="targetMultiple" value={fd.targetMultiple} onChange={set} />
          </SubSection>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-1">
          <SubSection title="Revenue Detail (annual)">
            <FieldRow label="Wash & Fold Revenue" name="washFoldRevenue" value={fd.washFoldRevenue} onChange={set} />
            <FieldRow label="Pickup & Delivery Revenue" name="pickupDeliveryRevenue" value={fd.pickupDeliveryRevenue} onChange={set} />
            <FieldRow label="Commercial Revenue" name="commercialRevenue" value={fd.commercialRevenue} onChange={set} />
            <FieldRow label="Vending Revenue" name="vendingRevenue" value={fd.vendingRevenue} onChange={set} />
            <FieldRow label="Other Revenue" name="otherRevenue" value={fd.otherRevenue} onChange={set} />
          </SubSection>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-1">
          <SubSection title="Expense Detail (annual)">
            <FieldRow label="Payroll" name="payroll" value={fd.payroll} onChange={set} />
            <FieldRow label="Water" name="water" value={fd.water} onChange={set} />
            <FieldRow label="Gas" name="gas" value={fd.gas} onChange={set} />
            <FieldRow label="Electric" name="electric" value={fd.electric} onChange={set} />
            <FieldRow label="Insurance" name="insurance" value={fd.insurance} onChange={set} />
            <FieldRow label="Repairs & Maintenance" name="repairsMaintenance" value={fd.repairsMaintenance} onChange={set} />
            <FieldRow label="Supplies" name="supplies" value={fd.supplies} onChange={set} />
            <FieldRow label="Merchant Fees" name="merchantFees" value={fd.merchantFees} onChange={set} />
            <FieldRow label="Software Fees" name="softwareFees" value={fd.softwareFees} onChange={set} />
            <FieldRow label="Marketing" name="marketing" value={fd.marketing} onChange={set} />
            <FieldRow label="Cleaning" name="cleaning" value={fd.cleaning} onChange={set} />
            <FieldRow label="Accounting" name="accounting" value={fd.accounting} onChange={set} />
            <FieldRow label="Licenses & Permits" name="licensesPermits" value={fd.licensesPermits} onChange={set} />
            <FieldRow label="Other Expenses" name="otherExpenses" value={fd.otherExpenses} onChange={set} />
          </SubSection>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-1">
          <SubSection title="Buyer Adjustments">
            <FieldRow label="Adjusted Payroll" name="adjustedPayroll" value={fd.adjustedPayroll} onChange={set} />
            <FieldRow label="Replacement Manager Salary" name="replacementManagerSalary" value={fd.replacementManagerSalary} onChange={set} />
            <FieldRow label="Capex Reserve (annual)" name="capexReserve" value={fd.capexReserve} onChange={set} />
            <FieldRow label="Maintenance Reserve (annual)" name="maintenanceReserve" value={fd.maintenanceReserve} onChange={set} />
            <FieldRow label="Other Buyer Adjustments" name="otherBuyerAdjustments" value={fd.otherBuyerAdjustments} onChange={set} />
          </SubSection>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-1">
          <SubSection title="Financing">
            <FieldRow label="Down Payment %" name="downPaymentPercent" value={fd.downPaymentPercent} onChange={set} />
            <FieldRow label="Interest Rate %" name="interestRate" value={fd.interestRate} onChange={set} />
            <FieldRow label="Loan Term (years)" name="loanTermYears" value={fd.loanTermYears} onChange={set} />
            <FieldRow label="Amortization (years)" name="amortizationYears" value={fd.amortizationYears} onChange={set} />
            <FieldRow label="Closing Cost %" name="closingCostPercent" value={fd.closingCostPercent} onChange={set} />
            <FieldRow label="SBA Fees" name="sbaFees" value={fd.sbaFees} onChange={set} />
            <FieldRow label="Working Capital Reserve" name="workingCapitalReserve" value={fd.workingCapitalReserve} onChange={set} />
            <FieldRow label="Capex Budget" name="capexBudget" value={fd.capexBudget} onChange={set} />
            <FieldRow label="Seller Financing Amount" name="sellerFinancingAmount" value={fd.sellerFinancingAmount} onChange={set} />
            <FieldRow label="Seller Fin. Interest Rate %" name="sellerFinancingInterestRate" value={fd.sellerFinancingInterestRate} onChange={set} />
            <FieldRow label="Seller Fin. Amortization (yrs)" name="sellerFinancingAmortizationYears" value={fd.sellerFinancingAmortizationYears} onChange={set} />
          </SubSection>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <SubSection title="Equipment Capex">
            <FieldRow label="% Machines Needing Replacement" name="percentMachinesNeedingReplacement" value={fd.percentMachinesNeedingReplacement} onChange={set} />
            <FieldRow label="Avg. Washer Replacement Cost" name="averageWasherReplacementCost" value={fd.averageWasherReplacementCost} onChange={set} />
            <FieldRow label="Avg. Dryer Replacement Cost" name="averageDryerReplacementCost" value={fd.averageDryerReplacementCost} onChange={set} />
            <FieldRow label="Installation Budget" name="installationBudget" value={fd.installationBudget} onChange={set} />
            <FieldRow label="Capex Contingency %" name="capexContingencyPercent" value={fd.capexContingencyPercent} onChange={set} />
          </SubSection>

          <SubSection title="Upside Model (annual)">
            <FieldRow label="Wash & Fold Revenue Increase" name="washFoldRevenueIncrease" value={fd.washFoldRevenueIncrease} onChange={set} />
            <FieldRow label="Pickup Delivery Increase" name="pickupDeliveryRevenueIncrease" value={fd.pickupDeliveryRevenueIncrease} onChange={set} />
            <FieldRow label="Commercial Revenue Increase" name="commercialRevenueIncrease" value={fd.commercialRevenueIncrease} onChange={set} />
            <FieldRow label="Price Increase %" name="priceIncreasePercent" value={fd.priceIncreasePercent} onChange={set} />
            <FieldRow label="Hours Expansion Revenue" name="hoursExpansionRevenueIncrease" value={fd.hoursExpansionRevenueIncrease} onChange={set} />
            <FieldRow label="Labor Savings" name="laborSavings" value={fd.laborSavings} onChange={set} />
            <FieldRow label="Utility Savings" name="utilitySavings" value={fd.utilitySavings} onChange={set} />
            <FieldRow label="Other Upside" name="otherUpside" value={fd.otherUpside} onChange={set} />
          </SubSection>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Other sub-tabs (preserved from original)
// ─────────────────────────────────────────────────────────────────────────────

function DealInfoForm({ deal, brokers }: { deal: any; brokers: any[] }) {
  const [isEditing, setIsEditing] = useState(false);
  const [fd, setFd] = useState({
    dealName: deal.dealName || "", businessName: deal.businessName || "",
    address: deal.address || "", city: deal.city || "", state: deal.state || "",
    assetType: deal.assetType || "", source: deal.source || "",
    sellerName: deal.sellerName || "", brokerId: deal.brokerId || null,
    lastContactedDate: deal.lastContactedDate || "", nextAction: deal.nextAction || "",
    nextActionDueDate: deal.nextActionDueDate || "",
  });
  const updateDeal = useUpdateDeal();
  const qc = useQueryClient();
  const set = (k: string, v: any) => setFd((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    updateDeal.mutate({ id: deal.id, data: fd }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetDealQueryKey(deal.id) }); setIsEditing(false); },
    });
  };

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">{label}</div>
      <div className="text-sm font-medium">{value || "—"}</div>
    </div>
  );

  if (!isEditing) {
    return (
      <SectionCard title="Deal Information">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 mb-4">
          <Row label="Deal Name" value={deal.dealName} />
          <Row label="Business Name" value={deal.businessName} />
          <Row label="Address" value={[deal.address, deal.city, deal.state].filter(Boolean).join(", ")} />
          <Row label="Asset Type" value={deal.assetType} />
          <Row label="Source" value={deal.source} />
          <Row label="Seller" value={deal.sellerName} />
          <Row label="Broker" value={deal.brokerName ? <Link href={`/brokers/${deal.brokerId}`}><span className="text-primary hover:underline">{deal.brokerName}</span></Link> : "—"} />
          <Row label="Last Contacted" value={formatDateShort(deal.lastContactedDate)} />
          <Row label="Next Action" value={deal.nextAction} />
          <Row label="Next Action Due" value={formatDateShort(deal.nextActionDueDate)} />
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Edit Deal Information">
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          ["Deal Name", "dealName"], ["Business Name", "businessName"],
          ["Address", "address"], ["City", "city"], ["State", "state"],
          ["Asset Type", "assetType"], ["Source", "source"], ["Seller Name", "sellerName"],
        ].map(([label, key]) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-medium">{label}</label>
            <Input value={(fd as any)[key]} onChange={(e) => set(key, e.target.value)} className="h-8 text-sm" />
          </div>
        ))}
        <div className="space-y-1">
          <label className="text-xs font-medium">Broker</label>
          <Select value={fd.brokerId?.toString() || "none"} onValueChange={(v) => set("brokerId", v === "none" ? null : parseInt(v))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {brokers.map((b) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Last Contacted</label>
          <Input type="date" value={fd.lastContactedDate} onChange={(e) => set("lastContactedDate", e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1 col-span-2">
          <label className="text-xs font-medium">Next Action</label>
          <Input value={fd.nextAction} onChange={(e) => set("nextAction", e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Next Action Due</label>
          <Input type="date" value={fd.nextActionDueDate} onChange={(e) => set("nextActionDueDate", e.target.value)} className="h-8 text-sm" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={updateDeal.isPending}>{updateDeal.isPending ? "Saving..." : "Save"}</Button>
      </div>
    </SectionCard>
  );
}

function LeaseForm({ deal }: { deal: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [fd, setFd] = useState({ leaseYearsRemaining: deal.leaseYearsRemaining || "", renewalOptions: deal.renewalOptions || "", realEstateIncluded: deal.realEstateIncluded || false });
  const updateDeal = useUpdateDeal();
  const qc = useQueryClient();

  if (!isEditing) {
    return (
      <SectionCard title="Lease Details">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Metric label="Lease Years Remaining" value={deal.leaseYearsRemaining ? `${deal.leaseYearsRemaining} yrs` : "—"} accent={deal.leaseYearsRemaining < 5 ? "red" : deal.leaseYearsRemaining >= 10 ? "green" : undefined} />
          <Metric label="Renewal Options" value={deal.renewalOptions || "—"} />
          <Metric label="Real Estate Included" value={deal.realEstateIncluded ? "Yes" : "No"} />
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Edit Lease Details">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="space-y-1"><label className="text-xs font-medium">Lease Years Remaining</label>
          <Input type="number" value={fd.leaseYearsRemaining} onChange={(e) => setFd({ ...fd, leaseYearsRemaining: e.target.value })} className="h-8 text-sm" /></div>
        <div className="space-y-1"><label className="text-xs font-medium">Renewal Options</label>
          <Input value={fd.renewalOptions} onChange={(e) => setFd({ ...fd, renewalOptions: e.target.value })} className="h-8 text-sm" /></div>
        <div className="flex items-center gap-2 pt-2">
          <Checkbox checked={fd.realEstateIncluded} onCheckedChange={(c) => setFd({ ...fd, realEstateIncluded: c as boolean })} id="re" />
          <label htmlFor="re" className="text-xs font-medium">Real Estate Included</label>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
        <Button size="sm" onClick={() => {
          updateDeal.mutate({ id: deal.id, data: { leaseYearsRemaining: fd.leaseYearsRemaining ? Number(fd.leaseYearsRemaining) : null, renewalOptions: fd.renewalOptions, realEstateIncluded: fd.realEstateIncluded } }, {
            onSuccess: () => { qc.invalidateQueries({ queryKey: getGetDealQueryKey(deal.id) }); setIsEditing(false); }
          });
        }} disabled={updateDeal.isPending}>{updateDeal.isPending ? "Saving..." : "Save"}</Button>
      </div>
    </SectionCard>
  );
}

function OperationsForm({ deal }: { deal: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [fd, setFd] = useState({
    numWashers: deal.numWashers ?? "", numDryers: deal.numDryers ?? "",
    machineBrand: deal.machineBrand || "", avgMachineAge: deal.avgMachineAge ?? "",
    cardOrCoin: deal.cardOrCoin || "Both", hoursOfOperation: deal.hoursOfOperation || "",
    staffCount: deal.staffCount ?? "", ownerOperated: deal.ownerOperated ?? true,
    washAndFold: deal.washAndFold ?? false, pickupDelivery: deal.pickupDelivery ?? false,
    commercialAccounts: deal.commercialAccounts ?? false, squareFootage: deal.squareFootage ?? "",
  });
  const updateDeal = useUpdateDeal();
  const qc = useQueryClient();
  const set = (k: string, v: any) => setFd((p) => ({ ...p, [k]: v }));

  if (!isEditing) {
    return (
      <SectionCard title="Operations & Equipment">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-4">
          <Metric label="Washers" value={deal.numWashers ?? "—"} />
          <Metric label="Dryers" value={deal.numDryers ?? "—"} />
          <Metric label="Brands" value={deal.machineBrand || "—"} />
          <Metric label="Avg Machine Age" value={deal.avgMachineAge ? `${deal.avgMachineAge} yrs` : "—"} accent={deal.avgMachineAge > 12 ? "red" : deal.avgMachineAge <= 7 ? "green" : undefined} />
          <Metric label="System" value={deal.cardOrCoin || "—"} />
          <Metric label="Hours" value={deal.hoursOfOperation || "—"} />
          <Metric label="Staff" value={deal.staffCount ?? "0"} />
          <Metric label="Square Footage" value={deal.squareFootage ? `${Number(deal.squareFootage).toLocaleString()} sqft` : "—"} />
        </div>
        <div className="flex flex-wrap gap-3 mb-4">
          {[
            { flag: deal.ownerOperated, label: "Owner Operated" },
            { flag: deal.washAndFold, label: "Wash & Fold" },
            { flag: deal.pickupDelivery, label: "Pickup/Delivery" },
            { flag: deal.commercialAccounts, label: "Commercial Accounts" },
          ].map(({ flag, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              {flag ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <CircleDashed className="w-4 h-4 text-muted-foreground" />}
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Edit Operations">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="space-y-1"><label className="text-xs font-medium">Washers</label><Input type="number" value={fd.numWashers} onChange={(e) => set("numWashers", e.target.value)} className="h-8 text-sm" /></div>
        <div className="space-y-1"><label className="text-xs font-medium">Dryers</label><Input type="number" value={fd.numDryers} onChange={(e) => set("numDryers", e.target.value)} className="h-8 text-sm" /></div>
        <div className="space-y-1"><label className="text-xs font-medium">Machine Brand</label><Input value={fd.machineBrand} onChange={(e) => set("machineBrand", e.target.value)} className="h-8 text-sm" /></div>
        <div className="space-y-1"><label className="text-xs font-medium">Avg Machine Age (yrs)</label><Input type="number" value={fd.avgMachineAge} onChange={(e) => set("avgMachineAge", e.target.value)} className="h-8 text-sm" /></div>
        <div className="space-y-1"><label className="text-xs font-medium">Square Footage</label><Input type="number" value={fd.squareFootage} onChange={(e) => set("squareFootage", e.target.value)} className="h-8 text-sm" /></div>
        <div className="space-y-1"><label className="text-xs font-medium">Card or Coin</label>
          <Select value={fd.cardOrCoin} onValueChange={(v) => set("cardOrCoin", v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Coin">Coin</SelectItem><SelectItem value="Card">Card</SelectItem><SelectItem value="Both">Both</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><label className="text-xs font-medium">Hours of Operation</label><Input value={fd.hoursOfOperation} onChange={(e) => set("hoursOfOperation", e.target.value)} className="h-8 text-sm" /></div>
        <div className="space-y-1"><label className="text-xs font-medium">Staff Count</label><Input type="number" value={fd.staffCount} onChange={(e) => set("staffCount", e.target.value)} className="h-8 text-sm" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[["ownerOperated","Owner Operated"],["washAndFold","Wash & Fold"],["pickupDelivery","Pickup/Delivery"],["commercialAccounts","Commercial Accounts"]].map(([k,l]) => (
          <div key={k} className="flex items-center gap-2">
            <Checkbox checked={(fd as any)[k]} onCheckedChange={(c) => set(k, c as boolean)} id={`op-${k}`} />
            <label htmlFor={`op-${k}`} className="text-xs font-medium">{l}</label>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
        <Button size="sm" onClick={() => {
          updateDeal.mutate({ id: deal.id, data: { ...fd, numWashers: fd.numWashers ? Number(fd.numWashers) : null, numDryers: fd.numDryers ? Number(fd.numDryers) : null, avgMachineAge: fd.avgMachineAge ? Number(fd.avgMachineAge) : null, staffCount: fd.staffCount ? Number(fd.staffCount) : null, squareFootage: fd.squareFootage ? Number(fd.squareFootage) : null } }, {
            onSuccess: () => { qc.invalidateQueries({ queryKey: getGetDealQueryKey(deal.id) }); setIsEditing(false); }
          });
        }} disabled={updateDeal.isPending}>{updateDeal.isPending ? "Saving..." : "Save"}</Button>
      </div>
    </SectionCard>
  );
}

function RedFlagsTab({ dealId }: { dealId: number }) {
  const { data: flags, isLoading } = useGetDealRedFlags(dealId, { query: { enabled: !!dealId, queryKey: getGetDealRedFlagsQueryKey(dealId) } });
  const updateFlags = useUpdateDealRedFlags();
  const qc = useQueryClient();

  const RED_FLAG_LIST = [
    "Revenue mismatch with utilities","Unverifiable cash income","Declining revenue trend","High labor costs",
    "Missing tax returns","Equipment age > 10 years","Missing maintenance records","Environmental liability / PERC",
    "Short lease remaining","No renewal options","Demolition clause in lease","Rent > 25% of gross",
    "Major new competition nearby","Declining neighborhood","Poor parking or access","Bad online reviews",
    "Seller uncooperative","Suspicious broker behavior","Unpaid taxes or liens","Zoning issues","High crime area",
  ];

  if (isLoading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>;

  const activeCount = flags?.filter((f) => f.isFlagged).length || 0;
  const riskCls = activeCount >= 9 ? "bg-red-50 text-red-700 border-red-200" : activeCount >= 6 ? "bg-orange-50 text-orange-700 border-orange-200" : activeCount >= 3 ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-emerald-50 text-emerald-700 border-emerald-200";

  const handleFlagChange = (flagKey: string, isChecked: boolean) => {
    if (!flags) return;
    const cur = flags.map((f) => ({ flagKey: f.flagKey, isFlagged: f.isFlagged, notes: f.notes }));
    const ex = cur.find((f) => f.flagKey === flagKey);
    if (ex) ex.isFlagged = isChecked;
    else cur.push({ flagKey, isFlagged: isChecked, notes: "" });
    updateFlags.mutate({ id: dealId, data: { flags: cur } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetDealRedFlagsQueryKey(dealId) }); qc.invalidateQueries({ queryKey: getGetDealQueryKey(dealId) }); },
    });
  };

  return (
    <SectionCard title={`Red Flags Assessment — ${activeCount} / ${RED_FLAG_LIST.length} Flagged`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border ${riskCls}`}>
          {activeCount >= 9 ? "Dangerous" : activeCount >= 6 ? "High Risk" : activeCount >= 3 ? "Caution" : "Clean"}
        </span>
        <Progress value={(activeCount / RED_FLAG_LIST.length) * 100} className="h-1.5 flex-1" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5">
        {RED_FLAG_LIST.map((flag) => {
          const isFlagged = flags?.find((f) => f.flagKey === flag)?.isFlagged || false;
          return (
            <div key={flag} className={`flex items-start gap-2.5 p-2 rounded transition-colors ${isFlagged ? "bg-red-50" : "hover:bg-muted/30"}`}>
              <Checkbox id={`flag-${flag}`} checked={isFlagged} onCheckedChange={(c) => handleFlagChange(flag, c as boolean)} />
              <label htmlFor={`flag-${flag}`} className={`text-xs font-medium leading-tight pt-0.5 cursor-pointer ${isFlagged ? "text-red-700" : "text-foreground"}`}>{flag}</label>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function DocumentsTab({ dealId }: { dealId: number }) {
  const { data: documents, isLoading } = useListDocuments({ dealId }, { query: { enabled: !!dealId, queryKey: getListDocumentsQueryKey({ dealId }) } });
  const updateDoc = useUpdateDocument();
  const qc = useQueryClient();

  if (isLoading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>;

  const received = documents?.filter((d) => ["Received","Reviewed"].includes(d.status)).length || 0;
  const total = documents?.length || 0;

  const statusCls = (s: string) =>
    s === "Problem found" ? "text-red-600" : s === "Reviewed" ? "text-emerald-600" : s === "Received" ? "text-blue-600" : s === "Requested" ? "text-amber-600" : "text-muted-foreground";

  return (
    <SectionCard title={`Due Diligence Documents — ${received} / ${total} Received`}>
      <Progress value={total > 0 ? (received / total) * 100 : 0} className="h-1 mb-4" />
      <div className="divide-y divide-border/50">
        {documents?.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2.5">
              <FileCheck className={`w-4 h-4 ${["Received","Reviewed"].includes(doc.status) ? "text-emerald-500" : "text-muted-foreground"}`} />
              <span className="text-sm">{doc.documentLabel}</span>
            </div>
            <Select value={doc.status} onValueChange={(v) => { updateDoc.mutate({ id: doc.id, data: { status: v } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListDocumentsQueryKey({ dealId }) }) }); }}>
              <SelectTrigger className={`w-[150px] h-7 text-[10px] font-semibold uppercase tracking-wider ${statusCls(doc.status)}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Not requested","Requested","Received","Reviewed","Problem found"].map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function NotesTab({ dealId }: { dealId: number }) {
  const { data: notes, isLoading } = useListNotes({ linkedType: "deal", linkedId: dealId }, { query: { enabled: !!dealId, queryKey: getListNotesQueryKey({ linkedType: "deal", linkedId: dealId }) } });
  const createNote = useCreateNote();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState("General note");

  const handleSubmit = () => {
    if (!content.trim()) return;
    createNote.mutate({ data: { linkedType: "deal", linkedId: dealId, noteType, content } as any }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListNotesQueryKey({ linkedType: "deal", linkedId: dealId }) }); setContent(""); },
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <Select value={noteType} onValueChange={setNoteType}>
          <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["General note","Call note","Email note","Site visit note","Broker comment","Seller claim","Underwriting note","Red flag"].map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Textarea placeholder="Add a note..." value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[80px] resize-none text-sm" />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSubmit} disabled={!content.trim() || createNote.isPending}>{createNote.isPending ? "Saving..." : "Add Note"}</Button>
        </div>
      </div>
      <div className="space-y-2">
        {isLoading ? <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
          : !notes?.length ? <div className="text-sm text-muted-foreground text-center py-8 bg-card border border-border rounded-lg">No notes yet.</div>
          : notes.map((note) => (
            <div key={note.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] px-1.5 py-0.5 border border-border rounded text-muted-foreground font-medium">{note.noteType}</span>
                <span className="text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleString()}</span>
              </div>
              <div className="text-sm whitespace-pre-wrap">{note.content}</div>
            </div>
          ))}
      </div>
    </div>
  );
}

function RemindersTab({ dealId }: { dealId: number }) {
  const { data: reminders, isLoading } = useListReminders({ linkedType: "deal", linkedId: dealId }, { query: { enabled: !!dealId, queryKey: getListRemindersQueryKey({ linkedType: "deal", linkedId: dealId }) } });
  const completeReminder = useCompleteReminder();
  const createReminder = useCreateReminder();
  const qc = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");

  const handleComplete = (id: number) => {
    completeReminder.mutate({ id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListRemindersQueryKey({ linkedType: "deal", linkedId: dealId }) }) });
  };

  const handleAdd = () => {
    if (!title || !dueDate) return;
    createReminder.mutate({ data: { title, dueDate, priority, linkedType: "deal", linkedId: dealId, completed: false } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListRemindersQueryKey({ linkedType: "deal", linkedId: dealId }) }); setIsAdding(false); setTitle(""); setDueDate(""); },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold">Reminders</span>
        <Button size="sm" variant="outline" onClick={() => setIsAdding(!isAdding)}>{isAdding ? "Cancel" : "Add Reminder"}</Button>
      </div>
      {isAdding && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <Input placeholder="What needs to be done?" value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-sm" />
          <div className="flex gap-2">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-8 text-sm" />
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-8 text-sm w-32"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={!title || !dueDate}>Save Reminder</Button>
        </div>
      )}
      <div className="space-y-2">
        {isLoading ? <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
          : !reminders?.length ? <div className="text-sm text-muted-foreground text-center py-8 bg-card border border-border rounded-lg">No reminders set.</div>
          : reminders.map((r) => (
            <div key={r.id} className={`flex items-center gap-3 bg-card border rounded-lg px-4 py-3 ${r.completed ? "opacity-50 border-border" : isOverdue(r.dueDate) ? "border-red-200 bg-red-50/20" : "border-border"}`}>
              <button onClick={() => !r.completed && handleComplete(r.id)} disabled={r.completed}
                className="w-5 h-5 rounded-full border-2 border-border flex items-center justify-center shrink-0 hover:border-emerald-400 transition-colors">
                {r.completed && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </button>
              <div>
                <div className={`text-sm font-medium ${r.completed ? "line-through text-muted-foreground" : ""}`}>{r.title}</div>
                <div className={`text-xs mt-0.5 ${isOverdue(r.dueDate) && !r.completed ? "text-red-600" : "text-muted-foreground"}`}>Due {formatDateShort(r.dueDate)}</div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function DealDetail() {
  const { id } = useParams();
  const dealId = parseInt(id || "0", 10);
  const qc = useQueryClient();
  const { data: deal, isLoading } = useGetDeal(dealId, { query: { enabled: !!dealId, queryKey: getGetDealQueryKey(dealId) } });
  const { data: brokers } = useListBrokers({});
  const updateDeal = useUpdateDeal();

  if (isLoading || !deal) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const fin = calculateFullUnderwriting({ ...deal });
  const warningCount = fin.warnings.filter((w) => w.level !== "info").length;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/deals">
          <button className="w-8 h-8 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate">{deal.dealName}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StatusBadge status={deal.status} />
            <PriorityBadge priority={deal.priority} />
            {deal.city && <span className="text-xs text-muted-foreground">{deal.city}, {deal.state}</span>}
            {deal.brokerName && <span className="text-xs text-muted-foreground">· {deal.brokerName}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {warningCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
              <AlertTriangle className="w-3.5 h-3.5" /> {warningCount} warning{warningCount > 1 ? "s" : ""}
            </span>
          )}
          {fin.dscr !== null && (
            <span className={`text-xs font-semibold border px-2 py-1 rounded ${fin.dscr >= 1.5 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : fin.dscr < 1.25 ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
              DSCR {fin.dscr.toFixed(2)}x
            </span>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { label: "Asking Price", value: formatCurrency(fin.askingPrice) },
          { label: "Gross Revenue", value: formatCurrency(fin.grossRevenue) },
          { label: "Adjusted SDE", value: formatCurrency(fin.adjustedSDE) },
          { label: "Asking Multiple", value: fmtX(fin.askingMultiple) },
          { label: "Max Offer", value: formatCurrency(fin.maxOffer) },
          { label: "Deal Score", value: deal.dealScore != null ? `${deal.dealScore}/100` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-lg px-4 py-3">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">{label}</div>
            <div className="text-base font-bold">{value}</div>
          </div>
        ))}
      </div>

      {/* Main layout — tabs + sidebar */}
      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="underwriting">
            <TabsList className="bg-card border w-full justify-start h-auto p-1 overflow-x-auto flex-wrap gap-0.5">
              <TabsTrigger value="underwriting" className="text-xs">
                Underwriting
                {warningCount > 0 && <span className="ml-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 rounded-full">{warningCount}</span>}
              </TabsTrigger>
              <TabsTrigger value="financials" className="text-xs">Financials</TabsTrigger>
              <TabsTrigger value="info" className="text-xs">Deal Info</TabsTrigger>
              <TabsTrigger value="lease" className="text-xs">Lease</TabsTrigger>
              <TabsTrigger value="operations" className="text-xs">Operations</TabsTrigger>
              <TabsTrigger value="redflags" className="text-xs">Red Flags</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
              <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
              <TabsTrigger value="reminders" className="text-xs">Reminders</TabsTrigger>
            </TabsList>

            <div className="mt-5">
              <TabsContent value="underwriting"><UnderwritingTab deal={deal} /></TabsContent>
              <TabsContent value="financials"><FinancialsForm deal={deal} /></TabsContent>
              <TabsContent value="info"><DealInfoForm deal={deal} brokers={brokers || []} /></TabsContent>
              <TabsContent value="lease"><LeaseForm deal={deal} /></TabsContent>
              <TabsContent value="operations"><OperationsForm deal={deal} /></TabsContent>
              <TabsContent value="redflags"><RedFlagsTab dealId={dealId} /></TabsContent>
              <TabsContent value="documents"><DocumentsTab dealId={dealId} /></TabsContent>
              <TabsContent value="notes"><NotesTab dealId={dealId} /></TabsContent>
              <TabsContent value="reminders"><RemindersTab dealId={dealId} /></TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="w-52 shrink-0 space-y-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-muted/20">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quick Actions</span>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground block mb-1">Status</label>
                <Select value={deal.status} onValueChange={(v) => updateDeal.mutate({ id: dealId, data: { status: v } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetDealQueryKey(dealId) }) })}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{ALL_STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground block mb-1">Priority</label>
                <Select value={deal.priority} onValueChange={(v) => updateDeal.mutate({ id: dealId, data: { priority: v } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetDealQueryKey(dealId) }) })}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Hot","High","Medium","Low"].map((p) => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-muted/20">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Key Contacts</span>
            </div>
            <div className="p-3 space-y-3">
              {deal.brokerId ? (
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-0.5">Broker</div>
                  <Link href={`/brokers/${deal.brokerId}`}><span className="text-xs font-medium text-primary hover:underline cursor-pointer">{deal.brokerName}</span></Link>
                </div>
              ) : <div className="text-xs text-muted-foreground italic">No broker assigned</div>}
              {deal.sellerName && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-0.5">Seller</div>
                  <div className="text-xs font-medium">{deal.sellerName}</div>
                </div>
              )}
            </div>
          </div>

          {deal.nextAction && (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-border bg-muted/20">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Next Action</span>
              </div>
              <div className="p-3">
                <div className="text-xs font-medium text-foreground mb-1">{deal.nextAction}</div>
                <div className={`text-[10px] font-medium ${isOverdue(deal.nextActionDueDate) ? "text-red-600" : "text-muted-foreground"}`}>{formatDateShort(deal.nextActionDueDate)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
