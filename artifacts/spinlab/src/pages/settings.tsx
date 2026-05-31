import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft, RotateCcw, Trash2, Archive, Download, SlidersHorizontal, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/format";
import {
  getDeletedDeals, getArchivedDeals, restoreDeal, permanentlyDeleteDeal,
  getDeletedBrokers, getArchivedBrokers, restoreBroker, permanentlyDeleteBroker,
  softDeleteDeal, softDeleteBroker,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const STORAGE_HQ_LABEL = "spinlab_hq_label";
const STORAGE_DEFAULT_PRIORITY = "spinlab_default_priority";

type DealRow = {
  id: number; dealName: string; city?: string | null; state?: string | null;
  askingPrice?: number | null; brokerName?: string | null;
  deletedAt?: string | null; archivedAt?: string | null;
};
type BrokerRow = {
  id: number; name: string; company?: string | null; market?: string | null;
  dealCount?: number; deletedAt?: string | null; archivedAt?: string | null;
};

function SectionDivider({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-6 pb-3 border-b border-border">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
    </div>
  );
}

function SubSectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h3 className="text-sm font-bold tracking-tight">{title}</h3>
      {count > 0 && (
        <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function ConfirmPermanentDelete({
  open, onOpenChange, label, onConfirm,
}: { open: boolean; onOpenChange: (v: boolean) => void; label: string; onConfirm: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Permanently delete?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. All data for <strong>{label}</strong> will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white">
            Permanently delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ArchivedDealsSection() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { setDeals(await getArchivedDeals()); } catch { setDeals([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRestore = async (id: number) => {
    await restoreDeal(id);
    toast({ title: "Deal restored", description: "Returned to your active pipeline." });
    load();
  };

  const handleDelete = async (id: number) => {
    await softDeleteDeal(id);
    toast({ title: "Deal deleted", description: "Moved to Deleted Deals." });
    setConfirmDeleteId(null);
    load();
  };

  return (
    <div>
      <SubSectionHeader title="Archived Deals" count={deals.length} />
      {loading ? (
        <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : deals.length === 0 ? (
        <EmptyState message="No archived deals." />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deal</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Location</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Asking</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Broker</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Archived</th>
                <th className="px-3 py-2.5 w-36" />
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm font-medium">{d.dealName}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{[d.city, d.state].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-3 py-3 text-right text-sm">{formatCurrency(d.askingPrice)}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{d.brokerName || "—"}</td>
                  <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                    {d.archivedAt ? new Date(d.archivedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleRestore(d.id)}>
                        <RotateCcw className="w-3 h-3" /> Restore
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setConfirmDeleteId(d.id)}>
                        <Trash2 className="w-3 h-3" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(v) => !v && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this deal?</AlertDialogTitle>
            <AlertDialogDescription>This will move the deal to Deleted Deals. You can restore it later from Settings.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => confirmDeleteId !== null && handleDelete(confirmDeleteId)}>
              Delete deal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ArchivedBrokersSection() {
  const [brokers, setBrokers] = useState<BrokerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { setBrokers(await getArchivedBrokers()); } catch { setBrokers([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRestore = async (id: number) => {
    await restoreBroker(id);
    toast({ title: "Broker restored" });
    load();
  };

  const handleDelete = async (id: number) => {
    await softDeleteBroker(id);
    toast({ title: "Broker deleted", description: "Moved to Deleted Brokers." });
    setConfirmDeleteId(null);
    load();
  };

  return (
    <div>
      <SubSectionHeader title="Archived Brokers" count={brokers.length} />
      {loading ? (
        <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : brokers.length === 0 ? (
        <EmptyState message="No archived brokers." />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Broker</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Market</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Archived</th>
                <th className="px-3 py-2.5 w-36" />
              </tr>
            </thead>
            <tbody>
              {brokers.map((b) => (
                <tr key={b.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm font-medium">
                    {b.name}
                    {b.company && <span className="text-xs text-muted-foreground ml-1.5">{b.company}</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{b.market || "—"}</td>
                  <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                    {b.archivedAt ? new Date(b.archivedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleRestore(b.id)}>
                        <RotateCcw className="w-3 h-3" /> Restore
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setConfirmDeleteId(b.id)}>
                        <Trash2 className="w-3 h-3" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(v) => !v && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this broker?</AlertDialogTitle>
            <AlertDialogDescription>This will move the broker to Deleted Brokers. You can restore it later from Settings.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => confirmDeleteId !== null && handleDelete(confirmDeleteId)}>
              Delete broker
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DeletedDealsSection() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { setDeals(await getDeletedDeals()); } catch { setDeals([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRestore = async (id: number) => {
    await restoreDeal(id);
    toast({ title: "Deal restored", description: "Returned to your active pipeline." });
    load();
  };

  const handlePermanent = async (id: number) => {
    await permanentlyDeleteDeal(id);
    toast({ title: "Deal permanently deleted" });
    setConfirmId(null);
    load();
  };

  return (
    <div>
      <SubSectionHeader title="Deleted Deals" count={deals.length} />
      {loading ? (
        <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : deals.length === 0 ? (
        <EmptyState message="No deleted deals." />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deal</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Location</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Asking</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Broker</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deleted</th>
                <th className="px-3 py-2.5 w-44" />
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm font-medium">{d.dealName}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{[d.city, d.state].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-3 py-3 text-right text-sm">{formatCurrency(d.askingPrice)}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{d.brokerName || "—"}</td>
                  <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                    {d.deletedAt ? new Date(d.deletedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleRestore(d.id)}>
                        <RotateCcw className="w-3 h-3" /> Restore
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setConfirmId(d.id)}>
                        <Trash2 className="w-3 h-3" /> Delete forever
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmPermanentDelete
        open={confirmId !== null}
        onOpenChange={(v) => !v && setConfirmId(null)}
        label="this deal"
        onConfirm={() => confirmId !== null && handlePermanent(confirmId)}
      />
    </div>
  );
}

function DeletedBrokersSection() {
  const [brokers, setBrokers] = useState<BrokerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { setBrokers(await getDeletedBrokers()); } catch { setBrokers([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRestore = async (id: number) => {
    await restoreBroker(id);
    toast({ title: "Broker restored" });
    load();
  };

  const handlePermanent = async (id: number) => {
    await permanentlyDeleteBroker(id);
    toast({ title: "Broker permanently deleted" });
    setConfirmId(null);
    load();
  };

  return (
    <div>
      <SubSectionHeader title="Deleted Brokers" count={brokers.length} />
      {loading ? (
        <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : brokers.length === 0 ? (
        <EmptyState message="No deleted brokers." />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Broker</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Market</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deleted</th>
                <th className="px-3 py-2.5 w-44" />
              </tr>
            </thead>
            <tbody>
              {brokers.map((b) => (
                <tr key={b.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm font-medium">
                    {b.name}
                    {b.company && <span className="text-xs text-muted-foreground ml-1.5">{b.company}</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{b.market || "—"}</td>
                  <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                    {b.deletedAt ? new Date(b.deletedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleRestore(b.id)}>
                        <RotateCcw className="w-3 h-3" /> Restore
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setConfirmId(b.id)}>
                        <Trash2 className="w-3 h-3" /> Delete forever
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmPermanentDelete
        open={confirmId !== null}
        onOpenChange={(v) => !v && setConfirmId(null)}
        label="this broker"
        onConfirm={() => confirmId !== null && handlePermanent(confirmId)}
      />
    </div>
  );
}

function toCSV(rows: Record<string, unknown>[], cols: string[]): string {
  const escape = (v: unknown) => {
    if (v == null) return "";
    return `"${String(v).replace(/"/g, '""')}"`;
  };
  const header = cols.join(",");
  const body = rows.map((r) => cols.map((c) => escape(r[c])).join(",")).join("\n");
  return header + "\n" + body;
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function DataExportSection() {
  const [exporting, setExporting] = useState<"deals" | "brokers" | null>(null);
  const { toast } = useToast();

  const handleExportDeals = async () => {
    setExporting("deals");
    try {
      const { apiFetch } = await import("@/lib/api");
      const deals = await apiFetch("/api/deals") as Record<string, unknown>[];
      const cols = ["id", "dealName", "city", "state", "askingPrice", "grossRevenue", "adjustedSde", "monthlyRent", "status", "priority", "brokerName", "nextAction", "nextActionDue", "createdAt"];
      const csv = toCSV(deals, cols);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `spinlab-deals-${date}.csv`);
      toast({ title: "Deals exported", description: `${deals.length} deals saved to CSV.` });
    } catch {
      toast({ title: "Export failed", description: "Could not export deals.", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const handleExportBrokers = async () => {
    setExporting("brokers");
    try {
      const { apiFetch } = await import("@/lib/api");
      const brokers = await apiFetch("/api/brokers") as Record<string, unknown>[];
      const cols = ["id", "name", "company", "email", "phone", "market", "specialty", "relationshipStrength", "lastContactDate", "nextFollowUpDate", "dealCount", "createdAt"];
      const csv = toCSV(brokers, cols);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `spinlab-brokers-${date}.csv`);
      toast({ title: "Brokers exported", description: `${brokers.length} brokers saved to CSV.` });
    } catch {
      toast({ title: "Export failed", description: "Could not export brokers.", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-lg p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Deals</span>
            </div>
            <p className="text-xs text-muted-foreground">Export all active deals to CSV</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleExportDeals}
            disabled={exporting === "deals"}
          >
            <Download className="w-3.5 h-3.5" />
            {exporting === "deals" ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
        <div className="bg-card border border-border rounded-lg p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Brokers</span>
            </div>
            <p className="text-xs text-muted-foreground">Export all active brokers to CSV</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleExportBrokers}
            disabled={exporting === "brokers"}
          >
            <Download className="w-3.5 h-3.5" />
            {exporting === "brokers" ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AppPreferencesSection() {
  const [hqLabel, setHqLabel] = useState(() => localStorage.getItem(STORAGE_HQ_LABEL) || "HQ");
  const [defaultPriority, setDefaultPriority] = useState(() => localStorage.getItem(STORAGE_DEFAULT_PRIORITY) || "Medium");
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    const trimmed = hqLabel.trim() || "HQ";
    localStorage.setItem(STORAGE_HQ_LABEL, trimmed);
    localStorage.setItem(STORAGE_DEFAULT_PRIORITY, defaultPriority);
    setHqLabel(trimmed);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast({ title: "Preferences saved" });
    window.dispatchEvent(new Event("spinlab:prefs-changed"));
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor="hq-label" className="text-sm font-medium">
            Nav Label
          </Label>
          <Input
            id="hq-label"
            value={hqLabel}
            onChange={(e) => setHqLabel(e.target.value)}
            placeholder="HQ"
            className="max-w-[160px]"
            maxLength={12}
          />
          <p className="text-xs text-muted-foreground">The badge shown next to "Spinlab" in the sidebar.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="default-priority" className="text-sm font-medium">
            Default Deal Priority
          </Label>
          <Select value={defaultPriority} onValueChange={setDefaultPriority}>
            <SelectTrigger className="max-w-[160px]" id="default-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Used when creating a new deal.</p>
        </div>
      </div>
      <div className="flex items-center gap-3 pt-1">
        <Button size="sm" onClick={handleSave} disabled={saved}>
          {saved ? "Saved" : "Save preferences"}
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-12">
      <div className="flex items-center gap-4">
        <Link href="/">
          <button className="w-8 h-8 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage archived records, deleted records, exports, and preferences</p>
        </div>
      </div>

      <section>
        <SectionDivider icon={Archive} title="Archived Records" />
        <div className="space-y-8">
          <ArchivedDealsSection />
          <ArchivedBrokersSection />
        </div>
      </section>

      <section>
        <SectionDivider icon={Trash2} title="Deleted Records" />
        <div className="space-y-8">
          <DeletedDealsSection />
          <DeletedBrokersSection />
        </div>
      </section>

      <section>
        <SectionDivider icon={Download} title="Data Export" />
        <DataExportSection />
      </section>

      <section>
        <SectionDivider icon={SlidersHorizontal} title="App Preferences" />
        <AppPreferencesSection />
      </section>
    </div>
  );
}
