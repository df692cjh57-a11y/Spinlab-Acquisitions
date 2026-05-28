import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import DealsPage from "@/pages/deals";
import DealDetail from "@/pages/deal-detail";
import BrokersPage from "@/pages/brokers";
import BrokerDetail from "@/pages/broker-detail";
import RemindersPage from "@/pages/reminders";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div className="min-h-screen bg-background text-foreground">
            <Layout>
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/deals" component={DealsPage} />
                <Route path="/deals/:id" component={DealDetail} />
                <Route path="/brokers" component={BrokersPage} />
                <Route path="/brokers/:id" component={BrokerDetail} />
                <Route path="/reminders" component={RemindersPage} />
                <Route component={NotFound} />
              </Switch>
            </Layout>
          </div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
