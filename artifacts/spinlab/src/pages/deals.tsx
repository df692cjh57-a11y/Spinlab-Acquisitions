import { useListDeals, useCreateDeal, getListDealsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatMultiple } from "@/lib/format";
import { Search, Plus, Filter, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

function getPriorityColor(priority: string) {
  switch (priority) {
    case "Hot": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "High": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "Medium": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    default: return "bg-muted text-muted-foreground border-muted-foreground/20";
  }
}

function getStatusColor(status: string) {
  if (["Closed"].includes(status)) return "bg-green-500/10 text-green-500 border-green-500/20";
  if (["Dead Deal", "Stalled"].includes(status)) return "bg-red-500/10 text-red-500 border-red-500/20";
  if (["Under Contract", "Due Diligence", "Financing"].includes(status)) return "bg-purple-500/10 text-purple-500 border-purple-500/20";
  return "bg-primary/10 text-primary border-primary/20";
}

const createDealSchema = z.object({
  dealName: z.string().min(1, "Deal name is required"),
  city: z.string().optional(),
  state: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  priority: z.string().min(1, "Priority is required"),
});

export default function DealsPage() {
  const [search, setSearch] = useState("");
  const { data: deals, isLoading } = useListDeals({ search });
  const queryClient = useQueryClient();
  const createDeal = useCreateDeal();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof createDealSchema>>({
    resolver: zodResolver(createDealSchema),
    defaultValues: {
      dealName: "",
      city: "",
      state: "",
      status: "New Lead",
      priority: "Medium",
    }
  });

  const onSubmit = (values: z.infer<typeof createDealSchema>) => {
    createDeal.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDealsQueryKey() });
        setIsDialogOpen(false);
        form.reset();
      }
    });
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
          <p className="text-muted-foreground mt-1">Manage and track your active acquisitions.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Deal</Button>
          </DialogTrigger>
          <DialogContent>
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
                      <FormLabel>Deal Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Sunset Laundromat" {...field} />
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

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            className="pl-9 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="bg-card">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Deal</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Asking Price</TableHead>
              <TableHead>Adj. Net Income</TableHead>
              <TableHead>Multiple</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Next Action</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading deals...</TableCell>
              </TableRow>
            ) : deals?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No deals found.</TableCell>
              </TableRow>
            ) : deals?.map((deal) => (
              <TableRow key={deal.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium">
                  <div>{deal.dealName}</div>
                  {deal.brokerName && <div className="text-xs text-muted-foreground mt-0.5">Broker: {deal.brokerName}</div>}
                </TableCell>
                <TableCell>{[deal.city, deal.state].filter(Boolean).join(", ") || "-"}</TableCell>
                <TableCell>{formatCurrency(deal.askingPrice)}</TableCell>
                <TableCell>{formatCurrency(deal.adjustedNetIncome)}</TableCell>
                <TableCell>{formatMultiple(deal.askingMultiple)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(deal.status)}>
                    {deal.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getPriorityColor(deal.priority)}>
                    {deal.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {deal.nextAction ? (
                      <>
                        <span className="block truncate max-w-[200px]">{deal.nextAction}</span>
                        {deal.nextActionDueDate && (
                          <span className={`text-xs ${new Date(deal.nextActionDueDate) < new Date() ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                            Due: {formatDate(deal.nextActionDueDate)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground italic">None set</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/deals/${deal.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
