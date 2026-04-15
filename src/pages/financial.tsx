import { useFinancialSummary, useFinancialMovements } from "@/hooks/use-financial"
import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { formatCurrency, cn } from "@/lib/utils"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, DollarSign, CreditCard, Wallet, AlertCircle, Search, Download, LayoutDashboard, PieChart as PieChartIcon, History, ChevronLeft, ChevronRight, Briefcase } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { motion } from "framer-motion"

export default function Financial() {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("month")
  const [branch, setBranch] = useState("Todas las Sedes")

  // Function to calculate dates based on string period
  const getPeriodDates = () => {
    if (period === "all") return {}
    const now = new Date()
    let startDate
    if (period === "today") {
      now.setHours(0,0,0,0)
      startDate = now.toISOString()
    } else if (period === "week") {
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)))
      startOfWeek.setHours(0,0,0,0)
      startDate = startOfWeek.toISOString()
    } else {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      startDate = startOfMonth.toISOString()
    }
    return { startDate }
  }

  const { data: summary, isLoading: loadingSummary } = useFinancialSummary(getPeriodDates(), branch)
  const { data: transactions, isLoading: loadingTransactions } = useFinancialMovements(getPeriodDates(), branch)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 8

  if (loadingSummary || loadingTransactions || !summary) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-20 bg-white rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-white rounded-2xl" />)}
          </div>
          <div className="h-96 bg-white rounded-2xl" />
        </div>
      </DashboardLayout>
    )
  }

  const filteredTransactions = (transactions ?? []).filter(t =>
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.guideNumber && t.guideNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const totalPages = Math.ceil(filteredTransactions.length / pageSize)
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Gestión Financiera</h1>
            <p className="text-slate-500 mt-1">Control integral de ingresos, egresos y rentabilidad logística.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center bg-white rounded-xl border border-border/50 shadow-sm p-1 gap-0.5">
              <select value={branch} onChange={(e) => setBranch(e.target.value)} className="px-3 py-1.5 text-sm font-semibold text-slate-700 rounded-lg bg-transparent border-none outline-none cursor-pointer focus:ring-0">
                <option value="Todas las Sedes">Todas las Sedes</option>
                <option value="Bogotá">Sede Bogotá</option>
                <option value="Medellín">Sede Medellín</option>
              </select>
            </div>
            <div className="flex items-center bg-white rounded-xl border border-slate-200 shadow-sm p-1 gap-0.5">
              {(["today", "week", "month", "all"] as const).map((p) => (
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
                  {p === "today" ? "Hoy" : p === "week" ? "Semana" : p === "month" ? "Mes" : "Todo"}
                </button>
              ))}
            </div>
            <Button variant="outline" className="rounded-xl border-slate-200 bg-white shadow-sm text-xs font-bold gap-2">
              <Download className="w-4 h-4" /> Exportar Reporte
            </Button>
          </div>
        </div>

        <Tabs defaultValue="resumen" className="w-full space-y-6">
          <TabsList className="bg-white/50 backdrop-blur-md border border-slate-200 p-1 rounded-2xl h-auto flex flex-wrap gap-1 shadow-sm overflow-x-auto no-scrollbar">
            <TabsTrigger value="resumen" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all gap-2">
              <LayoutDashboard className="w-4 h-4" /> Resumen General
            </TabsTrigger>
            <TabsTrigger value="rentabilidad" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all gap-2">
              <PieChartIcon className="w-4 h-4" /> Rentabilidad Detallada
            </TabsTrigger>
            <TabsTrigger value="transacciones" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all gap-2">
              <History className="w-4 h-4" /> Transacciones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="space-y-6 outline-none">
            {/* Financial KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Ingresos Totales" value={formatCurrency(summary.totalRevenue)} icon={DollarSign} color="blue" trend="+12.5%" />
              <StatCard title="Pagos Conductores" value={formatCurrency(summary.totalDriverPayments)} icon={CreditCard} color="indigo" trend="+5.2%" />
              <StatCard title="Utilidad Neta" value={formatCurrency(summary.finalProfit)} icon={TrendingUp} color="emerald" trend="+18.3%" />
              <StatCard title="Gastos Extras" value={formatCurrency(summary.totalExpenses)} icon={Wallet} color="orange" trend="Alerta" isAlert />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-6 rounded-3xl shadow-sm border-slate-200 bg-white">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-slate-900">Balance de Operación</h3>
                    <p className="text-xs text-slate-500">Ingresos vs Utilidad (Últimos 7 días)</p>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summary.dailyData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tickFormatter={(str) => format(new Date(str), "dd MMM", { locale: es })} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `$${val/1000}k`} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} name="Ingresos" />
                      <Area type="monotone" dataKey="netProfit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} name="Utilidad" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <div className="flex flex-col gap-6">
                 <Card className="p-6 rounded-3xl shadow-sm border-slate-200 bg-white flex-1">
                   <h3 className="font-bold text-slate-900 mb-6 font-display">Desglose Operativo</h3>
                   <div className="space-y-5">
                     <div>
                       <div className="flex justify-between text-xs mb-1.5"><span className="text-slate-500 font-semibold">Pagos a Conductores</span> <span className="font-bold text-slate-800">{formatCurrency(summary.totalDriverPayments)}</span></div>
                       <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{width: `${summary.totalRevenue > 0 ? (summary.totalDriverPayments/summary.totalRevenue)*100 : 0}%`}}></div></div>
                     </div>
                     <div>
                       <div className="flex justify-between text-xs mb-1.5"><span className="text-slate-500 font-semibold">Costos Operativos/ Otros</span> <span className="font-bold text-slate-800">{formatCurrency(summary.totalExpenses)}</span></div>
                       <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-orange-500 rounded-full" style={{width: `${summary.totalRevenue > 0 ? (summary.totalExpenses/summary.totalRevenue)*100 : 0}%`}}></div></div>
                     </div>
                     <div className="pt-5 mt-3 border-t border-slate-100">
                       <div className="flex justify-between text-sm"><span className="text-slate-700 font-bold">Utilidad Final</span> <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{formatCurrency(summary.finalProfit)}</span></div>
                       <div className="h-3 w-full bg-emerald-50 rounded-full mt-3 overflow-hidden border border-emerald-100"><div className="h-full bg-emerald-500 rounded-full" style={{width: `${summary.totalRevenue > 0 ? (summary.finalProfit/summary.totalRevenue)*100 : 0}%`}}></div></div>
                     </div>
                   </div>
                 </Card>
              </div>
            </div>

            <Card className="p-6 rounded-3xl shadow-sm border-slate-200 bg-white">
               <h3 className="font-bold text-slate-900 mb-6 font-display">Rentabilidad por Sede (Origen)</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                 {summary.segmentAnalysis.map((seg: any) => (
                   <div key={seg.segment} className="p-5 border border-slate-100 rounded-2xl bg-gradient-to-br from-slate-50 to-white shadow-sm flex flex-col gap-2 relative overflow-hidden group hover:border-indigo-200 hover:shadow-md transition-all">
                      <div className="absolute top-0 right-0 p-3 opacity-[0.03] scale-150 group-hover:scale-125 group-hover:opacity-[0.05] transition-all duration-500"><Briefcase className="w-20 h-20 text-indigo-900"/></div>
                      <h4 className="font-bold text-slate-800 relative z-10 text-sm">{seg.segment}</h4>
                      <div className="flex items-center justify-between text-xs mt-3 relative z-10">
                        <span className="text-slate-500 font-medium">Ingresos Brutos</span>
                        <span className="font-bold text-slate-700">{formatCurrency(seg.revenue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs relative z-10">
                        <span className="text-slate-500 font-medium">Costos Totales</span>
                        <span className="font-bold text-rose-600">{formatCurrency(seg.costs)}</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between relative z-10">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Margen</span>
                        <span className={cn("px-2.5 py-1 rounded-md text-[11px] font-black", seg.margin >= 35 ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700")}>{seg.margin}%</span>
                      </div>
                   </div>
                 ))}
               </div>
            </Card>
          </TabsContent>

          <TabsContent value="rentabilidad" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 rounded-3xl shadow-sm border-slate-200 bg-white">
                <h3 className="font-bold text-slate-900 mb-6 font-display uppercase tracking-wider text-sm flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-primary" /> Margen por Ciudad Destino
                </h3>
                <div className="space-y-6">
                  {summary.profitabilityByCity.map((city: any) => (
                    <div key={city.city} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="font-bold text-slate-700">{city.city}</span>
                        <span className="text-xs font-semibold text-primary">{city.margin}% Margen</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${city.margin}%` }} 
                          className={cn("h-full bg-primary", city.margin > 30 ? "bg-emerald-500" : city.margin > 20 ? "bg-blue-500" : "bg-orange-500")}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>Ingresos: {formatCurrency(city.revenue)}</span>
                        <span>Costos: {formatCurrency(city.costs)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 rounded-3xl shadow-sm border-slate-200 bg-white">
                <h3 className="font-bold text-slate-900 mb-6 font-display uppercase tracking-wider text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" /> Dinero Neto por Método de Pago
                </h3>
                <div className="space-y-6">
                  {summary.revenueByPaymentMethod?.map((pm: any) => (
                    <div key={pm.method} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="font-bold text-slate-700">{pm.method}</span>
                        <span className="text-xs font-semibold text-slate-500">{pm.percentage.toFixed(1)}% del total</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${pm.percentage}%` }} 
                          className="h-full bg-indigo-500"
                        />
                      </div>
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-emerald-600">{formatCurrency(pm.amount)} {pm.method === "Nequi" ? "brutos (total flete)" : "netos (tras caja conductor)"}</span>
                      </div>
                    </div>
                  ))}
                  {(!summary.revenueByPaymentMethod || summary.revenueByPaymentMethod.length === 0) && (
                    <div className="text-center py-10 text-slate-400 italic">No hay ingresos registrados en este periodo.</div>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transacciones" className="space-y-6 outline-none">
            <Card className="rounded-3xl shadow-sm border-slate-200 bg-white overflow-hidden">
               <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input 
                      placeholder="Buscar por guía o descripción..." 
                      className="pl-9 bg-slate-50 border-slate-200 rounded-xl"
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="rounded-lg text-xs gap-2">
                      <Download className="w-3.5 h-3.5" /> CSV
                    </Button>
                  </div>
               </div>
               <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4">Guía</th>
                      <th className="px-6 py-4">Descripción</th>
                      <th className="px-6 py-4 text-right">Monto</th>
                      <th className="px-6 py-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginatedTransactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-slate-500 text-xs">{format(new Date(tx.movementDate || tx.createdAt || new Date()), "dd/MM HH:mm")}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            tx.type === 'income' ? "bg-emerald-50 text-emerald-600" : 
                            tx.type === 'expense' ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-600"
                          )}>
                            {tx.type === 'income' ? 'Ingreso' : tx.type === 'expense' ? 'Egreso' : 'Otro'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-primary text-xs">{tx.guideNumber || '—'}</td>
                        <td className="px-6 py-4 text-slate-600 text-xs">{tx.description}</td>
                        <td className={cn("px-6 py-4 text-right font-bold", tx.type === 'income' ? "text-emerald-600" : "text-slate-900")}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "w-2 h-2 rounded-full inline-block mr-2",
                            "bg-emerald-500"
                          )} />
                          <span className="text-xs text-slate-500 capitalize">Confirmado</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
               </div>
               {/* Pagination */}
               <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Mostrando {(currentPage-1)*pageSize + 1} a {Math.min(currentPage*pageSize, filteredTransactions.length)} de {filteredTransactions.length}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p -1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
               </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

function StatCard({ title, value, icon: Icon, color, trend, isAlert }: any) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
  }

  const colorClass = colors[color] || colors.blue

  return (
    <Card className="p-5 rounded-2xl shadow-sm border-slate-200 bg-white">
      <div className="flex items-start justify-between">
        <div className={cn("p-2 rounded-xl border", colorClass)}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1", isAlert ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500 uppercase")}>
          {isAlert && <AlertCircle className="w-3 h-3" />} {trend}
        </span>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs font-medium text-slate-500 mt-1">{title}</p>
      </div>
    </Card>
  )
}

