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

const queryClient = new QueryClient()

// Protected Route Wrapper — NO "Verificando sesión" text, ever
function ProtectedRoute({ component: Component, requiredPermission, ...rest }: { component: any; path: string; requiredPermission?: string }) {
  const { isAuthenticated, isLoading, hasPermission } = useAuth();
  
  // Mientras se restaura la sesión, mostrar pantalla en blanco (sin spinner ni texto)
  if (isLoading) {
    return <div className="min-h-screen w-full bg-slate-50" />;
  }
  
  if (!isAuthenticated) {
    return <Redirect to="/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <Route {...rest}>
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4">
          <div className="flex flex-col items-center justify-center gap-4 text-center max-w-md bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Acceso Denegado</h2>
            <p className="font-medium text-sm text-slate-500">Tu nivel de acceso actual no te permite visualizar o interactuar con este módulo operativo del sistema.</p>
            <a href="/" className="px-6 py-2.5 bg-primary text-white font-semibold rounded-xl hover:-translate-y-0.5 transition-all shadow-md shadow-primary/20 mt-4">Regresar al inicio</a>
          </div>
        </div>
      </Route>
    );
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
      <ProtectedRoute path="/dashboard" component={Dashboard} requiredPermission="dashboard" />
      <ProtectedRoute path="/shipments" component={Shipments} requiredPermission="shipments" />
      <ProtectedRoute path="/shipments/new" component={NewShipment} requiredPermission="shipments" />
      <ProtectedRoute path="/shipments/:id/edit" component={EditShipment} requiredPermission="shipments" />
      <ProtectedRoute path="/shipments/:id" component={ShipmentDetail} requiredPermission="shipments" />
      <ProtectedRoute path="/drivers" component={Drivers} requiredPermission="drivers" />
      <ProtectedRoute path="/clients" component={ClientsPage} requiredPermission="clients" />
      <ProtectedRoute path="/financial" component={Financial} requiredPermission="financial" />
      <ProtectedRoute path="/daily-close" component={DailyClosePage} requiredPermission="daily_close" />
      <ProtectedRoute path="/users" component={UsersPage} requiredPermission="users" />

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