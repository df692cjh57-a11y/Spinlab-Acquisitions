import { useListReminders, useCompleteReminder, useCreateReminder, getListRemindersQueryKey, useListDeals, useListBrokers } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Calendar as CalendarIcon, Plus, CalendarDays, CalendarCheck, CheckCircle } from "lucide-react";
import { formatDateShort, isOverdue, isDueToday } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RemindersPage() {
  const [showCompleted, setShowCompleted] = useState(false);
  const { data: activeReminders, isLoading: loadingActive } = useListReminders({ completed: false });
  const { data: completedReminders, isLoading: loadingCompleted } = useListReminders({ completed: true });
  
  const completeReminder = useCompleteReminder();
  const queryClient = useQueryClient();

  const handleComplete = (id: number) => {
    completeReminder.mutate(
      { id, data: { completed: true } as any }, 
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey() });
        }
      }
    );
  };

  if (loadingActive) {
    return <div className="p-8 text-center text-muted-foreground">Loading reminders...</div>;
  }

  // Group active reminders
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  const overdue = activeReminders?.filter(r => isOverdue(r.dueDate)) || [];
  const dueToday = activeReminders?.filter(r => isDueToday(r.dueDate)) || [];
  const dueThisWeek = activeReminders?.filter(r => {
    if (isOverdue(r.dueDate) || isDueToday(r.dueDate)) return false;
    const d = new Date(r.dueDate);
    d.setHours(0, 0, 0, 0);
    return d <= nextWeek;
  }) || [];
  const future = activeReminders?.filter(r => {
    const d = new Date(r.dueDate);
    d.setHours(0, 0, 0, 0);
    return d > nextWeek;
  }) || [];

  return (
    <div className="p-8 space-y-8 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reminders</h1>
          <p className="text-muted-foreground mt-1">Keep your deal flow moving.</p>
        </div>
        <NewReminderDialog />
      </div>

      <div className="space-y-8">
        
        {/* Overdue */}
        {overdue.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4 text-red-600">
              <Clock className="w-5 h-5" /> 
              <h2 className="text-lg font-semibold">Overdue</h2>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 ml-2 rounded-full px-2 py-0">{overdue.length}</Badge>
            </div>
            <div className="space-y-3">
              {overdue.map(r => (
                <ReminderCard key={r.id} reminder={r} onComplete={() => handleComplete(r.id)} isOverdue />
              ))}
            </div>
          </section>
        )}

        {/* Due Today */}
        <section>
          <div className="flex items-center gap-2 mb-4 text-primary">
            <CalendarIcon className="w-5 h-5" /> 
            <h2 className="text-lg font-semibold">Due Today</h2>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 ml-2 rounded-full px-2 py-0">{dueToday.length}</Badge>
          </div>
          {dueToday.length > 0 ? (
            <div className="space-y-3">
              {dueToday.map(r => (
                <ReminderCard key={r.id} reminder={r} onComplete={() => handleComplete(r.id)} />
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground p-6 bg-card border rounded-lg text-center text-sm">
              No reminders due today. Take a breather or tackle something from this week!
            </div>
          )}
        </section>

        {/* Due This Week */}
        {dueThisWeek.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4 text-foreground">
              <CalendarDays className="w-5 h-5 text-muted-foreground" /> 
              <h2 className="text-lg font-semibold">Due This Week</h2>
              <Badge variant="secondary" className="ml-2 rounded-full px-2 py-0">{dueThisWeek.length}</Badge>
            </div>
            <div className="space-y-3">
              {dueThisWeek.map(r => (
                <ReminderCard key={r.id} reminder={r} onComplete={() => handleComplete(r.id)} />
              ))}
            </div>
          </section>
        )}

        {/* Future */}
        {future.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4 text-foreground">
              <CalendarCheck className="w-5 h-5 text-muted-foreground" /> 
              <h2 className="text-lg font-semibold">Future</h2>
              <Badge variant="secondary" className="ml-2 rounded-full px-2 py-0">{future.length}</Badge>
            </div>
            <div className="space-y-3">
              {future.map(r => (
                <ReminderCard key={r.id} reminder={r} onComplete={() => handleComplete(r.id)} />
              ))}
            </div>
          </section>
        )}

        {/* Completed */}
        <section className="pt-8 border-t">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="w-5 h-5" /> 
              <h2 className="text-lg font-semibold">Completed</h2>
              {completedReminders && <Badge variant="outline" className="ml-2 rounded-full px-2 py-0">{completedReminders.length}</Badge>}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowCompleted(!showCompleted)}>
              {showCompleted ? "Hide" : "Show"}
            </Button>
          </div>
          
          {showCompleted && completedReminders && (
            <div className="space-y-3">
              {completedReminders.length > 0 ? (
                completedReminders.map(r => (
                  <Card key={r.id} className="opacity-60 bg-muted/20">
                    <CardContent className="p-4 flex items-center gap-4">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      <div>
                        <div className="font-medium text-sm line-through">{r.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Completed • Due was {formatDateShort(r.dueDate)}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">No completed reminders.</div>
              )}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

function ReminderCard({ reminder, onComplete, isOverdue = false }: { reminder: any, onComplete: () => void, isOverdue?: boolean }) {
  return (
    <Card className={`transition-colors hover:bg-muted/30 group shadow-sm ${isOverdue ? 'border-red-200 bg-red-50/10' : ''}`}>
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full h-6 w-6 mt-0.5 border border-muted-foreground/30 text-transparent hover:text-green-600 hover:border-green-600 hover:bg-green-50 shrink-0 transition-all group-hover:border-primary/40 group-hover:text-primary/20"
            onClick={onComplete}
          >
            <CheckCircle2 className="h-5 w-5" />
          </Button>
          <div>
            <div className="font-medium text-[15px]">{reminder.title}</div>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className={`text-xs font-medium ${isOverdue ? "text-red-600" : isDueToday(reminder.dueDate) ? "text-primary" : "text-muted-foreground"}`}>
                {formatDateShort(reminder.dueDate)}
              </span>
              
              {reminder.reminderType && (
                <>
                  <span className="text-muted-foreground/30 text-xs">•</span>
                  <span className="text-xs text-muted-foreground">{reminder.reminderType}</span>
                </>
              )}

              {reminder.linkedName && (
                <>
                  <span className="text-muted-foreground/30 text-xs">•</span>
                  <Badge variant="secondary" className="font-normal text-[10px] px-1.5 py-0 bg-muted/50">
                    {reminder.linkedType === 'deal' ? 'Deal' : 'Broker'}: {reminder.linkedName}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
        {reminder.priority === "High" && (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 shrink-0 uppercase tracking-wider text-[10px]">High</Badge>
        )}
      </CardContent>
    </Card>
  );
}

function NewReminderDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    dueDate: "",
    priority: "Medium",
    reminderType: "Call broker",
    linkedType: "none",
    linkedId: ""
  });
  
  const { data: deals } = useListDeals({});
  const { data: brokers } = useListBrokers({});
  const createReminder = useCreateReminder();
  const queryClient = useQueryClient();

  const handleSave = () => {
    if (!formData.title || !formData.dueDate) return;
    
    const payload: any = {
      title: formData.title,
      dueDate: formData.dueDate,
      priority: formData.priority,
      reminderType: formData.reminderType,
      completed: false
    };

    if (formData.linkedType !== "none" && formData.linkedId) {
      payload.linkedType = formData.linkedType;
      payload.linkedId = parseInt(formData.linkedId);
    }

    createReminder.mutate({ data: payload }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey() });
        setOpen(false);
        setFormData({
          title: "", dueDate: "", priority: "Medium", reminderType: "Call broker", linkedType: "none", linkedId: ""
        });
      }
    });
  };

  const TYPES = [
    'Call broker', 'Follow up on financials', 'Request lease', 'Schedule site visit', 
    'Send LOI', 'Review tax returns', 'Ask about seller financing', 'Check zoning', 
    'Call lender', 'Follow up after no response', 'Revisit dead deal', 'Review underwriting', 
    'Request utility bills', 'Ask for machine list', 'Ask for card system reports'
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-new-reminder"><Plus className="w-4 h-4 mr-2" /> New Reminder</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Reminder</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="What needs to be done?" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date *</label>
              <Input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Task Type</label>
            <Select value={formData.reminderType} onValueChange={v => setFormData({...formData, reminderType: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Link To</label>
              <Select value={formData.linkedType} onValueChange={v => setFormData({...formData, linkedType: v, linkedId: ""})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="deal">Deal</SelectItem>
                  <SelectItem value="broker">Broker</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formData.linkedType !== "none" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select {formData.linkedType === "deal" ? "Deal" : "Broker"}</label>
                <Select value={formData.linkedId} onValueChange={v => setFormData({...formData, linkedId: v})}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {formData.linkedType === "deal" && deals?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.dealName}</SelectItem>)}
                    {formData.linkedType === "broker" && brokers?.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!formData.title || !formData.dueDate || createReminder.isPending}>
            {createReminder.isPending ? "Saving..." : "Create Reminder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
