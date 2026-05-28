import { useParams, Link } from "wouter";
import { 
  useGetDeal, useUpdateDeal, getGetDealQueryKey,
  useGetDealRedFlags, useUpdateDealRedFlags, getGetDealRedFlagsQueryKey,
  useListDocuments, useUpdateDocument, getListDocumentsQueryKey,
  useListNotes, useCreateNote, getListNotesQueryKey,
  useListReminders, useCreateReminder, useCompleteReminder, getListRemindersQueryKey,
  useListBrokers
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent, formatDateShort, isOverdue } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle, FileText, Check, FileCheck, CircleDashed, PhoneCall, Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function getRiskColor(level: string | undefined) {
  switch (level) {
    case "Clean": return "bg-green-50 text-green-700 border-green-200";
    case "Caution": return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "High Risk": return "bg-orange-50 text-orange-700 border-orange-200";
    case "Dangerous": return "bg-red-50 text-red-700 border-red-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function getQualityColor(score: number | undefined) {
  if (score === undefined || score === null) return "bg-gray-100 text-gray-700 border-gray-200";
  if (score >= 80) return "bg-green-50 text-green-700 border-green-200";
  if (score >= 60) return "bg-blue-50 text-blue-700 border-blue-200";
  if (score >= 40) return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-red-50 text-red-700 border-red-200";
}

const ALL_STATUSES = [
  "New Lead", "Reviewing Info", "Initial Call", "Underwriting", "Site Visit", 
  "Drafting LOI", "LOI Sent", "LOI Negotiating", "Under Contract", "Due Diligence",
  "Financing", "Closing Prep", "Closed", "Dead Deal", "Stalled", "Pass"
];

export default function DealDetail() {
  const { id } = useParams();
  const dealId = parseInt(id || "0", 10);
  const queryClient = useQueryClient();

  const { data: deal, isLoading } = useGetDeal(dealId, { query: { enabled: !!dealId, queryKey: getGetDealQueryKey(dealId) } });
  const updateDeal = useUpdateDeal();

  const { data: brokers } = useListBrokers({});

  if (isLoading || !deal) {
    return (
      <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const handleStatusChange = (newStatus: string) => {
    updateDeal.mutate({ id: dealId, data: { status: newStatus } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetDealQueryKey(dealId) })
    });
  };

  const handlePriorityChange = (newPriority: string) => {
    updateDeal.mutate({ id: dealId, data: { priority: newPriority } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetDealQueryKey(dealId) })
    });
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/deals">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{deal.dealName}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="font-normal bg-card">{deal.status}</Badge>
            <Badge variant="outline" className="font-normal bg-card">{deal.priority} Priority</Badge>
            {deal.city && <span className="text-sm text-muted-foreground">{deal.city}, {deal.state}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-card border w-full justify-start h-auto p-1 overflow-x-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="info">Deal Info</TabsTrigger>
              <TabsTrigger value="financials">Financials</TabsTrigger>
              <TabsTrigger value="lease">Lease</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="redflags">Red Flags</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="reminders">Reminders</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Deal Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Asking Price</div>
                    <div className="font-semibold text-xl">{formatCurrency(deal.askingPrice)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Adj. Net Income</div>
                    <div className="font-semibold text-xl text-primary">{formatCurrency(deal.adjustedNetIncome)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Asking Multiple</div>
                    <div className="font-semibold text-xl">{deal.askingMultiple ? `${deal.askingMultiple.toFixed(1)}x` : '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Rent / Gross</div>
                    <div className="font-semibold text-xl">{formatPercent(deal.rentAsPercentGross)}</div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Score & Risk</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-medium text-muted-foreground">Deal Score</span>
                        <div className="text-right">
                          <span className="text-3xl font-bold">{deal.dealScore || 0}</span>
                          <span className="text-sm text-muted-foreground ml-1">/ 100</span>
                        </div>
                      </div>
                      <Progress value={deal.dealScore || 0} className="h-2" />
                      <div className="flex justify-end">
                        <Badge variant="outline" className={`font-normal ${getQualityColor(deal.dealScore || 0)}`}>
                          {deal.dealQuality || "Not scored"}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">Red Flag Level</span>
                        <Badge variant="outline" className={`font-normal ${getRiskColor(deal.redFlagLevel)}`}>
                          {deal.redFlagLevel || "Clean"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Next Action</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {deal.nextAction ? (
                      <div className="space-y-4">
                        <div className="text-lg font-medium">{deal.nextAction}</div>
                        <div className={`text-sm ${isOverdue(deal.nextActionDueDate) ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                          Due: {formatDateShort(deal.nextActionDueDate)}
                        </div>
                        <Button variant="outline" className="w-full">Mark Complete</Button>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-center py-8 bg-muted/30 rounded-lg">
                        <div className="mb-2">No next action set</div>
                        <Button variant="secondary" size="sm">Set Action</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="info" className="mt-6">
              <DealInfoForm deal={deal} brokers={brokers || []} />
            </TabsContent>

            <TabsContent value="financials" className="mt-6">
              <FinancialsForm deal={deal} />
            </TabsContent>

            <TabsContent value="lease" className="mt-6">
              <LeaseForm deal={deal} />
            </TabsContent>

            <TabsContent value="operations" className="mt-6">
              <OperationsForm deal={deal} />
            </TabsContent>

            <TabsContent value="redflags" className="mt-6">
              <RedFlagsTab dealId={dealId} />
            </TabsContent>

            <TabsContent value="documents" className="mt-6">
              <DocumentsTab dealId={dealId} />
            </TabsContent>

            <TabsContent value="notes" className="mt-6">
              <NotesTab dealId={dealId} />
            </TabsContent>

            <TabsContent value="reminders" className="mt-6">
              <RemindersTab dealId={dealId} />
            </TabsContent>

          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="py-4 px-5 border-b bg-muted/10">
              <CardTitle className="text-sm font-semibold">Key Contacts</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {deal.brokerId ? (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Broker</div>
                  <div className="font-medium">
                    <Link href={`/brokers/${deal.brokerId}`} className="text-primary hover:underline">{deal.brokerName}</Link>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">No broker assigned</div>
              )}
              {deal.sellerName && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Seller</div>
                  <div className="font-medium">{deal.sellerName}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4 px-5 border-b bg-muted/10">
              <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Status</label>
                <Select value={deal.status || ""} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Priority</label>
                <Select value={deal.priority || ""} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Hot">Hot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Sub-components for tabs

function DealInfoForm({ deal, brokers }: { deal: any, brokers: any[] }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    dealName: deal.dealName || "",
    businessName: deal.businessName || "",
    address: deal.address || "",
    city: deal.city || "",
    state: deal.state || "",
    assetType: deal.assetType || "",
    source: deal.source || "",
    sellerName: deal.sellerName || "",
    brokerId: deal.brokerId || null,
    lastContactedDate: deal.lastContactedDate || ""
  });
  const updateDeal = useUpdateDeal();
  const queryClient = useQueryClient();

  const handleSave = () => {
    updateDeal.mutate({ id: deal.id, data: formData }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDealQueryKey(deal.id) });
        setIsEditing(false);
      }
    });
  };

  if (!isEditing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="text-lg">Deal Information</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-12 gap-y-6 pt-6">
          <div><div className="text-sm text-muted-foreground mb-1">Deal Name</div><div className="font-medium">{deal.dealName}</div></div>
          <div><div className="text-sm text-muted-foreground mb-1">Business Name</div><div className="font-medium">{deal.businessName || "-"}</div></div>
          <div className="col-span-2"><div className="text-sm text-muted-foreground mb-1">Address</div><div className="font-medium">{[deal.address, deal.city, deal.state].filter(Boolean).join(", ") || "-"}</div></div>
          <div><div className="text-sm text-muted-foreground mb-1">Asset Type</div><div className="font-medium">{deal.assetType || "-"}</div></div>
          <div><div className="text-sm text-muted-foreground mb-1">Source</div><div className="font-medium">{deal.source || "-"}</div></div>
          <div><div className="text-sm text-muted-foreground mb-1">Seller Name</div><div className="font-medium">{deal.sellerName || "-"}</div></div>
          <div><div className="text-sm text-muted-foreground mb-1">Last Contacted</div><div className="font-medium">{formatDateShort(deal.lastContactedDate)}</div></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b">
        <CardTitle className="text-lg">Edit Deal Information</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={updateDeal.isPending}>{updateDeal.isPending ? "Saving..." : "Save"}</Button>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-8 gap-y-4 pt-6">
        <div className="space-y-2"><label className="text-sm font-medium">Deal Name</label><Input value={formData.dealName} onChange={e => setFormData({...formData, dealName: e.target.value})} /></div>
        <div className="space-y-2"><label className="text-sm font-medium">Business Name</label><Input value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} /></div>
        <div className="space-y-2 col-span-2"><label className="text-sm font-medium">Address</label><Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
        <div className="space-y-2"><label className="text-sm font-medium">City</label><Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} /></div>
        <div className="space-y-2"><label className="text-sm font-medium">State</label><Input value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} /></div>
        <div className="space-y-2"><label className="text-sm font-medium">Asset Type</label><Input value={formData.assetType} onChange={e => setFormData({...formData, assetType: e.target.value})} /></div>
        <div className="space-y-2"><label className="text-sm font-medium">Source</label><Input value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} /></div>
        <div className="space-y-2"><label className="text-sm font-medium">Seller Name</label><Input value={formData.sellerName} onChange={e => setFormData({...formData, sellerName: e.target.value})} /></div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Linked Broker</label>
          <Select value={formData.brokerId?.toString() || "none"} onValueChange={v => setFormData({...formData, brokerId: v === "none" ? null : parseInt(v)})}>
            <SelectTrigger><SelectValue placeholder="Select broker" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {brokers.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function FinancialsForm({ deal }: { deal: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    askingPrice: deal.askingPrice || "",
    grossRevenue: deal.grossRevenue || "",
    netIncome: deal.netIncome || "",
    adjustedNetIncome: deal.adjustedNetIncome || "",
    monthlyRent: deal.monthlyRent || "",
    squareFootage: deal.squareFootage || ""
  });
  const updateDeal = useUpdateDeal();
  const queryClient = useQueryClient();

  const handleSave = () => {
    const payload = {
      askingPrice: formData.askingPrice ? Number(formData.askingPrice) : null,
      grossRevenue: formData.grossRevenue ? Number(formData.grossRevenue) : null,
      netIncome: formData.netIncome ? Number(formData.netIncome) : null,
      adjustedNetIncome: formData.adjustedNetIncome ? Number(formData.adjustedNetIncome) : null,
      monthlyRent: formData.monthlyRent ? Number(formData.monthlyRent) : null,
      squareFootage: formData.squareFootage ? Number(formData.squareFootage) : null,
    };
    updateDeal.mutate({ id: deal.id, data: payload }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDealQueryKey(deal.id) });
        setIsEditing(false);
      }
    });
  };

  if (!isEditing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="text-lg">Financial Details</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-12 gap-y-6 pt-6">
          <div><div className="text-sm text-muted-foreground mb-1">Asking Price</div><div className="font-medium text-lg">{formatCurrency(deal.askingPrice)}</div></div>
          <div><div className="text-sm text-muted-foreground mb-1">Asking Multiple</div><div className="font-medium text-lg">{deal.askingMultiple ? `${deal.askingMultiple.toFixed(2)}x` : "-"}</div></div>
          
          <div className="col-span-2 border-t pt-4 grid grid-cols-2 gap-x-12 gap-y-6">
            <div><div className="text-sm text-muted-foreground mb-1">Gross Revenue</div><div className="font-medium">{formatCurrency(deal.grossRevenue)}</div></div>
            <div><div className="text-sm text-muted-foreground mb-1">Net Income</div><div className="font-medium">{formatCurrency(deal.netIncome)}</div></div>
            <div><div className="text-sm text-muted-foreground mb-1">Adjusted Net Income</div><div className="font-medium text-primary">{formatCurrency(deal.adjustedNetIncome)}</div></div>
          </div>
          
          <div className="col-span-2 border-t pt-4 grid grid-cols-2 gap-x-12 gap-y-6">
            <div><div className="text-sm text-muted-foreground mb-1">Monthly Rent</div><div className="font-medium">{formatCurrency(deal.monthlyRent)}</div></div>
            <div><div className="text-sm text-muted-foreground mb-1">Annual Rent</div><div className="font-medium">{formatCurrency(deal.annualRent)}</div></div>
            <div><div className="text-sm text-muted-foreground mb-1">Rent as % of Gross</div><div className="font-medium">{formatPercent(deal.rentAsPercentGross)}</div></div>
            <div><div className="text-sm text-muted-foreground mb-1">Square Footage</div><div className="font-medium">{deal.squareFootage ? `${deal.squareFootage.toLocaleString()} sq ft` : "-"}</div></div>
            <div><div className="text-sm text-muted-foreground mb-1">Rent per Sq Ft</div><div className="font-medium">{formatCurrency(deal.rentPerSqFt)}</div></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b">
        <CardTitle className="text-lg">Edit Financial Details</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={updateDeal.isPending}>{updateDeal.isPending ? "Saving..." : "Save"}</Button>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-8 gap-y-4 pt-6">
        <div className="space-y-2"><label className="text-sm font-medium">Asking Price</label><Input type="number" value={formData.askingPrice} onChange={e => setFormData({...formData, askingPrice: e.target.value})} /></div>
        <div className="space-y-2"><label className="text-sm font-medium">Gross Revenue</label><Input type="number" value={formData.grossRevenue} onChange={e => setFormData({...formData, grossRevenue: e.target.value})} /></div>
        <div className="space-y-2"><label className="text-sm font-medium">Net Income</label><Input type="number" value={formData.netIncome} onChange={e => setFormData({...formData, netIncome: e.target.value})} /></div>
        <div className="space-y-2"><label className="text-sm font-medium">Adjusted Net Income</label><Input type="number" value={formData.adjustedNetIncome} onChange={e => setFormData({...formData, adjustedNetIncome: e.target.value})} /></div>
        <div className="space-y-2"><label className="text-sm font-medium">Monthly Rent</label><Input type="number" value={formData.monthlyRent} onChange={e => setFormData({...formData, monthlyRent: e.target.value})} /></div>
        <div className="space-y-2"><label className="text-sm font-medium">Square Footage</label><Input type="number" value={formData.squareFootage} onChange={e => setFormData({...formData, squareFootage: e.target.value})} /></div>
      </CardContent>
    </Card>
  );
}

function LeaseForm({ deal }: { deal: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    leaseYearsRemaining: deal.leaseYearsRemaining || "",
    renewalOptions: deal.renewalOptions || "",
  });
  const updateDeal = useUpdateDeal();
  const queryClient = useQueryClient();

  const handleSave = () => {
    updateDeal.mutate({ 
      id: deal.id, 
      data: { 
        leaseYearsRemaining: formData.leaseYearsRemaining ? Number(formData.leaseYearsRemaining) : null,
        renewalOptions: formData.renewalOptions
      } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDealQueryKey(deal.id) });
        setIsEditing(false);
      }
    });
  };

  if (!isEditing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="text-lg">Lease Details</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-12 gap-y-6 pt-6">
          <div><div className="text-sm text-muted-foreground mb-1">Lease Years Remaining</div><div className="font-medium">{deal.leaseYearsRemaining || "-"}</div></div>
          <div><div className="text-sm text-muted-foreground mb-1">Renewal Options</div><div className="font-medium">{deal.renewalOptions || "-"}</div></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b">
        <CardTitle className="text-lg">Edit Lease Details</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={updateDeal.isPending}>{updateDeal.isPending ? "Saving..." : "Save"}</Button>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-8 gap-y-4 pt-6">
        <div className="space-y-2"><label className="text-sm font-medium">Lease Years Remaining</label><Input type="number" value={formData.leaseYearsRemaining} onChange={e => setFormData({...formData, leaseYearsRemaining: e.target.value})} /></div>
        <div className="space-y-2"><label className="text-sm font-medium">Renewal Options</label><Input value={formData.renewalOptions} onChange={e => setFormData({...formData, renewalOptions: e.target.value})} /></div>
      </CardContent>
    </Card>
  );
}

function OperationsForm({ deal }: { deal: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    numWashers: deal.numWashers || "",
    numDryers: deal.numDryers || "",
    machineBrand: deal.machineBrand || "",
    avgMachineAge: deal.avgMachineAge || "",
    cardOrCoin: deal.cardOrCoin || "Both",
    hoursOfOperation: deal.hoursOfOperation || "",
    staffCount: deal.staffCount || "",
    ownerOperated: deal.ownerOperated || false,
    washAndFold: deal.washAndFold || false,
    pickupDelivery: deal.pickupDelivery || false,
    commercialAccounts: deal.commercialAccounts || false
  });
  const updateDeal = useUpdateDeal();
  const queryClient = useQueryClient();

  const handleSave = () => {
    updateDeal.mutate({ 
      id: deal.id, 
      data: { 
        ...formData,
        numWashers: formData.numWashers ? Number(formData.numWashers) : null,
        numDryers: formData.numDryers ? Number(formData.numDryers) : null,
        avgMachineAge: formData.avgMachineAge ? Number(formData.avgMachineAge) : null,
        staffCount: formData.staffCount ? Number(formData.staffCount) : null,
      } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDealQueryKey(deal.id) });
        setIsEditing(false);
      }
    });
  };

  if (!isEditing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="text-lg">Operations & Equipment</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div><div className="text-sm text-muted-foreground mb-1">Washers</div><div className="font-medium">{deal.numWashers || "-"}</div></div>
            <div><div className="text-sm text-muted-foreground mb-1">Dryers</div><div className="font-medium">{deal.numDryers || "-"}</div></div>
            <div><div className="text-sm text-muted-foreground mb-1">Brands</div><div className="font-medium">{deal.machineBrand || "-"}</div></div>
            <div><div className="text-sm text-muted-foreground mb-1">Avg Age</div><div className="font-medium">{deal.avgMachineAge ? `${deal.avgMachineAge} yrs` : "-"}</div></div>
            <div><div className="text-sm text-muted-foreground mb-1">System</div><div className="font-medium">{deal.cardOrCoin || "-"}</div></div>
            <div><div className="text-sm text-muted-foreground mb-1">Hours</div><div className="font-medium">{deal.hoursOfOperation || "-"}</div></div>
            <div><div className="text-sm text-muted-foreground mb-1">Staff</div><div className="font-medium">{deal.staffCount || "0"}</div></div>
          </div>
          
          <div className="border-t pt-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-2">
              {deal.ownerOperated ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <CircleDashed className="w-5 h-5 text-muted-foreground" />}
              <span className="font-medium">Owner Operated</span>
            </div>
            <div className="flex items-center gap-2">
              {deal.washAndFold ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <CircleDashed className="w-5 h-5 text-muted-foreground" />}
              <span className="font-medium">Wash & Fold</span>
            </div>
            <div className="flex items-center gap-2">
              {deal.pickupDelivery ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <CircleDashed className="w-5 h-5 text-muted-foreground" />}
              <span className="font-medium">Pickup/Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              {deal.commercialAccounts ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <CircleDashed className="w-5 h-5 text-muted-foreground" />}
              <span className="font-medium">Commercial Accounts</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b">
        <CardTitle className="text-lg">Edit Operations</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={updateDeal.isPending}>{updateDeal.isPending ? "Saving..." : "Save"}</Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div className="space-y-2"><label className="text-sm font-medium">Washers</label><Input type="number" value={formData.numWashers} onChange={e => setFormData({...formData, numWashers: e.target.value})} /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Dryers</label><Input type="number" value={formData.numDryers} onChange={e => setFormData({...formData, numDryers: e.target.value})} /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Machine Brands</label><Input value={formData.machineBrand} onChange={e => setFormData({...formData, machineBrand: e.target.value})} /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Avg Machine Age</label><Input type="number" value={formData.avgMachineAge} onChange={e => setFormData({...formData, avgMachineAge: e.target.value})} /></div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Card or Coin</label>
            <Select value={formData.cardOrCoin} onValueChange={v => setFormData({...formData, cardOrCoin: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Coin">Coin</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="Both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><label className="text-sm font-medium">Hours of Operation</label><Input value={formData.hoursOfOperation} onChange={e => setFormData({...formData, hoursOfOperation: e.target.value})} /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Staff Count</label><Input type="number" value={formData.staffCount} onChange={e => setFormData({...formData, staffCount: e.target.value})} /></div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="owner" checked={formData.ownerOperated} onCheckedChange={(c) => setFormData({...formData, ownerOperated: c as boolean})} />
            <label htmlFor="owner" className="text-sm font-medium leading-none">Owner Operated</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="wf" checked={formData.washAndFold} onCheckedChange={(c) => setFormData({...formData, washAndFold: c as boolean})} />
            <label htmlFor="wf" className="text-sm font-medium leading-none">Wash & Fold</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="pd" checked={formData.pickupDelivery} onCheckedChange={(c) => setFormData({...formData, pickupDelivery: c as boolean})} />
            <label htmlFor="pd" className="text-sm font-medium leading-none">Pickup/Delivery</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="comm" checked={formData.commercialAccounts} onCheckedChange={(c) => setFormData({...formData, commercialAccounts: c as boolean})} />
            <label htmlFor="comm" className="text-sm font-medium leading-none">Commercial Accounts</label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RedFlagsTab({ dealId }: { dealId: number }) {
  const { data: flags, isLoading } = useGetDealRedFlags(dealId, { query: { enabled: !!dealId, queryKey: getGetDealRedFlagsQueryKey(dealId) } });
  const updateFlags = useUpdateDealRedFlags();
  const queryClient = useQueryClient();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading red flags...</div>;

  const handleFlagChange = (flagKey: string, isChecked: boolean) => {
    if (!flags) return;
    const currentFlags = flags.map(f => ({ flagKey: f.flagKey, isFlagged: f.isFlagged, notes: f.notes }));
    const existing = currentFlags.find(f => f.flagKey === flagKey);
    if (existing) {
      existing.isFlagged = isChecked;
    } else {
      currentFlags.push({ flagKey, isFlagged: isChecked, notes: "" });
    }
    
    updateFlags.mutate({ id: dealId, data: { flags: currentFlags } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDealRedFlagsQueryKey(dealId) });
        queryClient.invalidateQueries({ queryKey: getGetDealQueryKey(dealId) });
      }
    });
  };

  const activeCount = flags?.filter(f => f.isFlagged).length || 0;
  
  // This is a static list of the 21 red flags
  const RED_FLAG_LIST = [
    "Revenue mismatch with utilities", "Unverifiable cash income", "Declining revenue trend", "High labor costs",
    "Missing tax returns", "Equipment age > 10 years", "Missing maintenance records", "Environmental liability / PERC",
    "Short lease remaining", "No renewal options", "Demolition clause in lease", "Rent > 25% of gross",
    "Major new competition nearby", "Declining neighborhood", "Poor parking or access", "Bad online reviews",
    "Seller uncooperative", "Suspicious broker behavior", "Unpaid taxes or liens", "Zoning issues", "High crime area"
  ];

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Red Flags Assessment</CardTitle>
          <Badge variant="outline" className={`font-normal ${
            activeCount >= 9 ? "bg-red-50 text-red-700 border-red-200" :
            activeCount >= 6 ? "bg-orange-50 text-orange-700 border-orange-200" :
            activeCount >= 3 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
            "bg-green-50 text-green-700 border-green-200"
          }`}>
            {activeCount} / 21 Flags Found
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {RED_FLAG_LIST.map(flag => {
            const isFlagged = flags?.find(f => f.flagKey === flag)?.isFlagged || false;
            return (
              <div key={flag} className="flex items-start space-x-3 p-2 rounded hover:bg-muted/30 transition-colors">
                <Checkbox 
                  id={`flag-${flag}`} 
                  checked={isFlagged}
                  onCheckedChange={(c) => handleFlagChange(flag, c as boolean)}
                />
                <label htmlFor={`flag-${flag}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pt-0.5">
                  {flag}
                </label>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentsTab({ dealId }: { dealId: number }) {
  const { data: documents, isLoading } = useListDocuments({ dealId }, { query: { enabled: !!dealId, queryKey: getListDocumentsQueryKey({ dealId }) } });
  const updateDoc = useUpdateDocument();
  const queryClient = useQueryClient();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading documents...</div>;

  const handleStatusChange = (id: number, newStatus: string) => {
    updateDoc.mutate({ id, data: { status: newStatus } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey({ dealId }) })
    });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Problem found": return "text-red-600 bg-red-50";
      case "Reviewed": return "text-green-600 bg-green-50";
      case "Received": return "text-blue-600 bg-blue-50";
      case "Requested": return "text-yellow-600 bg-yellow-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const receivedOrReviewed = documents?.filter(d => ["Received", "Reviewed"].includes(d.status)).length || 0;
  const totalDocs = documents?.length || 0;
  const progress = totalDocs > 0 ? (receivedOrReviewed / totalDocs) * 100 : 0;

  return (
    <Card>
      <CardHeader className="border-b space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Due Diligence Documents</CardTitle>
          <span className="text-sm font-medium text-muted-foreground">{receivedOrReviewed} / {totalDocs} Received</span>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {documents?.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors">
              <div className="flex items-center gap-3">
                <FileCheck className={`w-5 h-5 ${["Received", "Reviewed"].includes(doc.status) ? "text-green-500" : "text-muted-foreground"}`} />
                <span className="font-medium text-sm">{doc.documentLabel}</span>
              </div>
              <div className="flex items-center gap-4">
                <Select value={doc.status} onValueChange={(v) => handleStatusChange(doc.id, v)}>
                  <SelectTrigger className={`w-[160px] h-8 text-xs font-semibold uppercase tracking-wider ${getStatusColor(doc.status)}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not requested">Not requested</SelectItem>
                    <SelectItem value="Requested">Requested</SelectItem>
                    <SelectItem value="Received">Received</SelectItem>
                    <SelectItem value="Reviewed">Reviewed</SelectItem>
                    <SelectItem value="Problem found">Problem found</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function NotesTab({ dealId }: { dealId: number }) {
  const { data: notes, isLoading } = useListNotes({ linkedType: 'deal', linkedId: dealId }, { query: { enabled: !!dealId, queryKey: getListNotesQueryKey({ linkedType: 'deal', linkedId: dealId }) } });
  const createNote = useCreateNote();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState("General note");

  const handleSubmit = () => {
    if (!content.trim()) return;
    createNote.mutate({ 
      data: { linkedType: "deal", linkedId: dealId, noteType, content } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey({ linkedType: 'deal', linkedId: dealId }) });
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
                <SelectItem value="Site visit note">Site visit note</SelectItem>
                <SelectItem value="Broker comment">Broker comment</SelectItem>
                <SelectItem value="Seller claim">Seller claim</SelectItem>
                <SelectItem value="Underwriting note">Underwriting note</SelectItem>
                <SelectItem value="Red flag">Red flag</SelectItem>
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
                <Badge variant="outline" className="font-normal text-xs">{note.noteType}</Badge>
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

function RemindersTab({ dealId }: { dealId: number }) {
  const { data: reminders, isLoading } = useListReminders({ linkedType: 'deal', linkedId: dealId }, { query: { enabled: !!dealId, queryKey: getListRemindersQueryKey({ linkedType: 'deal', linkedId: dealId }) } });
  const completeReminder = useCompleteReminder();
  const createReminder = useCreateReminder();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPriority, setNewPriority] = useState("Medium");
  const [newType, setNewType] = useState("Follow up");

  const handleComplete = (id: number) => {
    completeReminder.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey({ linkedType: 'deal', linkedId: dealId }) })
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
        linkedType: "deal",
        linkedId: dealId,
        completed: false
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey({ linkedType: 'deal', linkedId: dealId }) });
        setIsAdding(false);
        setNewTitle(""); setNewDueDate(""); setNewType("Follow up"); setNewPriority("Medium");
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
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="What needs to be done?" />
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
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
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
