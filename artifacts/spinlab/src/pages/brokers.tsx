import { useListBrokers, useCreateBroker, getListBrokersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, Plus, ChevronRight } from "lucide-react";
import { isOverdue } from "@/lib/format";

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
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cls}`}>{s}</span>
  );
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

export default function BrokersPage() {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { data: brokers, isLoading } = useListBrokers({ search });
  const createBroker = useCreateBroker();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", company: "", phone: "", email: "", market: "", specialty: "", brokerType: "", relationshipStrength: "Cold", notes: "" },
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    createBroker.mutate({ data: values as any }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListBrokersQueryKey() }); setIsOpen(false); form.reset(); },
    });
  };

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
                <th className="px-4 text-left">Broker</th>
                <th className="px-3 text-left">Market</th>
                <th className="px-3 text-left">Specialty</th>
                <th className="px-3 text-left">Relationship</th>
                <th className="px-3 text-center">Trust</th>
                <th className="px-3 text-center">Response</th>
                <th className="px-3 text-center">Deal Quality</th>
                <th className="px-3 text-center">Score</th>
                <th className="px-3 text-right">Last Contact</th>
                <th className="px-3 text-right">Follow-Up</th>
                <th className="px-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {brokers.map((broker) => {
                const followUpOverdue = isOverdue(broker.nextFollowUpDate);
                return (
                  <tr key={broker.id} className="hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0">
                    <td className="px-4">
                      <Link href={`/brokers/${broker.id}`}>
                        <div className="font-medium text-sm text-foreground hover:text-primary cursor-pointer leading-tight">{broker.name}</div>
                        <div className="text-xs text-muted-foreground">{broker.company}</div>
                      </Link>
                    </td>
                    <td className="px-3 text-xs text-muted-foreground">{broker.market || "—"}</td>
                    <td className="px-3 text-xs text-muted-foreground"><span className="truncate block max-w-[120px]">{broker.specialty || "—"}</span></td>
                    <td className="px-3"><RelBadge strength={broker.relationshipStrength} /></td>
                    <td className="px-3 text-center"><Dots value={broker.trustRating} /></td>
                    <td className="px-3 text-center"><Dots value={broker.responsivenessRating} /></td>
                    <td className="px-3 text-center"><Dots value={broker.dealQualityRating} /></td>
                    <td className="px-3 text-center"><BrokerScore trust={broker.trustRating} responsiveness={broker.responsivenessRating} quality={broker.dealQualityRating} /></td>
                    <td className="px-3 text-right text-xs text-muted-foreground">{broker.lastContactedDate || "—"}</td>
                    <td className={`px-3 text-right text-xs font-medium ${followUpOverdue ? "text-red-600" : "text-muted-foreground"}`}>{broker.nextFollowUpDate || "—"}</td>
                    <td className="px-3 text-center">
                      <Link href={`/brokers/${broker.id}`}><ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /></Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
