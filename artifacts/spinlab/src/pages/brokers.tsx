import { useListBrokers, useCreateBroker, getListBrokersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, Plus, ChevronRight, MoreHorizontal, Archive, Trash2, X, AlertTriangle } from "lucide-react";
import { isOverdue } from "@/lib/format";
import {
  softDeleteBroker, archiveBroker, getBrokerLinkedDeals, deleteBrokerUnlink, deleteBrokerReassign,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  market: z.string().optional(),
  specialty: z.string().optional(),
  brokerType: z.string().optional(),
  relationshipStrength: z.string().default("Cold"),
  notes: z.string().optional(),
});

function RelBadge({ strength }: { strength?: string | null }) {
  const s = strength || "Cold";
  const cls =
    s === "Strong" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    s === "Warm" ? "bg-amber-50 text-amber-700 border-amber-200" :
    "bg-gray-50 text-gray-500 border-gray-200";
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cls}`}>{s}</span>;
}

function Dots({ value }: { value?: number | null }) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="inline-flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= value ? "bg-primary" : "bg-border"}`} />
      ))}
    </span>
  );
}

function BrokerScore({ trust, responsiveness, quality }: { trust?: number | null; responsiveness?: number | null; quality?: number | null }) {
  const vals = [trust, responsiveness, quality].filter((v) => v != null) as number[];
  if (vals.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
  const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  const cls = avg >= 4 ? "text-emerald-600" : avg >= 3 ? "text-amber-600" : "text-red-600";
  return <span className={`text-sm font-semibold ${cls}`}>{avg}/5</span>;
}

type LinkedDeal = { id: number; dealName: string; status: string; askingPrice?: number | null };

// ── Broker Delete Modal (handles linked deals) ────────────────────────────

function BrokerDeleteModal({
  open, broker, onOpenChange, onDeleted,
}: {
  open: boolean;
  broker: any | null;
  onOpenChange: (v: boolean) => void;
  onDeleted: () => void;
}) {
  const [linkedDeals, setLinkedDeals] = useState<LinkedDeal[]>([]);
  const [loadingLinked, setLoadingLinked] = useState(false);
  const [action, setAction] = useState<"simple" | "unlink" | "reassign">("simple");
  const [reassignTo, setReassignTo] = useState<string>("");
  const [otherBrokers, setOtherBrokers] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: allBrokers } = useListBrokers ? useListBrokers({}) : { data: [] as any[] };

  useEffect(() => {
    if (!open || !broker) return;
    setLoadingLinked(true);
    setAction("simple");
    setReassignTo("");
    getBrokerLinkedDeals(broker.id)
      .then((deals) => setLinkedDeals(deals ?? []))
      .catch(() => setLinkedDeals([]))
      .finally(() => setLoadingLinked(false));
  }, [open, broker?.id]);

  useEffect(() => {
    if (allBrokers) {
      setOtherBrokers((allBrokers as any[]).filter((b) => b.id !== broker?.id));
    }
  }, [allBrokers, broker?.id]);

  if (!broker) return null;

  const hasLinked = linkedDeals.length > 0;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      if (!hasLinked || action === "simple") {
        await softDeleteBroker(broker.id);
      } else if (action === "unlink") {
        await deleteBrokerUnlink(broker.id);
      } else if (action === "reassign" && reassignTo) {
        await deleteBrokerReassign(broker.id, Number(reassignTo));
      } else {
        return;
      }
      toast({ title: "Broker deleted", description: `${broker.name} has been moved to Deleted Brokers.` });
      queryClient.invalidateQueries({ queryKey: ["brokers"] });
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleArchiveInstead = async () => {
    setBusy(true);
    try {
      await archiveBroker(broker.id);
      toast({ title: "Broker archived" });
      queryClient.invalidateQueries({ queryKey: ["brokers"] });
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const canConfirm = !hasLinked
    || action === "unlink"
    || (action === "reassign" && !!reassignTo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete broker?</DialogTitle>
        </DialogHeader>

        {loadingLinked ? (
          <div className="py-4 text-sm text-muted-foreground">Checking linked deals…</div>
        ) : !hasLinked ? (
          <p className="text-sm text-muted-foreground">
            This will move <strong>{broker.name}</strong> to Deleted Brokers. You can restore them later from Settings.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-muted-foreground">
                <strong className="text-foreground">{broker.name}</strong> is linked to{" "}
                <strong className="text-foreground">{linkedDeals.length} deal{linkedDeals.length > 1 ? "s" : ""}</strong>.
                Deleting the broker will not delete those deals. Choose what to do with linked deals:
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
              {linkedDeals.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-xs">
                  <span className="font-medium">{d.dealName}</span>
                  <span className="text-muted-foreground">{d.status}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="brokerDeleteAction"
                  checked={action === "unlink"}
                  onChange={() => setAction("unlink")}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">Remove broker from linked deals and delete</div>
                  <div className="text-xs text-muted-foreground">Deals remain active with no broker assigned</div>
                </div>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="brokerDeleteAction"
                  checked={action === "reassign"}
                  onChange={() => setAction("reassign")}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Reassign linked deals to another broker</div>
                  {action === "reassign" && (
                    <Select value={reassignTo} onValueChange={setReassignTo}>
                      <SelectTrigger className="h-7 text-xs mt-1.5 max-w-[200px]">
                        <SelectValue placeholder="Select broker..." />
                      </SelectTrigger>
                      <SelectContent>
                        {otherBrokers.map((b) => (
                          <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </label>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" size="sm" onClick={handleArchiveInstead} disabled={busy}>
            <Archive className="w-3.5 h-3.5 mr-1.5" />Archive instead
          </Button>
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleConfirm}
            disabled={busy || !canConfirm}
          >
            Delete broker
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BrokersPage() {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);

  const { data: brokers, isLoading } = useListBrokers({ search });
  const createBroker = useCreateBroker();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", company: "", phone: "", email: "", market: "", specialty: "", brokerType: "", relationshipStrength: "Cold", notes: "" },
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    createBroker.mutate({ data: values as any }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListBrokersQueryKey() }); setIsOpen(false); form.reset(); },
    });
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListBrokersQueryKey() });

  const handleArchive = async (broker: any) => {
    await archiveBroker(broker.id);
    toast({ title: "Broker archived", description: `${broker.name} has been archived.` });
    setSelected((prev) => { const s = new Set(prev); s.delete(broker.id); return s; });
    invalidate();
  };

  const handleBulkArchive = async () => {
    const ids = [...selected];
    await Promise.all(ids.map(archiveBroker));
    toast({ title: `${ids.length} broker${ids.length > 1 ? "s" : ""} archived` });
    setSelected(new Set());
    setBulkArchiveOpen(false);
    invalidate();
  };

  const handleBulkDelete = async () => {
    const ids = [...selected];
    await Promise.all(ids.map(softDeleteBroker));
    toast({ title: `${ids.length} broker${ids.length > 1 ? "s" : ""} deleted` });
    setSelected(new Set());
    setBulkDeleteOpen(false);
    invalidate();
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const allIds = (brokers ?? []).map((b) => b.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Brokers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track broker relationships and deal sources</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Broker</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Broker</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="company" render={({ field }) => (
                    <FormItem><FormLabel>Company</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="brokerType" render={({ field }) => (
                    <FormItem><FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Business Broker">Business Broker</SelectItem>
                          <SelectItem value="CRE Broker">CRE Broker</SelectItem>
                          <SelectItem value="Investment Banker">Investment Banker</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="market" render={({ field }) => (
                    <FormItem><FormLabel>Market</FormLabel><FormControl><Input placeholder="e.g. NYC / NJ" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="specialty" render={({ field }) => (
                    <FormItem><FormLabel>Specialty</FormLabel><FormControl><Input placeholder="e.g. Laundromats" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="relationshipStrength" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Relationship</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Cold">Cold</SelectItem>
                          <SelectItem value="Warm">Warm</SelectItem>
                          <SelectItem value="Strong">Strong</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Notes</FormLabel>
                      <FormControl><textarea className="w-full min-h-[80px] rounded border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>Cancel</Button>
                  <Button type="submit" size="sm" disabled={createBroker.isPending}>{createBroker.isPending ? "Adding..." : "Add Broker"}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input placeholder="Search brokers..." className="pl-8 h-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5">
          <span className="text-sm font-medium">{selected.size} broker{selected.size > 1 ? "s" : ""} selected</span>
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

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-11 bg-muted animate-pulse rounded" />)}</div>
        ) : !brokers || brokers.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No brokers yet.{" "}<button onClick={() => setIsOpen(true)} className="text-primary hover:underline">Add your first broker.</button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="px-3 py-2.5 w-8">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) => {
                      if (v) setSelected(new Set(allIds));
                      else setSelected(new Set());
                    }}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-4 text-left">Broker</th>
                <th className="px-3 text-left">Market</th>
                <th className="px-3 text-left">Specialty</th>
                <th className="px-3 text-left">Relationship</th>
                <th className="px-3 text-center">Score</th>
                <th className="px-3 text-right">Last Contact</th>
                <th className="px-3 text-right">Follow-Up</th>
                <th className="px-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {brokers.map((broker) => {
                const followUpOverdue = isOverdue(broker.nextFollowUpDate);
                const isSelected = selected.has(broker.id);
                return (
                  <tr key={broker.id} className={`hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0 ${isSelected ? "bg-primary/5" : ""}`}>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(broker.id)}
                        aria-label={`Select ${broker.name}`}
                      />
                    </td>
                    <td className="px-4">
                      <Link href={`/brokers/${broker.id}`}>
                        <div className="font-medium text-sm text-foreground hover:text-primary cursor-pointer leading-tight">{broker.name}</div>
                        <div className="text-xs text-muted-foreground">{broker.company}</div>
                      </Link>
                    </td>
                    <td className="px-3 text-xs text-muted-foreground">{broker.market || "—"}</td>
                    <td className="px-3 text-xs text-muted-foreground"><span className="truncate block max-w-[120px]">{broker.specialty || "—"}</span></td>
                    <td className="px-3"><RelBadge strength={broker.relationshipStrength} /></td>
                    <td className="px-3 text-center"><BrokerScore trust={broker.trustRating} responsiveness={broker.responsivenessRating} quality={broker.dealQualityRating} /></td>
                    <td className="px-3 text-right text-xs text-muted-foreground">{broker.lastContactedDate || "—"}</td>
                    <td className={`px-3 text-right text-xs font-medium ${followUpOverdue ? "text-red-600" : "text-muted-foreground"}`}>{broker.nextFollowUpDate || "—"}</td>
                    <td className="px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors">
                            <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem asChild>
                            <Link href={`/brokers/${broker.id}`}><ChevronRight className="w-3.5 h-3.5 mr-2" />View broker</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleArchive(broker)} className="gap-2">
                            <Archive className="w-3.5 h-3.5" />Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(broker)}
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
        )}
      </div>

      {/* Single delete modal */}
      <BrokerDeleteModal
        open={deleteTarget !== null}
        broker={deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        onDeleted={invalidate}
      />

      {/* Bulk delete modal */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} broker{selected.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move selected brokers to Deleted Brokers. Linked deals will not be deleted.
              You can restore them later from Settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleBulkDelete}>
              Delete {selected.size} broker{selected.size > 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk archive modal */}
      <AlertDialog open={bulkArchiveOpen} onOpenChange={setBulkArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {selected.size} broker{selected.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              These brokers will be hidden from your active list. You can restore them later from Settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkArchive}>
              Archive {selected.size} broker{selected.size > 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
