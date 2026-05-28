import { useGetDashboardSummary, useGetDashboardPipeline } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, AlertCircle, Calendar, Users, TrendingUp, DollarSign, FileText, Ban, AlertTriangle, Activity } from "lucide-react";
import { Link } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatMultiple, formatDateShort } from "@/lib/format";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: pipeline, isLoading: isLoadingPipeline } = useGetDashboardPipeline();

  if (isLoadingSummary) {
    return (
      <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
        <h1 className="text-3xl font-bold">Command Center</h1>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <MetricCard
          title="Total Active Deals"
          value={summary.totalActiveDeals}
          icon={Briefcase}
          link="/deals"
          className="bg-primary/5 text-primary border-primary/20"
        />
        <MetricCard
          title="Hot Deals"
          value={summary.hotDeals}
          icon={TrendingUp}
          className="bg-orange-500/5 text-orange-600 border-orange-500/20"
          link="/deals?hotOnly=true"
        />
        <MetricCard
          title="Overdue Reminders"
          value={summary.overdueReminders}
          icon={AlertCircle}
          className={summary.overdueReminders > 0 ? "bg-red-500/5 text-red-600 border-red-500/20" : ""}
          link="/reminders?overdueOnly=true"
        />
        <MetricCard
          title="Due Today"
          value={summary.followUpToday}
          icon={Calendar}
          className={summary.followUpToday > 0 ? "bg-yellow-500/5 text-yellow-600 border-yellow-500/20" : ""}
          link="/reminders?dueToday=true"
        />
        <MetricCard
          title="Stalled Deals"
          value={summary.stalledDeals}
          icon={AlertTriangle}
          className="bg-muted text-muted-foreground"
          link="/deals?status=Stalled"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <MetricCard
          title="Brokers to Follow-up"
          value={summary.brokersNeedingFollowUp}
          icon={Users}
          link="/brokers?followUpDue=true"
        />
        <MetricCard
          title="In Underwriting"
          value={summary.dealsInUnderwriting}
          icon={Activity}
          link="/deals?status=Underwriting"
        />
        <MetricCard
          title="LOIs Sent"
          value={summary.loisSent}
          icon={FileText}
          link="/deals?status=LOI Sent"
        />
        <MetricCard
          title="Dead Deals"
          value={summary.deadDeals}
          icon={Ban}
          link="/deals?deadOnly=true"
        />
        <MetricCard
          title="Avg Asking Multiple"
          value={`${summary.avgAskingMultiple.toFixed(1)}x`}
          icon={DollarSign}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPipeline ? (
              <Skeleton className="h-64 w-full" />
            ) : pipeline && pipeline.length > 0 ? (
              <div className="space-y-5 mt-2">
                {pipeline.filter(s => s.count > 0).map((stage) => (
                  <div key={stage.status} className="flex items-center">
                    <div className="w-48 text-sm font-medium">{stage.status}</div>
                    <div className="flex-1 mx-4">
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${Math.min(100, (stage.count / summary.totalActiveDeals) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-12 text-right font-medium text-sm">{stage.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No pipeline data
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Due Today</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.todayReminders && summary.todayReminders.length > 0 ? (
              <div className="space-y-3">
                {summary.todayReminders.map(reminder => (
                  <div key={reminder.id} className="flex flex-col p-3 rounded-md border bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{reminder.title}</span>
                      <span className="text-xs text-muted-foreground">{formatDateShort(reminder.dueDate)}</span>
                    </div>
                    {reminder.linkedName && (
                      <div className="mt-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {reminder.linkedType}: {reminder.linkedName}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No reminders due today.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Hot Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Asking</TableHead>
                  <TableHead>Multiple</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.hotDealsList && summary.hotDealsList.length > 0 ? (
                  summary.hotDealsList.map(deal => (
                    <TableRow key={deal.id}>
                      <TableCell className="font-medium">
                        <Link href={`/deals/${deal.id}`} className="text-primary hover:underline">
                          {deal.dealName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{deal.city || "-"}</TableCell>
                      <TableCell>{formatCurrency(deal.askingPrice)}</TableCell>
                      <TableCell>{formatMultiple(deal.askingMultiple)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">{deal.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No hot deals.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overdue Follow-ups</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Next Action</TableHead>
                  <TableHead className="text-right">Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.overdueDealsList && summary.overdueDealsList.length > 0 ? (
                  summary.overdueDealsList.map(deal => (
                    <TableRow key={deal.id}>
                      <TableCell className="font-medium">
                        <Link href={`/deals/${deal.id}`} className="text-primary hover:underline">
                          {deal.dealName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm truncate max-w-[200px]">
                        {deal.nextAction}
                      </TableCell>
                      <TableCell className="text-right text-red-500 text-sm font-medium">
                        {formatDateShort(deal.nextActionDueDate)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No overdue follow-ups.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, className = "", link }: { title: string; value: number | string; icon: any; className?: string; link?: string }) {
  const content = (
    <Card className={`transition-colors border ${className}`}>
      <CardContent className="p-5 flex flex-col items-start justify-center space-y-3">
        <div className="flex items-center justify-between w-full">
          <div className="text-sm font-medium opacity-80">{title}</div>
          <Icon className="w-5 h-5 opacity-70" />
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );

  if (link) {
    return (
      <Link href={link}>
        <div className="block cursor-pointer hover:opacity-80 transition-opacity">
          {content}
        </div>
      </Link>
    );
  }

  return content;
}
