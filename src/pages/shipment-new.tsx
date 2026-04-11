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
import { ArrowLeft, Package, MapPin, DollarSign, Loader2 } from "lucide-react"
import { Link } from "wouter"
import { useClients } from "@/hooks/use-clients"
import { useListDrivers } from "@/hooks/use-drivers"
import { useAuth } from "@/hooks/use-auth"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { DriverSearchCombobox } from "@/components/driver-search-combobox"
import { Component, ErrorInfo, ReactNode } from "react"

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-white text-red-500 min-h-screen">
          <h1 className="text-2xl font-bold mb-4">Aparació un error de sistema interno:</h1>
          <p className="font-semibold">{this.state.error?.message}</p>
          <pre className="mt-4 bg-red-50 text-xs p-4 rounded overflow-auto border border-red-200">
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  recipientDocument: z.string().min(5, "Requerido"),
  recipientName: z.string().min(2, "Requerido"),
  recipientPhone: z.string().min(7, "Requerido"),
  recipientAddress: z.string().min(5, "Requerido"),
  recipientCity: z.string().min(3, "Requerido"),
  weight: z.coerce.number().min(0.1, "Mayor a 0"),
  quantity: z.coerce.number().min(1, "Mayor a 0").default(1),
  declaredValue: z.coerce.number().min(0, "Requerido"),
  shippingCost: z.coerce.number().min(0, "Requerido"),
  driverPayment: z.coerce.number().min(0, "Requerido"),
  cashOnDelivery: z.coerce.number().min(0, "Requerido").default(0),
  packageContents: z.string().optional(),
  observations: z.string().optional(),
  driverId: z.coerce.number().optional(),
  branchOrigin: z.string().min(2, "Requerido").default("Bogotá"),
  paymentMethod: z.string().default("Efectivo"),
})

type FormData = z.infer<typeof formSchema>

