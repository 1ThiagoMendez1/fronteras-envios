import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { X, Check } from "lucide-react"

export function DriverSearchCombobox({ 
  drivers, 
  value, 
  onChange 
}: { 
  drivers: any[], 
  value?: number | string, 
  onChange: (id: number | undefined) => void 
}) {
  const [open, setOpen] = useState(false)
  const numericValue = value ? Number(value) : undefined
  const selectedDriver = drivers?.find(d => d.id === numericValue)
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      if (selectedDriver) {
        setQ(`${selectedDriver.name} - ${selectedDriver.vehicleType}`)
      } else {
        setQ("")
      }
    }
  }, [selectedDriver, open])

  const filtered = (drivers || [])
    .filter(d => d.isActive)
    .filter(d => {
      if (!q) return true;
      if (!open) return true; // Si está cerrado, no filtramos aunque q tenga el nombre
      const s = q.toLowerCase()
      // Si el texto es igual al conductor seleccionado, mostramos todos
      if (selectedDriver && q === `${selectedDriver.name} - ${selectedDriver.vehicleType}`) {
        return true
      }
      return d.name?.toLowerCase().includes(s) || 
             d.vehicleType?.toLowerCase().includes(s) || 
             d.city?.toLowerCase().includes(s)
    })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Input
          value={q}
          onChange={e => {
            setQ(e.target.value)
            setOpen(true)
            // Si el input se vacía, deseleccionamos el conductor
            if (e.target.value === "") {
                onChange(undefined)
            }
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar conductor..."
          className="h-11 rounded-xl bg-slate-50 pr-8"
        />
        {q && (
          <button 
            type="button" 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={(e) => { 
                e.preventDefault()
                e.stopPropagation()
                setQ("")
                onChange(undefined)
                setTimeout(() => setOpen(true), 0) 
            }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full max-h-[250px] overflow-y-auto bg-white border border-border/50 rounded-xl shadow-2xl py-1">
          {filtered.length === 0 && (
            <p className="p-3 text-sm text-slate-500 text-center">No se encontraron conductores</p>
          )}
          {filtered.map(d => (
             <button
              key={d.id}
              type="button"
              className="w-full px-4 py-3 hover:bg-slate-50 text-left text-sm text-slate-700 flex justify-between items-center transition-colors border-b border-slate-50 last:border-0"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onChange(d.id)
                setOpen(false)
              }}
            >
              <div className="min-w-0">
                <span className="font-semibold text-slate-900 block truncate">{d.name}</span> 
                <span className="text-slate-400 text-xs block truncate">{d.vehicleType} {d.city ? `· ${d.city}` : ''}</span>
              </div>
              {numericValue === d.id && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
