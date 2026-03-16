import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, UserPlus, MapPin, Phone, FileText, Package } from "lucide-react"
import { useState } from "react"
import { useClients } from "@/hooks/use-clients"
import type { Client } from "@/hooks/use-clients"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  document: z.string().min(5, "Requerido"),
  name: z.string().min(2, "Requerido"),
  phone: z.string().min(7, "Requerido"),
  city: z.string().min(3, "Requerido"),
  address: z.string().min(5, "Requerido"),
})

export default function ClientsPage() {
  const { clients, upsertClient } = useClients()
  const [searchTerm, setSearchTerm] = useState("")

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  })

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    upsertClient(data)
    setIsCreateOpen(false)
    reset()
  }

  // Mock shipments for history
  const mockShipments = [
    { id: 1, guide: "GUIA-4001", date: "16 Mar, 2024", status: "En Tránsito", dest: "Cali" },
    { id: 2, guide: "GUIA-3995", date: "12 Mar, 2024", status: "Entregado", dest: "Medellín" },
    { id: 3, guide: "GUIA-3910", date: "05 Mar, 2024", status: "Entregado", dest: "Bogotá" }
  ]

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.document.includes(searchTerm)
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Directorio de Clientes</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona los remitentes frecuentes y su historial de envíos.
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 font-semibold">
                <UserPlus className="w-4 h-4 mr-2" /> Nuevo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Cliente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Documento (CC/NIT)</Label>
                  <Input {...register("document")} className="rounded-xl" />
                  {errors.document && <p className="text-red-500 text-xs">{errors.document.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Nombre / Razón Social</Label>
                  <Input {...register("name")} className="rounded-xl" />
                  {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input {...register("phone")} className="rounded-xl" />
                  {errors.phone && <p className="text-red-500 text-xs">{errors.phone.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ciudad</Label>
                    <Input {...register("city")} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Dirección</Label>
                    <Input {...register("address")} className="rounded-xl" />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 rounded-xl font-bold mt-2">
                  Guardar Cliente
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-4 sm:p-6 rounded-2xl shadow-sm border-border/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input 
                placeholder="Buscar por nombre o documento..." 
                className="pl-10 h-12 bg-slate-50/50 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Documento</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4">Ubicación</th>
                  <th className="px-6 py-4 text-center">Envíos (Mes)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((client) => (
                  <tr 
                    key={client.id} 
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedClient(client)}
                  >
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        {client.document}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{client.name}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        {client.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {client.city}
                      </div>
                      <div className="text-xs text-slate-400 ml-6 mt-0.5 truncate max-w-[150px]">
                        {client.address}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 py-1.5 px-3 rounded-full font-bold w-fit mx-auto">
                        <Package className="w-4 h-4" />
                        {client.totalShipmentsThisMonth}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No se encontraron clientes coincidiendo con tu búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Client History Modal */}
        <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <UserPlus className="w-5 h-5 text-primary" /> 
                Historial de {selectedClient?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase">Documento</p>
                  <p className="font-bold text-slate-800">{selectedClient?.document}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase">Contacto</p>
                  <p className="font-bold text-slate-800">{selectedClient?.phone}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 font-medium uppercase">Ubicación</p>
                  <p className="font-bold text-slate-800">{selectedClient?.city} - {selectedClient?.address}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-400" />
                  Últimos Envíos Registrados
                </h4>
                <div className="space-y-3">
                  {mockShipments.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                      <div>
                        <p className="font-bold text-primary">{s.guide}</p>
                        <p className="text-xs text-slate-500">Destino: {s.dest}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-xs font-bold px-2 py-1 rounded-full w-fit ml-auto border mb-1",
                          s.status === "Entregado" ? "bg-green-50 text-green-700 border-green-200" : "bg-blue-50 text-blue-700 border-blue-200"
                        )}>
                          {s.status}
                        </p>
                        <p className="text-xs text-slate-400">{s.date}</p>
                      </div>
                    </div>
                  ))}
                  <Button variant="ghost" className="w-full text-sm font-semibold text-primary mt-2">
                    Ver todos los resultados
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
