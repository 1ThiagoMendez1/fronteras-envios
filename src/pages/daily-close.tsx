import { useState, useMemo } from "react"
// Mock hooks
const useListDailyCloses = () => ({
  data: [
    { id: 1, closeDate: new Date(Date.now() - 86400000).toISOString(), closedBy: 'Admin', totalShipments: 150, totalRevenue: 3000000, totalDriverPayments: 1800000, totalNetProfit: 1200000, deliveredCount: 135, incidentCount: 3, avgDeliveryTime: 3.8, notes: 'Día normal de operación', otherCosts: 180000 },
    { id: 2, closeDate: new Date(Date.now() - 86400000 * 2).toISOString(), closedBy: 'Operador 1', totalShipments: 128, totalRevenue: 2700000, totalDriverPayments: 1600000, totalNetProfit: 1100000, deliveredCount: 115, incidentCount: 5, avgDeliveryTime: 4.1, notes: '', otherCosts: 150000 },
    { id: 3, closeDate: new Date(Date.now() - 86400000 * 3).toISOString(), closedBy: 'Admin', totalShipments: 142, totalRevenue: 2900000, totalDriverPayments: 1750000, totalNetProfit: 1150000, deliveredCount: 130, incidentCount: 2, avgDeliveryTime: 3.5, notes: 'Se resolvieron 2 incidencias del día anterior', otherCosts: 165000 },
    { id: 4, closeDate: new Date(Date.now() - 86400000 * 4).toISOString(), closedBy: 'Admin', totalShipments: 110, totalRevenue: 2200000, totalDriverPayments: 1350000, totalNetProfit: 850000, deliveredCount: 98, incidentCount: 4, avgDeliveryTime: 4.5, notes: 'Demoras por clima en vías principales', otherCosts: 120000 },
    { id: 5, closeDate: new Date(Date.now() - 86400000 * 5).toISOString(), closedBy: 'Operador 1', totalShipments: 135, totalRevenue: 2800000, totalDriverPayments: 1700000, totalNetProfit: 1100000, deliveredCount: 125, incidentCount: 1, avgDeliveryTime: 3.2, notes: '', otherCosts: 155000 },
  ],
  isLoading: false
})
const usePreCloseData = () => ({
  data: {
    totalShipments: 120,
    deliveredCount: 95,
    inTransitCount: 18,
    incidentCount: 5,
    pendingAssignment: 2,
    totalRevenue: 2500000,
    totalDriverPayments: 1500000,
    totalNetProfit: 1000000,
    otherCosts: 200000,
    unregisteredPayments: 3,
    shipmentsWithoutCost: 1,
    topClients: [
      { name: 'Empresa A', revenue: 650000, margin: 42 },
      { name: 'Distribuidora XY', revenue: 420000, margin: 35 },
      { name: 'Tech Corp', revenue: 310000, margin: 38 }
    ],
    checks: [
      { id: 'delivered', label: 'Envíos con estado final registrado', status: 'pass' as const, detail: '95 de 120 envíos finalizados' },
      { id: 'transit', label: 'Envíos aún en tránsito', status: 'warn' as const, detail: '18 envíos siguen activos' },
      { id: 'payments', label: 'Pagos a conductores registrados', status: 'warn' as const, detail: '3 pagos pendientes de registro' },
      { id: 'costs', label: 'Todos los envíos tienen flete asignado', status: 'warn' as const, detail: '1 envío sin costo de flete' },
      { id: 'incidents', label: 'Incidencias documentadas', status: 'pass' as const, detail: '5 incidencias con notas' },
    ]
  },
  isLoading: false
})

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn, formatCurrency } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarCheck, Lock, Download, ChevronDown, ChevronUp, Package, DollarSign, TrendingUp, AlertTriangle, CheckCircle2, XCircle, FileText, ArrowRight, LayoutDashboard, Wallet, Search } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useCreateDailyCloseMutation } from "@/hooks/use-daily-close-wrapper"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Link } from "wouter"

type WizardStep = 'idle' | 'pre-close' | 'confirm' | 'success'

