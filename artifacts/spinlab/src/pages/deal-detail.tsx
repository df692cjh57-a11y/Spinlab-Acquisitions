import { useParams } from "wouter";
import { useGetDeal, useUpdateDeal, getGetDealQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent, formatDate } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, ArrowLeft, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

function getRiskColor(level: string | undefined) {
  switch (level) {
    case "Clean": return "text-green-500 bg-green-500/10";
    case "Caution": return "text-yellow-500 bg-yellow-500/10";
    case "High Risk": return "text-orange-500 bg-orange-500/10";
    case "Dangerous": return "text-red-500 bg-red-500/10";
    default: return "text-muted-foreground bg-muted";
  }
}

export default function DealDetail() {
  const { id } = useParams();
  const dealId = parseInt(id || "0", 10);
  const { data: deal, isLoading } = useGetDeal(dealId, { query: { enabled: !!dealId, queryKey: getGetDealQueryKey(dealId) } });

  if (isLoading || !deal) {
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
        <Link href="/deals">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{deal.dealName}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{deal.status}</Badge>
            <Badge variant="outline">{deal.priority} Priority</Badge>
            {deal.city && <span className="text-sm text-muted-foreground">{deal.city}, {deal.state}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-card border w-full justify-start h-auto p-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="financials">Financials</TabsTrigger>
              <TabsTrigger value="property">Property & Equip</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Deal Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Asking Price</div>
                    <div className="font-semibold text-lg">{formatCurrency(deal.askingPrice)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Adj. Net Income</div>
                    <div className="font-semibold text-lg text-primary">{formatCurrency(deal.adjustedNetIncome)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Implied Multiple</div>
                    <div className="font-semibold text-lg">{deal.askingMultiple ? `${deal.askingMultiple.toFixed(2)}x` : '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Rent / Gross</div>
                    <div className="font-semibold text-lg">{formatPercent(deal.rentAsPercentGross)}</div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Score & Risk</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-4">
                      <span className="text-muted-foreground">Deal Quality</span>
                      <span className="font-medium">{deal.dealQuality || "Not scored"}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-4">
                      <span className="text-muted-foreground">Deal Score</span>
                      <span className="font-medium">{deal.dealScore || "-"} / 100</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Red Flag Level</span>
                      <Badge variant="outline" className={getRiskColor(deal.redFlagLevel)}>
                        {deal.redFlagLevel || "Clean"}
                      </Badge>
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
                        <div className="font-medium">{deal.nextAction}</div>
                        <div className="text-sm text-muted-foreground">
                          Due: {formatDate(deal.nextActionDueDate)}
                        </div>
                        <Button className="w-full">Mark Complete</Button>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-center py-4">No next action set</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="financials" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Financial Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-y-6 gap-x-12">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Asking Price</span>
                    <span className="font-medium">{formatCurrency(deal.askingPrice)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Gross Revenue</span>
                    <span className="font-medium">{formatCurrency(deal.grossRevenue)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Net Income</span>
                    <span className="font-medium">{formatCurrency(deal.netIncome)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Adj. Net Income</span>
                    <span className="font-medium text-primary">{formatCurrency(deal.adjustedNetIncome)}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Other tabs would follow similar patterns */}
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="py-4 px-5">
              <CardTitle className="text-sm font-semibold">Key Contacts</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              {deal.brokerId ? (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Broker</div>
                  <div className="font-medium text-primary cursor-pointer hover:underline">
                    <Link href={`/brokers/${deal.brokerId}`}>{deal.brokerName}</Link>
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
        </div>
      </div>
    </div>
  );
}
