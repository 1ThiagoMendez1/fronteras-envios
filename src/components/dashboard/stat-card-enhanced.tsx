import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { motion } from "framer-motion"

interface StatCardEnhancedProps {
  title: string
  value: string
  icon: LucideIcon
  trend?: number        // percentage change vs previous period
  trendLabel?: string   // e.g. "vs. ayer"
  sparklineData?: number[]
  color: string         // e.g. "blue", "emerald", "indigo", "orange"
  delay?: number        // animation delay in seconds
}

const colorMap: Record<string, { bg: string; text: string; sparkline: string; gradient: string }> = {
  blue:    { bg: "bg-blue-50",    text: "text-blue-600",    sparkline: "#3b82f6", gradient: "from-blue-50 to-blue-100/50" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", sparkline: "#10b981", gradient: "from-emerald-50 to-emerald-100/50" },
  indigo:  { bg: "bg-indigo-50",  text: "text-indigo-600",  sparkline: "#6366f1", gradient: "from-indigo-50 to-indigo-100/50" },
  orange:  { bg: "bg-orange-50",  text: "text-orange-600",  sparkline: "#f97316", gradient: "from-orange-50 to-orange-100/50" },
  violet:  { bg: "bg-violet-50",  text: "text-violet-600",  sparkline: "#8b5cf6", gradient: "from-violet-50 to-violet-100/50" },
  rose:    { bg: "bg-rose-50",    text: "text-rose-600",    sparkline: "#f43f5e", gradient: "from-rose-50 to-rose-100/50" },
}

function MiniSparkline({ data, color, width = 80, height = 32 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data || data.length < 2) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((val - min) / range) * (height * 0.8) - height * 0.1
    return `${x},${y}`
  })

  const pathD = `M ${points.join(" L ")}`

  // Create area fill
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#spark-grad-${color})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle
        cx={(data.length - 1) / (data.length - 1) * width}
        cy={height - ((data[data.length - 1] - min) / range) * (height * 0.8) - height * 0.1}
        r={3}
        fill={color}
      />
    </svg>
  )
}

export function StatCardEnhanced({ title, value, icon: Icon, trend, trendLabel, sparklineData, color, delay = 0 }: StatCardEnhancedProps) {
  const colors = colorMap[color] || colorMap.blue

  const trendIcon = trend === undefined ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus
  const trendColor = trend === undefined ? "" : trend > 0 ? "text-emerald-600" : trend < 0 ? "text-red-500" : "text-slate-400"
  const trendText = trend === undefined ? "" : `${trend > 0 ? "+" : ""}${trend.toFixed(1)}%`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      <Card className={cn(
        "p-5 rounded-2xl shadow-sm border-border/50 hover:shadow-lg transition-all duration-300 relative overflow-hidden group",
        `bg-gradient-to-br ${colors.gradient}`
      )}>
        {/* Background decoration */}
        <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.07] group-hover:opacity-[0.12] transition-opacity", colors.bg, colors.text)}>
          <Icon className="w-24 h-24 p-4" />
        </div>

        <div className="flex items-start justify-between relative z-10">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{title}</p>
            <h4 className="text-2xl font-bold text-foreground truncate">{value}</h4>

            {/* Trend indicator */}
            {trend !== undefined && trendIcon !== null && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className={cn("inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md", trendColor, trend > 0 ? "bg-emerald-50" : trend < 0 ? "bg-red-50" : "bg-slate-50")}>
                  {trendIcon !== null && <span className="w-3 h-3"><TrendingUp className={cn("w-3 h-3", trend < 0 && "rotate-180")} /></span>}
                  {trendText}
                </span>
                {trendLabel && <span className="text-[11px] text-muted-foreground">{trendLabel}</span>}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className={cn("p-2.5 rounded-xl shadow-sm", colors.bg, colors.text)}>
              <Icon className="w-5 h-5" />
            </div>
            {/* Sparkline */}
            {sparklineData && sparklineData.length > 1 && (
              <div className="mt-1">
                <MiniSparkline data={sparklineData} color={colors.sparkline} />
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
