import { useParams, Link, useLocation } from "wouter";
import {
  useGetBroker, useUpdateBroker, getGetBrokerQueryKey,
  useGetBrokerDeals, getGetBrokerDealsQueryKey,
  useListNotes, useCreateNote, getListNotesQueryKey,
  useListReminders, useCreateReminder, useCompleteReminder, getListRemindersQueryKey,
  useListBrokers,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, Mail, Phone, MapPin, CheckCircle2, Archive, Trash2, AlertTriangle, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  softDeleteBroker, archiveBroker, getBrokerLinkedDeals, deleteBrokerUnlink, deleteBrokerReassign,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDateShort, isOverdue } from "@/lib/format";

function Dots({ value }: { value?: number | null }) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="inline-flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`w-2 h-2 rounded-full ${i <= value ? "bg-primary" : "bg-border"}`} />
      ))}
    </span>
  );
}

function RelBadge({ strength }: { strength?: string | null }) {
  const s = strength || "Cold";
  const cls = s === "Strong" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : s === "Warm" ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-gray-50 text-gray-500 border-gray-200";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${cls}`}>{s}</span>;
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{title}</span>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: React.ReactNode; accent?: "green" | "red" | "amber" | "blue" }) {
  const cls = accent === "green" ? "text-emerald-600" : accent === "red" ? "text-red-600" : accent === "amber" ? "text-amber-600" : accent === "blue" ? "text-primary" : "text-foreground";
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className={`text-sm font-bold ${cls}`}>{value || "—"}</div>
    </div>
  );
}

