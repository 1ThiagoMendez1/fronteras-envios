const colombiaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
})
const chartDate = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota", day: "2-digit", month: "short",
})

export function colombiaDay(date = new Date()): string {
  const parts = colombiaDate.formatToParts(date)
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)!.value).join("-")
}

export function financialDayBounds(day: string) {
  const next = new Date(`${day}T00:00:00-05:00`)
  next.setUTCDate(next.getUTCDate() + 1)
  return { start: `${day}T00:00:00-05:00`, endExclusive: next.toISOString() }
}

export function financialChartDate(value: string): string {
  return chartDate.format(new Date(value))
}

const movementTimestamp = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota", day: "2-digit", month: "2-digit",
  hour: "2-digit", minute: "2-digit", hour12: false,
})

export function financialMovementDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value.slice(8, 10)}/${value.slice(5, 7)}`
  return movementTimestamp.format(new Date(value))
}
