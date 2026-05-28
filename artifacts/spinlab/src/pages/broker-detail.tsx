import { useParams, Link } from "wouter";
import { 
  useGetBroker, useUpdateBroker, getGetBrokerQueryKey,
  useGetBrokerDeals, getGetBrokerDealsQueryKey,
  useListNotes, useCreateNote, getListNotesQueryKey,
  useListReminders, useCreateReminder, useCompleteReminder, getListRemindersQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Mail, Phone, Globe, Star, MapPin, Building2, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateShort, formatCurrency, isOverdue } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function RatingStars({ rating }: { rating: number | null | undefined }) {
  const score = rating || 0;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <Star 
          key={star} 
          className={`w-4 h-4 ${star <= score ? "fill-primary text-primary" : "fill-muted text-muted-foreground opacity-30"}`} 
        />
      ))}
    </div>
  );
}

function getRelationshipColor(str: string | undefined) {
  switch(str) {
    case "Cold": return "bg-gray-100 text-gray-700 border-gray-200";
    case "Warm": return "bg-blue-100 text-blue-700 border-blue-200";
    case "Strong": return "bg-green-100 text-green-700 border-green-200";
    case "Key Contact": return "bg-amber-100 text-amber-700 border-amber-200";
    default: return "bg-gray-50 text-gray-600 border-gray-200";
  }
}

