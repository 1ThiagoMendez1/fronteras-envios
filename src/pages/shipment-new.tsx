import { useLocation } from "wouter"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { useCreateShipmentMutation } from "@/hooks/use-shipments-wrapper"
import { ArrowLeft, Package, User, MapPin, DollarSign, Loader2, Truck, Building2, PenLine, Search, X, Check, ChevronDown } from "lucide-react"
import { Link } from "wouter"
import { useClients } from "@/hooks/use-clients"
import { useListDrivers } from "@/hooks/use-drivers"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

const COVERAGE_CITIES = [
  "Aguazul", "Apartadó", "Barranquilla", "Bogotá", "Bucaramanga", "Cali", 
  "Carepa", "Cartagena", "Chigorodó", "Cúcuta", "Ipiales", "Istmina", 
  "La Hormiga", "Maicao", "Medellín", "Mocoa", "Montería", "Necoclí", 
  "Pasto", "Popayán", "Puerto Asís", "Quibdó", "Riohacha", "Santa Marta", 
  "Sincelejo", "Tadó", "Turbo", "Yopal"
].sort((a,b) => a.localeCompare(b));

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
  paymentMethod: z.string().default("Efectivo"),
})

type FormData = z.infer<typeof formSchema>

/** Inline client search combobox — searches by name, document or city */
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
        <div className="absolute z-50 top-full mt-1 w-full max-h-[300px] overflow-y-auto bg-white border border-border/50 rounded-xl shadow-2xl py-1">
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
              <Check className="w-4 h-4 text-primary ml-auto shrink-0 mt-1 opacity-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CitySearchCombobox({ value, onChange }: { value: string, onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState(value || "")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setQ(value || "") }, [value])

  const filtered = COVERAGE_CITIES.filter(c => c.toLowerCase().includes(q.toLowerCase()))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <Input
        value={q}
        onChange={e => {
          setQ(e.target.value)
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar o escribir (Ej. Bogotá)"
        className="h-11 rounded-xl bg-slate-50"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full max-h-[200px] overflow-y-auto bg-white border border-border/50 rounded-xl shadow-2xl py-1">
          {filtered.map(c => (
             <button
              key={c}
              type="button"
              className="w-full px-4 py-2 hover:bg-slate-50 text-left text-sm text-slate-700"
              onClick={() => {
                setQ(c)
                onChange(c)
                setOpen(false)
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NewShipment() {
  const [, setLocation] = useLocation()
  const createMutation = useCreateShipmentMutation()
  const { data: drivers } = useListDrivers({ onlyActive: true })
  const { clients, getClientByDocument, upsertClient } = useClients()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      senderDocument: "",
      weight: 1,
      declaredValue: 0,
      shippingCost: 0,
      driverPayment: 0,
      branchOrigin: "Bogotá",
      paymentMethod: "Efectivo",
    }
  })

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
        document: data.senderDocument,
        name: data.senderName,
        phone: data.senderPhone,
        city: data.senderCity,
        address: data.senderAddress
      })
      const result = await createMutation.mutateAsync({ data })
      setLocation(`/shipments/${result.id}`)
    } catch (e) { /* handled in mutation */ }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/shipments">
            <Button variant="outline" size="icon" className="rounded-xl shrink-0"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Registrar Nuevo Envío</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">Completa los datos para generar la guía de transporte.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Client Search Banner */}
          <Card className="p-5 rounded-2xl border-primary/20 bg-gradient-to-r from-primary/5 to-transparent shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-primary/10 p-1.5 rounded-lg text-primary"><Search className="w-4 h-4" /></div>
              <h3 className="font-bold text-sm text-primary">Buscar cliente existente</h3>
              <span className="text-xs text-slate-400 ml-1">— Auto-completa el formulario de remitente</span>
            </div>
            <ClientSearchCombobox
              clients={clients ?? []}
              onSelect={fillFromClient}
            />
          </Card>

          {/* Sender & Recipient — side by side */}
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
                  <Input {...register("senderDocument")} placeholder="Ej. 900123456"
                    className="h-11 rounded-xl bg-slate-50"
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
                  <CitySearchCombobox
                    value={watch("recipientCity")}
                    onChange={(v) => setValue("recipientCity", v, { shouldValidate: true })}
                  />
                  {errors.recipientCity && <p className="text-red-500 text-xs">{errors.recipientCity.message}</p>}
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

              {/* Live margin preview */}
              <div className={cn(
                "ml-auto px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5",
                margin >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
              )}>
                <DollarSign className="w-3.5 h-3.5" />
                Margen estimado: {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(margin)}
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
                <Label className="text-primary font-bold">Costo Flete (Cobro)</Label>
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-5">
              <div className="space-y-1.5">
                <Label>Asignar Conductor</Label>
                <Select onValueChange={(v) => setValue("driverId", parseInt(v))}>
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {drivers?.filter(d => d.isActive).map(d => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name} · {d.vehicleType} · {d.city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sede de Origen</Label>
                <Select defaultValue="Bogotá" onValueChange={(v) => setValue("branchOrigin", v)}>
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bogotá">Sede Bogotá</SelectItem>
                    <SelectItem value="Medellín">Sede Medellín</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Método de Pago</Label>
                <Select defaultValue="Efectivo" onValueChange={(v) => setValue("paymentMethod", v)}>
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efectivo">Efectivo 💵</SelectItem>
                    <SelectItem value="Nequi">Nequi 📱</SelectItem>
                    <SelectItem value="DaviPlata">DaviPlata 📱</SelectItem>
                    <SelectItem value="Transferencia">Transferencia 🏦</SelectItem>
                    <SelectItem value="Tarjeta">Tarjeta 💳</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Observaciones</Label>
                <Input {...register("observations")} placeholder="Notas..." className="h-11 rounded-xl bg-slate-50" />
              </div>
            </div>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Link href="/shipments">
              <Button variant="outline" type="button" className="h-12 px-6 rounded-xl font-semibold">Cancelar</Button>
            </Link>
            <Button
              type="submit"
              className="h-12 px-8 rounded-xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all gap-2"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
              Generar Guía de Envío
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
