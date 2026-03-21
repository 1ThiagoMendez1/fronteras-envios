import { useState, useMemo } from "react"
// Mock hook to replace useGetDashboardStats
const useGetDashboardStats = (_options?: any) => ({
  data: {
    todayShipments: 120,
    todayRevenue: 2500000,
    todayProfit: 800000,
    activeDrivers: 15,
    deliveryRate: 85.7,
    avgDeliveryTime: 4.2,
    slaCompliance: 94.5,
    slaTrend: 1.2,
    pendingGuides: 12,
    pendingGuidesTrend: -3.5,
    statusBreakdown: [
      { status: 'created', count: 8 },
      { status: 'assigned', count: 12 },
      { status: 'picked_up', count: 10 },
      { status: 'in_transit', count: 45 },
      { status: 'out_for_delivery', count: 15 },
      { status: 'delivered', count: 60 },
      { status: 'incident', count: 5 }
    ],
    totalActiveShipments: 55,
    deliveredToday: 60,
    incidentsToday: 5,
    revenueSparkline: [1800000, 2100000, 1900000, 2400000, 2200000, 2600000, 2500000],
    shipmentsSparkline: [95, 110, 88, 115, 105, 125, 120],
    profitSparkline: [600000, 720000, 650000, 780000, 750000, 850000, 800000],
    driversSparkline: [12, 14, 13, 15, 14, 16, 15],
    revenueTrend: -3.8,
    shipmentsTrend: 12.5,
    profitTrend: 5.3,
    driversTrend: 0,
    // BI Data
    avgCostPerPackage: 28500,
    avgIncomePerPackage: 35000,
    topRoutes: [
      { route: 'Bogotá - Medellín', packages: 320, revenue: 5200000, trend: 12 },
      { route: 'Bogotá - Cali', packages: 280, revenue: 4500000, trend: 8 },
      { route: 'Medellín - Cartagena', packages: 150, revenue: 3100000, trend: -5 },
      { route: 'Cali - Bogotá', packages: 120, revenue: 2100000, trend: 15 },
    ],
    revenueComposition: [
      { name: 'Flete Base', value: 75, color: 'bg-blue-500' },
      { name: 'Seguros', value: 15, color: 'bg-emerald-500' },
      { name: 'Servicios Logísticos', value: 10, color: 'bg-indigo-500' },
    ],
    cityPerformance: [
      { city: 'Bogotá', shipments: 450, revenue: 8500000, margin: 32 },
      { city: 'Medellín', shipments: 320, revenue: 6200000, margin: 28 },
      { city: 'Cali', shipments: 280, revenue: 5100000, margin: 25 },
      { city: 'Barranquilla', shipments: 190, revenue: 3800000, margin: 22 },
      { city: 'Bucaramanga', shipments: 150, revenue: 2900000, margin: 30 },
    ],
    weeklyTrends: [
      { name: 'Lun', envios: 95, ingresos: 1800000 },
      { name: 'Mar', envios: 110, ingresos: 2100000 },
      { name: 'Mie', envios: 88, ingresos: 1900000 },
      { name: 'Jue', envios: 115, ingresos: 2400000 },
      { name: 'Vie', envios: 105, ingresos: 2200000 },
      { name: 'Sab', envios: 125, ingresos: 2600000 },
      { name: 'Dom', envios: 120, ingresos: 2500000 },
    ],
    lastCloseDate: new Date(Date.now() - 86400000).toISOString(),
    closedToday: false,
    recentShipments: [
      { id: 1, guideNumber: 'GUIA-1001', senderName: 'Empresa A', recipientName: 'Carlos M.', recipientCity: 'Bogotá', status: 'in_transit', createdAt: new Date().toISOString(), driverName: 'Pedro García', shippingCost: 45000 },
      { id: 2, guideNumber: 'GUIA-1002', senderName: 'Empresa B', recipientName: 'Ana P.', recipientCity: 'Medellín', status: 'delivered', createdAt: new Date().toISOString(), driverName: 'Miguel López', shippingCost: 62000 },
      { id: 3, guideNumber: 'GUIA-1003', senderName: 'Distribuidora XY', recipientName: 'Laura R.', recipientCity: 'Cali', status: 'picked_up', createdAt: new Date().toISOString(), driverName: 'José Martínez', shippingCost: 35000 },
      { id: 4, guideNumber: 'GUIA-1004', senderName: 'Tech Corp', recipientName: 'David S.', recipientCity: 'Barranquilla', status: 'incident', createdAt: new Date(Date.now() - 3600000).toISOString(), driverName: 'Carlos Ruiz', shippingCost: 28000 },
      { id: 5, guideNumber: 'GUIA-1005', senderName: 'Empresa A', recipientName: 'María G.', recipientCity: 'Bucaramanga', status: 'in_transit', createdAt: new Date(Date.now() - 7200000).toISOString(), driverName: 'Pedro García', shippingCost: 55000 },
      { id: 6, guideNumber: 'GUIA-1006', senderName: 'Logística Sur', recipientName: 'Andrea V.', recipientCity: 'Pereira', status: 'delivered', createdAt: new Date(Date.now() - 10800000).toISOString(), driverName: 'Miguel López', shippingCost: 48000 },
      { id: 7, guideNumber: 'GUIA-1007', senderName: 'Comercio NE', recipientName: 'Ricardo L.', recipientCity: 'Cartagena', status: 'in_transit', createdAt: new Date(Date.now() - 14400000).toISOString(), driverName: 'José Martínez', shippingCost: 72000 },
      { id: 8, guideNumber: 'GUIA-1008', senderName: 'Empresa B', recipientName: 'Sofía M.', recipientCity: 'Manizales', status: 'assigned', createdAt: new Date(Date.now() - 18000000).toISOString(), driverName: 'Carlos Ruiz', shippingCost: 38000 },
    ]
  },
  isLoading: false
})
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Package, TrendingUp, Users, DollarSign, ArrowUpRight, Timer, Target, Search, LayoutDashboard, Activity, BarChart3, Map as MapIcon, Info, CheckCircle2, AlertTriangle } from "lucide-react"
import { cn, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, Line } from "recharts"
import { format } from "date-fns"
import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatCardEnhanced } from "@/components/dashboard/stat-card-enhanced"
import { DayContextBar } from "@/components/dashboard/day-context-bar"
import { AlertPanel, generateOperationalAlerts } from "@/components/dashboard/alert-panel"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ColombiaMap } from "@/components/colombia-map"

