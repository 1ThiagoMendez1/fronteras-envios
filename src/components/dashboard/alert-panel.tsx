import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { AlertCircle, Package, CheckCircle2 } from "lucide-react"
import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"

interface Alert {
  id: string
  level: "critical" | "warning" | "normal"
  title: string
  description: string
  icon: LucideIcon
  value?: string | number
}

interface AlertPanelProps {
  alerts: Alert[]
}

const levelConfig = {
  critical: {
    bg: "bg-red-50",
    border: "border-red-200",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    titleColor: "text-red-900",
    descColor: "text-red-700",
    valueColor: "text-red-700",
    dot: "bg-red-500",
    pulse: true,
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    titleColor: "text-amber-900",
    descColor: "text-amber-700",
    valueColor: "text-amber-700",
    dot: "bg-amber-500",
    pulse: false,
  },
  normal: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    titleColor: "text-emerald-900",
    descColor: "text-emerald-700",
    valueColor: "text-emerald-700",
    dot: "bg-emerald-500",
    pulse: false,
  },
}

export function AlertPanel({ alerts }: AlertPanelProps) {
  const sortedAlerts = [...alerts].sort((a, b) => {
    const priority = { critical: 0, warning: 1, normal: 2 }
    return priority[a.level] - priority[b.level]
  })

  return (
    <Card className="p-5 rounded-2xl shadow-sm border-border/50 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-foreground">Alertas Operativas</h3>
        <div className="flex items-center gap-1.5">
          {alerts.filter(a => a.level === "critical").length > 0 && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          )}
          <span className="text-xs text-muted-foreground font-medium">
            {alerts.filter(a => a.level === "critical").length} críticas
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[360px]">
        {sortedAlerts.map((alert, idx) => {
          const config = levelConfig[alert.level]
          const IconComponent = alert.icon
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className={cn(
                "p-3 rounded-xl border flex items-start gap-3 transition-all hover:shadow-sm cursor-default",
                config.bg, config.border
              )}
            >
              <div className={cn("p-1.5 rounded-lg shrink-0 mt-0.5", config.iconBg, config.iconColor)}>
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn("text-sm font-semibold", config.titleColor)}>{alert.title}</p>
                  {config.pulse && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </div>
                <p className={cn("text-xs mt-0.5", config.descColor)}>{alert.description}</p>
              </div>
              {alert.value !== undefined && (
                <span className={cn("text-lg font-bold shrink-0", config.valueColor)}>
                  {alert.value}
                </span>
              )}
            </motion.div>
          )
        })}
      </div>
    </Card>
  )
}

// Helper to generate alerts from stats data
export function generateOperationalAlerts(stats: {
  incidentsToday: number
  totalActiveShipments: number
  deliveredToday: number
  todayShipments: number
}): Alert[] {
  const alerts: Alert[] = []

  // Incidents alert
  const incidentRate = stats.todayShipments > 0 ? (stats.incidentsToday / stats.todayShipments) * 100 : 0
  if (stats.incidentsToday > 0) {
    alerts.push({
      id: "incidents",
      level: incidentRate > 5 ? "critical" : "warning",
      title: "Incidencias",
      description: `${incidentRate.toFixed(1)}% de los envíos del día`,
      icon: AlertCircle,
      value: stats.incidentsToday,
    })
  }

  // Active shipments
  if (stats.totalActiveShipments > 0) {
    alerts.push({
      id: "active",
      level: stats.totalActiveShipments > 50 ? "warning" : "normal",
      title: "En tránsito",
      description: `Envíos activos en movimiento`,
      icon: Package,
      value: stats.totalActiveShipments,
    })
  }

  // Delivered
  alerts.push({
    id: "delivered",
    level: "normal",
    title: "Entregados hoy",
    description: `${stats.todayShipments > 0 ? ((stats.deliveredToday / stats.todayShipments) * 100).toFixed(0) : 0}% tasa de entrega`,
    icon: CheckCircle2,
    value: stats.deliveredToday,
  })

  return alerts
}