export default function BrokerDetail() {
  const { id } = useParams();
  const brokerId = parseInt(id || "0", 10);
  const { data: broker, isLoading } = useGetBroker(brokerId, { query: { enabled: !!brokerId, queryKey: getGetBrokerQueryKey(brokerId) } });
  
  if (isLoading || !broker) {
    return (
      <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="md:col-span-2 h-96 w-full" />
        </div>
      </div>
    );
  }

  // Calculate score client side
  let score = 0;
  if (broker.trustRating) score += broker.trustRating * 8;
  if (broker.responsivenessRating) score += broker.responsivenessRating * 6;
  if (broker.dealQualityRating) score += broker.dealQualityRating * 4;
  if ((broker.dealCount || 0) >= 3) score += 5;
  if ((broker.hotDealCount || 0) >= 1) score += 5;
  if (score > 100) score = 100;

  const scoreLabel = score >= 80 ? "Key Source" : score >= 60 ? "Good Source" : score >= 40 ? "Average" : "Weak Source";
  const scoreColor = score >= 80 ? "bg-green-50 text-green-700 border-green-200" : score >= 60 ? "bg-blue-50 text-blue-700 border-blue-200" : score >= 40 ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-red-50 text-red-700 border-red-200";

  return (
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/brokers">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{broker.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            {broker.company && <span className="text-sm font-medium">{broker.company}</span>}
            {broker.company && <span className="text-muted-foreground">•</span>}
            {broker.market && <Badge variant="outline" className="font-normal bg-card"><MapPin className="w-3 h-3 mr-1" />{broker.market}</Badge>}
            {broker.relationshipStrength && <Badge variant="outline" className={`font-normal ${getRelationshipColor(broker.relationshipStrength)}`}>{broker.relationshipStrength}</Badge>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Broker Profile</CardTitle>
                <EditBrokerDialog broker={broker} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/20">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                  {score}
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Broker Score</div>
                  <Badge variant="outline" className={`mt-1 font-normal ${scoreColor}`}>{scoreLabel}</Badge>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {broker.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${broker.email}`} className="text-sm text-primary hover:underline">{broker.email}</a>
                  </div>
                )}
                {broker.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${broker.phone}`} className="text-sm text-primary hover:underline">{broker.phone}</a>
                  </div>
                )}
                {broker.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <a href={broker.website} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">Website</a>
                  </div>
                )}
                {broker.brokerType && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{broker.brokerType}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">First Contact</span>
                  <span className="font-medium">{formatDateShort(broker.firstContactedDate) || "-"}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Last Contact</span>
                  <span className="font-medium">{formatDateShort(broker.lastContactedDate) || "-"}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Next Follow-up</span>
                  <span className={`font-medium ${isOverdue(broker.nextFollowUpDate) ? "text-red-600" : ""}`}>
                    {formatDateShort(broker.nextFollowUpDate) || "-"}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Trust Rating</span>
                  <RatingStars rating={broker.trustRating} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Responsiveness</span>
                  <RatingStars rating={broker.responsivenessRating} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Deal Quality</span>
                  <RatingStars rating={broker.dealQualityRating} />
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="deals" className="w-full">
            <TabsList className="bg-card border w-full justify-start h-auto p-1">
              <TabsTrigger value="deals">Deals</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="reminders">Reminders</TabsTrigger>
            </TabsList>
            
            <TabsContent value="deals" className="mt-6">
              <BrokerDealsTab brokerId={brokerId} />
            </TabsContent>
            
            <TabsContent value="notes" className="mt-6">
              <BrokerNotesTab brokerId={brokerId} />
            </TabsContent>

            <TabsContent value="reminders" className="mt-6">
              <BrokerRemindersTab brokerId={brokerId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function BrokerDealsTab({ brokerId }: { brokerId: number }) {
  const { data: deals, isLoading } = useGetBrokerDeals(brokerId, { query: { enabled: !!brokerId, queryKey: getGetBrokerDealsQueryKey(brokerId) } });

  if (isLoading) return <Card><CardContent className="p-8 text-center text-muted-foreground">Loading deals...</CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Deals Sent ({deals?.length || 0})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Deal Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Asking Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals && deals.length > 0 ? (
              deals.map(deal => (
                <TableRow key={deal.id} className="hover:bg-muted/30">
                  <TableCell className="pl-6">
                    <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline">
                      {deal.dealName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{[deal.city, deal.state].filter(Boolean).join(", ")}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(deal.askingPrice)}</TableCell>
                  <TableCell><Badge variant="outline" className="font-normal bg-card">{deal.status}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="font-normal bg-card">{deal.priority}</Badge></TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No deals from this broker.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function BrokerNotesTab({ brokerId }: { brokerId: number }) {
  const { data: notes, isLoading } = useListNotes({ linkedType: 'broker', linkedId: brokerId }, { query: { enabled: !!brokerId, queryKey: getListNotesQueryKey({ linkedType: 'broker', linkedId: brokerId }) } });
  const createNote = useCreateNote();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState("General note");

  const handleSubmit = () => {
    if (!content.trim()) return;
    createNote.mutate({ 
      data: { linkedType: "broker", linkedId: brokerId, noteType, content } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey({ linkedType: 'broker', linkedId: brokerId }) });
        setContent("");
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-4">
            <Select value={noteType} onValueChange={setNoteType}>
              <SelectTrigger className="w-[180px] bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="General note">General note</SelectItem>
                <SelectItem value="Call note">Call note</SelectItem>
                <SelectItem value="Email note">Email note</SelectItem>
                <SelectItem value="In-person meeting">In-person meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea 
            placeholder="Add a note..." 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none bg-card"
          />
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={!content.trim() || createNote.isPending}>
              {createNote.isPending ? "Saving..." : "Add Note"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading notes...</div>
        ) : notes?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg bg-card">No notes yet.</div>
        ) : notes?.map(note => (
          <Card key={note.id}>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-normal text-xs bg-card">{note.noteType}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleString()}</span>
              </div>
              <div className="text-sm whitespace-pre-wrap">{note.content}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BrokerRemindersTab({ brokerId }: { brokerId: number }) {
  const { data: reminders, isLoading } = useListReminders({ linkedType: 'broker', linkedId: brokerId }, { query: { enabled: !!brokerId, queryKey: getListRemindersQueryKey({ linkedType: 'broker', linkedId: brokerId }) } });
  const completeReminder = useCompleteReminder();
  const createReminder = useCreateReminder();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPriority, setNewPriority] = useState("Medium");
  const [newType, setNewType] = useState("Call broker");

  const handleComplete = (id: number) => {
    completeReminder.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey({ linkedType: 'broker', linkedId: brokerId }) })
    });
  };

  const handleAdd = () => {
    if (!newTitle || !newDueDate) return;
    createReminder.mutate({
      data: {
        title: newTitle,
        dueDate: newDueDate,
        priority: newPriority,
        reminderType: newType,
        linkedType: "broker",
        linkedId: brokerId,
        completed: false
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey({ linkedType: 'broker', linkedId: brokerId }) });
        setIsAdding(false);
        setNewTitle(""); setNewDueDate(""); setNewType("Call broker"); setNewPriority("Medium");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Reminders</h3>
        <Button size="sm" onClick={() => setIsAdding(!isAdding)}>{isAdding ? "Cancel" : "Add Reminder"}</Button>
      </div>

      {isAdding && (
        <Card className="border-primary/50 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">Title *</label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Follow up on pipeline" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date *</label>
                <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleAdd} disabled={!newTitle || !newDueDate || createReminder.isPending}>Save Reminder</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading reminders...</div>
        ) : reminders?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg bg-card">No reminders set.</div>
        ) : reminders?.map(r => (
          <Card key={r.id} className={r.completed ? "opacity-50" : ""}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full h-6 w-6 mt-0.5 text-muted-foreground hover:text-green-500 shrink-0"
                  onClick={() => !r.completed && handleComplete(r.id)}
                  disabled={r.completed}
                >
                  <CheckCircle2 className="h-5 w-5" />
                </Button>
                <div>
                  <div className={`font-medium ${r.completed ? "line-through text-muted-foreground" : ""}`}>{r.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <span className={!r.completed && isOverdue(r.dueDate) ? "text-red-500 font-medium" : ""}>
                      Due: {formatDateShort(r.dueDate)}
                    </span>
                  </div>
                </div>
              </div>
              {!r.completed && r.priority === "High" && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">High</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EditBrokerDialog({ broker }: { broker: any }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: broker.name || "",
    company: broker.company || "",
    email: broker.email || "",
    phone: broker.phone || "",
    website: broker.website || "",
    market: broker.market || "",
    specialty: broker.specialty || "",
    brokerType: broker.brokerType || "Business Broker",
    relationshipStrength: broker.relationshipStrength || "Cold",
    trustRating: broker.trustRating?.toString() || "0",
    responsivenessRating: broker.responsivenessRating?.toString() || "0",
    dealQualityRating: broker.dealQualityRating?.toString() || "0"
  });

  const updateBroker = useUpdateBroker();
  const queryClient = useQueryClient();

  const handleSave = () => {
    updateBroker.mutate({
      id: broker.id,
      data: {
        ...formData,
        trustRating: parseInt(formData.trustRating),
        responsivenessRating: parseInt(formData.responsivenessRating),
        dealQualityRating: parseInt(formData.dealQualityRating),
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBrokerQueryKey(broker.id) });
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit Profile</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Broker Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className="text-sm font-medium">Name</label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Company</label><Input value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Email</label><Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Phone</label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
            <div className="space-y-2 col-span-2"><label className="text-sm font-medium">Website</label><Input value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Market</label><Input value={formData.market} onChange={e => setFormData({...formData, market: e.target.value})} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Specialty</label><Input value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} /></div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Broker Type</label>
              <Select value={formData.brokerType} onValueChange={v => setFormData({...formData, brokerType: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Business Broker">Business Broker</SelectItem>
                  <SelectItem value="Commercial Agent">Commercial Agent</SelectItem>
                  <SelectItem value="Distressed Asset Specialist">Distressed Asset Specialist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Relationship</label>
              <Select value={formData.relationshipStrength} onValueChange={v => setFormData({...formData, relationshipStrength: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cold">Cold</SelectItem>
                  <SelectItem value="Warm">Warm</SelectItem>
                  <SelectItem value="Strong">Strong</SelectItem>
                  <SelectItem value="Key Contact">Key Contact</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="border-t pt-4 grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Trust (1-5)</label>
              <Input type="number" min="0" max="5" value={formData.trustRating} onChange={e => setFormData({...formData, trustRating: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Responsiveness</label>
              <Input type="number" min="0" max="5" value={formData.responsivenessRating} onChange={e => setFormData({...formData, responsivenessRating: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Deal Quality</label>
              <Input type="number" min="0" max="5" value={formData.dealQualityRating} onChange={e => setFormData({...formData, dealQualityRating: e.target.value})} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateBroker.isPending || !formData.name}>
            {updateBroker.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
