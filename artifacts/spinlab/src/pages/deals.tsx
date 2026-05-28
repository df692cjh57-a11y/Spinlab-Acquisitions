import { useListDeals, useCreateDeal, getListDealsQueryKey, useListBrokers } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDateShort, formatMultiple, formatPercent, isOverdue } from "@/lib/format";
import { Search, Plus, Filter, ArrowRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Toggle } from "@/components/ui/toggle";

function getPriorityColor(priority: string) {
  switch (priority) {
    case "Hot": return "bg-orange-100 text-orange-700 border-orange-200";
    case "High": return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "Medium": return "bg-blue-100 text-blue-700 border-blue-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function getStatusColor(status: string) {
  if (["Closed"].includes(status)) return "bg-green-100 text-green-700 border-green-200";
  if (["Dead Deal", "Stalled"].includes(status)) return "bg-red-100 text-red-700 border-red-200";
  if (["Under Contract", "Due Diligence", "Financing"].includes(status)) return "bg-purple-100 text-purple-700 border-purple-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

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
  notes: z.string().optional(),
});

const ALL_STATUSES = [
  "New Lead", "Contacted Broker", "NDA Sent", "Financials Requested", "Financials Received",
  "Underwriting", "Site Visit Scheduled", "LOI Sent", "Negotiation", "Under Contract",
  "Due Diligence", "Financing", "Closed", "Dead Deal", "Follow Up Later", "Stalled"
];

