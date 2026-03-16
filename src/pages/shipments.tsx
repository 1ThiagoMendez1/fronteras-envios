import { useState } from "react"
// Mock hook to replace useListShipments
const useListShipments = (_options?: any) => ({
  data: {
    shipments: [
      { id: 1, guideNumber: "GUIA-1001", senderName: "Empresa A", senderCity: "Bogota", recipientName: "Cliente B", recipientCity: "Medellin", shippingCost: 15000, status: "in_transit", createdAt: new Date().toISOString() },
      { id: 2, guideNumber: "GUIA-1002", senderName: "Empresa C", senderCity: "Cali", recipientName: "Cliente D", recipientCity: "Bogota", shippingCost: 25000, status: "delivered", createdAt: new Date().toISOString() }
    ],
    total: 2
  },
  isLoading: false
})
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { formatCurrency, getStatusColor, getStatusLabel, cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Plus, Search, Filter, ChevronRight } from "lucide-react"
import { Link } from "wouter"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function Shipments() {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  const { data, isLoading } = useListShipments({
    query: {
      queryKey: ["/api/shipments", statusFilter !== "all" ? { status: statusFilter } : undefined]
    }
  })

  // Local filtering for search (in real app, this would be server side)
  const filteredShipments = data?.shipments.filter(s => 
    search ? s.guideNumber.toLowerCase().includes(search.toLowerCase()) || 
             s.senderName.toLowerCase().includes(search.toLowerCase()) ||
             s.recipientName.toLowerCase().includes(search.toLowerCase()) 
           : true
  ) || []

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Gestión de Envíos</h1>
            <p className="text-muted-foreground mt-1">Administra todos los paquetes y despachos de la red.</p>
          </div>
          <Link href="/shipments/new">
            <Button className="rounded-xl h-12 px-6 font-semibold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all">
              <Plus className="mr-2 w-5 h-5" /> Nuevo Envío
            </Button>
          </Link>
        </div>

        <Card className="p-4 rounded-2xl border-border/50 shadow-sm flex flex-col md:flex-row gap-4 items-center bg-white/50 backdrop-blur-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input 
              placeholder="Buscar por guía, remitente o destinatario..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-white border-slate-200"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px] h-12 rounded-xl bg-white border-slate-200">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="created">Creado</SelectItem>
                <SelectItem value="assigned">Asignado</SelectItem>
                <SelectItem value="picked_up">Recogido</SelectItem>
                <SelectItem value="in_transit">En Tránsito</SelectItem>
                <SelectItem value="out_for_delivery">En Entrega</SelectItem>
                <SelectItem value="delivered">Entregado</SelectItem>
                <SelectItem value="incident">Incidencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="rounded-2xl shadow-sm border-border/50 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Guía</th>
                  <th className="px-6 py-4">Remitente</th>
                  <th className="px-6 py-4">Destinatario</th>
                  <th className="px-6 py-4">Valor Flete</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredShipments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      No se encontraron envíos que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredShipments.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <Link href={`/shipments/${shipment.id}`} className="font-bold text-primary hover:underline">
                          {shipment.guideNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{shipment.senderName}</div>
                        <div className="text-xs text-slate-500">{shipment.senderCity}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{shipment.recipientName}</div>
                        <div className="text-xs text-slate-500">{shipment.recipientCity}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {formatCurrency(shipment.shippingCost)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center", getStatusColor(shipment.status))}>
                          {getStatusLabel(shipment.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {format(new Date(shipment.createdAt), "d MMM yyyy", { locale: es })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/shipments/${shipment.id}`}>
                          <Button variant="ghost" size="icon" className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {data && (
             <div className="p-4 border-t border-slate-100 text-sm text-slate-500 flex justify-between items-center bg-slate-50/50">
               <span>Mostrando {filteredShipments.length} de {data.total} envíos</span>
             </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
