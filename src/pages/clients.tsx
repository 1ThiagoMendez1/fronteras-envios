import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Search, UserPlus, MapPin, Phone, FileText, Package,
  Building2, User, Edit2, Trash2, Upload, Download, Plus, Check, ChevronsUpDown, X
} from "lucide-react"
import { useState, useRef, useCallback } from "react"
import {
  useClients,
  DEFAULT_TIPO_CLIENTE_OPTIONS,
  DEFAULT_TIPO_IDENTIFICACION_OPTIONS,
  DEFAULT_RESPONSABLE_IVA_OPTIONS,
  DEFAULT_REGIMEN_OPTIONS,
  DEFAULT_CATEGORIA_OPTIONS,
} from "@/hooks/use-clients"
import type { Client, ClientInput } from "@/hooks/use-clients"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useListShipments } from "@/hooks/use-shipments"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import * as XLSX from "xlsx"

// ─── localStorage-backed option lists (user can add new values) ───────────────
function useOptions(key: string, defaults: string[]) {
  const stored = localStorage.getItem("client_opts_" + key)
  const initial: string[] = stored ? JSON.parse(stored) : defaults

  const [options, setOptions] = useState<string[]>(initial)

  const addOption = useCallback((val: string) => {
    const next = [...options, val]
    setOptions(next)
    localStorage.setItem("client_opts_" + key, JSON.stringify(next))
  }, [key, options])

  return { options, addOption }
}

