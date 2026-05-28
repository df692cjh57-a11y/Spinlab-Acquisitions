import {
  useListReminders, useCompleteReminder, useCreateReminder,
  getListRemindersQueryKey, useListDeals, useListBrokers
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Check, Clock, Calendar, CalendarCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { isOverdue, isDueToday, isDueThisWeek, formatDateShort } from "@/lib/format";

const reminderSchema = z.object({
  title: z.string().min(1, "Title is required"),
  dueDate: z.string().min(1, "Due date is required"),
  priority: z.string().default("Medium"),
  reminderType: z.string().optional(),
  linkedType: z.string().optional(),
  linkedId: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type ReminderItem = {
  id: number;
  title: string;
  dueDate: string;
  priority: string;
  reminderType?: string | null;
  completed: boolean;
  linkedName?: string | null;
  linkedType?: string | null;
  notes?: string | null;
};

function PriorityBadge({ priority }: { priority: string }) {
  const cls =
    priority === "High" ? "bg-red-50 text-red-700 border-red-200" :
    priority === "Medium" ? "bg-amber-50 text-amber-700 border-amber-200" :
    "bg-gray-50 text-gray-500 border-gray-200";
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cls}`}>{priority}</span>;
}

function ReminderRow({
  r,
  overdue,
  onComplete,
}: {
  r: ReminderItem;
  overdue?: boolean;
  onComplete: () => void;
}) {
  return (
    <div className={`flex items-center gap-4 px-4 py-3 bg-card border rounded-lg hover:border-border/80 transition-colors ${overdue ? "border-red-200 bg-red-50/30" : "border-border"}`}>
      <button
        onClick={onComplete}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors hover:bg-emerald-50 hover:border-emerald-400 ${overdue ? "border-red-400" : "border-border"}`}
      >
        <Check className="w-3 h-3 text-transparent hover:text-emerald-500" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-foreground">{r.title}</span>
          <PriorityBadge priority={r.priority} />
          {r.reminderType && (
            <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded">{r.reminderType}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className={`text-xs font-medium ${overdue ? "text-red-600" : "text-muted-foreground"}`}>
            {overdue ? "Overdue · " : ""}{formatDateShort(r.dueDate)}
          </span>
          {r.linkedName && (
            <span className="text-xs text-muted-foreground">{r.linkedType === "deal" ? "Deal" : "Broker"}: {r.linkedName}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function NewReminderDialog() {
  const [open, setOpen] = useState(false);
  const createReminder = useCreateReminder();
  const queryClient = useQueryClient();
  const { data: deals } = useListDeals({});
  const { data: brokers } = useListBrokers({});

  const form = useForm<z.infer<typeof reminderSchema>>({
    resolver: zodResolver(reminderSchema),
    defaultValues: { title: "", dueDate: "", priority: "Medium", reminderType: "", linkedType: "", notes: "" },
  });

  const linkedType = form.watch("linkedType");

  const onSubmit = (values: z.infer<typeof reminderSchema>) => {
    const payload: any = { ...values };
    if (!payload.linkedType || payload.linkedType === "none") { delete payload.linkedType; delete payload.linkedId; }
    if (!payload.linkedId) delete payload.linkedId;
    createReminder.mutate({ data: payload }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey() }); setOpen(false); form.reset(); },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> New Reminder</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Reminder</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Title *</FormLabel><FormControl><Input placeholder="e.g. Follow up on LOI" {...field} /></FormControl></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem><FormLabel>Due Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem><FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="reminderType" render={({ field }) => (
              <FormItem><FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Follow Up">Follow Up</SelectItem>
                    <SelectItem value="Site Visit">Site Visit</SelectItem>
                    <SelectItem value="LOI">LOI</SelectItem>
                    <SelectItem value="Broker Follow Up">Broker Follow Up</SelectItem>
                    <SelectItem value="Task">Task</SelectItem>
                    <SelectItem value="Lease Review">Lease Review</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="linkedType" render={({ field }) => (
              <FormItem><FormLabel>Link to</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="deal">Deal</SelectItem>
                    <SelectItem value="broker">Broker</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            {linkedType === "deal" && deals && (
              <FormField control={form.control} name="linkedId" render={({ field }) => (
                <FormItem><FormLabel>Deal</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select deal..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {deals.map((d) => <SelectItem key={d.id} value={d.id.toString()}>{d.dealName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            )}
            {linkedType === "broker" && brokers && (
              <FormField control={form.control} name="linkedId" render={({ field }) => (
                <FormItem><FormLabel>Broker</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select broker..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {brokers.map((b) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={createReminder.isPending}>{createReminder.isPending ? "Saving..." : "Save Reminder"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

type FilterType = "all" | "deals" | "brokers" | "high" | "overdue";

export default function RemindersPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const { data: activeReminders } = useListReminders({ completed: false });
  const { data: completedReminders } = useListReminders({ completed: true });
  const completeReminder = useCompleteReminder();
  const queryClient = useQueryClient();

  const handleComplete = (id: number) => {
    completeReminder.mutate(
      { id, data: { completed: true } as any },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey() }); } }
    );
  };

  const applyFilter = (items: ReminderItem[]) => {
    if (filter === "deals") return items.filter((r) => r.linkedType === "deal");
    if (filter === "brokers") return items.filter((r) => r.linkedType === "broker");
    if (filter === "high") return items.filter((r) => r.priority === "High");
    if (filter === "overdue") return items.filter((r) => isOverdue(r.dueDate));
    return items;
  };

  const all = applyFilter((activeReminders as ReminderItem[]) ?? []);
  const overdue = all.filter((r) => isOverdue(r.dueDate));
  const dueToday = all.filter((r) => isDueToday(r.dueDate));
  const dueThisWeek = all.filter((r) => isDueThisWeek(r.dueDate) && !isDueToday(r.dueDate) && !isOverdue(r.dueDate));
  const future = all.filter((r) => !isOverdue(r.dueDate) && !isDueToday(r.dueDate) && !isDueThisWeek(r.dueDate));

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "deals", label: "Deals" },
    { key: "brokers", label: "Brokers" },
    { key: "high", label: "High Priority" },
    { key: "overdue", label: "Overdue" },
  ];

  return (
    <div className="p-8 max-w-[900px] mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Reminders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Follow-up discipline keeps deals moving.</p>
        </div>
        <NewReminderDialog />
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors border ${
              filter === key
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {/* Overdue */}
        {overdue.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-semibold text-red-600">Overdue</span>
              <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{overdue.length}</span>
            </div>
            <div className="space-y-2">
              {overdue.map((r) => (
                <ReminderRow key={r.id} r={r} overdue onComplete={() => handleComplete(r.id)} />
              ))}
            </div>
          </section>
        )}

        {/* Due Today */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Due Today</span>
            <span className="bg-blue-50 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-blue-100">{dueToday.length}</span>
          </div>
          {dueToday.length > 0 ? (
            <div className="space-y-2">
              {dueToday.map((r) => <ReminderRow key={r.id} r={r} onComplete={() => handleComplete(r.id)} />)}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground px-4 py-4 bg-card border border-border rounded-lg">
              Nothing due today.
            </div>
          )}
        </section>

        {/* Due This Week */}
        {dueThisWeek.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <CalendarCheck className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Due This Week</span>
              <span className="bg-muted text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{dueThisWeek.length}</span>
            </div>
            <div className="space-y-2">
              {dueThisWeek.map((r) => <ReminderRow key={r.id} r={r} onComplete={() => handleComplete(r.id)} />)}
            </div>
          </section>
        )}

        {/* Future */}
        {future.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Future</span>
              <span className="bg-muted text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{future.length}</span>
            </div>
            <div className="space-y-2">
              {future.map((r) => <ReminderRow key={r.id} r={r} onComplete={() => handleComplete(r.id)} />)}
            </div>
          </section>
        )}

        {/* Completed */}
        <section className="pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground">Completed</span>
              {completedReminders && (
                <span className="bg-muted text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{completedReminders.length}</span>
              )}
            </div>
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showCompleted ? "Hide" : "Show"}
            </button>
          </div>
          {showCompleted && completedReminders && completedReminders.length > 0 && (
            <div className="space-y-2">
              {(completedReminders as ReminderItem[]).map((r) => (
                <div key={r.id} className="flex items-center gap-4 px-4 py-3 bg-muted/30 border border-border rounded-lg opacity-60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-foreground line-through">{r.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {r.linkedName && `${r.linkedName} · `}Due {formatDateShort(r.dueDate)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
