import { useGetDashboardSummary, useListDeals } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatCurrency, formatMultiple } from "@/lib/format";
import { calculateFullUnderwriting } from "@/lib/financialCalculations";
import { ArrowRight, AlertCircle, TrendingUp, Briefcase, Ban, Activity, DollarSign, FileText, Users } from "lucide-react";

function MetricCard({
  label,
  value,
  sub,
  href,
  accent,
}: {
  label: string;
  value: string | number | null;
  sub?: string;
  href?: string;
  accent?: "red" | "blue" | "amber" | "green";
}) {
  const accentClass =
    accent === "red" ? "text-red-600" :
    accent === "blue" ? "text-primary" :
    accent === "amber" ? "text-amber-600" :
    accent === "green" ? "text-emerald-600" :
    "text-foreground";

  const inner = (
    <div className="bg-card border border-border rounded-lg p-4 hover:border-border/80 transition-colors group">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">{label}</div>
      <div className={`text-2xl font-bold tracking-tight ${accentClass}`}>
        {value ?? "—"}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      {href && (
        <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          View <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

function StatusBadge({ status }: { status: string }) {
  const closed = status === "Closed";
  const dead = status === "Dead Deal" || status === "Stalled";
  const hot = ["Under Contract", "Due Diligence", "Financing", "LOI Sent", "Negotiation"].includes(status);
  const cls = closed
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : dead
    ? "bg-red-50 text-red-600 border-red-200"
    : hot
    ? "bg-purple-50 text-purple-700 border-purple-200"
    : "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cls}`}>
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls =
    priority === "Hot" ? "bg-rose-50 text-rose-700 border-rose-200" :
    priority === "High" ? "bg-amber-50 text-amber-700 border-amber-200" :
    priority === "Medium" ? "bg-blue-50 text-blue-700 border-blue-200" :
    "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cls}`}>
      {priority}
    </span>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const { data: allDeals } = useListDeals({});

  const financialMetrics = (() => {
    if (!allDeals || allDeals.length === 0) return null;
    const fins = (allDeals as any[]).map((d) => calculateFullUnderwriting(d));
    const withDscr = fins.filter((f) => f.dscr !== null);
    const withCoc  = fins.filter((f) => f.cashOnCashReturn !== null);
    const avgDscr  = withDscr.length > 0
      ? withDscr.reduce((s, f) => s + f.dscr!, 0) / withDscr.length
      : null;
    const avgCoc   = withCoc.length > 0
      ? withCoc.reduce((s, f) => s + f.cashOnCashReturn!, 0) / withCoc.length
      : null;
    return {
      avgDscr,
      avgCoc,
      dscrBelow125: withDscr.filter((f) => f.dscr! < 1.25).length,
      rentAbove20:  fins.filter((f) => f.rentPctGross !== null && f.rentPctGross > 0.20).length,
      multipleAbove5: fins.filter((f) => f.askingMultiple !== null && f.askingMultiple > 5).length,
      totalWithDscr: withDscr.length,
    };
  })();

  if (isLoading) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Command Center</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Spinlab Deal Desk — acquisition pipeline overview</p>
      </div>

      {/* Metric Cards — 2 rows of 4 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Active Deals"
          value={summary.totalActiveDeals}
          sub="in pipeline"
          href="/deals"
          accent="blue"
        />
        <MetricCard
          label="Hot Deals"
          value={summary.hotDeals}
          sub="highest priority"
          href="/deals"
          accent={summary.hotDeals > 0 ? "amber" : undefined}
        />
        <MetricCard
          label="Stalled Deals"
          value={summary.stalledDeals}
          sub="need attention"
          accent={summary.stalledDeals > 0 ? "red" : undefined}
        />
        <MetricCard
          label="Overdue Follow-Ups"
          value={summary.overdueReminders}
          sub="past due reminders"
          href="/reminders"
          accent={summary.overdueReminders > 0 ? "red" : undefined}
        />
        <MetricCard
          label="Avg. Asking Multiple"
          value={summary.avgAskingMultiple ? `${summary.avgAskingMultiple}x` : "—"}
          sub="across pipeline"
        />
        <MetricCard
          label="Total Pipeline Value"
          value={summary.totalPipelineValue ? formatCurrency(summary.totalPipelineValue) : "—"}
          sub="active asking prices"
          accent="green"
        />
        <MetricCard
          label="Brokers to Contact"
          value={summary.brokersNeedingFollowUp}
          sub="follow-up due"
          href="/brokers"
          accent={summary.brokersNeedingFollowUp > 0 ? "amber" : undefined}
        />
        <MetricCard
          label="LOIs Sent"
          value={summary.loisSent}
          sub="awaiting response"
          accent={summary.loisSent > 0 ? "blue" : undefined}
        />
        <MetricCard
          label="Avg. DSCR"
          value={financialMetrics?.avgDscr != null ? financialMetrics.avgDscr.toFixed(2) + "x" : "—"}
          sub={financialMetrics ? `${financialMetrics.totalWithDscr} deals with data` : "no data"}
          accent={financialMetrics?.avgDscr != null
            ? financialMetrics.avgDscr >= 1.5 ? "green"
            : financialMetrics.avgDscr < 1.25 ? "red"
            : "amber"
            : undefined}
        />
        <MetricCard
          label="DSCR Below 1.25x"
          value={financialMetrics?.dscrBelow125 ?? "—"}
          sub="may not qualify for financing"
          accent={financialMetrics?.dscrBelow125 && financialMetrics.dscrBelow125 > 0 ? "red" : undefined}
        />
        <MetricCard
          label="High Rent Deals"
          value={financialMetrics?.rentAbove20 ?? "—"}
          sub="rent > 20% of gross revenue"
          accent={financialMetrics?.rentAbove20 && financialMetrics.rentAbove20 > 0 ? "amber" : undefined}
        />
        <MetricCard
          label="Avg. Cash-on-Cash"
          value={financialMetrics?.avgCoc != null ? (financialMetrics.avgCoc * 100).toFixed(1) + "%" : "—"}
          sub="across all financed deals"
          accent={financialMetrics?.avgCoc != null
            ? financialMetrics.avgCoc >= 0.15 ? "green"
            : financialMetrics.avgCoc < 0.08 ? "red"
            : "amber"
            : undefined}
        />
      </div>

      {/* 4 mini tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Hot Deals */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hot Deals</span>
            </div>
            <Link href="/deals" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {!summary.hotDealsList || summary.hotDealsList.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">No hot deals right now.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 text-left">Deal</th>
                  <th className="px-3 text-right">Asking</th>
                  <th className="px-3 text-right">Multiple</th>
                  <th className="px-4 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {(summary.hotDealsList as any[]).map((d) => (
                  <tr key={d.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4">
                      <Link href={`/deals/${d.id}`}>
                        <div className="font-medium text-sm text-foreground hover:text-primary cursor-pointer">{d.dealName}</div>
                        <div className="text-xs text-muted-foreground">{[d.city, d.state].filter(Boolean).join(", ")}</div>
                      </Link>
                    </td>
                    <td className="px-3 text-right text-sm">{formatCurrency(d.askingPrice)}</td>
                    <td className="px-3 text-right text-sm font-mono">{d.askingMultiple ? `${d.askingMultiple}x` : "—"}</td>
                    <td className="px-4 text-right">
                      <span className={`text-xs font-semibold ${d.dealScore >= 70 ? "text-emerald-600" : d.dealScore >= 50 ? "text-amber-600" : "text-red-600"}`}>
                        {d.dealScore}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Overdue Follow-Ups */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Overdue Follow-Ups</span>
            </div>
            <Link href="/reminders" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {!summary.overdueFollowUpsList || (summary.overdueFollowUpsList as any[]).length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">No overdue follow-ups.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 text-left">Deal</th>
                  <th className="px-3 text-left">Next Action</th>
                  <th className="px-4 text-right">Due</th>
                </tr>
              </thead>
              <tbody>
                {(summary.overdueFollowUpsList as any[]).map((d) => (
                  <tr key={d.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4">
                      <Link href={`/deals/${d.id}`}>
                        <div className="font-medium text-sm text-foreground hover:text-primary cursor-pointer">{d.dealName}</div>
                        <div className="text-xs text-muted-foreground">{[d.city, d.state].filter(Boolean).join(", ")}</div>
                      </Link>
                    </td>
                    <td className="px-3 text-xs text-muted-foreground max-w-[140px]">
                      <span className="truncate block">{d.nextAction || "—"}</span>
                    </td>
                    <td className="px-4 text-right text-xs text-red-600 font-medium whitespace-nowrap">{d.nextActionDueDate || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recently Added */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recently Added</span>
            </div>
            <Link href="/deals" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {!summary.recentlyAddedDeals || (summary.recentlyAddedDeals as any[]).length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">No deals yet.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 text-left">Deal</th>
                  <th className="px-3 text-left">Status</th>
                  <th className="px-4 text-right">Asking</th>
                </tr>
              </thead>
              <tbody>
                {(summary.recentlyAddedDeals as any[]).map((d) => (
                  <tr key={d.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4">
                      <Link href={`/deals/${d.id}`}>
                        <div className="font-medium text-sm text-foreground hover:text-primary cursor-pointer">{d.dealName}</div>
                        <div className="text-xs text-muted-foreground">{[d.city, d.state].filter(Boolean).join(", ")}</div>
                      </Link>
                    </td>
                    <td className="px-3"><StatusBadge status={d.status} /></td>
                    <td className="px-4 text-right text-sm">{formatCurrency(d.askingPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top Brokers */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Top Brokers</span>
            </div>
            <Link href="/brokers" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {!summary.topBrokers || (summary.topBrokers as any[]).length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">No brokers yet.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 text-left">Broker</th>
                  <th className="px-3 text-left">Relationship</th>
                  <th className="px-3 text-right">Deals</th>
                  <th className="px-4 text-right">Follow-Up</th>
                </tr>
              </thead>
              <tbody>
                {(summary.topBrokers as any[]).map((b) => {
                  const relColor =
                    b.relationshipStrength === "Strong" ? "text-emerald-600" :
                    b.relationshipStrength === "Warm" ? "text-amber-600" :
                    "text-muted-foreground";
                  return (
                    <tr key={b.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4">
                        <Link href={`/brokers/${b.id}`}>
                          <div className="font-medium text-sm text-foreground hover:text-primary cursor-pointer">{b.name}</div>
                          <div className="text-xs text-muted-foreground">{b.company}</div>
                        </Link>
                      </td>
                      <td className="px-3">
                        <span className={`text-xs font-medium ${relColor}`}>{b.relationshipStrength}</span>
                      </td>
                      <td className="px-3 text-right text-sm">{b.dealCount}</td>
                      <td className="px-4 text-right text-xs text-muted-foreground">{b.nextFollowUpDate || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
