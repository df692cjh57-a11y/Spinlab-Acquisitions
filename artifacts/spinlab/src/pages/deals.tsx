import {
  useListDeals, useCreateDeal, useUpdateDeal,
  getListDealsQueryKey, useListBrokers
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, Plus, LayoutList, Columns, ChevronRight, X, MoreHorizontal, Archive, Trash2 } from "lucide-react";
import { formatCurrency, isOverdue } from "@/lib/format";
import { calculateFullUnderwriting } from "@/lib/financialCalculations";
import { softDeleteDeal, archiveDeal } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ALL_STATUSES = [
  "New Lead","Contacted Broker","NDA Sent","Financials Requested","Financials Received",
  "Underwriting","Site Visit Scheduled","LOI Sent","Negotiation","Under Contract",
  "Due Diligence","Financing","Closed","Dead Deal","Follow Up Later","Stalled",
];

const PIPELINE_STAGES = [
  "New Lead","Contacted Broker","Financials Requested","Financials Received",
  "Underwriting","Site Visit Scheduled","LOI Sent","Negotiation",
  "Under Contract","Due Diligence",
];

const createDealSchema = z.object({
  dealName: z.string().min(1, "Deal name is required"),
  businessName: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  assetType: z.string().default("Laundromat"),
  askingPrice: z.coerce.number().optional(),
  grossRevenue: z.coerce.number().optional(),
  adjustedNetIncome: z.coerce.number().optional(),
  monthlyRent: z.coerce.number().optional(),
  status: z.string().min(1, "Status is required"),
  priority: z.string().min(1, "Priority is required"),
  nextAction: z.string().optional(),
  nextActionDueDate: z.string().optional(),
  brokerId: z.coerce.number().optional(),
});

function StatusBadge({ status }: { status: string }) {
  const closed = status === "Closed";
  const dead = ["Dead Deal","Stalled"].includes(status);
  const active = ["Under Contract","Due Diligence","Financing","LOI Sent","Negotiation"].includes(status);
  const cls = closed ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : dead ? "bg-red-50 text-red-600 border-red-200"
    : active ? "bg-purple-50 text-purple-700 border-purple-200"
    : "bg-blue-50 text-blue-700 border-blue-200";
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cls}`}>{status}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls =
    priority === "Hot" ? "bg-rose-50 text-rose-700 border-rose-200" :
    priority === "High" ? "bg-amber-50 text-amber-700 border-amber-200" :
    priority === "Medium" ? "bg-blue-50 text-blue-700 border-blue-100" :
    "bg-gray-50 text-gray-500 border-gray-200";
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cls}`}>{priority}</span>;
}

function ScoreBadge({ score, quality }: { score?: number | null; quality?: string | null }) {
  if (score == null) return <span className="text-muted-foreground text-xs">—</span>;
  const cls = score >= 70 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600";
  return (
    <div className="flex flex-col items-end">
      <span className={`text-sm font-bold ${cls}`}>{score}</span>
      <span className="text-[9px] text-muted-foreground leading-tight">{quality}</span>
    </div>
  );
}

function MultipleCell({ value }: { value?: number | null }) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  const cls = value > 5 ? "text-red-600 font-semibold" : value < 3.5 ? "text-emerald-600 font-semibold" : "text-foreground";
  return <span className={`text-sm font-mono ${cls}`}>{value.toFixed(2)}x</span>;
}

type Deal = {
  id: number;
  dealName: string;
  city?: string | null;
  state?: string | null;
  status: string;
  priority: string;
  askingPrice?: number | null;
  grossRevenue?: number | null;
  adjustedNetIncome?: number | null;
  askingMultiple?: number | null;
  rentAsPercentGross?: number | null;
  dealScore?: number | null;
  dealQuality?: string | null;
  brokerName?: string | null;
  nextAction?: string | null;
  nextActionDueDate?: string | null;
};

