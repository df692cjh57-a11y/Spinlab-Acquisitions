import { useParams, Link } from "wouter";
import { useGetBroker, useGetBrokerDeals, getGetBrokerQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Mail, Phone, Globe, Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function BrokerDetail() {
  const { id } = useParams();
  const brokerId = parseInt(id || "0", 10);
  const { data: broker, isLoading } = useGetBroker(brokerId, { query: { enabled: !!brokerId, queryKey: getGetBrokerQueryKey(brokerId) } });
  const { data: deals } = useGetBrokerDeals(brokerId, { query: { enabled: !!brokerId } });

  if (isLoading || !broker) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/brokers">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{broker.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            {broker.company && <Badge variant="secondary">{broker.company}</Badge>}
            {broker.market && <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />{broker.market}</Badge>}
            {broker.relationshipStrength && <Badge variant="outline">{broker.relationshipStrength}</Badge>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ratings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Trust</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{broker.trustRating || "-"}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Responsiveness</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{broker.responsivenessRating || "-"}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Deal Quality</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{broker.dealQualityRating || "-"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex justify-between items-center">
                <span>Deals from this Broker</span>
                <Badge variant="secondary">{deals?.length || 0} Deals</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deals && deals.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deal</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Asking</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deals.map(deal => (
                      <TableRow key={deal.id}>
                        <TableCell>
                          <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline">
                            {deal.dealName}
                          </Link>
                        </TableCell>
                        <TableCell>{[deal.city, deal.state].filter(Boolean).join(", ")}</TableCell>
                        <TableCell>{formatCurrency(deal.askingPrice)}</TableCell>
                        <TableCell><Badge variant="outline">{deal.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No deals found for this broker.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