// ClientSearchCombobox removed

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
  const { user, profile } = useAuth()
  const createMutation = useCreateShipmentMutation()
  const { data: drivers } = useListDrivers({ onlyActive: true })
  const { getClientByDocument } = useClients()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      senderDocument: "",
      senderAddress: "TERMINAL",
      recipientDocument: "",
      weight: 1,
      quantity: 1,
      declaredValue: 0,
      shippingCost: 0,
      driverPayment: 0,
      cashOnDelivery: 0,
      branchOrigin: "Bogotá",
      paymentMethod: "Efectivo",
    }
  })

  // Fijar la ciudad de origen del remitente y la sede siempre desde la sesión del usuario
  const userBranch = profile?.branch || user?.user_metadata?.branch || "Bogotá"

  useEffect(() => {
    setValue("branchOrigin", userBranch)
    setValue("senderCity", userBranch, { shouldValidate: true })
  }, [userBranch, setValue])

  const shippingCost = watch("shippingCost") || 0
  const driverPayment = watch("driverPayment") || 0
  const margin = Number(shippingCost) - Number(driverPayment)

  const fillSenderFromClient = (client: any) => {
    setValue("senderName", client.razonSocial ?? client.name ?? "", { shouldValidate: true })
    setValue("senderPhone", client.phone ?? "", { shouldValidate: true })
    // No sobreescribir senderCity — siempre viene de la sesión del usuario
    setValue("senderAddress", client.address ?? "", { shouldValidate: true })
  }

  const fillRecipientFromClient = (client: any) => {
    setValue("recipientName", client.razonSocial ?? client.name ?? "", { shouldValidate: true })
    setValue("recipientPhone", client.phone ?? "", { shouldValidate: true })
    setValue("recipientCity", client.city ?? "", { shouldValidate: true })
    setValue("recipientAddress", client.address ?? "", { shouldValidate: true })
  }

  const onSubmit = async (data: any) => {
    try {
      // API mutation triggers upserts behind the scenes automatically
      const result = await createMutation.mutateAsync({ data })
      setLocation(`/shipments/${result.id}`)
    } catch (e) { /* handled in mutation */ }
  }

  return (
    <ErrorBoundary>
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
          {/* Search combobox banner removed */}

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
                    onBlur={e => {
                      if (!e.target.value) return;
                      const c = getClientByDocument(e.target.value);
                      if (c) fillSenderFromClient(c);
                    }}
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
                  <Input
                    value={userBranch}
                    disabled
                    className="h-11 rounded-xl bg-slate-100 font-semibold text-slate-700 cursor-not-allowed"
                  />
                  {errors.senderCity && <p className="text-red-500 text-xs">{errors.senderCity.message}</p>}
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
                  <Label>Documento (CC / NIT)</Label>
                  <Input {...register("recipientDocument")} placeholder="Ej. 900123456" 
                    className="h-11 rounded-xl bg-slate-50" 
                    onBlur={e => {
                      if (!e.target.value) return;
                      const c = getClientByDocument(e.target.value);
                      if (c) fillRecipientFromClient(c);
                    }}
                  />
                  {errors.recipientDocument && <p className="text-red-500 text-xs">{errors.recipientDocument.message}</p>}
                </div>
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
              {profile?.role === "admin" && (
                <div className={cn(
                  "ml-auto px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5",
                  margin >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                )}>
                  <DollarSign className="w-3.5 h-3.5" />
                  Margen estimado: {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(margin)}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-6 gap-5">
              <div className="space-y-1.5 lg:col-span-1">
                <Label>Cantidad (Pzs)</Label>
                <div className="relative">
                  <Input type="number" step="1" {...register("quantity")} className="h-11 rounded-xl bg-slate-50" />
                </div>
              </div>
              <div className="space-y-1.5 lg:col-span-1">
                <Label>Peso (kg)</Label>
                <div className="relative">
                  <Input type="number" step="0.1" {...register("weight")} className="h-11 rounded-xl bg-slate-50 pr-9" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">kg</span>
                </div>
              </div>
              <div className="space-y-1.5 lg:col-span-1">
                <Label>Valor Declarado</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <Input type="number" {...register("declaredValue")} className="h-11 rounded-xl bg-slate-50 pl-6" />
                </div>
              </div>
              <div className="space-y-1.5 lg:col-span-1">
                <Label className="text-primary font-bold">Costo Flete</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary text-sm font-bold">$</span>
                  <Input 
                    type="number" 
                    {...register("shippingCost")} 
                    className="h-11 rounded-xl bg-primary/5 border-primary/30 pl-6 font-semibold text-primary" 
                  />
                </div>
              </div>
              <div className="space-y-1.5 lg:col-span-1">
                <Label className="text-amber-600 font-bold">Pago Contra Entrega</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 text-sm font-bold">$</span>
                  <Input 
                    type="number" 
                    {...register("cashOnDelivery")} 
                    className="h-11 rounded-xl bg-amber-50 border-amber-200 pl-6 font-semibold text-amber-700" 
                  />
                </div>
              </div>
              <div className="space-y-1.5 lg:col-span-1">
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
                <DriverSearchCombobox
                  drivers={drivers || []}
                  value={watch("driverId")}
                  onChange={(v) => setValue("driverId", v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sede de Origen</Label>
                <Select 
                  value={watch("branchOrigin")} 
                  onValueChange={(v) => setValue("branchOrigin", v)}
                  disabled={profile?.role !== "admin"}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 opacity-100 disabled:bg-slate-100 disabled:opacity-100 disabled:cursor-auto disabled:text-slate-700 font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {profile?.role === "admin" ? (
                      <>
                        <SelectItem value="Bogotá">Sede Bogotá</SelectItem>
                        <SelectItem value="Medellín">Sede Medellín</SelectItem>
                      </>
                    ) : (
                      <SelectItem value={user?.user_metadata?.branch || "Bogotá"}>
                        Sede {user?.user_metadata?.branch || "Bogotá"}
                      </SelectItem>
                    )}
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
                <Label>Dice Contener</Label>
                <Input {...register("packageContents")} placeholder="Ej. Ropa, documentos, electrónicos..." className="h-11 rounded-xl bg-slate-50" />
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
    </ErrorBoundary>
  )
}