function PipelineView({ deals, onStatusChange }: { deals: Deal[]; onStatusChange: (id: number, status: string) => void }) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {PIPELINE_STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.status === stage);
          return (
            <div key={stage} className="w-56 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{stage}</span>
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 rounded-full">{stageDeals.length}</span>
              </div>
              <div className="space-y-2">
                {stageDeals.map((d) => (
                  <Link key={d.id} href={`/deals/${d.id}`}>
                    <div className="bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-colors cursor-pointer group">
                      <div className="font-medium text-sm text-foreground group-hover:text-primary leading-tight mb-1">{d.dealName}</div>
                      <div className="text-xs text-muted-foreground mb-2">{[d.city, d.state].filter(Boolean).join(", ")}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{formatCurrency(d.askingPrice)}</span>
                        {d.askingMultiple && <span className="text-xs font-mono text-muted-foreground">{d.askingMultiple.toFixed(2)}x</span>}
                      </div>
                      {d.brokerName && <div className="text-[10px] text-muted-foreground mt-1 truncate">{d.brokerName}</div>}
                      <div className="flex items-center justify-between mt-2">
                        <PriorityBadge priority={d.priority} />
                        {d.dealScore != null && (
                          <span className={`text-xs font-bold ${d.dealScore >= 70 ? "text-emerald-600" : d.dealScore >= 50 ? "text-amber-600" : "text-red-600"}`}>
                            {d.dealScore}
                          </span>
                        )}
                      </div>
                      {d.nextAction && (
                        <div className="mt-2 text-[10px] text-muted-foreground truncate border-t border-border pt-1.5">
                          {d.nextAction}
                        </div>
                      )}
                      <div className="mt-1.5" onClick={(e) => e.preventDefault()}>
                        <Select value={d.status} onValueChange={(v) => onStatusChange(d.id, v)}>
                          <SelectTrigger className="h-6 text-[10px] border-border/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Link>
                ))}
                {stageDeals.length === 0 && (
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center text-[10px] text-muted-foreground">
                    No deals
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ──────────────────────────────────────────────

function DeleteDealModal({
  open, deal, onOpenChange, onConfirm, onArchiveInstead,
}: {
  open: boolean;
  deal: any | null;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  onArchiveInstead: () => void;
}) {
  if (!deal) return null;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete deal?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>This will move the deal to Deleted Deals. You can restore it later from Settings.</p>
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="font-semibold text-foreground">{deal.dealName}</div>
                {(deal.city || deal.state) && <div className="text-muted-foreground">{[deal.city, deal.state].filter(Boolean).join(", ")}</div>}
                {deal.askingPrice && <div className="text-muted-foreground">{formatCurrency(Number(deal.askingPrice))}</div>}
                {deal.brokerName && <div className="text-muted-foreground">Broker: {deal.brokerName}</div>}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onArchiveInstead}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
          >
            <Archive className="w-3.5 h-3.5 mr-1.5" />Archive instead
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete deal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function DealsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [hotOnly, setHotOnly] = useState(false);
  const [view, setView] = useState<"table" | "pipeline">("table");
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: deals, isLoading } = useListDeals({
    search,
    ...(statusFilter !== "All" && { status: statusFilter }),
    ...(priorityFilter !== "All" && { priority: priorityFilter }),
    ...(overdueOnly && { overdueOnly: true }),
    ...(hotOnly && { priority: "Hot" }),
  });

  const { data: brokers } = useListBrokers({});
  const queryClient = useQueryClient();
  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();

  const form = useForm<z.infer<typeof createDealSchema>>({
    resolver: zodResolver(createDealSchema),
    defaultValues: { dealName: "", businessName: "", city: "", state: "", assetType: "Laundromat", status: "New Lead", priority: "Medium", nextAction: "" },
  });

  const onSubmit = (values: z.infer<typeof createDealSchema>) => {
    createDeal.mutate({ data: values as any }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListDealsQueryKey() }); setIsOpen(false); form.reset(); },
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateDeal.mutate({ id, data: { status } as any }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListDealsQueryKey() }); },
    });
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListDealsQueryKey() });

  const handleDelete = async (deal: any) => {
    await softDeleteDeal(deal.id);
    toast({ title: "Deal deleted", description: `${deal.dealName} has been moved to Deleted Deals.` });
    setDeleteTarget(null);
    setSelected((prev) => { const s = new Set(prev); s.delete(deal.id); return s; });
    invalidate();
  };

  const handleArchive = async (deal: any) => {
    await archiveDeal(deal.id);
    toast({ title: "Deal archived", description: `${deal.dealName} has been archived.` });
    setDeleteTarget(null);
    setSelected((prev) => { const s = new Set(prev); s.delete(deal.id); return s; });
    invalidate();
  };

  const handleBulkDelete = async () => {
    const ids = [...selected];
    await Promise.all(ids.map(softDeleteDeal));
    toast({ title: `${ids.length} deal${ids.length > 1 ? "s" : ""} deleted` });
    setSelected(new Set());
    setBulkDeleteOpen(false);
    invalidate();
  };

  const handleBulkArchive = async () => {
    const ids = [...selected];
    await Promise.all(ids.map(archiveDeal));
    toast({ title: `${ids.length} deal${ids.length > 1 ? "s" : ""} archived` });
    setSelected(new Set());
    setBulkArchiveOpen(false);
    invalidate();
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const allIds = (deals as any[] | undefined)?.map((d) => d.id) ?? [];
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  const hasFilters = statusFilter !== "All" || priorityFilter !== "All" || overdueOnly || hotOnly || search;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Deals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track laundromat and real estate acquisition opportunities</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Deal</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Add Deal</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="dealName" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Deal Name *</FormLabel><FormControl><Input placeholder="e.g. Brooklyn Coin Laundry" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="businessName" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Business Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem><FormLabel>State</FormLabel><FormControl><Input placeholder="NY" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="askingPrice" render={({ field }) => (
                    <FormItem><FormLabel>Asking Price ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="grossRevenue" render={({ field }) => (
                    <FormItem><FormLabel>Gross Revenue ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="adjustedNetIncome" render={({ field }) => (
                    <FormItem><FormLabel>Adjusted SDE ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="monthlyRent" render={({ field }) => (
                    <FormItem><FormLabel>Monthly Rent ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem><FormLabel>Priority *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {["Hot","High","Medium","Low"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="brokerId" render={({ field }) => (
                    <FormItem><FormLabel>Broker</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select broker..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {brokers?.map((b) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="nextActionDueDate" render={({ field }) => (
                    <FormItem><FormLabel>Next Action Due</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="nextAction" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Next Action</FormLabel><FormControl><Input placeholder="What needs to happen next?" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>Cancel</Button>
                  <Button type="submit" size="sm" disabled={createDeal.isPending}>{createDeal.isPending ? "Adding..." : "Add Deal"}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search deals..." className="pl-8 h-8 w-52 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-48 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Priorities</SelectItem>
            {["Hot","High","Medium","Low"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <button
          onClick={() => setOverdueOnly(!overdueOnly)}
          className={`px-3 py-1 h-8 rounded border text-xs font-medium transition-colors ${overdueOnly ? "bg-red-600 text-white border-red-600" : "bg-card text-muted-foreground border-border hover:border-foreground/30"}`}
        >
          Overdue
        </button>
        <button
          onClick={() => setHotOnly(!hotOnly)}
          className={`px-3 py-1 h-8 rounded border text-xs font-medium transition-colors ${hotOnly ? "bg-rose-600 text-white border-rose-600" : "bg-card text-muted-foreground border-border hover:border-foreground/30"}`}
        >
          Hot
        </button>
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setStatusFilter("All"); setPriorityFilter("All"); setOverdueOnly(false); setHotOnly(false); }}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <div className="ml-auto flex items-center gap-1 border border-border rounded overflow-hidden">
          <button
            onClick={() => setView("table")}
            className={`px-2.5 py-1.5 text-xs transition-colors ${view === "table" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutList className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setView("pipeline")}
            className={`px-2.5 py-1.5 text-xs transition-colors ${view === "pipeline" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {someSelected && view === "table" && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5">
          <span className="text-sm font-medium">{selected.size} deal{selected.size > 1 ? "s" : ""} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setBulkArchiveOpen(true)}>
              <Archive className="w-3.5 h-3.5" /> Archive selected
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="w-3.5 h-3.5" /> Delete selected
            </Button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground ml-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-11 bg-muted animate-pulse rounded" />)}</div>
      ) : !deals || deals.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center text-sm text-muted-foreground">
          No deals match your filters.{" "}<button onClick={() => setIsOpen(true)} className="text-primary hover:underline">Add one.</button>
        </div>
      ) : view === "pipeline" ? (
        <PipelineView deals={deals as Deal[]} onStatusChange={handleStatusChange} />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="px-3 w-8">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) => {
                      if (v) setSelected(new Set(allIds));
                      else setSelected(new Set());
                    }}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-4 text-left">Deal</th>
                <th className="px-3 text-left">Location</th>
                <th className="px-3 text-right">Asking</th>
                <th className="px-3 text-right">Gross Rev</th>
                <th className="px-3 text-right">Adj. SDE</th>
                <th className="px-3 text-right">Multiple</th>
                <th className="px-3 text-right">DSCR</th>
                <th className="px-3 text-right">CoC</th>
                <th className="px-3 text-right">Rent %</th>
                <th className="px-3 text-left">Status</th>
                <th className="px-3 text-left">Priority</th>
                <th className="px-3 text-left">Broker</th>
                <th className="px-3 text-left">Next Action</th>
                <th className="px-3 text-right">Due</th>
                <th className="px-3 text-right">Score</th>
                <th className="px-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {(deals as any[]).map((d) => {
                const overdue = isOverdue(d.nextActionDueDate);
                const fin = calculateFullUnderwriting(d);
                const dscrColor = fin.dscr !== null
                  ? fin.dscr >= 1.5 ? "text-emerald-600 font-semibold"
                  : fin.dscr < 1.25 ? "text-red-600 font-semibold"
                  : "text-amber-600 font-semibold"
                  : "text-muted-foreground";
                const cocColor = fin.cashOnCashReturn !== null
                  ? fin.cashOnCashReturn >= 0.15 ? "text-emerald-600 font-semibold"
                  : fin.cashOnCashReturn < 0.08 ? "text-red-600 font-semibold"
                  : "text-amber-600 font-semibold"
                  : "text-muted-foreground";
                const isSelected = selected.has(d.id);
                return (
                  <tr key={d.id} className={`hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0 ${isSelected ? "bg-primary/5" : ""}`}>
                    <td className="px-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(d.id)}
                        aria-label={`Select ${d.dealName}`}
                      />
                    </td>
                    <td className="px-4">
                      <Link href={`/deals/${d.id}`}>
                        <div className="font-medium text-sm text-foreground hover:text-primary cursor-pointer leading-tight">{d.dealName}</div>
                      </Link>
                    </td>
                    <td className="px-3 text-xs text-muted-foreground whitespace-nowrap">{[d.city, d.state].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-3 text-right text-sm">{formatCurrency(d.askingPrice)}</td>
                    <td className="px-3 text-right text-sm text-muted-foreground">{formatCurrency(d.grossRevenue)}</td>
                    <td className="px-3 text-right text-sm">{d.adjustedNetIncome ? formatCurrency(Number(d.adjustedNetIncome)) : "—"}</td>
                    <td className="px-3 text-right"><MultipleCell value={fin.askingMultiple} /></td>
                    <td className="px-3 text-right">
                      <span className={`text-xs font-mono ${dscrColor}`}>
                        {fin.dscr !== null ? fin.dscr.toFixed(2) + "x" : "—"}
                      </span>
                    </td>
                    <td className="px-3 text-right">
                      <span className={`text-xs font-mono ${cocColor}`}>
                        {fin.cashOnCashReturn !== null ? (fin.cashOnCashReturn * 100).toFixed(1) + "%" : "—"}
                      </span>
                    </td>
                    <td className="px-3 text-right text-xs text-muted-foreground">
                      {fin.rentPctGross !== null ? (
                        <span className={fin.rentPctGross > 0.20 ? "text-red-600 font-medium" : ""}>{(fin.rentPctGross * 100).toFixed(1)}%</span>
                      ) : "—"}
                    </td>
                    <td className="px-3"><StatusBadge status={d.status} /></td>
                    <td className="px-3"><PriorityBadge priority={d.priority} /></td>
                    <td className="px-3 text-xs text-muted-foreground">{d.brokerName || "—"}</td>
                    <td className="px-3 text-xs text-muted-foreground max-w-[160px]">
                      <span className="truncate block">{d.nextAction || <span className="text-red-500 italic">No next action</span>}</span>
                    </td>
                    <td className={`px-3 text-right text-xs whitespace-nowrap ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                      {d.nextActionDueDate || "—"}
                    </td>
                    <td className="px-3 text-right">
                      <ScoreBadge score={fin.calculatedDealScore} quality={fin.dealQuality} />
                    </td>
                    <td className="px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors">
                            <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem asChild>
                            <Link href={`/deals/${d.id}`}><ChevronRight className="w-3.5 h-3.5 mr-2" />View deal</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleArchive(d)} className="gap-2">
                            <Archive className="w-3.5 h-3.5" />Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(d)}
                            className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Single delete modal */}
      <DeleteDealModal
        open={deleteTarget !== null}
        deal={deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onArchiveInstead={() => deleteTarget && handleArchive(deleteTarget)}
      />

      {/* Bulk delete modal */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} deal{selected.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the selected deals to Deleted Deals. You can restore them later from Settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleBulkDelete}>
              Delete {selected.size} deal{selected.size > 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk archive modal */}
      <AlertDialog open={bulkArchiveOpen} onOpenChange={setBulkArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {selected.size} deal{selected.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              These deals will be hidden from your active pipeline. You can restore them later from Settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkArchive}>
              Archive {selected.size} deal{selected.size > 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
