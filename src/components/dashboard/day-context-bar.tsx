import { cn } from "@/lib/utils"
import { Clock, CalendarCheck, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { motion } from "framer-motion"

interface DayContextBarProps {
  closedToday: boolean
  pendingCloseDate?: string | null
}

export function DayContextBar({ closedToday, pendingCloseDate }: DayContextBarProps) {
  const now = new Date()
  const greeting = now.getHours() < 12 ? "Buenos días" : now.getHours() < 18 ? "Buenas tardes" : "Buenas noches"

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-4 px-6 shadow-sm border border-border/50"
    >
      <div className="flex items-center gap-4">
        <div className="bg-primary/10 p-2 rounded-xl text-primary">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{greeting}</p>
          <p className="font-bold text-foreground capitalize">
            {format(now, "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {pendingCloseDate && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            <span>Cierre pendiente: {pendingCloseDate}</span>
          </div>
        )}
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-semibold",
          closedToday
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-amber-50 text-amber-700 border-amber-200"
        )}>
          <CalendarCheck className="w-4 h-4" />
          {closedToday ? "Cierre completado" : "Cierre pendiente hoy"}
        </div>
      </div>
    </motion.div>
  )
}
