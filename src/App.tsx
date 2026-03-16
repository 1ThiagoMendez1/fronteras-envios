import { Switch, Route, Router as WouterRouter } from "wouter"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/hooks/use-auth"

// Pages
import Login from "@/pages/login"
import Dashboard from "@/pages/dashboard"
import PublicTracking from "@/pages/public-tracking"
import Shipments from "@/pages/shipments"
import ShipmentDetail from "@/pages/shipment-detail"
import NewShipment from "@/pages/shipment-new"
import Drivers from "@/pages/drivers"
import Financial from "@/pages/financial"
import DailyClosePage from "@/pages/daily-close"
import ClientsPage from "@/pages/clients"
import NotFound from "@/pages/not-found"

const queryClient = new QueryClient()

function Router() {
  return (
    <Switch>

      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/track" component={PublicTracking} />

      {/* App routes (sin protección por ahora) */}
      <Route path="/" component={Dashboard} />
      <Route path="/shipments" component={Shipments} />
      <Route path="/shipments/new" component={NewShipment} />
      <Route path="/shipments/:id" component={ShipmentDetail} />
      <Route path="/drivers" component={Drivers} />
      <Route path="/clients" component={ClientsPage} />
      <Route path="/financial" component={Financial} />
      <Route path="/daily-close" component={DailyClosePage} />

      {/* 404 */}
      <Route component={NotFound} />

    </Switch>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}