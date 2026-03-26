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
import { ArrowLeft, Package, MapPin, DollarSign, Loader2, Search, X, Check } from "lucide-react"
import { useClients } from "@/hooks/use-clients"
import { useEffect, useState, useRef } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useGetShipment } from "@/hooks/use-shipments"
import { useListDrivers } from "@/hooks/use-drivers"
import { cn } from "@/lib/utils"

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

function ClientSearchCombobox({ clients, onSelect }: {
  clients: any[]
  onSelect: (client: any) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  const filtered = clients.filter(c => {
    const s = q.toLowerCase()
    return (
      c.name?.toLowerCase().includes(s) ||
      c.document?.toLowerCase().includes(s) ||
      (c.razonSocial ?? "").toLowerCase().includes(s) ||
      (c.city ?? "").toLowerCase().includes(s)
    )
  }).slice(0, 8)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar por nombre, documento, razón social..."
          className="pl-9 h-11 rounded-xl bg-white border-primary/30 focus:border-primary"
        />
        {q && (
          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => { setQ(""); setOpen(false) }}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-border/50 rounded-xl shadow-2xl overflow-hidden">
          {filtered.map(c => (
            <button
              key={c.id ?? c.document}
              type="button"
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 text-left border-b border-slate-50 last:border-0 transition-colors"
              onClick={() => { onSelect(c); setQ(c.name); setOpen(false) }}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                {(c.razonSocial ?? c.name)?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-slate-800 truncate">{c.razonSocial ?? c.name}</p>
                <p className="text-xs text-slate-500">{c.document} {c.city ? `· ${c.city}` : ""}</p>
              </div>
              <Check className="w-4 h-4 text-primary ml-auto shrink-0 mt-1 opacity-50" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function EditShipment() {
  const [, setLocation] = useLocation()
  const [, params] = useRoute("/shipments/:id/edit")
  const id = parseInt(params?.id || "0")

  const { data: shipment, isLoading } = useGetShipment(id)
  const updateMutation = useUpdateShipmentMutation(id)
  const { data: drivers } = useListDrivers({ onlyActive: true })
  const { clients, getClientByDocument, upsertClient } = useClients()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      senderDocument: "", weight: 1, declaredValue: 0, shippingCost: 0, driverPayment: 0, branchOrigin: "Bogotá"
    }
  })

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

  const shippingCost = watch("shippingCost") || 0
  const driverPayment = watch("driverPayment") || 0
  const margin = Number(shippingCost) - Number(driverPayment)

  const fillFromClient = (client: any) => {
    setValue("senderDocument", client.document ?? "")
    setValue("senderName", client.razonSocial ?? client.name ?? "")
    setValue("senderPhone", client.phone ?? "")
    setValue("senderCity", client.city ?? "")
    setValue("senderAddress", client.address ?? "")
  }

  const onSubmit = async (data: any) => {
    try {
      upsertClient({
        document: data.senderDocument, name: data.senderName, phone: data.senderPhone,
        city: data.senderCity, address: data.senderAddress
      })
      await updateMutation.mutateAsync({ data })
      setLocation(`/shipments/${id}`)
    } catch (e) { /* handled */ }
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
      <div className="space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="rounded-xl shrink-0" onClick={() => setLocation(`/shipments/${id}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Editar Envío</h1>
            <p className="text-primary font-bold mt-0.5 text-sm">{shipment?.guideNumber}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Client Search */}
          <Card className="p-5 rounded-2xl border-primary/20 bg-gradient-to-r from-primary/5 to-transparent shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-primary/10 p-1.5 rounded-lg text-primary"><Search className="w-4 h-4" /></div>
              <h3 className="font-bold text-sm text-primary">Cambiar remitente</h3>
              <span className="text-xs text-slate-400 ml-1">— busca un cliente para auto-completar</span>
            </div>
            <ClientSearchCombobox clients={clients ?? []} onSelect={fillFromClient} />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Remitente */}
            <Card className="p-6 rounded-2xl border-border/50 shadow-sm">
              <div className="flex items-center gap-2 mb-5 pb-3 border-b">
                <div className="bg-primary/10 p-2 rounded-lg text-primary"><MapPin className="w-4 h-4" /></div>
                <h3 className="font-bold text-base">Remitente (Origen)</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Documento (CC / NIT)</Label>
                  <Input {...register("senderDocument")} className="h-11 rounded-xl bg-slate-50"
                    onBlur={e => { const c = getClientByDocument(e.target.value); if (c) fillFromClient(c) }}
                  />
                  {errors.senderDocument && <p className="text-red-500 text-xs">{errors.senderDocument.message}</p>}
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Nombre / Razón Social</Label>
                  <Input {...register("senderName")} className="h-11 rounded-xl bg-slate-50" />
                  {errors.senderName && <p className="text-red-500 text-xs">{errors.senderName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono</Label>
                  <Input {...register("senderPhone")} className="h-11 rounded-xl bg-slate-50" />
                </div>
                <div className="space-y-1.5">
                  <Label>Ciudad de Origen</Label>
                  <Input {...register("senderCity")} className="h-11 rounded-xl bg-slate-50" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Dirección</Label>
                  <Input {...register("senderAddress")} className="h-11 rounded-xl bg-slate-50" />
                </div>
              </div>
            </Card>

            {/* Destinatario */}
            <Card className="p-6 rounded-2xl border-border/50 shadow-sm">
              <div className="flex items-center gap-2 mb-5 pb-3 border-b">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><MapPin className="w-4 h-4" /></div>
                <h3 className="font-bold text-base">Destinatario (Destino)</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Nombre Completo</Label>
                  <Input {...register("recipientName")} className="h-11 rounded-xl bg-slate-50" />
                  {errors.recipientName && <p className="text-red-500 text-xs">{errors.recipientName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono</Label>
                  <Input {...register("recipientPhone")} className="h-11 rounded-xl bg-slate-50" />
                </div>
                <div className="space-y-1.5">
                  <Label>Ciudad Destino</Label>
                  <Input {...register("recipientCity")} className="h-11 rounded-xl bg-slate-50" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Dirección</Label>
                  <Input {...register("recipientAddress")} className="h-11 rounded-xl bg-slate-50" />
                </div>
              </div>
            </Card>
          </div>

          {/* Package + Financials */}
          <Card className="p-6 rounded-2xl border-border/50 shadow-sm">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b">
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><Package className="w-4 h-4" /></div>
              <h3 className="font-bold text-base">Paquete y Tarifas</h3>
              <div className={cn(
                "ml-auto px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5",
                margin >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
              )}>
                <DollarSign className="w-3.5 h-3.5" />
                Margen: {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(margin)}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <div className="space-y-1.5">
                <Label>Peso (kg)</Label>
                <div className="relative">
                  <Input type="number" step="0.1" {...register("weight")} className="h-11 rounded-xl bg-slate-50 pr-9" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">kg</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Valor Declarado</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <Input type="number" {...register("declaredValue")} className="h-11 rounded-xl bg-slate-50 pl-6" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-primary font-bold">Costo Flete</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary text-sm font-bold">$</span>
                  <Input type="number" {...register("shippingCost")} className="h-11 rounded-xl bg-primary/5 border-primary/30 pl-6 font-semibold text-primary" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Pago Conductor</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <Input type="number" {...register("driverPayment")} className="h-11 rounded-xl bg-slate-50 pl-6" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
              <div className="space-y-1.5">
                <Label>Conductor Asignado</Label>
                <Select
                  value={shipment?.driverId ? String(shipment.driverId) : undefined}
                  onValueChange={(v) => setValue("driverId", parseInt(v))}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {drivers?.filter(d => d.isActive).map(d => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name} · {d.vehicleType}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sede de Origen</Label>
                <Select value={shipment?.branchOrigin || "Bogotá"} onValueChange={(v) => setValue("branchOrigin", v)}>
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bogotá">Sede Bogotá</SelectItem>
                    <SelectItem value="Medellín">Sede Medellín</SelectItem>
                    <SelectItem value="Cali">Sede Cali</SelectItem>
                    <SelectItem value="Barranquilla">Sede Barranquilla</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Observaciones</Label>
                <Input {...register("observations")} placeholder="Notas para la entrega..." className="h-11 rounded-xl bg-slate-50" />
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" className="h-12 px-6 rounded-xl font-semibold"
              onClick={() => setLocation(`/shipments/${id}`)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-12 px-8 rounded-xl font-bold shadow-lg hover:-translate-y-0.5 transition-all gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
              Guardar Cambios
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