export default function DealsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [hotOnly, setHotOnly] = useState(false);
  const [deadOnly, setDeadOnly] = useState(false);
  
  const { data: deals, isLoading } = useListDeals({ 
    search,
    ...(statusFilter !== "All" && { status: statusFilter }),
    ...(priorityFilter !== "All" && { priority: priorityFilter }),
    ...(overdueOnly && { overdueOnly: true }),
    ...(hotOnly && { priority: "Hot" }),
    ...(deadOnly && { status: "Dead Deal" }),
  });
  
  const { data: brokers } = useListBrokers({});
  
  const queryClient = useQueryClient();
  const createDeal = useCreateDeal();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof createDealSchema>>({
    resolver: zodResolver(createDealSchema),
    defaultValues: {
      dealName: "",
      businessName: "",
      city: "",
      state: "",
      assetType: "Laundromat",
      status: "New Lead",
      priority: "Medium",
      nextAction: "",
      nextActionDueDate: "",
      notes: ""
    }
  });

  const onSubmit = (values: z.infer<typeof createDealSchema>) => {
    createDeal.mutate({ data: values as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDealsQueryKey() });
        setIsDialogOpen(false);
        form.reset();
      }
    });
  };

  const hasActiveFilters = statusFilter !== "All" || priorityFilter !== "All" || overdueOnly || hotOnly || deadOnly;

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
          <p className="text-muted-foreground mt-1">Manage and track your active acquisitions.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-deal"><Plus className="w-4 h-4 mr-2" /> New Deal</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Deal</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="dealName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Sunset Laundromat" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Legal Business Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Sunset Laundry LLC" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="ST" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="askingPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asking Price</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="grossRevenue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gross Revenue</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adjustedNetIncome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adjusted Net Income</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="monthlyRent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Rent</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Hot">Hot</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="brokerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linked Broker</FormLabel>
                      <Select onValueChange={(val) => field.onChange(parseInt(val))} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select broker" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {brokers?.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createDeal.isPending}>
                    {createDeal.isPending ? "Creating..." : "Create Deal"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            className="pl-9 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px] bg-card">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Priorities</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Hot">Hot</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 border rounded-md p-1 bg-card">
          <Toggle size="sm" pressed={overdueOnly} onPressedChange={setOverdueOnly} className="h-8 data-[state=on]:bg-red-100 data-[state=on]:text-red-700">Overdue</Toggle>
          <Toggle size="sm" pressed={hotOnly} onPressedChange={setHotOnly} className="h-8 data-[state=on]:bg-orange-100 data-[state=on]:text-orange-700">Hot</Toggle>
          <Toggle size="sm" pressed={deadOnly} onPressedChange={setDeadOnly} className="h-8">Dead</Toggle>
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={() => {
            setStatusFilter("All"); setPriorityFilter("All"); setOverdueOnly(false); setHotOnly(false); setDeadOnly(false);
          }} className="text-muted-foreground">
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      <div className="border rounded-md bg-card shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="min-w-[200px]">Deal Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Asking Price</TableHead>
              <TableHead>Gross Rev</TableHead>
              <TableHead>Adj. Net</TableHead>
              <TableHead>Multiple</TableHead>
              <TableHead>Rent/Gross</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="min-w-[180px]">Next Action</TableHead>
              <TableHead>Red Flags</TableHead>
              <TableHead>Score</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">Loading deals...</TableCell>
              </TableRow>
            ) : deals?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">No deals match your filters.</TableCell>
              </TableRow>
            ) : deals?.map((deal) => {
              const multipleStr = formatMultiple(deal.askingMultiple);
              const multipleColor = !deal.askingMultiple ? "" : deal.askingMultiple > 5 ? "text-red-600 font-medium" : deal.askingMultiple >= 4 ? "text-yellow-600 font-medium" : "text-green-600 font-medium";
              
              const rentPercent = deal.rentAsPercentGross;
              const rentColor = !rentPercent ? "" : rentPercent > 20 ? "text-red-600 font-medium" : rentPercent >= 15 ? "text-yellow-600 font-medium" : "";

              return (
                <TableRow key={deal.id} className="hover:bg-muted/30 transition-colors group cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/deals/${deal.id}`} className="block">
                      <div className="text-primary hover:underline">{deal.dealName}</div>
                      {deal.brokerName && <div className="text-[11px] text-muted-foreground mt-0.5 font-normal">{deal.brokerName}</div>}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    <Link href={`/deals/${deal.id}`} className="block">{[deal.city, deal.state].filter(Boolean).join(", ") || "-"}</Link>
                  </TableCell>
                  <TableCell className="text-sm">{formatCurrency(deal.askingPrice)}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(deal.grossRevenue)}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(deal.adjustedNetIncome)}</TableCell>
                  <TableCell className={`text-sm ${multipleColor}`}>{multipleStr}</TableCell>
                  <TableCell className={`text-sm ${rentColor}`}>{formatPercent(rentPercent)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`font-normal whitespace-nowrap ${getStatusColor(deal.status)}`}>
                      {deal.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`font-normal ${getPriorityColor(deal.priority)}`}>
                      {deal.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {deal.nextAction ? (
                        <>
                          <span className="block truncate max-w-[180px]">{deal.nextAction}</span>
                          {deal.nextActionDueDate && (
                            <span className={`text-[11px] ${isOverdue(deal.nextActionDueDate) ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                              {formatDateShort(deal.nextActionDueDate)}
                            </span>
                          )}
                        </>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[10px] uppercase font-bold">Stalled</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {deal.redFlagLevel && (
                       <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                         deal.redFlagLevel === "Clean" ? "bg-green-50 text-green-700 border-green-200" :
                         deal.redFlagLevel === "Caution" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                         deal.redFlagLevel === "High Risk" ? "bg-orange-50 text-orange-700 border-orange-200" :
                         "bg-red-50 text-red-700 border-red-200"
                       }`}>
                         {deal.redFlagLevel}
                       </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {deal.dealScore ? (
                       <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                         deal.dealScore >= 80 ? "bg-green-50 text-green-700 border-green-200" :
                         deal.dealScore >= 60 ? "bg-blue-50 text-blue-700 border-blue-200" :
                         deal.dealScore >= 40 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                         "bg-red-50 text-red-700 border-red-200"
                       }`}>
                         {deal.dealScore}
                       </Badge>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/deals/${deal.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