// ─── CreatableSelect ─────────────────────────────────────────────────────────
function CreatableSelect({
  options,
  onAddOption,
  value,
  onChange,
  placeholder = "Seleccionar...",
}: {
  options: string[]
  onAddOption: (val: string) => void
  value: string
  onChange: (val: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [inputVal, setInputVal] = useState("")

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(inputVal.toLowerCase())
  )
  const canCreate = inputVal.trim() && !options.some(
    (o) => o.toLowerCase() === inputVal.trim().toLowerCase()
  )

  const select = (val: string) => {
    onChange(val)
    setInputVal("")
    setOpen(false)
  }

  const create = () => {
    const v = inputVal.trim().toUpperCase()
    onAddOption(v)
    select(v)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10 rounded-xl text-sm font-normal"
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar o crear..."
            value={inputVal}
            onValueChange={setInputVal}
          />
          <CommandList>
            <CommandEmpty>
              {canCreate ? (
                <button
                  type="button"
                  onClick={create}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-left"
                >
                  <Plus className="w-4 h-4 text-primary" />
                  Crear <strong>"{inputVal.trim().toUpperCase()}"</strong>
                </button>
              ) : (
                <span className="text-xs text-muted-foreground px-3 py-2 block">Sin resultados</span>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((opt) => (
                <CommandItem key={opt} value={opt} onSelect={() => select(opt)}>
                  <Check className={cn("mr-2 h-4 w-4", value === opt ? "opacity-100" : "opacity-0")} />
                  {opt}
                </CommandItem>
              ))}
              {canCreate && filtered.length > 0 && (
                <CommandItem value={`__new__${inputVal}`} onSelect={create}>
                  <Plus className="mr-2 h-4 w-4 text-primary" />
                  Crear <strong className="ml-1">"{inputVal.trim().toUpperCase()}"</strong>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─── Zod schema ───────────────────────────────────────────────────────────────
const formSchema = z.object({
  tipoCliente:        z.string().min(1, "Requerido"),
  tipoIdentificacion: z.string().min(1, "Requerido"),
  document:           z.string().min(3, "Requerido"),
  name:               z.string().min(1, "Requerido"),
  apellido:           z.string().optional(),
  razonSocial:        z.string().optional(),
  responsableIva:     z.string().min(1, "Requerido"),
  regimen:            z.string().min(1, "Requerido"),
  categoria:          z.string().min(1, "Requerido"),
  email:              z.string().optional(),
  phone:              z.string().min(7, "Requerido"),
  departamento:       z.string().optional(),
  city:               z.string().min(2, "Requerido"),
  address:            z.string().min(3, "Requerido"),
})
type FormValues = z.infer<typeof formSchema>

// ─── TextField helper ─────────────────────────────────────────────────────────
function TextField({
  label, name, register, errors, required, placeholder, type = "text",
}: {
  label: string; name: keyof FormValues
  register: ReturnType<typeof useForm<FormValues>>["register"]
  errors: ReturnType<typeof useForm<FormValues>>["formState"]["errors"]
  required?: boolean; placeholder?: string; type?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <Input {...register(name)} type={type} placeholder={placeholder} className="rounded-xl h-10 text-sm" />
      {errors[name] && <p className="text-red-500 text-xs">{errors[name]?.message as string}</p>}
    </div>
  )
}

// ─── SelectField helper (creatable) ──────────────────────────────────────────
function SelectField({
  label, name, options, onAddOption, control, errors, required,
}: {
  label: string; name: keyof FormValues
  options: string[]; onAddOption: (v: string) => void
  control: ReturnType<typeof useForm<FormValues>>["control"]
  errors: ReturnType<typeof useForm<FormValues>>["formState"]["errors"]
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <CreatableSelect
            options={options}
            onAddOption={onAddOption}
            value={field.value as string ?? ""}
            onChange={field.onChange}
          />
        )}
      />
      {errors[name] && <p className="text-red-500 text-xs">{errors[name]?.message as string}</p>}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
const TIPO_CLIENTE_COLORS: Record<string, string> = {
  NATURAL:  "bg-blue-50 text-blue-700 border-blue-200",
  JURIDICA: "bg-violet-50 text-violet-700 border-violet-200",
}
const RESPONSABLE_IVA_COLORS: Record<string, string> = {
  SI: "bg-orange-50 text-orange-700 border-orange-200",
  NO: "bg-slate-50 text-slate-500 border-slate-200",
}
const CATEGORIA_COLORS: Record<string, string> = {
  CLIENTE:      "bg-green-50 text-green-700 border-green-200",
  CONTABILIDAD: "bg-amber-50 text-amber-700 border-amber-200",
}

function Badge({ value, colorMap }: { value: string | null | undefined; colorMap: Record<string, string> }) {
  if (!value) return <span className="text-slate-400 text-xs">—</span>
  const cls = colorMap[value] ?? "bg-slate-100 text-slate-600 border-slate-200"
  return <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", cls)}>{value}</span>
}

// ─── Shipment history ─────────────────────────────────────────────────────────
function ShipmentHistoryList({ document }: { document: string }) {
  const { data, isLoading } = useListShipments({ senderDocument: document, pageSize: 5 })
  if (isLoading)
    return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-slate-50 animate-pulse rounded-xl" />)}</div>
  const shipments = data?.shipments || []
  if (!shipments.length)
    return <p className="text-sm text-center py-6 text-slate-400">No hay envíos registrados para este cliente.</p>
  return (
    <div className="space-y-2">
      {shipments.map((s) => (
        <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
          <div>
            <p className="font-bold text-primary text-sm">{s.guideNumber}</p>
            <p className="text-xs text-slate-500">Destino: {s.recipientCity}</p>
          </div>
          <div className="text-right">
            <p className={cn("text-xs font-bold px-2 py-0.5 rounded-full border mb-1",
              s.status === "delivered" ? "bg-green-50 text-green-700 border-green-200" : "bg-blue-50 text-blue-700 border-blue-200")}>
              {s.status === "delivered" ? "Entregado" : s.status === "in_transit" ? "En Tránsito" : s.status}
            </p>
            <p className="text-xs text-slate-400">{format(new Date(s.createdAt), "dd MMM, yyyy", { locale: es })}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Client Form ──────────────────────────────────────────────────────────────
function ClientForm({
  defaultValues, onSave, onClose, isSaving,
  tipoClienteOpts, tipoIdOpts, ivaOpts, regimenOpts, categoriaOpts,
  addTipoCliente, addTipoId, addIva, addRegimen, addCategoria,
}: {
  defaultValues?: Partial<FormValues>
  onSave: (d: FormValues) => Promise<void>
  onClose: () => void
  isSaving?: boolean
  tipoClienteOpts: string[]; tipoIdOpts: string[]; ivaOpts: string[]
  regimenOpts: string[]; categoriaOpts: string[]
  addTipoCliente: (v: string) => void; addTipoId: (v: string) => void
  addIva: (v: string) => void; addRegimen: (v: string) => void; addCategoria: (v: string) => void
}) {
  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipoCliente: "", tipoIdentificacion: "", document: "", name: "",
      apellido: "", razonSocial: "", responsableIva: "", regimen: "",
      categoria: "", email: "", phone: "", departamento: "", city: "", address: "",
      ...defaultValues,
    },
  })

  const tipoCliente = watch("tipoCliente")
  const isJuridica = tipoCliente === "JURIDICA"

  return (
    <form onSubmit={handleSubmit(async (d) => { await onSave(d); onClose() })}
      className="space-y-5 py-2 overflow-y-auto max-h-[72vh] pr-1">

      {/* Clasificación */}
      <section className="space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clasificación</p>
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Tipo de Cliente" name="tipoCliente" options={tipoClienteOpts} onAddOption={addTipoCliente} control={control} errors={errors} required />
          <SelectField label="Categoría" name="categoria" options={categoriaOpts} onAddOption={addCategoria} control={control} errors={errors} required />
        </div>
      </section>

      {/* Identificación */}
      <section className="space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identificación</p>
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Tipo ID" name="tipoIdentificacion" options={tipoIdOpts} onAddOption={addTipoId} control={control} errors={errors} required />
          <TextField label="Número de Identificación" name="document" register={register} errors={errors} required placeholder="Ej: 900123456" />
        </div>
      </section>

      {/* Datos personales / empresa */}
      <section className="space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {isJuridica ? "Datos de la Empresa" : "Datos Personales"}
        </p>
        {isJuridica ? (
          <>
            <TextField label="Razón Social" name="razonSocial" register={register} errors={errors} placeholder="Ej: Empresa S.A.S." />
            <TextField label="Nombre del Responsable" name="name" register={register} errors={errors} required placeholder="Nombre y apellido" />
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Nombre" name="name" register={register} errors={errors} required placeholder="Ej: Juan" />
            <TextField label="Apellido" name="apellido" register={register} errors={errors} placeholder="Ej: Pérez" />
          </div>
        )}
      </section>

      {/* Tributario */}
      <section className="space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Información Tributaria</p>
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Responsable IVA" name="responsableIva" options={ivaOpts} onAddOption={addIva} control={control} errors={errors} required />
          <SelectField label="Régimen" name="regimen" options={regimenOpts} onAddOption={addRegimen} control={control} errors={errors} required />
        </div>
      </section>

      {/* Contacto */}
      <section className="space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contacto</p>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Teléfono" name="phone" register={register} errors={errors} required placeholder="Ej: 3001234567" />
          <TextField label="Correo" name="email" register={register} errors={errors} type="email" placeholder="correo@ejemplo.com" />
        </div>
      </section>

      {/* Ubicación */}
      <section className="space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ubicación</p>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Departamento" name="departamento" register={register} errors={errors} placeholder="Ej: Cundinamarca" />
          <TextField label="Ciudad" name="city" register={register} errors={errors} required placeholder="Ej: Bogotá" />
        </div>
        <TextField label="Dirección" name="address" register={register} errors={errors} required placeholder="Ej: Calle 123 #45-67" />
      </section>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="ghost" className="flex-1 rounded-xl" onClick={onClose}>Cancelar</Button>
        <Button type="submit" className="flex-1 h-11 rounded-xl font-bold" disabled={isSaving}>
          {isSaving ? "Guardando..." : "Guardar Cliente"}
        </Button>
      </div>
    </form>
  )
}

// ─── Excel utilities ──────────────────────────────────────────────────────────
const EXCEL_COLUMNS = [
  "TIPO CLIENTE", "IDENTIFICACION", "TIPO_IDENTIFICACION", "NOMBRE",
  "APELLIDO", "RAZON_SOCIAL", "RESPONSABLE_IVA", "REGIMEN",
  "CORREO", "TELEFONO", "DEPARTAMENTO", "CIUDAD", "DIRECCION", "CATEGORIA",
]

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([EXCEL_COLUMNS])
  // Style header row (xlsx CE doesn't support styles but we can set column widths)
  ws["!cols"] = EXCEL_COLUMNS.map(() => ({ wch: 20 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Clientes")
  XLSX.writeFile(wb, "plantilla_clientes.xlsx")
}

function parseExcel(file: File): Promise<ClientInput[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: "array" })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" })
        const clients: ClientInput[] = rows
          .filter(r => r["IDENTIFICACION"]?.toString().trim())
          .map(r => ({
            tipoCliente:        r["TIPO CLIENTE"]?.toString().trim().toUpperCase() || null,
            tipoIdentificacion: r["TIPO_IDENTIFICACION"]?.toString().trim().toUpperCase() || null,
            document:           r["IDENTIFICACION"]?.toString().trim(),
            name:               r["NOMBRE"]?.toString().trim() || "",
            apellido:           r["APELLIDO"]?.toString().trim() || null,
            razonSocial:        r["RAZON_SOCIAL"]?.toString().trim() || null,
            responsableIva:     r["RESPONSABLE_IVA"]?.toString().trim().toUpperCase() || null,
            regimen:            r["REGIMEN"]?.toString().trim().toUpperCase() || null,
            email:              r["CORREO"]?.toString().trim() || null,
            phone:              r["TELEFONO"]?.toString().trim() || "",
            departamento:       r["DEPARTAMENTO"]?.toString().trim() || null,
            city:               r["CIUDAD"]?.toString().trim() || "",
            address:            r["DIRECCION"]?.toString().trim() || "",
            categoria:          r["CATEGORIA"]?.toString().trim().toUpperCase() || null,
          }))
        resolve(clients)
      } catch (err) {
        reject(err)
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

// ─── Bulk Import Dialog ───────────────────────────────────────────────────────
function BulkImportDialog({
  open, onClose, onImport, isLoading,
}: {
  open: boolean; onClose: () => void
  onImport: (rows: ClientInput[]) => Promise<void>; isLoading: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ClientInput[]>([])
  const [fileName, setFileName] = useState("")
  const [error, setError] = useState("")

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError("")
    try {
      const rows = await parseExcel(file)
      setPreview(rows)
      setFileName(file.name)
    } catch {
      setError("Error al leer el archivo. Asegúrate de usar la plantilla correcta.")
    }
  }

  const reset = () => {
    setPreview([]); setFileName(""); setError("")
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleImport = async () => {
    if (!preview.length) return
    await onImport(preview)
    reset(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose() } }}>
      <DialogContent className="sm:max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" /> Importar Clientes desde Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Template download */}
          <div className="flex items-center justify-between p-3 border rounded-xl bg-slate-50">
            <div>
              <p className="text-sm font-semibold">1. Descarga la plantilla</p>
              <p className="text-xs text-slate-500">Usa esta plantilla con el orden exacto de columnas</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-lg gap-2" onClick={downloadTemplate}>
              <Download className="w-4 h-4" /> Plantilla .xlsx
            </Button>
          </div>

          {/* File upload */}
          <div>
            <p className="text-sm font-semibold mb-2">2. Sube el archivo diligenciado</p>
            <label className={cn(
              "flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors",
              fileName ? "border-primary/40 bg-primary/5" : "border-slate-200 hover:border-primary/30"
            )}>
              <Upload className="w-8 h-8 text-slate-400" />
              {fileName
                ? <span className="text-sm font-semibold text-primary">{fileName}</span>
                : <span className="text-sm text-slate-500">Clic para seleccionar archivo .xlsx o .csv</span>
              }
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            </label>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">{preview.length} cliente{preview.length !== 1 ? "s" : ""} encontrado{preview.length !== 1 ? "s" : ""}</p>
                <button type="button" onClick={reset} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                  <X className="w-3 h-3" /> Limpiar
                </button>
              </div>
              <div className="overflow-x-auto border rounded-xl max-h-48">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 font-semibold border-b">
                    <tr>
                      {["Tipo", "ID", "Tipo ID", "Nombre", "Ciudad", "Categoría"].map(h => (
                        <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {preview.slice(0, 8).map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5">{r.tipoCliente ?? "—"}</td>
                        <td className="px-3 py-1.5 font-mono">{r.document}</td>
                        <td className="px-3 py-1.5">{r.tipoIdentificacion ?? "—"}</td>
                        <td className="px-3 py-1.5">{r.name}</td>
                        <td className="px-3 py-1.5">{r.city}</td>
                        <td className="px-3 py-1.5">{r.categoria ?? "—"}</td>
                      </tr>
                    ))}
                    {preview.length > 8 && (
                      <tr><td colSpan={6} className="px-3 py-1.5 text-center text-slate-400">...y {preview.length - 8} más</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => { reset(); onClose() }}>Cancelar</Button>
            <Button
              className="flex-1 h-11 rounded-xl font-bold"
              disabled={!preview.length || isLoading}
              onClick={handleImport}
            >
              {isLoading ? "Importando..." : `Importar ${preview.length} cliente${preview.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const { clients, upsertClient, updateClient, deleteClient, bulkInsert, isSaving, isBulkLoading } = useClients()

  // Option lists (creatable)
  const { options: tipoClienteOpts, addOption: addTipoCliente } = useOptions("tipoCliente",  DEFAULT_TIPO_CLIENTE_OPTIONS)
  const { options: tipoIdOpts,      addOption: addTipoId      } = useOptions("tipoId",        DEFAULT_TIPO_IDENTIFICACION_OPTIONS)
  const { options: ivaOpts,         addOption: addIva         } = useOptions("iva",           DEFAULT_RESPONSABLE_IVA_OPTIONS)
  const { options: regimenOpts,     addOption: addRegimen     } = useOptions("regimen",       DEFAULT_REGIMEN_OPTIONS)
  const { options: categoriaOpts,   addOption: addCategoria   } = useOptions("categoria",     DEFAULT_CATEGORIA_OPTIONS)

  const [searchTerm,     setSearchTerm]     = useState("")
  const [isCreateOpen,     setIsCreateOpen]     = useState(false)
  const [editClient,       setEditClient]       = useState<Client | null>(null)
  const [deleteTarget,     setDeleteTarget]     = useState<Client | null>(null)
  const [bulkDeleteOpen,   setBulkDeleteOpen]   = useState(false)
  const [viewClient,       setViewClient]       = useState<Client | null>(null)
  const [isBulkOpen,       setIsBulkOpen]       = useState(false)
  const [selectedIds,      setSelectedIds]      = useState<Set<number>>(new Set())

  const sharedFormProps = {
    tipoClienteOpts, tipoIdOpts, ivaOpts, regimenOpts, categoriaOpts,
    addTipoCliente, addTipoId, addIva, addRegimen, addCategoria,
  }

  const displayName = (c: Client) =>
    c.tipoCliente === "JURIDICA" && c.razonSocial
      ? c.razonSocial
      : `${c.name}${c.apellido ? " " + c.apellido : ""}`

  const filteredClients = clients.filter((c) => {
    const s = searchTerm.toLowerCase()
    return (
      c.name.toLowerCase().includes(s) ||
      c.document.includes(s) ||
      (c.razonSocial ?? "").toLowerCase().includes(s) ||
      (c.apellido ?? "").toLowerCase().includes(s) ||
      (c.city ?? "").toLowerCase().includes(s)
    )
  })

  const allFilteredIds     = filteredClients.map(c => c.id)
  const allSelected        = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id))
  const someSelected       = allFilteredIds.some(id => selectedIds.has(id)) && !allSelected
  const selectedCount      = [...selectedIds].filter(id => allFilteredIds.includes(id)).length

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(prev => { const n = new Set(prev); allFilteredIds.forEach(id => n.delete(id)); return n })
    } else {
      setSelectedIds(prev => new Set([...prev, ...allFilteredIds]))
    }
  }

  const toggleRow = (id: number) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const handleBulkDelete = async () => {
    const ids = [...selectedIds].filter(id => allFilteredIds.includes(id))
    await Promise.all(ids.map(id => deleteClient(id)))
    setSelectedIds(new Set())
    setBulkDeleteOpen(false)
  }

  const handleCreate = async (d: FormValues) => {
    await upsertClient({
      tipoCliente: d.tipoCliente, tipoIdentificacion: d.tipoIdentificacion,
      document: d.document, name: d.name, apellido: d.apellido || null,
      razonSocial: d.razonSocial || null, responsableIva: d.responsableIva,
      regimen: d.regimen, categoria: d.categoria, email: d.email || null,
      phone: d.phone, departamento: d.departamento || null, city: d.city, address: d.address,
    })
  }

  const handleEdit = async (d: FormValues) => {
    if (!editClient) return
    await updateClient({
      id: editClient.id,
      tipoCliente: d.tipoCliente, tipoIdentificacion: d.tipoIdentificacion,
      document: d.document, name: d.name, apellido: d.apellido || null,
      razonSocial: d.razonSocial || null, responsableIva: d.responsableIva,
      regimen: d.regimen, categoria: d.categoria, email: d.email || null,
      phone: d.phone, departamento: d.departamento || null, city: d.city, address: d.address,
    })
  }

  const clientToForm = (c: Client): Partial<FormValues> => ({
    tipoCliente: c.tipoCliente ?? "", tipoIdentificacion: c.tipoIdentificacion ?? "",
    document: c.document, name: c.name, apellido: c.apellido ?? "",
    razonSocial: c.razonSocial ?? "", responsableIva: c.responsableIva ?? "",
    regimen: c.regimen ?? "", categoria: c.categoria ?? "",
    email: c.email ?? "", phone: c.phone,
    departamento: c.departamento ?? "", city: c.city, address: c.address,
  })

  type FormValues = z.infer<typeof formSchema>

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Directorio de Clientes</h1>
            <p className="text-muted-foreground mt-1">Gestiona clientes, información tributaria e historial de envíos.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl h-10 gap-2 font-semibold"
              onClick={() => setIsBulkOpen(true)}>
              <Upload className="w-4 h-4" /> Importar Excel
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl h-10 font-semibold gap-2">
                  <UserPlus className="w-4 h-4" /> Nuevo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl rounded-2xl">
                <DialogHeader><DialogTitle>Registrar Nuevo Cliente</DialogTitle></DialogHeader>
                <ClientForm
                  onSave={handleCreate}
                  onClose={() => setIsCreateOpen(false)}
                  isSaving={isSaving}
                  {...sharedFormProps}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Table */}
        <Card className="p-4 sm:p-6 rounded-2xl shadow-sm border-border/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-5">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nombre, razón social, documento..."
                className="pl-9 h-11 bg-slate-50/50 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <p className="text-sm text-slate-400 shrink-0">
              {filteredClients.length} cliente{filteredClients.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 text-xs">
                <tr>
                  <th className="px-3 py-3 w-10">
                <Checkbox
                  checked={allSelected}
                  data-state={someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"}
                  onCheckedChange={toggleAll}
                  aria-label="Seleccionar todos"
                />
              </th>
              <th className="px-3 py-3 whitespace-nowrap">Tipo Cliente</th>
                  <th className="px-3 py-3 whitespace-nowrap">Identificación</th>
                  <th className="px-3 py-3 whitespace-nowrap">Tipo ID</th>
                  <th className="px-3 py-3 whitespace-nowrap">Nombre / Razón Social</th>
                  <th className="px-3 py-3 whitespace-nowrap">Resp. IVA</th>
                  <th className="px-3 py-3 whitespace-nowrap">Régimen</th>
                  <th className="px-3 py-3 whitespace-nowrap">Correo</th>
                  <th className="px-3 py-3 whitespace-nowrap">Teléfono</th>
                  <th className="px-3 py-3 whitespace-nowrap">Departamento</th>
                  <th className="px-3 py-3 whitespace-nowrap">Ciudad</th>
                  <th className="px-3 py-3 whitespace-nowrap">Dirección</th>
                  <th className="px-3 py-3 whitespace-nowrap">Categoría</th>
                  <th className="px-3 py-3 whitespace-nowrap text-center">Env. Mes</th>
                  <th className="px-3 py-3 whitespace-nowrap text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((client) => (
                  <tr key={client.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-3 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(client.id)}
                        onCheckedChange={() => toggleRow(client.id)}
                        aria-label={`Seleccionar ${displayName(client)}`}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        {client.tipoCliente === "JURIDICA"
                          ? <Building2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                          : <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        <Badge value={client.tipoCliente} colorMap={TIPO_CLIENTE_COLORS} />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 font-medium">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {client.document}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs font-semibold text-slate-600">
                      {client.tipoIdentificacion ?? "—"}
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-900 max-w-[180px]">
                      <span className="truncate block">{displayName(client)}</span>
                      {client.tipoCliente === "JURIDICA" && client.name && (
                        <span className="text-xs font-normal text-slate-400 block truncate">{client.name}</span>
                      )}
                      {client.apellido && client.tipoCliente !== "JURIDICA" && (
                        <span className="sr-only">{client.apellido}</span>
                      )}
                    </td>
                    <td className="px-3 py-3"><Badge value={client.responsableIva} colorMap={RESPONSABLE_IVA_COLORS} /></td>
                    <td className="px-3 py-3 text-xs text-slate-600">{client.regimen ?? "—"}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 max-w-[140px]">
                      <span className="truncate block">{client.email ?? "—"}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs">{client.phone}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">{client.departamento ?? "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs">{client.city}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500 max-w-[150px]">
                      <span className="truncate block">{client.address}</span>
                    </td>
                    <td className="px-3 py-3"><Badge value={client.categoria} colorMap={CATEGORIA_COLORS} /></td>
                    <td className="px-3 py-3">
                      <div
                        className="flex items-center justify-center gap-1 bg-blue-50 text-blue-700 py-1 px-2.5 rounded-full font-bold w-fit mx-auto cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => setViewClient(client)}
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span className="text-xs">{client.totalShipmentsThisMonth}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10"
                          onClick={() => setEditClient(client)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteTarget(client)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={15} className="px-6 py-12 text-center text-slate-400">
                      No se encontraron clientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editClient} onOpenChange={(o) => !o && setEditClient(null)}>
          <DialogContent className="sm:max-w-xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-primary" />
                Editar Cliente
              </DialogTitle>
            </DialogHeader>
            {editClient && (
              <ClientForm
                defaultValues={clientToForm(editClient)}
                onSave={handleEdit}
                onClose={() => setEditClient(null)}
                isSaving={isSaving}
                {...sharedFormProps}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* View / Shipment History */}
        <Dialog open={!!viewClient} onOpenChange={(o) => !o && setViewClient(null)}>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                {viewClient?.tipoCliente === "JURIDICA"
                  ? <Building2 className="w-5 h-5 text-violet-500" />
                  : <User className="w-5 h-5 text-blue-500" />}
                {viewClient ? displayName(viewClient) : ""}
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border grid grid-cols-2 gap-x-6 gap-y-3">
                {([
                  ["Tipo Cliente",    <Badge value={viewClient?.tipoCliente}    colorMap={TIPO_CLIENTE_COLORS} />],
                  ["Tipo ID",         <span className="font-mono text-xs font-bold">{viewClient?.tipoIdentificacion ?? "—"}</span>],
                  ["Identificación",  <span className="font-bold text-sm">{viewClient?.document}</span>],
                  ["Resp. IVA",       <Badge value={viewClient?.responsableIva} colorMap={RESPONSABLE_IVA_COLORS} />],
                  ["Régimen",         <span className="font-bold text-sm">{viewClient?.regimen ?? "—"}</span>],
                  ["Categoría",       <Badge value={viewClient?.categoria}      colorMap={CATEGORIA_COLORS} />],
                  ["Teléfono",        <span className="font-bold text-sm">{viewClient?.phone}</span>],
                  ["Correo",          <span className="font-bold text-sm">{viewClient?.email ?? "—"}</span>],
                  ["Departamento",    <span className="font-bold text-sm">{viewClient?.departamento ?? "—"}</span>],
                  ["Ciudad",          <span className="font-bold text-sm">{viewClient?.city}</span>],
                ] as [string, React.ReactNode][]).map(([label, val], i) => (
                  <div key={i}>
                    <p className="text-xs text-slate-500 font-medium uppercase mb-0.5">{label}</p>
                    {val}
                  </div>
                ))}
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 font-medium uppercase mb-0.5">Dirección</p>
                  <p className="font-bold text-sm">{viewClient?.address}</p>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-400" /> Últimos Envíos
                </h4>
                <ShipmentHistoryList document={viewClient?.document || ""} />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará permanentemente el cliente <strong>{deleteTarget ? displayName(deleteTarget) : ""}</strong> con identificación <strong>{deleteTarget?.document}</strong>. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl bg-red-600 hover:bg-red-700"
                onClick={async () => {
                  if (deleteTarget) {
                    await deleteClient(deleteTarget.id)
                    setDeleteTarget(null)
                  }
                }}
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Import */}
        <BulkImportDialog
          open={isBulkOpen}
          onClose={() => setIsBulkOpen(false)}
          onImport={bulkInsert}
          isLoading={isBulkLoading}
        />

        {/* Bulk Delete Confirmation */}
        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar {selectedCount} cliente{selectedCount !== 1 ? "s" : ""}?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminarán permanentemente <strong>{selectedCount}</strong> cliente{selectedCount !== 1 ? "s" : ""} seleccionado{selectedCount !== 1 ? "s" : ""}. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl bg-red-600 hover:bg-red-700"
                onClick={handleBulkDelete}
              >
                Eliminar {selectedCount} cliente{selectedCount !== 1 ? "s" : ""}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Floating bulk action bar */}
        {selectedCount > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10 animate-in slide-in-from-bottom-4">
            <span className="text-sm font-semibold">{selectedCount} seleccionado{selectedCount !== 1 ? "s" : ""}</span>
            <div className="w-px h-5 bg-white/20" />
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10 h-8 rounded-lg text-xs"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="w-3.5 h-3.5 mr-1" /> Deseleccionar
            </Button>
            <Button
              size="sm"
              className="bg-red-500 hover:bg-red-600 h-8 rounded-lg text-xs font-bold gap-1.5"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" /> Eliminar seleccionados
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
