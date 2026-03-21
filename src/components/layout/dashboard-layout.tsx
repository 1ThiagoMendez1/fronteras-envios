import { useState } from "react"
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
  Truck,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  UploadCloud
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation()
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "operator"] },
    { href: "/clients", label: "Clientes", icon: UserCircle, roles: ["admin", "operator"] },
    { href: "/shipments", label: "Envíos", icon: Package, roles: ["admin", "operator", "client", "driver"] },
    { href: "/drivers", label: "Conductores", icon: Users, roles: ["admin", "operator"] },
    { href: "/data-upload", label: "Archivos", icon: UploadCloud, roles: ["admin", "operator"] },
    { href: "/financial", label: "Financiero", icon: Wallet, roles: ["admin"] },
    { href: "/daily-close", label: "Cierre", icon: CalendarCheck, roles: ["admin", "operator"] },
  ]

  const filteredNavItems = navItems.filter(item => !user || (user?.role && item.roles.includes(user.role)))

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-slate-950">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out lg:static",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        isCollapsed ? "w-20" : "w-72"
      )}>
        <div className={cn(
          "flex h-16 shrink-0 items-center px-6 bg-sidebar-primary text-sidebar-primary-foreground border-b border-sidebar-border/20",
          isCollapsed ? "justify-center px-0" : "justify-between"
        )}>
          {!isCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-3 font-display text-xl font-bold tracking-tight overflow-hidden">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm shrink-0">
                <Truck className="h-5 w-5" />
              </div>
              <span className="truncate">FRONTERAS</span>
            </Link>
          )}
          {isCollapsed && (
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm shrink-0 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
              <Truck className="h-5 w-5" />
            </div>
          )}
          <div className="flex gap-2 shrink-0">
            <Button variant="ghost" size="icon" className="hidden lg:flex text-white hover:bg-white/20 shrink-0" onClick={() => setIsCollapsed(!isCollapsed)}>
              {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="lg:hidden text-white hover:bg-white/20 shrink-0" onClick={() => setIsMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className={cn("flex flex-1 flex-col overflow-y-auto py-6", isCollapsed ? "px-2" : "px-4")}>
          <nav className="flex-1 space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href))
              return (
                <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                  <div className={cn(
                    "flex items-center rounded-xl py-3.5 text-sm font-medium transition-all duration-200",
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/20 text-sidebar-primary font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-sm font-semibold">{user?.name || "Administrador"}</span>
                <span className="truncate text-xs text-sidebar-foreground/50 capitalize">{user?.role || "admin"}</span>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/20 text-sidebar-primary font-bold mb-4" title={user?.name || "Administrador"}>
              {user?.name?.charAt(0).toUpperCase() || 'A'}
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

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white/50 backdrop-blur-md px-6 shadow-sm z-30 lg:hidden">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-display font-bold text-lg text-primary">FRONTERAS</span>
          </div>
        </header>

        {/* Main Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
