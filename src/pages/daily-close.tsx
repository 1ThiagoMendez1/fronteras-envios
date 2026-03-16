import { useState } from "react"
// Mock hook to replace useListDailyCloses
const useListDailyCloses = () => ({
  data: [
    { id: 1, closeDate: new Date(Date.now() - 86400000).toISOString(), closedBy: 'Admin', totalShipments: 150, totalRevenue: 3000000, totalDriverPayments: 1800000, totalNetProfit: 1200000 }
  ],
  isLoading: false
})
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarCheck, Lock, Download } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { useCreateDailyCloseMutation } from "@/hooks/use-daily-close-wrapper"

export default function DailyClosePage() {
  const { data: closes, isLoading } = useListDailyCloses()
  const createMutation = useCreateDailyCloseMutation()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleCreateClose = async () => {
    await createMutation.mutateAsync({
      data: {
        closeDate: new Date().toISOString(),
        notes: "Cierre automático del día"
      }
    })
    setIsDialogOpen(false)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-primary text-white p-8 rounded-3xl relative overflow-hidden shadow-xl shadow-primary/20">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="relative z-10">
            <h1 className="text-3xl font-display font-bold">Cierre Diario de Operación</h1>
            <p className="text-primary-foreground/80 mt-2 max-w-md">
              Ejecute el cierre diario para consolidar ingresos, pagos a conductores y calcular la utilidad neta del día.
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="relative z-10 bg-white text-primary hover:bg-slate-100 rounded-xl h-14 px-8 font-bold text-lg shadow-lg">
                <Lock className="w-5 h-5 mr-2" /> Realizar Cierre Hoy
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Confirmar Cierre Diario</DialogTitle>
                <DialogDescription>
                  Esta acción calculará y bloqueará los registros financieros del día de hoy. No se podrán modificar transacciones previas una vez ejecutado.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-sm mb-4">
                  <strong>Advertencia:</strong> Asegúrese de que todos los envíos y pagos del día hayan sido registrados en el sistema antes de continuar.
                </div>
                <Button 
                  className="w-full h-12 rounded-xl text-base font-bold bg-primary hover:bg-primary/90"
                  onClick={handleCreateClose}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Procesando..." : "Confirmar y Cerrar Día"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <h3 className="text-xl font-bold text-foreground mt-8">Historial de Cierres</h3>

        <div className="grid gap-4">
          {isLoading ? (
             <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : closes?.length === 0 ? (
            <Card className="p-12 text-center text-slate-500 border-dashed">
              No hay cierres registrados aún en el sistema.
            </Card>
          ) : (
            closes?.map((close) => (
              <Card key={close.id} className="p-6 rounded-2xl border-border/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-3 rounded-xl text-slate-500">
                    <CalendarCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-slate-900 capitalize">
                      {format(new Date(close.closeDate), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                    </h4>
                    <p className="text-sm text-slate-500">Realizado por: {close.closedBy}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 flex-1 max-w-2xl">
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Envíos</p>
                    <p className="font-bold text-slate-800">{close.totalShipments}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Ingresos</p>
                    <p className="font-bold text-green-600">{formatCurrency(close.totalRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Pagos</p>
                    <p className="font-bold text-orange-600">{formatCurrency(close.totalDriverPayments)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Utilidad</p>
                    <p className="font-bold text-primary">{formatCurrency(close.totalNetProfit)}</p>
                  </div>
                </div>

                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary shrink-0 self-end md:self-auto">
                  <Download className="w-5 h-5" />
                </Button>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
