import { useState, useEffect } from "react"
import type { ReactNode } from "react"
import { Link, useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Wallet, 
  CalendarCheck,
  LogOut,
  Menu,
  X,
  UserCircle,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CashOnDeliveryAlert } from "@/components/cash-on-delivery-alert"

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location, setLocation] = useLocation()
  const { profile, logout, hasPermission, isAuthenticated, isLoading } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)

  useEffect(() => {
    // Redirección forzada si no hay sesión JWT activa
    if (!isLoading && !isAuthenticated) {
      setLocation("/login")
    }
  }, [isAuthenticated, isLoading, setLocation])

  // Mostrar un loader de alta fidelidad mientras se verifica la sesión
  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <img src="/logo-mark.png" alt="Loading" className="h-8 w-8 object-contain opacity-50" />
          </div>
        </div>
        <p className="text-sm text-slate-500 font-medium animate-pulse">Protegiendo su sesión...</p>
      </div>
    )
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, visible: hasPermission('dashboard') },
    { href: "/clients", label: "Clientes", icon: UserCircle, visible: hasPermission('clients') },
    { href: "/shipments", label: "Envíos", icon: Package, visible: hasPermission('shipments') },
    { href: "/drivers", label: "Conductores", icon: Users, visible: hasPermission('drivers') },
    { href: "/financial", label: "Financiero", icon: Wallet, visible: hasPermission('financial') },
    { href: "/daily-close", label: "Cierre", icon: CalendarCheck, visible: hasPermission('daily_close') },
    { href: "/users", label: "Usuarios", icon: Users, visible: hasPermission('users') },
  ]

  const filteredNavItems = navItems.filter(item => item.visible)
  

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-slate-950">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar — always fixed, never pushes content */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        isCollapsed ? "w-[72px]" : "w-[260px]"
      )}>
        {/* Toggle Button placed outside the sidebar */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "absolute -right-3.5 top-6 z-[60] hidden lg:flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white shadow-md border-2 border-slate-50 hover:bg-primary/90 transition-transform",
            !isCollapsed && "rotate-180"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className={cn(
          "flex h-16 shrink-0 items-center px-5 bg-sidebar-primary text-sidebar-primary-foreground border-b border-sidebar-border/20",
          isCollapsed ? "justify-center px-0" : "justify-between"
        )}>
          {!isCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-3 font-display overflow-hidden">
              <img src="/logo-mark.png" alt="Fronteras" className="h-9 w-auto object-contain drop-shadow-sm" />
              <span className="text-xl font-bold tracking-tight text-white translate-y-1.5">FRONTERAS</span>
            </Link>
          )}
          {isCollapsed && (
            <div className="bg-white/10 p-1.5 rounded-lg shrink-0 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
              <img src="/logo-mark.png" alt="Icon" className="h-7 w-7 object-contain drop-shadow-sm" />
            </div>
          )}
          <div className="flex gap-2 shrink-0">
            <Button variant="ghost" size="icon" className="lg:hidden text-white hover:bg-white/20 shrink-0" onClick={() => setIsMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className={cn("flex flex-1 flex-col overflow-y-auto py-5", isCollapsed ? "px-2" : "px-3")}>
          <nav className="flex-1 space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href))
              return (
                <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                  <div className={cn(
                    "flex items-center rounded-xl py-3 text-sm font-medium transition-all duration-200",
                    isCollapsed ? "justify-center px-0" : "gap-3 px-4",
                    isActive 
                      ? "bg-sidebar-primary/10 text-sidebar-primary font-semibold shadow-sm" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                  title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon className={cn(
                      "shrink-0",
                      isCollapsed ? "h-6 w-6" : "h-5 w-5", 
                      isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50"
                    )} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className={cn("p-4 mt-auto border-t border-sidebar-border", isCollapsed && "p-2 flex flex-col items-center")}>
          {!isCollapsed && (
            <div className="flex items-center gap-3 px-2 py-3 rounded-xl bg-sidebar-accent/50 mb-4 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/20 text-sidebar-primary font-bold text-sm">
                {profile?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-sm font-semibold">{profile?.name || "Administrador"}</span>
                <span className="truncate text-xs text-sidebar-foreground/50 capitalize">{profile?.role || "admin"}</span>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/20 text-sidebar-primary font-bold text-sm mb-4" title={profile?.name || "Administrador"}>
              {profile?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
          )}
          <Button 
            variant="ghost" 
            className={cn(
              "text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10",
              isCollapsed ? "w-10 h-10 p-0 justify-center" : "w-full justify-start"
            )}
            onClick={logout}
            title={isCollapsed ? "Cerrar Sesión" : undefined}
          >
            <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
            {!isCollapsed && "Cerrar Sesión"}
          </Button>
        </div>
      </aside>

      {/* Main Content — offset by sidebar width so sidebar doesn't overlap */}
      <div className={cn(
        "flex flex-1 flex-col min-h-screen transition-all duration-300",
        isCollapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"
      )}>
        {/* Mobile top header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white/50 backdrop-blur-md px-6 shadow-sm z-30 lg:hidden">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <img src="/logo-mark.png" alt="Fronteras" className="h-8 w-auto object-contain drop-shadow-sm" />
              <span className="font-display font-bold text-lg text-primary translate-y-1">FRONTERAS</span>
            </div>
          </div>
        </header>

        {/* Main scrollable area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full mb-6 lg:mb-8 gap-4">
            <div className="lg:hidden w-full"></div> {/* Spacer for mobile */}
            <div className="ml-auto">
              <ColombiaClock />
            </div>
          </div>
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>

      <CashOnDeliveryAlert />
    </div>
  )
}

function ColombiaClock() {
  const [date, setDate] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formattedDate = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)

  const formattedTime = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(date)

  return (
    <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-slate-500 bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-sm border border-slate-200">
      <CalendarCheck className="w-4 h-4 text-primary shrink-0" />
      <span className="capitalize hidden sm:inline">{formattedDate}</span>
      <span className="capitalize sm:hidden">{formattedDate.split(',')[0]}</span>
      <span className="w-1 h-1 rounded-full bg-slate-300 mx-1 shrink-0"></span>
      <span className="font-semibold text-slate-800 tabular-nums shrink-0">{formattedTime}</span>
    </div>
  )
}
