import { Switch, Route, Router as WouterRouter } from "wouter"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider, useAuth } from "@/hooks/use-auth"

import { Suspense, type ComponentType } from "react"
import { Redirect, useLocation } from "wouter"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { pages, isPrivatePath } from "@/lib/routes"
import { RouteErrorBoundary } from "@/components/route-error-boundary"

const queryClient = new QueryClient()

// Protected Route Wrapper — NO "Verificando sesión" text, ever
function ProtectedRoute({ component: Component, requiredPermission, ...rest }: { component: ComponentType; path: string; requiredPermission?: string }) {
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

function RouteLoading() {
  return <div role="status" className="flex min-h-48 items-center justify-center text-muted-foreground">Cargando página…</div>
}

function Router() {
  const [location] = useLocation()
  if (isPrivatePath(location)) return (
    <DashboardLayout>
      <RouteErrorBoundary>
        <Suspense fallback={<RouteLoading />}>
          <Switch>
            <ProtectedRoute path="/dashboard" component={pages.dashboard} requiredPermission="dashboard" />
            <ProtectedRoute path="/shipments" component={pages.shipments} requiredPermission="shipments" />
            <ProtectedRoute path="/shipments/new" component={pages.newShipment} requiredPermission="shipments" />
            <ProtectedRoute path="/shipments/:id/edit" component={pages.editShipment} requiredPermission="shipments" />
            <ProtectedRoute path="/shipments/:id" component={pages.shipmentDetail} requiredPermission="shipments" />
            <ProtectedRoute path="/drivers" component={pages.drivers} requiredPermission="drivers" />
            <ProtectedRoute path="/clients" component={pages.clients} requiredPermission="clients" />
            <ProtectedRoute path="/financial" component={pages.financial} requiredPermission="financial" />
            <ProtectedRoute path="/daily-close" component={pages.dailyClose} requiredPermission="daily_close" />
            <ProtectedRoute path="/users" component={pages.users} requiredPermission="users" />
          </Switch>
        </Suspense>
      </RouteErrorBoundary>
    </DashboardLayout>
  )
  return (
    <Suspense fallback={<RouteLoading />}>
      <Switch>
        <Route path="/login" component={pages.login} />
        <Route path="/register" component={pages.register} />
        <Route path="/" component={pages.tracking} />
        <Route component={pages.notFound} />
      </Switch>
    </Suspense>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter>
            <RouteErrorBoundary resetOnNavigation={false}>
              <Router />
            </RouteErrorBoundary>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}