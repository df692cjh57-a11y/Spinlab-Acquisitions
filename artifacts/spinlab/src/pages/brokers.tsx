import { useListBrokers, getListBrokersQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Star, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function BrokersPage() {
  const [search, setSearch] = useState("");
  const { data: brokers, isLoading } = useListBrokers({ search });

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brokers</h1>
          <p className="text-muted-foreground mt-1">Manage relationships and track deal flow.</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> New Broker</Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search brokers..."
            className="pl-9 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Broker</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Market</TableHead>
              <TableHead>Deals Sent</TableHead>
              <TableHead>Hot Deals</TableHead>
              <TableHead>Relationship</TableHead>
              <TableHead>Last Contact</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading brokers...</TableCell>
              </TableRow>
            ) : brokers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No brokers found.</TableCell>
              </TableRow>
            ) : brokers?.map((broker) => (
              <TableRow key={broker.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium">{broker.name}</TableCell>
                <TableCell>{broker.company || "-"}</TableCell>
                <TableCell>{broker.market || "-"}</TableCell>
                <TableCell>{broker.dealCount || 0}</TableCell>
                <TableCell>
                  {broker.hotDealCount ? (
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                      {broker.hotDealCount}
                    </Badge>
                  ) : "-"}
                </TableCell>
                <TableCell>
                  {broker.relationshipStrength ? (
                    <Badge variant="outline">{broker.relationshipStrength}</Badge>
                  ) : "-"}
                </TableCell>
                <TableCell>{formatDate(broker.lastContactedDate)}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/brokers/${broker.id}`}>
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
