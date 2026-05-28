import { useGetDashboardSummary, useGetDashboardPipeline } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, AlertCircle, Calendar, Users, TrendingUp, DollarSign } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: pipeline, isLoading: isLoadingPipeline } = useGetDashboardPipeline();

  if (isLoadingSummary) {
    return (
      <div className="p-8 space-y-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Deals"
          value={summary.totalActiveDeals}
          icon={Briefcase}
          link="/deals"
        />
        <MetricCard
          title="Hot Deals"
          value={summary.hotDeals}
          icon={TrendingUp}
          className="bg-orange-500/10 border-orange-500/20 text-orange-500"
          link="/deals?priority=Hot"
        />
        <MetricCard
          title="Follow-ups Today"
          value={summary.followUpToday}
          icon={Calendar}
          link="/reminders?dueToday=true"
        />
        <MetricCard
          title="Overdue Reminders"
          value={summary.overdueReminders}
          icon={AlertCircle}
          className={summary.overdueReminders > 0 ? "bg-red-500/10 border-red-500/20 text-red-500" : ""}
          link="/reminders?overdueOnly=true"
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
              <div className="space-y-4">
                {pipeline.map((stage) => (
                  <div key={stage.status} className="flex items-center">
                    <div className="w-48 text-sm font-medium">{stage.status}</div>
                    <div className="flex-1 mx-4">
                      <div className="h-4 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${Math.min(100, (stage.count / summary.totalActiveDeals) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-12 text-right font-medium">{stage.count}</div>
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
              <div className="space-y-4">
                {summary.todayReminders.map(reminder => (
                  <div key={reminder.id} className="flex flex-col gap-1 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{reminder.title}</span>
                      <span className="text-xs text-muted-foreground">{new Date(reminder.dueDate).toLocaleDateString()}</span>
                    </div>
                    {reminder.linkedName && (
                      <span className="text-xs text-primary">{reminder.linkedName}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No reminders due today.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, className = "", link }: { title: string; value: number | string; icon: any; className?: string; link?: string }) {
  const content = (
    <Card className={`transition-colors ${className}`}>
      <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
        <Icon className="w-6 h-6 mb-2 opacity-80" />
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-sm font-medium opacity-80">{title}</div>
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
