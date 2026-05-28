import { useListReminders, useCompleteReminder, getListRemindersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Calendar as CalendarIcon, Plus } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export default function RemindersPage() {
  const { data: reminders, isLoading } = useListReminders({ completed: false });
  const completeReminder = useCompleteReminder();
  const queryClient = useQueryClient();

  const handleComplete = (id: number) => {
    completeReminder.mutate(
      { id, data: { completed: true } }, 
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey() });
        }
      }
    );
  };

  if (isLoading) {
    return <div className="p-8">Loading reminders...</div>;
  }

  // Group reminders
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const overdue = reminders?.filter(r => new Date(r.dueDate) < now) || [];
  const dueToday = reminders?.filter(r => {
    const d = new Date(r.dueDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === now.getTime();
  }) || [];
  const upcoming = reminders?.filter(r => {
    const d = new Date(r.dueDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() > now.getTime();
  }) || [];

  return (
    <div className="p-8 space-y-8 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reminders</h1>
          <p className="text-muted-foreground mt-1">Keep your deal flow moving.</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> New Reminder</Button>
      </div>

      <div className="space-y-8">
        {overdue.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-red-500 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" /> Overdue
            </h2>
            <div className="space-y-3">
              {overdue.map(r => (
                <ReminderCard key={r.id} reminder={r} onComplete={() => handleComplete(r.id)} isOverdue />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
            <CalendarIcon className="w-5 h-5" /> Due Today
          </h2>
          {dueToday.length > 0 ? (
            <div className="space-y-3">
              {dueToday.map(r => (
                <ReminderCard key={r.id} reminder={r} onComplete={() => handleComplete(r.id)} />
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground p-6 bg-card border rounded-lg text-center">
              No reminders due today.
            </div>
          )}
        </section>

        {upcoming.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              Upcoming
            </h2>
            <div className="space-y-3">
              {upcoming.map(r => (
                <ReminderCard key={r.id} reminder={r} onComplete={() => handleComplete(r.id)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ReminderCard({ reminder, onComplete, isOverdue = false }: { reminder: any, onComplete: () => void, isOverdue?: boolean }) {
  return (
    <Card className={`transition-colors hover:bg-muted/30 ${isOverdue ? 'border-red-500/30' : ''}`}>
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full h-6 w-6 mt-1 text-muted-foreground hover:text-green-500 shrink-0"
            onClick={onComplete}
          >
            <CheckCircle2 className="h-5 w-5" />
          </Button>
          <div>
            <div className="font-medium text-base">{reminder.title}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <span className={isOverdue ? "text-red-500 font-medium" : ""}>
                {formatDate(reminder.dueDate)}
              </span>
              {reminder.linkedName && (
                <>
                  <span className="text-border">•</span>
                  <Badge variant="secondary" className="font-normal">{reminder.linkedType}: {reminder.linkedName}</Badge>
                </>
              )}
            </div>
          </div>
        </div>
        {reminder.priority === "High" && (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 w-fit">High Priority</Badge>
        )}
      </CardContent>
    </Card>
  );
}
