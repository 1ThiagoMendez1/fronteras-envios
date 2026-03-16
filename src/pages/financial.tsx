// Mock hooks to replace useGetFinancialSummary and useListTransactions
const useGetFinancialSummary = () => ({
  data: {
    totalRevenue: 5000000,
    totalDriverPayments: 3000000,
    totalNetProfit: 2000000,
    dailyData: [
      { date: new Date(Date.now() - 86400000 * 2).toISOString(), revenue: 1500000, netProfit: 600000 },
      { date: new Date(Date.now() - 86400000).toISOString(), revenue: 2000000, netProfit: 800000 },
      { date: new Date().toISOString(), revenue: 1500000, netProfit: 600000 }
    ]
  },
  isLoading: false
})
const useListTransactions = () => ({
  data: [
    { id: 1, createdAt: new Date().toISOString(), type: 'revenue', guideNumber: 'GUIA-1001', description: 'Pago de flete', amount: 15000 },
    { id: 2, createdAt: new Date().toISOString(), type: 'driver_payment', guideNumber: 'GUIA-1001', description: 'Pago conductor', amount: 10000 }
  ],
  isLoading: false
})
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, DollarSign, CreditCard, ArrowDownRight, ArrowUpRight } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function Financial() {
  const { data: summary, isLoading: sumLoading } = useGetFinancialSummary()
  const { data: transactions, isLoading: txLoading } = useListTransactions()

  if (sumLoading || !summary) {
    return (
      <DashboardLayout>
        <div className="h-full w-full flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  const pieData = [
    { name: 'Pago Conductores', value: summary.totalDriverPayments, color: '#f59e0b' },
    { name: 'Utilidad Empresa', value: summary.totalNetProfit, color: '#22c55e' },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Panel Financiero</h1>
          <p className="text-muted-foreground mt-1">Control de ingresos, pagos y rentabilidad operativa.</p>
        </div>

        {/* Top summary metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 rounded-2xl shadow-sm border-border/50 bg-gradient-to-br from-white to-slate-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <DollarSign className="w-32 h-32" />
            </div>
            <p className="text-sm font-semibold text-slate-500 mb-1">Ingresos Brutos (Fletes)</p>
            <h4 className="text-4xl font-bold text-slate-900">{formatCurrency(summary.totalRevenue)}</h4>
            <div className="mt-4 flex items-center text-sm font-medium text-emerald-600">
              <TrendingUp className="w-4 h-4 mr-1" /> Saludable
            </div>
          </Card>
          
          <Card className="p-6 rounded-2xl shadow-sm border-border/50 bg-gradient-to-br from-white to-orange-50/30 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 text-orange-500">
              <CreditCard className="w-32 h-32" />
            </div>
            <p className="text-sm font-semibold text-slate-500 mb-1">Costo Operativo (Conductores)</p>
            <h4 className="text-4xl font-bold text-orange-600">{formatCurrency(summary.totalDriverPayments)}</h4>
            <div className="mt-4 flex items-center text-sm font-medium text-orange-600">
              {((summary.totalDriverPayments / summary.totalRevenue) * 100).toFixed(1)}% de los ingresos
            </div>
          </Card>

          <Card className="p-6 rounded-2xl shadow-sm border-border/50 bg-primary text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            <p className="text-sm font-semibold text-primary-foreground/80 mb-1">Utilidad Neta Total</p>
            <h4 className="text-4xl font-bold text-white">{formatCurrency(summary.totalNetProfit)}</h4>
            <div className="mt-4 flex items-center text-sm font-medium text-primary-foreground/90">
               Margen: {((summary.totalNetProfit / summary.totalRevenue) * 100).toFixed(1)}%
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Area Chart */}
          <Card className="col-span-1 lg:col-span-2 p-6 rounded-2xl shadow-sm border-border/50">
            <h3 className="text-lg font-bold text-foreground mb-6">Evolución de Ingresos y Utilidad</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.dailyData || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#065bb5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#065bb5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} 
                    tickFormatter={(val) => format(new Date(val), 'dd MMM')} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `$${val/1000}k`} />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(value)}
                    labelFormatter={(label) => format(new Date(label), "d 'de' MMMM", {locale: es})}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="revenue" name="Ingresos" stroke="#065bb5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="netProfit" name="Utilidad" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Breakdown Pie */}
          <Card className="col-span-1 p-6 rounded-2xl shadow-sm border-border/50">
            <h3 className="text-lg font-bold text-foreground mb-2">Distribución de Ingresos</h3>
            <div className="h-[250px] w-full mt-4 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                <span className="text-xs text-slate-500 font-medium">Ingresos</span>
                <span className="font-bold text-lg text-slate-800">{formatCurrency(summary.totalRevenue)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 mt-4">
              {pieData.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card className="rounded-2xl shadow-sm border-border/50 overflow-hidden bg-white">
          <div className="p-6 border-b border-border/50">
            <h3 className="text-lg font-bold text-foreground">Registro de Transacciones</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Guía Asociada</th>
                  <th className="px-6 py-4">Descripción</th>
                  <th className="px-6 py-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {txLoading ? (
                  <tr><td colSpan={5} className="py-8 text-center">Cargando...</td></tr>
                ) : transactions?.length === 0 ? (
                   <tr><td colSpan={5} className="py-8 text-center text-slate-500">No hay transacciones.</td></tr>
                ) : (
                  transactions?.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                        {format(new Date(tx.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
                      </td>
                      <td className="px-6 py-4">
                        {tx.type === 'revenue' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Ingreso (Flete)</span>}
                        {tx.type === 'driver_payment' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Pago Conductor</span>}
                        {tx.type === 'commission' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Comisión</span>}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">{tx.guideNumber || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{tx.description}</td>
                      <td className="px-6 py-4 text-right font-bold">
                        {tx.type === 'driver_payment' ? (
                          <span className="text-orange-600 flex items-center justify-end gap-1"><ArrowDownRight className="w-4 h-4"/> {formatCurrency(tx.amount)}</span>
                        ) : (
                          <span className="text-green-600 flex items-center justify-end gap-1"><ArrowUpRight className="w-4 h-4"/> {formatCurrency(tx.amount)}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
