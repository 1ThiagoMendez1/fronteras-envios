import { useState } from "react"
import { useListShipments } from "@/hooks/use-shipments"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { formatCurrency, getStatusColor, getStatusLabel, cn, formatGuide } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Plus, Search, Filter, ChevronRight, Pencil, MessageSquareDot, Trash2 } from "lucide-react"
import { Link } from "wouter"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"
import { useDeleteShipmentMutation } from "@/hooks/use-shipments-wrapper"

export default function Shipments() {
  const [, setLocation] = useLocation()
  const { profile } = useAuth()
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const deleteMutation = useDeleteShipmentMutation()

  const { data, isLoading } = useListShipments({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: search || undefined,
    page: currentPage,
    pageSize: 50
  })

  // Local filtering for search (in real app, this would be server side)
  const filteredShipments = data?.shipments.filter(s => {
    const matchesSearch = search ? s.guideNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.senderName.toLowerCase().includes(search.toLowerCase()) ||
      s.recipientName.toLowerCase().includes(search.toLowerCase())
      : true
    const hasUnread = s.comentarios && s.comentarios.length > 0 && s.comentarios[s.comentarios.length - 1].sender === "user"
    const matchesUnread = unreadOnly ? hasUnread : true
    return matchesSearch && matchesUnread
  }) || []

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Gestión de Envíos</h1>
            <p className="text-muted-foreground mt-1">Administra todos los paquetes y despachos de la red.</p>
          </div>
          <Button className="rounded-xl h-12 px-6 font-semibold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all" onClick={() => setLocation("/shipments/new")}>
            <Plus className="mr-2 w-5 h-5" /> Nuevo Envío
          </Button>
        </div>

        <Card className="p-4 rounded-2xl border-border/50 shadow-sm flex flex-col md:flex-row gap-4 items-center bg-white/50 backdrop-blur-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Buscar por guía, remitente o destinatario..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-10 h-12 rounded-xl bg-white border-slate-200"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant={unreadOnly ? "default" : "outline"}
              className={cn("h-12 rounded-xl flex-shrink-0 transition-colors", unreadOnly ? "bg-red-500 hover:bg-red-600 border-red-500" : "bg-white border-slate-200")}
              onClick={() => setUnreadOnly(!unreadOnly)}
              title="Filtrar mensajes sin leer"
            >
              <MessageSquareDot className="w-5 h-5 sm:mr-2" />
              <span className="hidden sm:inline">Sin Leer</span>
            </Button>
            <Filter className="w-5 h-5 text-muted-foreground mr-1 ml-2" />
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full md:w-[200px] h-12 rounded-xl bg-white border-slate-200">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="created">Creado</SelectItem>
                <SelectItem value="assigned">Asignado</SelectItem>
                <SelectItem value="picked_up">Recogido</SelectItem>
                <SelectItem value="in_transit">En Tránsito</SelectItem>
                <SelectItem value="out_for_delivery">Pendiente por Entregar</SelectItem>
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
                  <th className="px-6 py-4">Sede Origen</th>
                  <th className="px-6 py-4">Destinatario</th>
                  <th className="px-6 py-4">Flete / Ganancia</th>
                  <th className="px-6 py-4">Pago</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredShipments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      No se encontraron envíos que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredShipments.map((shipment: any) => {
                    const hasUnreadChat = shipment.comentarios && shipment.comentarios.length > 0 && shipment.comentarios[shipment.comentarios.length - 1].sender === "user"

                    return (
                      <tr key={shipment.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link href={`/shipments/${shipment.id}`} className="font-bold text-primary hover:underline">
                              {formatGuide(shipment.guideNumber)}
                            </Link>
                            {hasUnreadChat && (
                              <div className="relative flex h-3 w-3 flex-shrink-0" title="Nuevo mensaje">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">{shipment.senderName}</div>
                          <div className="text-xs text-slate-500">{shipment.senderCity}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-xs font-semibold text-slate-700">
                            {shipment.branchOrigin || "Bogotá"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">{shipment.recipientName}</div>
                          <div className="text-xs text-slate-500">{shipment.recipientCity}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-700">Flete: {formatCurrency(shipment.shippingCost)}</div>
                          {profile?.role === "admin" && (
                            <div className="text-[11px] font-bold text-green-600 uppercase tracking-widest mt-0.5">Neto: {formatCurrency(shipment.shippingCost - (shipment.driverPayment || 0))}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md", 
                            shipment.paymentMethod === "Efectivo" ? "bg-emerald-50 text-emerald-700" :
                            shipment.paymentMethod === "Nequi" ? "bg-purple-50 text-purple-700" :
                            shipment.paymentMethod === "DaviPlata" ? "bg-red-50 text-red-700" : 
                            "bg-blue-50 text-blue-700"
                          )}>
                            {shipment.paymentMethod || "Efectivo"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn("px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center", getStatusColor(shipment.status))}>
                            {getStatusLabel(shipment.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          {format(new Date(shipment.createdAt), "d MMM yyyy, h:mm a", { locale: es })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {profile?.role === "admin" && (
                              <Button variant="ghost" size="icon" className="rounded-full hover:bg-red-100 hover:text-red-600 focus:opacity-100" disabled={deleteMutation.isPending} onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`¿Estás seguro de que deseas eliminar la guía ${formatGuide(shipment.guideNumber)}? Esta acción no se puede deshacer.`)) {
                                  deleteMutation.mutate(shipment.id);
                                }
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200" onClick={() => setLocation(`/shipments/${shipment.id}/edit`)}>
                              <Pencil className="w-4 h-4 text-slate-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200" onClick={() => setLocation(`/shipments/${shipment.id}`)}>
                              <ChevronRight className="w-5 h-5 text-slate-400" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <span className="text-sm text-slate-500">
              Mostrando {filteredShipments.length} de {data?.total || 0} envíos
            </span>
            {data && data.total > 50 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-xl h-9" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
                <div className="text-sm font-semibold px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg">Página {currentPage} de {Math.ceil(data.total / 50)}</div>
                <Button variant="outline" size="sm" className="rounded-xl h-9" onClick={() => setCurrentPage(p => Math.ceil(data.total / 50) > p ? p + 1 : p)} disabled={currentPage >= Math.ceil(data.total / 50)}>Siguiente</Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