type DashboardPeriod = "today" | "week" | "month"

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats({
    query: { refetchInterval: 30000 }
  })
  const [period, setPeriod] = useState<DashboardPeriod>("today")
  const [shipmentSearch, setShipmentSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5

  if (isLoading || !stats) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-16 bg-white rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="h-[400px] bg-white rounded-2xl animate-pulse" />
        </div>
      </DashboardLayout>
    )
  }

  // Pipeline chart data
  const pipelineOrder = ['created', 'assigned', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'incident']
  const chartData = pipelineOrder
    .map(status => {
      const found = stats.statusBreakdown.find((item: any) => item.status === status)
      return { name: getStatusLabel(status), value: found?.count || 0, color: getStatusChartColor(status) }
    })
    .filter(d => d.value > 0)

  // Alerts
  const alerts = generateOperationalAlerts(stats)

  // Filter & paginate shipments
  const filteredShipments = useMemo(() => {
    return stats.recentShipments.filter((s: any) => {
      const matchSearch = !shipmentSearch ||
        s.guideNumber.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
        s.senderName.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
        s.recipientName.toLowerCase().includes(shipmentSearch.toLowerCase())
      const matchStatus = s.status === "in_transit" || s.status === "delivered" || s.status === "incident" // Simplify for now
      return matchSearch && matchStatus
    })
  }, [stats.recentShipments, shipmentSearch])

  const paginatedShipments = filteredShipments.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Day Context Bar */}
        <DayContextBar closedToday={stats.closedToday} />

        {/* Header with period selector */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Panel de Control</h1>
            <p className="text-muted-foreground mt-1">Visión estratégica y operativa del negocio.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white rounded-xl border border-border/50 shadow-sm p-1 gap-0.5">
              {(["today", "week", "month"] as DashboardPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-4 py-2 text-sm font-semibold rounded-lg transition-all",
                    period === p
                      ? "bg-primary text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {p === "today" ? "Hoy" : p === "week" ? "Semana" : "Mes"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs for Sub-modules */}
        <Tabs defaultValue="resumen" className="w-full space-y-6">
          <TabsList className="bg-white/50 backdrop-blur-md border border-border/50 p-1 rounded-2xl h-auto flex flex-wrap gap-1 shadow-sm overflow-x-auto no-scrollbar">
            <TabsTrigger value="resumen" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all gap-2">
              <LayoutDashboard className="w-4 h-4" /> Resumen Ejecutivo
            </TabsTrigger>
            <TabsTrigger value="operacion" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all gap-2">
              <Activity className="w-4 h-4" /> Operación Tiempo Real
            </TabsTrigger>
            <TabsTrigger value="analitica" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all gap-2">
              <BarChart3 className="w-4 h-4" /> BI y Analítica
            </TabsTrigger>
            <TabsTrigger value="mapa" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all gap-2">
              <MapIcon className="w-4 h-4" /> Control Geográfico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="space-y-6 outline-none">
            {/* Stats Grid — 6 KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
              <StatCardEnhanced title="Envíos" value={stats.todayShipments.toString()} icon={Package} trend={stats.shipmentsTrend} trendLabel="vs. ant." sparklineData={stats.shipmentsSparkline} color="blue" delay={0} />
              <StatCardEnhanced title="Ingresos" value={formatCurrency(stats.todayRevenue)} icon={DollarSign} trend={stats.revenueTrend} trendLabel="vs. ant." sparklineData={stats.revenueSparkline} color="emerald" delay={0.05} />
              <StatCardEnhanced title="Utilidad" value={formatCurrency(stats.todayProfit)} icon={TrendingUp} trend={stats.profitTrend} trendLabel="vs. ant." sparklineData={stats.profitSparkline} color="indigo" delay={0.1} />
              <StatCardEnhanced title="Cumplimiento SLA" value={`${stats.slaCompliance}%`} icon={CheckCircle2} trend={stats.slaTrend} trendLabel="vs. obj." color="emerald" delay={0.15} />
              <StatCardEnhanced title="Conductores" value={stats.activeDrivers.toString()} icon={Users} trend={stats.driversTrend} trendLabel="vs. ant." sparklineData={stats.driversSparkline} color="orange" delay={0.2} />
              <StatCardEnhanced title="Efectividad" value={`${stats.deliveryRate}%`} icon={Target} color="violet" delay={0.25} />
              <StatCardEnhanced title="Tiempo Prom." value={`${stats.avgDeliveryTime}h`} icon={Timer} color="rose" delay={0.3} />
              <StatCardEnhanced title="Guías Pendientes" value={stats.pendingGuides.toString()} icon={AlertTriangle} trend={stats.pendingGuidesTrend} trendLabel="vs. ant." color="amber" delay={0.35} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-6 rounded-3xl shadow-sm border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Tendencia Semanal</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Volumen vs Ingresos</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Envíos</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Ingresos</span>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.weeklyTrends}>
                      <defs>
                        <linearGradient id="colorEnvios" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} hide />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                      <Area type="monotone" dataKey="envios" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorEnvios)" />
                      <Line type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <AlertPanel alerts={alerts} />
            </div>
          </TabsContent>

          <TabsContent value="operacion" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 rounded-2xl shadow-sm border-border/50 overflow-hidden bg-white">
                <div className="p-5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Envíos Recientes</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Control de flujo operacional</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Buscar guía..."
                        value={shipmentSearch}
                        onChange={(e) => { setShipmentSearch(e.target.value); setCurrentPage(1) }}
                        className="pl-8 h-9 text-sm rounded-lg w-40 bg-slate-50 border-slate-200"
                      />
                    </div>
                    <Link href="/shipments">
                      <Button variant="outline" size="sm" className="rounded-lg text-xs font-semibold h-9">
                        Ver todos
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3">Guía</th>
                        <th className="px-5 py-3">Remitente</th>
                        <th className="px-5 py-3">Ciudad Destino</th>
                        <th className="px-5 py-3">Estado</th>
                        <th className="px-5 py-3">Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedShipments.map((shipment: any) => (
                        <tr key={shipment.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3 font-bold text-primary text-xs">{shipment.guideNumber}</td>
                          <td className="px-5 py-3 font-medium text-slate-700 text-xs">{shipment.senderName}</td>
                          <td className="px-5 py-3 text-slate-600 text-xs">{shipment.recipientCity}</td>
                          <td className="px-5 py-3">
                            <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border", getStatusColor(shipment.status))}>{getStatusLabel(shipment.status)}</span>
                          </td>
                          <td className="px-5 py-3 text-slate-500 text-[11px]">{format(new Date(shipment.createdAt), "HH:mm")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="p-6 rounded-2xl shadow-sm border-border/50 bg-white h-full">
                <h3 className="text-base font-bold text-foreground mb-6">Pipeline Operativo</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: -20, right: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={100} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                    <span className="font-semibold">En Tránsito</span>
                    <span className="font-bold">{stats.statusBreakdown.find((s:any)=>s.status==='in_transit')?.count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                    <span className="font-semibold">Entregados Hoy</span>
                    <span className="font-bold">{stats.deliveredToday}</span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analitica" className="space-y-6 outline-none">
            {/* Top KPIs for BI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5 rounded-2xl shadow-sm border-border/50 bg-white">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Ingreso Prom. por Envío</span>
                </div>
                <h4 className="text-3xl font-bold text-slate-800">{formatCurrency(stats.avgIncomePerPackage)}</h4>
                <p className="text-emerald-600 text-sm mt-1 font-semibold flex items-center gap-1"><ArrowUpRight className="w-4 h-4"/> +4.5% vs mes ant.</p>
              </Card>
              <Card className="p-5 rounded-2xl shadow-sm border-border/50 bg-white">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Costo Prom. Operativo</span>
                </div>
                <h4 className="text-3xl font-bold text-slate-800">{formatCurrency(stats.avgCostPerPackage)}</h4>
                <p className="text-red-500 text-sm mt-1 font-semibold flex items-center gap-1"><TrendingUp className="w-4 h-4 rotate-180"/> +1.2% vs mes ant.</p>
              </Card>
              <Card className="p-5 rounded-2xl shadow-sm border-border/50 bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
                <div className="flex items-center gap-2 mb-2 text-indigo-100">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Margen Promedio</span>
                </div>
                <h4 className="text-3xl font-bold text-white">
                  {((stats.avgIncomePerPackage - stats.avgCostPerPackage) / stats.avgIncomePerPackage * 100).toFixed(1)}%
                </h4>
                <p className="text-indigo-200 text-sm mt-1 font-semibold">Saludable</p>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-6 rounded-3xl shadow-sm border-border/50">
                <h3 className="text-lg font-bold text-foreground mb-6">Top Rutas / Corredores Más Frecuentes</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="pb-3 text-xs uppercase tracking-wider">Ruta</th>
                        <th className="pb-3 text-xs uppercase tracking-wider">Paquetes</th>
                        <th className="pb-3 text-xs uppercase tracking-wider">Ingresos</th>
                        <th className="pb-3 text-xs uppercase tracking-wider">Tendencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.topRoutes.map((route: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">{i+1}</span>
                            {route.route}
                          </td>
                          <td className="py-4 font-semibold text-primary">{route.packages}</td>
                          <td className="py-4 font-medium text-slate-600">{formatCurrency(route.revenue)}</td>
                          <td className="py-4">
                            <span className={cn("inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-bold", route.trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                              {route.trend > 0 ? "+" : ""}{route.trend}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="p-6 rounded-3xl shadow-sm border-border/50 bg-white">
                <h3 className="text-lg font-bold text-foreground mb-6">Composición del Ingreso</h3>
                <div className="space-y-6">
                  {/* Simplified bar chart representation */}
                  <div className="flex h-6 rounded-full overflow-hidden shadow-inner">
                    {stats.revenueComposition.map((item: any, i: number) => (
                      <div key={i} className={item.color} style={{ width: `${item.value}%` }} title={item.name} />
                    ))}
                  </div>
                  <div className="space-y-3">
                    {stats.revenueComposition.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={cn("w-3 h-3 rounded-full", item.color)}></span>
                          <span className="font-semibold text-slate-700">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-900">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                      La diversificación de servicios (seguros y logísticos) abarca un <span className="font-bold text-indigo-600">25%</span> de los ingresos totales, mejorando los márgenes operativos frente al flete base puro.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="mapa" className="space-y-6 outline-none">
            <Card className="p-0 rounded-3xl shadow-lg border-border/50 overflow-hidden relative group">
              <div className="absolute top-6 left-6 z-10 space-y-2 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900">Cobertura Nacional</h3>
                  <p className="text-[10px] text-slate-500 font-medium">41 Sedes y Puntos de Atención</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-500/90 text-white px-2.5 py-1 rounded-xl shadow-lg text-[10px] font-bold border border-white/20">Operación Normal</div>
                </div>
              </div>
              <div className="h-[650px] w-full">
                <ColombiaMap />
              </div>
              <div className="absolute bottom-6 right-6 z-10 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200 max-w-xs">
                <h4 className="text-xs font-bold text-slate-900 mb-2">Resumen por Zona</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-600 font-medium">Andina</span>
                    <span className="font-bold text-blue-600">22 sedes</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-600 font-medium">Caribe</span>
                    <span className="font-bold text-blue-600">12 sedes</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-600 font-medium">Pacífico</span>
                    <span className="font-bold text-blue-600">7 sedes</span>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

function getStatusChartColor(status: string) {
  switch (status) {
    case 'created': return '#94a3b8'
    case 'assigned': return '#3b82f6'
    case 'picked_up': return '#f59e0b'
    case 'in_transit': return '#6366f1'
    case 'out_for_delivery': return '#f97316'
    case 'delivered': return '#22c55e'
    case 'incident': return '#ef4444'
    default: return '#cbd5e1'
  }
}
