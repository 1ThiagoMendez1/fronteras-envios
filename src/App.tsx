import { Switch, Route, Router as WouterRouter } from "wouter"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider, useAuth } from "@/hooks/use-auth"

// Pages
import Login from "@/pages/login"
import Dashboard from "@/pages/dashboard"
import PublicTracking from "@/pages/public-tracking"
import Shipments from "@/pages/shipments"
import ShipmentDetail from "@/pages/shipment-detail"
import NewShipment from "@/pages/shipment-new"
import EditShipment from "@/pages/shipment-edit"
import Register from "@/pages/register"
import Drivers from "@/pages/drivers"
import Financial from "@/pages/financial"
import DailyClosePage from "@/pages/daily-close"
import ClientsPage from "@/pages/clients"
import UsersPage from "@/pages/users"
import NotFound from "@/pages/not-found"

import { Redirect } from "wouter"
import { Loader2 } from "lucide-react"

const queryClient = new QueryClient()

// Protected Route Wrapper
function ProtectedRoute({ component: Component, ...rest }: { component: any; path: string }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 text-primary">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p className="font-semibold text-sm">Verificando sesión...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Redirect to="/login" replace />;
  }

  return <Route {...rest} component={Component} />;
}

function Router() {
  return (
    <Switch>

      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/" component={PublicTracking} />

      {/* App routes (protegidas) */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/shipments" component={Shipments} />
      <ProtectedRoute path="/shipments/new" component={NewShipment} />
      <ProtectedRoute path="/shipments/:id/edit" component={EditShipment} />
      <ProtectedRoute path="/shipments/:id" component={ShipmentDetail} />
      <ProtectedRoute path="/drivers" component={Drivers} />
      <ProtectedRoute path="/clients" component={ClientsPage} />
      <ProtectedRoute path="/financial" component={Financial} />
      <ProtectedRoute path="/daily-close" component={DailyClosePage} />
      <ProtectedRoute path="/users" component={UsersPage} />

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