function BrokerProfileTab({ broker }: { broker: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [fd, setFd] = useState({
    name: broker.name || "", company: broker.company || "",
    phone: broker.phone || "", email: broker.email || "",
    market: broker.market || "", specialty: broker.specialty || "",
    brokerType: broker.brokerType || "", relationshipStrength: broker.relationshipStrength || "Cold",
    trustRating: broker.trustRating?.toString() || "", responsivenessRating: broker.responsivenessRating?.toString() || "",
    dealQualityRating: broker.dealQualityRating?.toString() || "",
    lastContactedDate: broker.lastContactedDate || "", nextFollowUpDate: broker.nextFollowUpDate || "",
    notes: broker.notes || "",
  });
  const updateBroker = useUpdateBroker();
  const qc = useQueryClient();
  const set = (k: string, v: any) => setFd((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    const payload = {
      ...fd,
      trustRating: fd.trustRating ? Number(fd.trustRating) : null,
      responsivenessRating: fd.responsivenessRating ? Number(fd.responsivenessRating) : null,
      dealQualityRating: fd.dealQualityRating ? Number(fd.dealQualityRating) : null,
    };
    updateBroker.mutate({ id: broker.id, data: payload as any }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetBrokerQueryKey(broker.id) }); setIsEditing(false); },
    });
  };

  const vals = [broker.trustRating, broker.responsivenessRating, broker.dealQualityRating].filter((v) => v != null) as number[];
  const avgScore = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  const scoreLabel = !avgScore ? "No data"
    : avgScore >= 4 ? "Key Source"
    : avgScore >= 3 ? "Good Source"
    : avgScore >= 2 ? "Average"
    : "Weak Source";
  const scoreColor = !avgScore ? "text-muted-foreground"
    : avgScore >= 4 ? "text-emerald-600"
    : avgScore >= 3 ? "text-blue-600"
    : avgScore >= 2 ? "text-amber-600"
    : "text-red-600";

  if (!isEditing) {
    return (
      <div className="space-y-4">
        <SectionCard title="Broker Profile" action={<Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setIsEditing(true)}>Edit</Button>}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            <Metric label="Company" value={broker.company} />
            <Metric label="Broker Type" value={broker.brokerType} />
            <Metric label="Market" value={broker.market} />
            <Metric label="Specialty" value={broker.specialty} />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Relationship</div>
              <RelBadge strength={broker.relationshipStrength} />
            </div>
            <Metric label="Last Contacted" value={formatDateShort(broker.lastContactedDate)} />
            <Metric label="Next Follow-Up" value={formatDateShort(broker.nextFollowUpDate)} accent={isOverdue(broker.nextFollowUpDate) ? "red" : undefined} />
          </div>

          {(broker.phone || broker.email) && (
            <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4">
              {broker.phone && (
                <a href={`tel:${broker.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <Phone className="w-3.5 h-3.5" /> {broker.phone}
                </a>
              )}
              {broker.email && (
                <a href={`mailto:${broker.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <Mail className="w-3.5 h-3.5" /> {broker.email}
                </a>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Ratings">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Trust</div>
              <Dots value={broker.trustRating} />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Responsiveness</div>
              <Dots value={broker.responsivenessRating} />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Deal Quality</div>
              <Dots value={broker.dealQualityRating} />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Overall Score</div>
              <span className={`text-xl font-bold ${scoreColor}`}>{avgScore !== null ? `${avgScore}/5` : "—"}</span>
              <div className="text-[10px] text-muted-foreground mt-0.5">{scoreLabel}</div>
            </div>
          </div>
        </SectionCard>

        {broker.notes && (
          <SectionCard title="Notes">
            <p className="text-sm text-foreground whitespace-pre-wrap">{broker.notes}</p>
          </SectionCard>
        )}
      </div>
    );
  }

  return (
    <SectionCard title="Edit Broker">
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[["Name", "name"], ["Company", "company"], ["Broker Type", "brokerType"], ["Market", "market"], ["Specialty", "specialty"], ["Phone", "phone"], ["Email", "email"]].map(([label, key]) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-medium">{label}</label>
            <Input value={(fd as any)[key]} onChange={(e) => set(key, e.target.value)} className="h-8 text-sm" />
          </div>
        ))}
        <div className="space-y-1">
          <label className="text-xs font-medium">Relationship</label>
          <Select value={fd.relationshipStrength} onValueChange={(v) => set("relationshipStrength", v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Cold">Cold</SelectItem><SelectItem value="Warm">Warm</SelectItem><SelectItem value="Strong">Strong</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Last Contacted</label>
          <Input type="date" value={fd.lastContactedDate} onChange={(e) => set("lastContactedDate", e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Next Follow-Up</label>
          <Input type="date" value={fd.nextFollowUpDate} onChange={(e) => set("nextFollowUpDate", e.target.value)} className="h-8 text-sm" />
        </div>
        {[["Trust Rating (1-5)", "trustRating"], ["Responsiveness (1-5)", "responsivenessRating"], ["Deal Quality (1-5)", "dealQualityRating"]].map(([label, key]) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-medium">{label}</label>
            <Input type="number" min="1" max="5" value={(fd as any)[key]} onChange={(e) => set(key, e.target.value)} className="h-8 text-sm" />
          </div>
        ))}
        <div className="space-y-1 col-span-2">
          <label className="text-xs font-medium">Notes</label>
          <Textarea value={fd.notes} onChange={(e) => set("notes", e.target.value)} className="text-sm min-h-[80px] resize-none" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={updateBroker.isPending}>{updateBroker.isPending ? "Saving..." : "Save"}</Button>
      </div>
    </SectionCard>
  );
}

function BrokerDealsTab({ brokerId }: { brokerId: number }) {
  const { data: deals, isLoading } = useGetBrokerDeals(brokerId, { query: { enabled: !!brokerId, queryKey: getGetBrokerDealsQueryKey(brokerId) } });

  if (isLoading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading deals...</div>;
  if (!deals || deals.length === 0) return <div className="py-8 text-center text-sm text-muted-foreground bg-card border border-border rounded-lg">No deals linked to this broker.</div>;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="border-b border-border bg-muted/30">
          <tr>
            <th className="px-4 text-left">Deal</th>
            <th className="px-3 text-left">Status</th>
            <th className="px-3 text-right">Asking</th>
            <th className="px-3 text-right">Multiple</th>
            <th className="px-3 text-right">Score</th>
          </tr>
        </thead>
        <tbody>
          {(deals as any[]).map((d) => (
            <tr key={d.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-4">
                <Link href={`/deals/${d.id}`}>
                  <div className="font-medium text-sm text-foreground hover:text-primary cursor-pointer">{d.dealName}</div>
                  <div className="text-xs text-muted-foreground">{[d.city, d.state].filter(Boolean).join(", ")}</div>
                </Link>
              </td>
              <td className="px-3">
                <span className="text-xs text-muted-foreground">{d.status}</span>
              </td>
              <td className="px-3 text-right text-sm">{formatCurrency(d.askingPrice)}</td>
              <td className="px-3 text-right text-sm font-mono">{d.askingMultiple ? `${Number(d.askingMultiple).toFixed(2)}x` : "—"}</td>
              <td className="px-3 text-right">
                {d.dealScore != null ? (
                  <span className={`text-xs font-semibold ${d.dealScore >= 70 ? "text-emerald-600" : d.dealScore >= 50 ? "text-amber-600" : "text-red-600"}`}>{d.dealScore}</span>
                ) : <span className="text-xs text-muted-foreground">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BrokerNotesTab({ brokerId }: { brokerId: number }) {
  const { data: notes, isLoading } = useListNotes({ linkedType: "broker", linkedId: brokerId }, { query: { enabled: !!brokerId, queryKey: getListNotesQueryKey({ linkedType: "broker", linkedId: brokerId }) } });
  const createNote = useCreateNote();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState("General note");

  const handleSubmit = () => {
    if (!content.trim()) return;
    createNote.mutate({ data: { linkedType: "broker", linkedId: brokerId, noteType, noteText: content } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListNotesQueryKey({ linkedType: "broker", linkedId: brokerId }) }); setContent(""); },
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <Select value={noteType} onValueChange={setNoteType}>
          <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["General note","Call note","Email note","Meeting note","Broker comment","Other"].map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Textarea placeholder="Add a note about this broker..." value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[80px] resize-none text-sm" />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSubmit} disabled={!content.trim() || createNote.isPending}>{createNote.isPending ? "Saving..." : "Add Note"}</Button>
        </div>
      </div>
      <div className="space-y-2">
        {isLoading ? <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
          : !notes?.length ? <div className="text-sm text-muted-foreground text-center py-8 bg-card border border-border rounded-lg">No notes yet.</div>
          : notes.map((note) => (
            <div key={note.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] px-1.5 py-0.5 border border-border rounded text-muted-foreground font-medium">{note.noteType}</span>
                <span className="text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleString()}</span>
              </div>
              <div className="text-sm whitespace-pre-wrap">{note.noteText}</div>
            </div>
          ))}
      </div>
    </div>
  );
}

function BrokerRemindersTab({ brokerId }: { brokerId: number }) {
  const { data: reminders, isLoading } = useListReminders({ linkedType: "broker", linkedId: brokerId }, { query: { enabled: !!brokerId, queryKey: getListRemindersQueryKey({ linkedType: "broker", linkedId: brokerId }) } });
  const completeReminder = useCompleteReminder();
  const createReminder = useCreateReminder();
  const qc = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");

  const handleAdd = () => {
    if (!title || !dueDate) return;
    createReminder.mutate({ data: { title, dueDate, priority, linkedType: "broker", linkedId: brokerId } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListRemindersQueryKey({ linkedType: "broker", linkedId: brokerId }) }); setIsAdding(false); setTitle(""); setDueDate(""); },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold">Reminders</span>
        <Button size="sm" variant="outline" onClick={() => setIsAdding(!isAdding)}>{isAdding ? "Cancel" : "Add Reminder"}</Button>
      </div>
      {isAdding && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <Input placeholder="Reminder title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-sm" />
          <div className="flex gap-2">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-8 text-sm" />
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-8 text-sm w-32"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={!title || !dueDate}>Save</Button>
        </div>
      )}
      <div className="space-y-2">
        {isLoading ? <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
          : !reminders?.length ? <div className="text-sm text-muted-foreground text-center py-8 bg-card border border-border rounded-lg">No reminders set.</div>
          : reminders.map((r) => (
            <div key={r.id} className={`flex items-center gap-3 bg-card border rounded-lg px-4 py-3 ${r.completed ? "opacity-50" : isOverdue(r.dueDate) ? "border-red-200 bg-red-50/20" : "border-border"}`}>
              <button onClick={() => !r.completed && completeReminder.mutate({ id: r.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListRemindersQueryKey({ linkedType: "broker", linkedId: brokerId }) }) })}
                disabled={r.completed}
                className="w-5 h-5 rounded-full border-2 border-border flex items-center justify-center shrink-0 hover:border-emerald-400 transition-colors">
                {r.completed && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </button>
              <div>
                <div className={`text-sm font-medium ${r.completed ? "line-through text-muted-foreground" : ""}`}>{r.title}</div>
                <div className={`text-xs mt-0.5 ${isOverdue(r.dueDate) && !r.completed ? "text-red-600" : "text-muted-foreground"}`}>Due {formatDateShort(r.dueDate)}</div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function BrokerDeleteDetailModal({
  open, broker, onOpenChange, onDeleted,
}: { open: boolean; broker: any | null; onOpenChange: (v: boolean) => void; onDeleted: () => void }) {
  const [linkedDeals, setLinkedDeals] = useState<any[]>([]);
  const [loadingLinked, setLoadingLinked] = useState(false);
  const [action, setAction] = useState<"unlink" | "reassign">("unlink");
  const [reassignTo, setReassignTo] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { data: allBrokers } = useListBrokers({});

  useEffect(() => {
    if (!open || !broker) return;
    setLoadingLinked(true);
    setAction("unlink");
    setReassignTo("");
    getBrokerLinkedDeals(broker.id)
      .then((d) => setLinkedDeals(d ?? []))
      .catch(() => setLinkedDeals([]))
      .finally(() => setLoadingLinked(false));
  }, [open, broker?.id]);

  if (!broker) return null;
  const hasLinked = linkedDeals.length > 0;
  const otherBrokers = (allBrokers as any[] | undefined ?? []).filter((b) => b.id !== broker.id);
  const canConfirm = !hasLinked || action === "unlink" || (action === "reassign" && !!reassignTo);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      if (!hasLinked) {
        await softDeleteBroker(broker.id);
      } else if (action === "unlink") {
        await deleteBrokerUnlink(broker.id);
      } else if (action === "reassign" && reassignTo) {
        await deleteBrokerReassign(broker.id, Number(reassignTo));
      }
      toast({ title: "Broker deleted", description: `${broker.name} moved to Deleted Brokers.` });
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally { setBusy(false); }
  };

  const handleArchive = async () => {
    setBusy(true);
    try {
      await archiveBroker(broker.id);
      toast({ title: "Broker archived" });
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Delete broker?</DialogTitle></DialogHeader>
        {loadingLinked ? (
          <p className="text-sm text-muted-foreground py-2">Checking linked deals…</p>
        ) : !hasLinked ? (
          <p className="text-sm text-muted-foreground">
            This will move <strong>{broker.name}</strong> to Deleted Brokers. You can restore them from Settings.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-muted-foreground">
                <strong className="text-foreground">{broker.name}</strong> is linked to{" "}
                <strong className="text-foreground">{linkedDeals.length}</strong> deal{linkedDeals.length > 1 ? "s" : ""}. Choose what to do:
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 space-y-1 max-h-24 overflow-y-auto">
              {linkedDeals.map((d) => <div key={d.id} className="flex justify-between text-xs"><span className="font-medium">{d.dealName}</span><span className="text-muted-foreground">{d.status}</span></div>)}
            </div>
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="radio" name="a" checked={action === "unlink"} onChange={() => setAction("unlink")} className="mt-0.5" />
                <div><div className="text-sm font-medium">Remove broker from linked deals and delete</div><div className="text-xs text-muted-foreground">Deals stay active with no broker</div></div>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="radio" name="a" checked={action === "reassign"} onChange={() => setAction("reassign")} className="mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Reassign linked deals to another broker</div>
                  {action === "reassign" && (
                    <Select value={reassignTo} onValueChange={setReassignTo}>
                      <SelectTrigger className="h-7 text-xs mt-1.5 max-w-[200px]"><SelectValue placeholder="Select broker..." /></SelectTrigger>
                      <SelectContent>{otherBrokers.map((b) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </div>
              </label>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" size="sm" onClick={handleArchive} disabled={busy}><Archive className="w-3.5 h-3.5 mr-1.5" />Archive instead</Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirm} disabled={busy || !canConfirm}>Delete broker</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BrokerDetail() {
  const { id } = useParams();
  const brokerId = parseInt(id || "0", 10);
  const [, navigate] = useLocation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { toast } = useToast();
  const { data: broker, isLoading } = useGetBroker(brokerId, { query: { enabled: !!brokerId, queryKey: getGetBrokerQueryKey(brokerId) } });

  if (isLoading || !broker) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const initials = broker.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/brokers">
          <button className="w-8 h-8 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
          {initials}
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{broker.name}</h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {broker.company && <span className="text-xs text-muted-foreground">{broker.company}</span>}
            {broker.market && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" /> {broker.market}
              </span>
            )}
            <RelBadge strength={broker.relationshipStrength} />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          {broker.dealCount != null && <span><strong className="text-foreground">{broker.dealCount}</strong> deals</span>}
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={async () => {
            await archiveBroker(broker.id);
            toast({ title: "Broker archived" });
            navigate("/brokers");
          }}>
            <Archive className="w-3 h-3" />Archive
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 text-red-600 hover:text-red-700 border-red-200" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="w-3 h-3" />Delete
          </Button>
        </div>
      </div>

      <BrokerDeleteDetailModal
        open={deleteOpen}
        broker={broker}
        onOpenChange={setDeleteOpen}
        onDeleted={() => navigate("/brokers")}
      />

      <Tabs defaultValue="profile">
        <TabsList className="bg-card border w-full justify-start h-auto p-1">
          <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
          <TabsTrigger value="deals" className="text-xs">Deals {broker.dealCount ? `(${broker.dealCount})` : ""}</TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
          <TabsTrigger value="reminders" className="text-xs">Reminders</TabsTrigger>
        </TabsList>

        <div className="mt-5">
          <TabsContent value="profile"><BrokerProfileTab broker={broker} /></TabsContent>
          <TabsContent value="deals"><BrokerDealsTab brokerId={brokerId} /></TabsContent>
          <TabsContent value="notes"><BrokerNotesTab brokerId={brokerId} /></TabsContent>
          <TabsContent value="reminders"><BrokerRemindersTab brokerId={brokerId} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
