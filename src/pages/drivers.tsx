import { useState } from "react"
import { useListDrivers } from "@/hooks/use-drivers"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { formatCurrency, cn } from "@/lib/utils"
import { Search, Plus, Truck, Phone, MapPin, Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useCreateDriverMutation, useUpdateDriverMutation, useDeleteDriverMutation } from "@/hooks/use-drivers-wrapper"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Label } from "@/components/ui/label"

const formSchema = z.object({
  name: z.string().min(2, "Requerido"),
  phone: z.string().min(7, "Requerido"),
  email: z.string().optional(),
  company: z.string().optional(),
  vehicleType: z.string().min(2, "Requerido"),
  city: z.string().min(3, "Requerido"),
  ratePerDelivery: z.coerce.number().min(0, "Requerido")
})

type FormValues = z.infer<typeof formSchema>

type Driver = {
  id: number
  name: string
  phone: string
  email?: string
  company?: string
  vehicleType: string
  city: string
  ratePerDelivery: number
  isActive: boolean
}

function DriverForm({
  defaultValues,
  onSubmit,
  isLoading,
}: {
  defaultValues?: Partial<FormValues>
  onSubmit: (data: FormValues) => void
  isLoading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: { vehicleType: "van", ratePerDelivery: 0, ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Nombre Completo</Label>
          <Input {...register("name")} className="rounded-xl bg-slate-50" />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Teléfono</Label>
          <Input {...register("phone")} className="rounded-xl bg-slate-50" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Ciudad Principal</Label>
          <Input {...register("city")} className="rounded-xl bg-slate-50" />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo de Vehículo</Label>
          <Input {...register("vehicleType")} placeholder="Ej. Bus, Moto, Furgón..." className="rounded-xl bg-slate-50" />
          {errors.vehicleType && <p className="text-xs text-red-500">{errors.vehicleType.message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Email (Opcional)</Label>
          <Input {...register("email")} className="rounded-xl bg-slate-50" type="email" />
        </div>
        <div className="space-y-1.5">
          <Label>Empresa (Opcional)</Label>
          <Input {...register("company")} className="rounded-xl bg-slate-50" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Tarifa Base Acordada</Label>
        <Input type="number" {...register("ratePerDelivery")} className="rounded-xl bg-slate-50" />
      </div>
      <Button type="submit" className="w-full h-11 rounded-xl mt-2" disabled={isLoading}>
        {isLoading ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  )
}

export default function Drivers() {
  const { data: drivers, isLoading } = useListDrivers()
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editDriver, setEditDriver] = useState<Driver | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null)

  const createMutation = useCreateDriverMutation()
  // For edit we need a dynamic hook — we'll pass the id via a wrapper component
  const deleteMutation = useDeleteDriverMutation()

  const filteredDrivers = drivers?.filter(d =>
    search ? d.name.toLowerCase().includes(search.toLowerCase()) || d.city.toLowerCase().includes(search.toLowerCase()) : true
  ) || []

  const vehicleLabel: Record<string, string> = {
    motorcycle: "Moto", car: "Auto", van: "Furgoneta", truck: "Camión", office: "Oficina", bus: "Bus"
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Flota de Conductores</h1>
            <p className="text-muted-foreground mt-1">Gestión de conductores tercerizados y vehículos.</p>
          </div>
          <Button className="rounded-xl h-12 px-6 font-semibold shadow-lg shadow-primary/20" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 w-5 h-5" /> Registrar Conductor
          </Button>
        </div>

        {/* Search */}
        <div className="relative w-full max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Buscar por nombre o ciudad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 rounded-xl shadow-sm border-border/50"
          />
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {isLoading ? (
            <div className="col-span-full py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-2xl border border-dashed">
              No se encontraron conductores.
            </div>
          ) : (
            filteredDrivers.map(driver => (
              <Card key={driver.id} className={cn(
                "p-5 rounded-2xl shadow-sm border-border/50 hover:shadow-md transition-shadow relative overflow-hidden group",
                !driver.isActive && "opacity-60"
              )}>
                {/* Status stripe */}
                <div className={cn("absolute top-0 right-0 w-1.5 h-full", driver.isActive ? "bg-emerald-500" : "bg-slate-300")} />

                {/* Name & city */}
                <div className="flex items-start justify-between mb-3 pr-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg shrink-0",
                      driver.isActive ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
                    )}>
                      {driver.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-md text-foreground leading-tight">{driver.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {driver.city}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Teléfono</span>
                    <span className="font-medium text-slate-700">{driver.phone}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-2"><Truck className="w-3.5 h-3.5" /> Vehículo</span>
                    <span className="font-medium px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs capitalize">
                      {vehicleLabel[driver.vehicleType] ?? driver.vehicleType}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100">
                    <span className="text-slate-500">Tarifa Base</span>
                    <span className="font-bold text-primary">{formatCurrency(driver.ratePerDelivery)}</span>
                  </div>
                </div>

                {/* Action row */}
                <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-100">
                  <ToggleStatusButton driver={driver} />
                  <div className="flex-1" />
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10"
                    onClick={() => setEditDriver(driver as Driver)}
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setDeleteTarget(driver as Driver)}
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Nuevo Conductor Tercerizado</DialogTitle>
            </DialogHeader>
            <DriverForm
              isLoading={createMutation.isPending}
              onSubmit={async (data) => {
                await createMutation.mutateAsync({ data })
                setCreateOpen(false)
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        {editDriver && (
          <EditDriverDialog
            driver={editDriver}
            onClose={() => setEditDriver(null)}
          />
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Desactivar a {deleteTarget?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                El conductor quedará marcado como inactivo y no aparecerá en las asignaciones. Podrás reactivarlo en cualquier momento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl bg-red-600 hover:bg-red-700"
                onClick={async () => {
                  if (deleteTarget) {
                    await deleteMutation.mutateAsync(deleteTarget.id)
                    setDeleteTarget(null)
                  }
                }}
              >
                Desactivar Conductor
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}

/** Separate component so the hook can be called with the correct id */
function EditDriverDialog({ driver, onClose }: { driver: Driver; onClose: () => void }) {
  const updateMutation = useUpdateDriverMutation(driver.id)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Conductor — {driver.name}</DialogTitle>
        </DialogHeader>
        <DriverForm
          defaultValues={{
            name: driver.name,
            phone: driver.phone,
            email: driver.email,
            company: driver.company,
            vehicleType: driver.vehicleType as any,
            city: driver.city,
            ratePerDelivery: driver.ratePerDelivery,
          }}
          isLoading={updateMutation.isPending}
          onSubmit={async (data) => {
            await updateMutation.mutateAsync({ data })
            onClose()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

/** Toggle active / inactive inline */
function ToggleStatusButton({ driver }: { driver: Driver }) {
  const updateMutation = useUpdateDriverMutation(driver.id)
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-7 rounded-lg text-[11px] font-semibold gap-1.5 px-2",
        driver.isActive
          ? "text-emerald-600 hover:bg-emerald-50"
          : "text-slate-400 hover:bg-slate-100"
      )}
      onClick={() => updateMutation.mutateAsync({ data: { isActive: !driver.isActive } })}
      disabled={updateMutation.isPending}
      title={driver.isActive ? "Desactivar" : "Activar"}
    >
      {driver.isActive
        ? <><ToggleRight className="w-4 h-4" /> Activo</>
        : <><ToggleLeft className="w-4 h-4" /> Inactivo</>
      }
    </Button>
  )
}
