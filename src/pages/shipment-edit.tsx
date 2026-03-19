import { useLocation, useRoute } from "wouter"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { useUpdateShipmentMutation } from "@/hooks/use-shipments-wrapper"
import { ArrowLeft, Package, User, MapPin, DollarSign, Loader2, Search } from "lucide-react"
import { useClients } from "@/hooks/use-clients"
import { useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Mock hooks to replace useGetShipment and useListDrivers
const useGetShipment = (_id: number, _options?: any) => ({
  data: {
    id: _id, guideNumber: `GUIA-${1000 + _id}`, senderName: "Empresa A", senderCity: "Bogota", senderPhone: "3001234567", senderAddress: "Calle Principal 123", senderDocument: "900123456", recipientName: "Cliente B", recipientCity: "Medellin", recipientPhone: "3109876543", recipientAddress: "Carrera 45 #67-89", weight: 5.5, declaredValue: 50000, shippingCost: 15000, driverPayment: 10000, status: "in_transit", createdAt: new Date().toISOString(), driverId: null, driverName: "Carlos Sanchez", observations: "Ninguna", branchOrigin: "Bogotá", history: [{ id: 1, status: "created", createdAt: new Date().toISOString(), note: "Creado" }]
  },
  isLoading: false
})
const useListDrivers = () => ({
  data: [
    { id: 1, name: "Carlos Sanchez", vehicleType: "Camión", city: "Bogota", isActive: true },
    { id: 2, name: "Luisa Pinto", vehicleType: "Furgón", city: "Medellin", isActive: true }
  ],
  isLoading: false
})

const formSchema = z.object({
  senderDocument: z.string().min(5, "Requerido"),
  senderName: z.string().min(2, "Requerido"),
  senderPhone: z.string().min(7, "Requerido"),
  senderAddress: z.string().min(5, "Requerido"),
  senderCity: z.string().min(3, "Requerido"),
  recipientName: z.string().min(2, "Requerido"),
  recipientPhone: z.string().min(7, "Requerido"),
  recipientAddress: z.string().min(5, "Requerido"),
  recipientCity: z.string().min(3, "Requerido"),
  weight: z.coerce.number().min(0.1, "Mayor a 0"),
  declaredValue: z.coerce.number().min(0, "Requerido"),
  shippingCost: z.coerce.number().min(0, "Requerido"),
  driverPayment: z.coerce.number().min(0, "Requerido"),
  observations: z.string().optional(),
  driverId: z.coerce.number().optional(),
  branchOrigin: z.string().min(2, "Requerido").default("Bogotá"),
})

type FormData = z.infer<typeof formSchema>

export default function EditShipment() {
  const [, setLocation] = useLocation()
  const [, params] = useRoute("/shipments/:id/edit")
  const id = parseInt(params?.id || "0")
  
  const { data: shipment, isLoading } = useGetShipment(id, { query: { enabled: !!id } })
  const updateMutation = useUpdateShipmentMutation(id)
  const { data: drivers } = useListDrivers()
  const { getClientByDocument, upsertClient } = useClients()

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      senderDocument: "", weight: 1, declaredValue: 0, shippingCost: 0, driverPayment: 0, branchOrigin: "Bogotá"
    }
  })

  // State for the driver select, because we can't reliably rely on setValue for Radix UI Select components without explicit state or watching the form
  useEffect(() => {
    if (shipment) {
      reset({
        senderDocument: shipment.senderDocument || "",
        senderName: shipment.senderName || "",
        senderPhone: shipment.senderPhone || "",
        senderAddress: shipment.senderAddress || "",
        senderCity: shipment.senderCity || "",
        recipientName: shipment.recipientName || "",
        recipientPhone: shipment.recipientPhone || "",
        recipientAddress: shipment.recipientAddress || "",
        recipientCity: shipment.recipientCity || "",
        weight: shipment.weight || 1,
        declaredValue: shipment.declaredValue || 0,
        shippingCost: shipment.shippingCost || 0,
        driverPayment: shipment.driverPayment || 0,
        observations: shipment.observations || "",
        driverId: shipment.driverId || undefined,
        branchOrigin: shipment.branchOrigin || "Bogotá"
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipment?.id, reset])

  const onSubmit = async (data: any) => {
    try {
      upsertClient({
        document: data.senderDocument, name: data.senderName, phone: data.senderPhone, city: data.senderCity, address: data.senderAddress
      })
      await updateMutation.mutateAsync({ data })
      setLocation(`/shipments/${id}`)
    } catch (e) {
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setLocation(`/shipments/${id}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Editar Envío</h1>
            <p className="text-muted-foreground mt-1 text-primary font-bold">{shipment?.guideNumber}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Sender & Recipient */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 rounded-2xl border-border/50 shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <User className="w-24 h-24" />
              </div>
              <div className="flex items-center gap-2 mb-4 border-b pb-2 relative z-10">
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold">Datos del Remitente</h3>
              </div>
              
              <div className="space-y-4 relative z-10">
                <div className="space-y-2">
                  <Label>Documento (CC/NIT)</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input 
                      {...register("senderDocument")} 
                      className="bg-slate-50/50 rounded-xl pl-9" 
                      placeholder="Ej. 900123456"
                      onBlur={(e) => {
                        const client = getClientByDocument(e.target.value)
                        if (client) {
                          setValue("senderName", client.name)
                          setValue("senderPhone", client.phone)
                          setValue("senderCity", client.city)
                          setValue("senderAddress", client.address)
                        }
                      }}
                    />
                  </div>
                  {errors.senderDocument && <p className="text-red-500 text-xs">{errors.senderDocument.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Nombre Completo</Label>
                  <Input {...register("senderName")} className="bg-slate-50/50 rounded-xl" />
                  {errors.senderName && <p className="text-red-500 text-xs">{errors.senderName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input {...register("senderPhone")} className="bg-slate-50/50 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Ciudad de Origen</Label>
                  <Input {...register("senderCity")} className="bg-slate-50/50 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input {...register("senderAddress")} className="bg-slate-50/50 rounded-xl" />
                </div>
              </div>
            </Card>

            <Card className="p-6 rounded-2xl border-border/50 shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <User className="w-24 h-24" />
              </div>
              <div className="flex items-center gap-2 mb-4 border-b pb-2 relative z-10">
                <div className="bg-accent/10 p-2 rounded-lg text-accent-foreground">
                  <MapPin className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-lg font-bold">Datos del Destinatario</h3>
              </div>
              
              <div className="space-y-4 relative z-10">
                <div className="space-y-2">
                  <Label>Nombre Completo</Label>
                  <Input {...register("recipientName")} className="bg-slate-50/50 rounded-xl" />
                  {errors.recipientName && <p className="text-red-500 text-xs">{errors.recipientName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input {...register("recipientPhone")} className="bg-slate-50/50 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Ciudad Destino</Label>
                  <Input {...register("recipientCity")} className="bg-slate-50/50 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input {...register("recipientAddress")} className="bg-slate-50/50 rounded-xl" />
                </div>
              </div>
            </Card>
          </div>

          {/* Package Details & Financial */}
          <Card className="p-6 rounded-2xl border-border/50 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b pb-4">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">Detalles del Paquete y Tarifas</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <div className="relative">
                  <Input type="number" step="0.1" {...register("weight")} className="bg-slate-50/50 rounded-xl pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">kg</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Valor Declarado ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input type="number" {...register("declaredValue")} className="bg-slate-50/50 rounded-xl pl-8" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Costo del Flete ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input type="number" {...register("shippingCost")} className="bg-slate-50/50 rounded-xl pl-8 font-semibold text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Pago a Conductor ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input type="number" {...register("driverPayment")} className="bg-slate-50/50 rounded-xl pl-8" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-2">
                <Label>Asignar Conductor (Opcional)</Label>
                <Select value={shipment?.driverId ? String(shipment.driverId) : undefined} onValueChange={(v) => setValue("driverId", parseInt(v))}>
                  <SelectTrigger className="bg-slate-50/50 rounded-xl h-12">
                    <SelectValue placeholder="Seleccionar conductor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers?.map(d => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name} ({d.vehicleType}) - {d.city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sede de Origen</Label>
                <Select value={shipment?.branchOrigin || "Bogotá"} onValueChange={(v) => setValue("branchOrigin", v)}>
                  <SelectTrigger className="bg-slate-50/50 rounded-xl h-12">
                    <SelectValue placeholder="Sede" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bogotá">Sede Bogotá</SelectItem>
                    <SelectItem value="Medellín">Sede Medellín</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Observaciones</Label>
                <Input {...register("observations")} placeholder="Notas para la entrega..." className="bg-slate-50/50 rounded-xl h-12" />
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" className="h-12 px-6 rounded-xl font-semibold" onClick={() => setLocation(`/shipments/${id}`)}>Cancelar</Button>
            <Button 
              type="submit" 
              className="h-12 px-8 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Package className="w-5 h-5 mr-2" />}
              Guardar Cambios
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
