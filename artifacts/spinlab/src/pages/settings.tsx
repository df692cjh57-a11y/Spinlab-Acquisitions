import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft, RotateCcw, Trash2, Archive, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  softDeleteBroker, archiveDeal, archiveBroker,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type DealRow = {
  id: number; dealName: string; city?: string | null; state?: string | null;
  askingPrice?: number | null; brokerName?: string | null;
  deletedAt?: string | null; archivedAt?: string | null;
};
type BrokerRow = {
  id: number; name: string; company?: string | null; market?: string | null;
  dealCount?: number; deletedAt?: string | null; archivedAt?: string | null;
};

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-sm font-bold tracking-tight">{title}</h2>
      {count > 0 && (
        <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
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
          <AlertDialogTitle>Permanently delete {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. All data for this record will be permanently removed from the database.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Permanently delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
    toast({ title: "Deal restored", description: "The deal has been returned to your active pipeline." });
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
      <SectionHeader title="Deleted Deals" count={deals.length} />
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
                <th className="px-3 py-2.5 w-32" />
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

function ArchivedDealsSection() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { setDeals(await getArchivedDeals()); } catch { setDeals([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRestore = async (id: number) => {
    await restoreDeal(id);
    toast({ title: "Deal restored", description: "The deal has been returned to your active pipeline." });
    load();
  };

  const handleDelete = async (id: number) => {
    const { softDeleteDeal } = await import("@/lib/api");
    await softDeleteDeal(id);
    toast({ title: "Deal deleted", description: "The deal has been moved to Deleted Deals." });
    setConfirmId(null);
    load();
  };

  return (
    <div>
      <SectionHeader title="Archived Deals" count={deals.length} />
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
                <th className="px-3 py-2.5 w-32" />
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
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setConfirmId(d.id)}>
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
      <AlertDialog open={confirmId !== null} onOpenChange={(v) => !v && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this deal?</AlertDialogTitle>
            <AlertDialogDescription>This will move the deal to Deleted Deals. You can restore it later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => confirmId !== null && handleDelete(confirmId)}>
              Delete deal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
      <SectionHeader title="Deleted Brokers" count={brokers.length} />
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
                <th className="px-3 py-2.5 w-32" />
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

function ArchivedBrokersSection() {
  const [brokers, setBrokers] = useState<BrokerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<number | null>(null);
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
    setConfirmId(null);
    load();
  };

  return (
    <div>
      <SectionHeader title="Archived Brokers" count={brokers.length} />
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
                <th className="px-3 py-2.5 w-32" />
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
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setConfirmId(b.id)}>
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
      <AlertDialog open={confirmId !== null} onOpenChange={(v) => !v && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this broker?</AlertDialogTitle>
            <AlertDialogDescription>This will move the broker to Deleted Brokers. You can restore it later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => confirmId !== null && handleDelete(confirmId)}>
              Delete broker
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-10">
      <div className="flex items-center gap-4">
        <Link href="/">
          <button className="w-8 h-8 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage deleted and archived records</p>
        </div>
      </div>

      <div className="space-y-10">
        <section>
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-border">
            <Archive className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Deals</h2>
          </div>
          <div className="space-y-8">
            <DeletedDealsSection />
            <ArchivedDealsSection />
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-border">
            <Archive className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Brokers</h2>
          </div>
          <div className="space-y-8">
            <DeletedBrokersSection />
            <ArchivedBrokersSection />
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">About Soft Delete</h2>
          </div>
          <div className="bg-muted/30 rounded-lg p-5 text-sm text-muted-foreground space-y-2">
            <p>When you delete or archive a deal or broker, it is hidden from your active views but not removed from the database.</p>
            <p>You can restore any deleted or archived record at any time from this page.</p>
            <p><strong className="text-foreground">Permanent deletion</strong> is irreversible — the record and all its associated data are removed forever.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
