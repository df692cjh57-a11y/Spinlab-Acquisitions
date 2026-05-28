import { useListBrokers, getListBrokersQueryKey, useCreateBroker } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, ArrowRight, X } from "lucide-react";
import { formatDateShort, isOverdue, isDueToday } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Toggle } from "@/components/ui/toggle";

const createBrokerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  website: z.string().optional(),
  market: z.string().optional(),
  specialty: z.string().optional(),
  brokerType: z.string().optional(),
  relationshipStrength: z.string().optional(),
  trustRating: z.coerce.number().min(0).max(5).optional(),
  responsivenessRating: z.coerce.number().min(0).max(5).optional(),
  dealQualityRating: z.coerce.number().min(0).max(5).optional(),
  notes: z.string().optional(),
});

function getRelationshipColor(str: string) {
  switch(str) {
    case "Cold": return "bg-gray-100 text-gray-700 border-gray-200";
    case "Warm": return "bg-blue-100 text-blue-700 border-blue-200";
    case "Strong": return "bg-green-100 text-green-700 border-green-200";
    case "Key Contact": return "bg-amber-100 text-amber-700 border-amber-200";
    default: return "bg-gray-50 text-gray-600 border-gray-200";
  }
}

export default function BrokersPage() {
  const [search, setSearch] = useState("");
  const [relationshipFilter, setRelationshipFilter] = useState("All");
  const [followUpDue, setFollowUpDue] = useState(false);
  
  const { data: brokers, isLoading } = useListBrokers({ search });
  const queryClient = useQueryClient();
  const createBroker = useCreateBroker();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof createBrokerSchema>>({
    resolver: zodResolver(createBrokerSchema),
    defaultValues: {
      name: "",
      company: "",
      phone: "",
      email: "",
      website: "",
      market: "",
      specialty: "",
      brokerType: "Business Broker",
      relationshipStrength: "Cold",
      trustRating: 0,
      responsivenessRating: 0,
      dealQualityRating: 0,
      notes: ""
    }
  });

  const onSubmit = (values: z.infer<typeof createBrokerSchema>) => {
    createBroker.mutate({ data: values as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBrokersQueryKey() });
        setIsDialogOpen(false);
        form.reset();
      }
    });
  };

  const filteredBrokers = brokers?.filter(b => {
    if (relationshipFilter !== "All" && b.relationshipStrength !== relationshipFilter) return false;
    if (followUpDue && b.nextFollowUpDate && !isOverdue(b.nextFollowUpDate) && !isDueToday(b.nextFollowUpDate)) return false;
    return true;
  });

  const hasActiveFilters = relationshipFilter !== "All" || followUpDue;

  return (
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brokers</h1>
          <p className="text-muted-foreground mt-1">Manage relationships and track deal flow.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-broker"><Plus className="w-4 h-4 mr-2" /> New Broker</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Broker</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="company" render={({ field }) => (
                    <FormItem><FormLabel>Company</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="market" render={({ field }) => (
                    <FormItem><FormLabel>Market</FormLabel><FormControl><Input placeholder="e.g. Chicago Metro" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="specialty" render={({ field }) => (
                    <FormItem><FormLabel>Specialty</FormLabel><FormControl><Input placeholder="e.g. Laundromats" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="brokerType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Broker Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Business Broker">Business Broker</SelectItem>
                          <SelectItem value="Commercial Agent">Commercial Agent</SelectItem>
                          <SelectItem value="Distressed Asset Specialist">Distressed Asset Specialist</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="relationshipStrength" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Cold">Cold</SelectItem>
                          <SelectItem value="Warm">Warm</SelectItem>
                          <SelectItem value="Strong">Strong</SelectItem>
                          <SelectItem value="Key Contact">Key Contact</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createBroker.isPending}>{createBroker.isPending ? "Saving..." : "Save Broker"}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search brokers..."
            className="pl-9 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={relationshipFilter} onValueChange={setRelationshipFilter}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue placeholder="Relationship" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Relationships</SelectItem>
            <SelectItem value="Cold">Cold</SelectItem>
            <SelectItem value="Warm">Warm</SelectItem>
            <SelectItem value="Strong">Strong</SelectItem>
            <SelectItem value="Key Contact">Key Contact</SelectItem>
          </SelectContent>
        </Select>

        <Toggle size="sm" pressed={followUpDue} onPressedChange={setFollowUpDue} className="h-9 border bg-card data-[state=on]:bg-blue-50 data-[state=on]:text-blue-700">
          Follow-up Due
        </Toggle>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setRelationshipFilter("All"); setFollowUpDue(false); }} className="text-muted-foreground">
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      <div className="border rounded-md bg-card shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Broker</TableHead>
              <TableHead>Market</TableHead>
              <TableHead>Specialty</TableHead>
              <TableHead>Relationship</TableHead>
              <TableHead className="text-center">Deals</TableHead>
              <TableHead className="text-center">Hot Deals</TableHead>
              <TableHead>Last Contact</TableHead>
              <TableHead>Next Follow-up</TableHead>
              <TableHead>Score</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading brokers...</TableCell>
              </TableRow>
            ) : filteredBrokers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">No brokers found.</TableCell>
              </TableRow>
            ) : filteredBrokers?.map((broker) => {
              
              // Calc score
              let score = 0;
              if (broker.trustRating) score += broker.trustRating * 8;
              if (broker.responsivenessRating) score += broker.responsivenessRating * 6;
              if (broker.dealQualityRating) score += broker.dealQualityRating * 4;
              if ((broker.dealCount || 0) >= 3) score += 5;
              if ((broker.hotDealCount || 0) >= 1) score += 5;
              if (score > 100) score = 100;

              const isStale = broker.lastContactedDate && (new Date().getTime() - new Date(broker.lastContactedDate).getTime() > 30 * 24 * 60 * 60 * 1000);
              const needsFollowup = broker.nextFollowUpDate && (isOverdue(broker.nextFollowUpDate) || isDueToday(broker.nextFollowUpDate));

              return (
                <TableRow key={broker.id} className="hover:bg-muted/30 transition-colors group cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/brokers/${broker.id}`} className="block">
                      <div className="text-primary hover:underline">{broker.name}</div>
                      {broker.company && <div className="text-[11px] text-muted-foreground font-normal mt-0.5">{broker.company}</div>}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{broker.market || "-"}</TableCell>
                  <TableCell className="text-sm">{broker.specialty || "-"}</TableCell>
                  <TableCell>
                    {broker.relationshipStrength ? (
                      <Badge variant="outline" className={`font-normal ${getRelationshipColor(broker.relationshipStrength)}`}>
                        {broker.relationshipStrength}
                      </Badge>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-center font-medium">{broker.dealCount || 0}</TableCell>
                  <TableCell className="text-center">
                    {broker.hotDealCount ? (
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                        {broker.hotDealCount}
                      </Badge>
                    ) : "-"}
                  </TableCell>
                  <TableCell className={`text-sm ${isStale ? "text-red-600 font-medium" : ""}`}>
                    {formatDateShort(broker.lastContactedDate)}
                  </TableCell>
                  <TableCell className={`text-sm ${needsFollowup ? "text-red-600 font-medium" : ""}`}>
                    {formatDateShort(broker.nextFollowUpDate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                      score >= 80 ? "bg-green-50 text-green-700 border-green-200" :
                      score >= 60 ? "bg-blue-50 text-blue-700 border-blue-200" :
                      score >= 40 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                      "bg-gray-100 text-gray-700 border-gray-200"
                    }`}>
                      {score > 0 ? score : "-"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/brokers/${broker.id}`}>
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
