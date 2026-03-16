// Mock hook to replace useGetDashboardStats
const useGetDashboardStats = (_options?: any) => ({
  data: {
    todayShipments: 120,
    todayRevenue: 2500000,
    todayProfit: 800000,
    activeDrivers: 15,
    statusBreakdown: [
      { status: 'in_transit', count: 45 },
      { status: 'delivered', count: 60 },
      { status: 'incident', count: 5 },
      { status: 'picked_up', count: 10 }
    ],
    totalActiveShipments: 55,
    deliveredToday: 60,
    incidentsToday: 5,
    recentShipments: [
      { id: 1, guideNumber: 'GUIA-1001', senderName: 'Empresa A', recipientCity: 'Bogota', status: 'in_transit', createdAt: new Date().toISOString() },
      { id: 2, guideNumber: 'GUIA-1002', senderName: 'Empresa B', recipientCity: 'Medellin', status: 'delivered', createdAt: new Date().toISOString() }
    ]
  },
  isLoading: false
})
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Package, TrendingUp, Users, DollarSign, AlertCircle, ArrowUpRight, CheckCircle2 } from "lucide-react"
import { cn, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Link } from "wouter"
import { Button } from "@/components/ui/button"

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats({
    query: {
      refetchInterval: 30000 // auto refresh every 30s
    }
  })

  if (isLoading || !stats) {
    return (
      <DashboardLayout>
        <div className="h-full w-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  // Map status breakdown for chart
  const chartData = stats.statusBreakdown.map(item => ({
    name: getStatusLabel(item.status || ''),
    value: item.count || 0,
    color: getStatusChartColor(item.status || '')
  }))

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Panel de Control</h1>
          <p className="text-muted-foreground mt-1">Resumen general de la operación del día.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Envíos Hoy" 
            value={stats.todayShipments.toString()} 
            icon={Package} 
            trend="+12%" 
            color="bg-blue-50 text-blue-600" 
          />
          <StatCard 
            title="Ingresos Hoy" 
            value={formatCurrency(stats.todayRevenue)} 
            icon={DollarSign} 
            trend="+5%" 
            color="bg-emerald-50 text-emerald-600" 
          />
          <StatCard 
            title="Utilidad Neta" 
            value={formatCurrency(stats.todayProfit)} 
            icon={TrendingUp} 
            color="bg-indigo-50 text-indigo-600" 
          />
          <StatCard 
            title="Conductores Activos" 
            value={stats.activeDrivers.toString()} 
            icon={Users} 
            color="bg-orange-50 text-orange-600" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart */}
          <Card className="lg:col-span-2 p-6 rounded-2xl shadow-sm border-border/50">
            <h3 className="text-lg font-bold text-foreground mb-6">Estado de Envíos Activos</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Quick Alerts */}
          <Card className="p-6 rounded-2xl shadow-sm border-border/50 flex flex-col">
            <h3 className="text-lg font-bold text-foreground mb-6">Métricas Críticas</h3>
            <div className="flex-1 space-y-4">
              <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 flex items-start gap-4">
                <div className="bg-white p-2 rounded-lg text-orange-500 shadow-sm mt-0.5">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-orange-900">En tránsito</p>
                  <p className="text-2xl font-bold text-orange-700">{stats.totalActiveShipments}</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-green-50 border border-green-100 flex items-start gap-4">
                <div className="bg-white p-2 rounded-lg text-green-500 shadow-sm mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-900">Entregados hoy</p>
                  <p className="text-2xl font-bold text-green-700">{stats.deliveredToday}</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-4">
                <div className="bg-white p-2 rounded-lg text-red-500 shadow-sm mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-900">Incidencias</p>
                  <p className="text-2xl font-bold text-red-700">{stats.incidentsToday}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Shipments Table */}
        <Card className="rounded-2xl shadow-sm border-border/50 overflow-hidden">
          <div className="p-6 border-b border-border/50 flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">Envíos Recientes</h3>
            <Link href="/shipments">
              <Button variant="outline" size="sm" className="rounded-lg text-sm font-semibold">
                Ver todos <ArrowUpRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Guía</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Destino</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentShipments.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-primary">
                      <Link href={`/shipments/${shipment.id}`}>{shipment.guideNumber}</Link>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{shipment.senderName}</td>
                    <td className="px-6 py-4 text-slate-600">{shipment.recipientCity}</td>
                    <td className="px-6 py-4">
                      <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", getStatusColor(shipment.status))}>
                        {getStatusLabel(shipment.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {format(new Date(shipment.createdAt), "dd MMM, HH:mm", { locale: es })}
                    </td>
                  </tr>
                ))}
                {stats.recentShipments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No hay envíos recientes</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}

function StatCard({ title, value, icon: Icon, trend, color }: any) {
  return (
    <Card className="p-6 rounded-2xl shadow-sm border-border/50 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-1">{title}</p>
          <h4 className="text-2xl font-bold text-foreground">{value}</h4>
          {trend && (
            <p className="text-sm font-medium text-emerald-600 mt-2 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" /> {trend}
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", color)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
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
