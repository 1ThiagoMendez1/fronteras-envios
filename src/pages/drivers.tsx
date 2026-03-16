import { useState } from "react"
// Mock hook to replace useListDrivers
const useListDrivers = () => ({
  data: [
    { id: 1, name: "Carlos Sanchez", vehicleType: "truck", city: "Bogota", phone: "3001234567", isActive: true, ratePerDelivery: 10000 },
    { id: 2, name: "Luisa Pinto", vehicleType: "van", city: "Medellin", phone: "3109876543", isActive: true, ratePerDelivery: 12000 }
  ],
  isLoading: false
})
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { formatCurrency, cn } from "@/lib/utils"
import { Search, Plus, Truck, Phone, MapPin, MoreVertical } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useCreateDriverMutation } from "@/hooks/use-drivers-wrapper"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const formSchema = z.object({
  name: z.string().min(2, "Requerido"),
  phone: z.string().min(7, "Requerido"),
  email: z.string().optional(),
  company: z.string().optional(),
  vehicleType: z.enum(["motorcycle", "car", "van", "truck"]),
  city: z.string().min(3, "Requerido"),
  ratePerDelivery: z.coerce.number().min(0, "Requerido")
})

export default function Drivers() {
  const { data: drivers, isLoading } = useListDrivers()
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const createMutation = useCreateDriverMutation()

  const { register, handleSubmit, setValue, reset } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      vehicleType: "van",
      ratePerDelivery: 0
    }
  })

  const onSubmit = async (data: any) => {
    await createMutation.mutateAsync({ data })
    setIsDialogOpen(false)
    reset()
  }

  const filteredDrivers = drivers?.filter(d => 
    search ? d.name.toLowerCase().includes(search.toLowerCase()) || d.city.toLowerCase().includes(search.toLowerCase()) : true
  ) || []

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Flota de Conductores</h1>
            <p className="text-muted-foreground mt-1">Gestión de conductores tercerizados y vehículos.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-12 px-6 font-semibold shadow-lg shadow-primary/20">
                <Plus className="mr-2 w-5 h-5" /> Registrar Conductor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl">Nuevo Conductor Tercerizado</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre Completo</Label>
                    <Input {...register("name")} className="rounded-xl bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input {...register("phone")} className="rounded-xl bg-slate-50" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ciudad Principal</Label>
                    <Input {...register("city")} className="rounded-xl bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Vehículo</Label>
                    <Select onValueChange={(v: any) => setValue("vehicleType", v)} defaultValue="van">
                      <SelectTrigger className="rounded-xl bg-slate-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="motorcycle">Motocicleta</SelectItem>
                        <SelectItem value="car">Automóvil</SelectItem>
                        <SelectItem value="van">Furgoneta / Van</SelectItem>
                        <SelectItem value="truck">Camión</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Empresa (Opcional)</Label>
                    <Input {...register("company")} className="rounded-xl bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tarifa Base Acordada</Label>
                    <Input type="number" {...register("ratePerDelivery")} className="rounded-xl bg-slate-50" />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl mt-4" disabled={createMutation.isPending}>
                  Guardar Conductor
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input 
            placeholder="Buscar por nombre o ciudad..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 rounded-xl shadow-sm border-border/50"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-2xl border border-dashed">
              No se encontraron conductores.
            </div>
          ) : (
            filteredDrivers.map(driver => (
              <Card key={driver.id} className="p-6 rounded-2xl shadow-sm border-border/50 hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className={cn("absolute top-0 right-0 w-2 h-full", driver.isActive ? "bg-emerald-500" : "bg-slate-300")} />
                
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xl text-primary shrink-0">
                      {driver.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground leading-tight">{driver.name}</h3>
                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {driver.city}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-slate-400">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3 mt-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-2"><Phone className="w-4 h-4"/> Teléfono</span>
                    <span className="font-medium">{driver.phone}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-2"><Truck className="w-4 h-4"/> Vehículo</span>
                    <span className="font-medium capitalize px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs">{driver.vehicleType}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-3 border-t">
                    <span className="text-slate-500">Tarifa Base</span>
                    <span className="font-bold text-primary">{formatCurrency(driver.ratePerDelivery)}</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