export default function DailyClosePage() {
  const { data: closes, isLoading } = useListDailyCloses()
  const { data: preCloseData } = usePreCloseData()
  const createMutation = useCreateDailyCloseMutation()
  const [wizardStep, setWizardStep] = useState<WizardStep>('idle')
  const [expandedCloseId, setExpandedCloseId] = useState<number | null>(null)
  const [closeNotes, setCloseNotes] = useState("")
  const [historySearch, setHistorySearch] = useState("")

  // Filter history
  const filteredCloses = useMemo(() => {
    if (!closes) return []
    if (!historySearch) return closes
    return closes.filter((c: any) => {
      const dateStr = format(new Date(c.closeDate), "EEEE d MMMM yyyy", { locale: es }).toLowerCase()
      return dateStr.includes(historySearch.toLowerCase()) || c.closedBy.toLowerCase().includes(historySearch.toLowerCase())
    })
  }, [closes, historySearch])

  const handleCreateClose = async () => {
    await createMutation.mutateAsync({
      data: {
        closeDate: new Date().toISOString(),
        notes: closeNotes || "Cierre automático del día"
      }
    })
    setWizardStep('success')
  }

  const resetWizard = () => {
    setWizardStep('idle')
    setCloseNotes("")
  }

  // Export close report as CSV
  const handleExportCSV = (close: any) => {
    const marginPct = close.totalRevenue > 0 ? ((close.totalNetProfit / close.totalRevenue) * 100).toFixed(1) : '0'
    const deliveryRate = close.totalShipments > 0 ? ((close.deliveredCount / close.totalShipments) * 100).toFixed(1) : '0'
    const rows = [
      "Campo,Valor",
      `"Fecha","${format(new Date(close.closeDate), "dd/MM/yyyy")}"`,
      `"Cerrado por","${close.closedBy}"`,
      `"Total envíos","${close.totalShipments}"`,
      `"Entregados","${close.deliveredCount}"`,
      `"Tasa de entrega","${deliveryRate}%"`,
      `"Incidencias","${close.incidentCount}"`,
      `"Tiempo promedio","${close.avgDeliveryTime}h"`,
      `"Ingresos brutos","${close.totalRevenue}"`,
      `"Pagos conductores","${close.totalDriverPayments}"`,
      `"Otros costos","${close.otherCosts || 0}"`,
      `"Utilidad neta","${close.totalNetProfit}"`,
      `"Margen","${marginPct}%"`,
      `"Notas","${close.notes || 'Sin notas'}"`,
    ].join("\n")
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `cierre_${format(new Date(close.closeDate), 'yyyy-MM-dd')}.csv`
    link.click()
  }

  // Calculate history summary stats
  const historyStats = useMemo(() => {
    if (!closes || closes.length === 0) return null
    const avgRevenue = closes.reduce((sum: number, c: any) => sum + c.totalRevenue, 0) / closes.length
    const avgMargin = closes.reduce((sum: number, c: any) => sum + (c.totalRevenue > 0 ? (c.totalNetProfit / c.totalRevenue) * 100 : 0), 0) / closes.length
    const avgDeliveryRate = closes.reduce((sum: number, c: any) => sum + (c.totalShipments > 0 ? (c.deliveredCount / c.totalShipments) * 100 : 0), 0) / closes.length
    return { avgRevenue, avgMargin, avgDeliveryRate }
  }, [closes])

  const CheckItem = ({ check }: { check: { id: string; label: string; status: 'pass' | 'warn' | 'fail'; detail: string } }) => {
    const StatusIcon = check.status === 'pass' ? CheckCircle2 : check.status === 'warn' ? AlertTriangle : XCircle
    const colors = check.status === 'pass'
      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
      : check.status === 'warn'
        ? 'text-amber-600 bg-amber-50 border-amber-200'
        : 'text-red-600 bg-red-50 border-red-200'
    return (
      <div className={cn("flex items-start gap-3 p-3 rounded-xl border", colors)}>
        <StatusIcon className="w-5 h-5 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{check.label}</p>
          <p className="text-xs mt-0.5 opacity-80">{check.detail}</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header Banner */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-primary text-white p-7 rounded-3xl relative overflow-hidden shadow-xl shadow-primary/20"
        >
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <h1 className="text-2xl font-display font-bold">Cierre Diario de Operación</h1>
            <p className="text-primary-foreground/80 mt-2 max-w-md text-sm">Consolide ingresos, pagos y calcule la utilidad neta del día con validaciones automáticas.</p>
          </div>
          <div className="relative z-10 flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="rounded-lg text-xs h-9 gap-1.5 text-white/80 hover:text-white hover:bg-white/10">
                  <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                </Button>
              </Link>
              <Link href="/financial">
                <Button variant="ghost" size="sm" className="rounded-lg text-xs h-9 gap-1.5 text-white/80 hover:text-white hover:bg-white/10">
                  <Wallet className="w-3.5 h-3.5" /> Financiero
                </Button>
              </Link>
            </div>
            <Button className="bg-white text-primary hover:bg-slate-100 rounded-xl h-12 px-6 font-bold text-base shadow-lg" onClick={() => setWizardStep('pre-close')} disabled={wizardStep !== 'idle'}>
              <Lock className="w-5 h-5 mr-2" /> Realizar Cierre Hoy
            </Button>
          </div>
        </motion.div>

        {/* Wizard Dialog */}
        <Dialog open={wizardStep !== 'idle'} onOpenChange={(open) => { if (!open) resetWizard() }}>
          <DialogContent className="rounded-2xl max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="pb-0">
              <DialogTitle className="text-xl">
                {wizardStep === 'pre-close' && '1. Pre-Cierre — Revisión Automática'}
                {wizardStep === 'confirm' && '2. Confirmar Cierre del Día'}
                {wizardStep === 'success' && '3. Cierre Completado'}
              </DialogTitle>
              <DialogDescription>
                {wizardStep === 'pre-close' && 'Revise el estado de la operación antes de cerrar el día.'}
                {wizardStep === 'confirm' && 'Confirme las cifras consolidadas para ejecutar el cierre.'}
                {wizardStep === 'success' && 'El cierre del día ha sido registrado exitosamente.'}
              </DialogDescription>
            </DialogHeader>

            {/* Steps indicator */}
            <div className="flex items-center gap-2 py-3">
              {[1, 2, 3].map((step) => {
                const stepNames = ['Pre-cierre', 'Confirmar', 'Listo']
                const currentStep = wizardStep === 'pre-close' ? 1 : wizardStep === 'confirm' ? 2 : 3
                const isActive = step === currentStep
                const isDone = step < currentStep
                return (
                  <div key={step} className="flex items-center gap-2 flex-1">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all", isActive ? "bg-primary text-white shadow-md" : isDone ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400")}>
                      {isDone ? '✓' : step}
                    </div>
                    <span className={cn("text-xs font-medium hidden sm:block", isActive ? "text-foreground" : "text-muted-foreground")}>{stepNames[step - 1]}</span>
                    {step < 3 && <div className={cn("flex-1 h-0.5 rounded-full ml-1", isDone ? "bg-emerald-300" : "bg-slate-200")} />}
                  </div>
                )
              })}
            </div>

            <AnimatePresence mode="wait">
              {wizardStep === 'pre-close' && preCloseData && (
                <motion.div key="pre-close" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <Package className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                      <p className="text-xs text-blue-600 font-medium">Envíos</p>
                      <p className="text-lg font-bold text-blue-800">{preCloseData.totalShipments}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                      <DollarSign className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                      <p className="text-xs text-emerald-600 font-medium">Ingresos</p>
                      <p className="text-lg font-bold text-emerald-800">{formatCurrency(preCloseData.totalRevenue)}</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-3 text-center">
                      <TrendingUp className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                      <p className="text-xs text-orange-600 font-medium">Pagos</p>
                      <p className="text-lg font-bold text-orange-800">{formatCurrency(preCloseData.totalDriverPayments)}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-3 text-center">
                      <TrendingUp className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                      <p className="text-xs text-indigo-600 font-medium">Utilidad</p>
                      <p className="text-lg font-bold text-indigo-800">{formatCurrency(preCloseData.totalNetProfit)}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2"><FileText className="w-4 h-4" /> Checklist de Validaciones</h4>
                    {preCloseData.checks.map((check) => (<CheckItem key={check.id} check={check} />))}
                  </div>
                  {preCloseData.checks.some(c => c.status !== 'pass') && (
                    <div className="bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-200 text-sm">
                      <strong>Nota:</strong> Hay items con advertencias. Puede continuar con el cierre, pero se recomienda revisar los puntos señalados.
                    </div>
                  )}
                  <Button className="w-full h-11 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90" onClick={() => setWizardStep('confirm')}>
                    Continuar al Cierre <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}

              {wizardStep === 'confirm' && preCloseData && (
                <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-bold text-foreground">Resumen del Cierre</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Envíos totales</span><span className="font-bold">{preCloseData.totalShipments}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Entregados</span><span className="font-bold text-emerald-600">{preCloseData.deliveredCount}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Ingresos brutos</span><span className="font-bold text-emerald-600">{formatCurrency(preCloseData.totalRevenue)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Pagos conductores</span><span className="font-bold text-orange-600">{formatCurrency(preCloseData.totalDriverPayments)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Otros costos</span><span className="font-bold text-red-500">{formatCurrency(preCloseData.otherCosts)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Incidencias</span><span className="font-bold text-red-500">{preCloseData.incidentCount}</span></div>
                    </div>
                    <div className="border-t pt-3 flex justify-between items-center">
                      <span className="font-bold text-foreground">Utilidad Neta</span>
                      <span className="text-xl font-bold text-primary">{formatCurrency(preCloseData.totalNetProfit)}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Notas del cierre (opcional)</label>
                    <textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} placeholder="Observaciones o notas relevantes del día..." className="w-full h-20 p-3 text-sm rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary resize-none bg-white" />
                  </div>
                  <div className="bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-200 text-sm">
                    <strong>⚠️ Advertencia:</strong> Una vez ejecutado el cierre, no se podrán modificar las transacciones del día.
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 h-11 rounded-xl text-sm font-bold" onClick={() => setWizardStep('pre-close')}>← Volver</Button>
                    <Button className="flex-1 h-11 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90" onClick={handleCreateClose} disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Procesando..." : "Confirmar y Cerrar Día"}
                    </Button>
                  </div>
                </motion.div>
              )}

              {wizardStep === 'success' && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4 space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-foreground">Cierre Exitoso</h4>
                    <p className="text-sm text-muted-foreground mt-1">El cierre del día {format(new Date(), "d 'de' MMMM, yyyy", { locale: es })} ha sido registrado.</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-left my-6 shadow-sm">
                    <h5 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <TrendingUp className="w-4 h-4 text-emerald-500"/>
                       Resumen Destacado de Hoy
                    </h5>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-3">
                           <span className="text-slate-500 font-medium">Costo Promedio Operativo</span>
                           <span className="font-bold text-slate-800 bg-white px-2 py-1 rounded-md border border-slate-100">{formatCurrency(preCloseData.totalDriverPayments / preCloseData.totalShipments)} / envío</span>
                        </div>
                        <div>
                           <span className="text-sm text-slate-500 font-medium block mb-3">Top Clientes del Día</span>
                           <div className="space-y-2">
                              {preCloseData.topClients?.map(c => (
                                 <div key={c.name} className="flex justify-between items-center text-xs p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-slate-300 transition-colors">
                                    <span className="font-bold text-slate-700">{c.name}</span>
                                    <div className="flex gap-4">
                                       <span className="text-slate-500">Ingresos: <span className="font-bold text-emerald-600">{formatCurrency(c.revenue)}</span></span>
                                       <span className="text-slate-500">Margen: <span className="font-bold text-indigo-600">{c.margin}%</span></span>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1 h-10 rounded-xl text-sm font-semibold" onClick={resetWizard}><Download className="w-4 h-4 mr-2" /> Descargar CSV</Button>
                    <Button className="flex-1 h-10 rounded-xl text-sm font-semibold" onClick={resetWizard}>Cerrar</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </DialogContent>
        </Dialog>

        {/* History Summary Stats (aggregated) */}
        {historyStats && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <Card className="p-4 rounded-2xl shadow-sm border-border/50 bg-gradient-to-br from-white to-emerald-50/30">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Ingreso Promedio / Día</p>
              <p className="text-lg font-bold text-emerald-700">{formatCurrency(historyStats.avgRevenue)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Basado en {closes?.length} cierres</p>
            </Card>
            <Card className="p-4 rounded-2xl shadow-sm border-border/50 bg-gradient-to-br from-white to-violet-50/30">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Margen Promedio</p>
              <p className="text-lg font-bold text-violet-700">{historyStats.avgMargin.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Promedio de utilidad</p>
            </Card>
            <Card className="p-4 rounded-2xl shadow-sm border-border/50 bg-gradient-to-br from-white to-blue-50/30">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tasa Entrega Prom.</p>
              <p className="text-lg font-bold text-blue-700">{historyStats.avgDeliveryRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">De envíos completados</p>
            </Card>
          </motion.div>
        )}

        {/* History Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-foreground">Historial de Cierres</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Últimos cierres registrados</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input placeholder="Buscar por fecha..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="pl-8 h-9 text-sm rounded-lg w-48 bg-slate-50 border-slate-200" />
            </div>
            <div className="text-xs text-muted-foreground bg-slate-100 px-3 py-1.5 rounded-lg font-medium">{filteredCloses.length} registros</div>
          </div>
        </div>

        <div className="grid gap-3">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (<div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />))}
            </div>
          ) : filteredCloses.length === 0 ? (
            <Card className="p-12 text-center text-slate-500 border-dashed rounded-2xl">
              <CalendarCheck className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">{historySearch ? 'No hay cierres que coincidan' : 'No hay cierres registrados aún'}</p>
              <p className="text-sm mt-1">{historySearch ? 'Intente con otro término de búsqueda.' : 'Ejecute su primer cierre diario para comenzar.'}</p>
            </Card>
          ) : (
            filteredCloses.map((close: any, idx: number) => {
              const isExpanded = expandedCloseId === close.id
              const marginPct = close.totalRevenue > 0 ? ((close.totalNetProfit / close.totalRevenue) * 100) : 0
              const deliveryRate = close.totalShipments > 0 ? ((close.deliveredCount / close.totalShipments) * 100) : 0
              const prevClose = closes[idx + 1]
              const revenueDeltaPct = prevClose && prevClose.totalRevenue > 0 ? (((close.totalRevenue - prevClose.totalRevenue) / prevClose.totalRevenue) * 100) : 0

              return (
                <motion.div key={close.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: idx * 0.05 }}>
                  <Card className={cn("rounded-2xl border-border/50 shadow-sm hover:shadow-md transition-all overflow-hidden", isExpanded && "shadow-md")}>
                    <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer" onClick={() => setExpandedCloseId(isExpanded ? null : close.id)}>
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-xl text-primary"><CalendarCheck className="w-6 h-6" /></div>
                        <div>
                          <h4 className="font-bold text-base text-slate-900 capitalize">{format(new Date(close.closeDate), "EEEE, d 'de' MMMM", { locale: es })}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-slate-500">por {close.closedBy}</span>
                            {revenueDeltaPct !== 0 && (
                              <span className={cn("text-xs font-semibold flex items-center gap-0.5", revenueDeltaPct > 0 ? "text-emerald-600" : "text-red-500")}>
                                <TrendingUp className={cn("w-3 h-3", revenueDeltaPct < 0 && "rotate-180")} />
                                {Math.abs(revenueDeltaPct).toFixed(1)}% vs anterior
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 max-w-xl">
                          <div><p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-0.5">Envíos</p><p className="font-bold text-sm text-slate-800">{close.totalShipments}</p></div>
                          <div><p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-0.5">Ingresos</p><p className="font-bold text-sm text-emerald-600">{formatCurrency(close.totalRevenue)}</p></div>
                          <div><p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-0.5">Pagos</p><p className="font-bold text-sm text-orange-600">{formatCurrency(close.totalDriverPayments)}</p></div>
                          <div><p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-0.5">Utilidad</p><p className="font-bold text-sm text-primary">{formatCurrency(close.totalNetProfit)}</p></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary shrink-0" onClick={(e) => { e.stopPropagation(); handleExportCSV(close) }}>
                            <Download className="w-4 h-4" />
                          </Button>
                          <div className="text-slate-400">{isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</div>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                          <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                              <div className="bg-slate-50 rounded-xl p-3">
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Tasa Entrega</p>
                                <p className="font-bold text-lg text-slate-800">{deliveryRate.toFixed(0)}%</p>
                                <p className="text-xs text-slate-500">{close.deliveredCount} de {close.totalShipments}</p>
                              </div>
                              <div className="bg-slate-50 rounded-xl p-3">
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Incidencias</p>
                                <p className={cn("font-bold text-lg", close.incidentCount > 3 ? "text-red-600" : "text-slate-800")}>{close.incidentCount}</p>
                                <p className="text-xs text-slate-500">del día</p>
                              </div>
                              <div className="bg-slate-50 rounded-xl p-3">
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Margen</p>
                                <p className={cn("font-bold text-lg", marginPct >= 35 ? "text-emerald-600" : marginPct >= 25 ? "text-violet-700" : "text-red-600")}>{marginPct.toFixed(1)}%</p>
                                <p className="text-xs text-slate-500">utilidad / ingresos</p>
                              </div>
                              <div className="bg-slate-50 rounded-xl p-3">
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Tiempo Prom.</p>
                                <p className="font-bold text-lg text-slate-800">{close.avgDeliveryTime}h</p>
                                <p className="text-xs text-slate-500">de entrega</p>
                              </div>
                              <div className="bg-slate-50 rounded-xl p-3">
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Otros Costos</p>
                                <p className="font-bold text-lg text-red-600">{formatCurrency(close.otherCosts || 0)}</p>
                                <p className="text-xs text-slate-500">gastos adicionales</p>
                              </div>
                            </div>
                            {close.notes && (
                              <div className="mt-3 bg-blue-50 rounded-xl p-3 text-sm text-blue-800 border border-blue-200">
                                <strong>Notas:</strong> {close.notes}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              )
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
