import { useState, useRef } from "react"
import {
  Search, Package, CheckCircle2, Clock, Truck, AlertTriangle,
  MapPin, ArrowRight, Shield, Zap, Globe, Phone, Mail,
  ChevronRight, Star, Users, TrendingUp, Box
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// Mock hook to replace useTrackShipment
const useTrackShipment = (guideNumber: string, _options?: any) => ({
  data: guideNumber.length > 5 ? {
    id: 1,
    guideNumber,
    senderCity: "Bogota",
    recipientCity: "Medellin",
    recipientName: "Cliente Demo",
    status: "in_transit",
    history: [
      { id: 1, status: "created", createdAt: new Date(Date.now() - 86400000).toISOString(), note: "Paquete recibido en origen" },
      { id: 2, status: "in_transit", createdAt: new Date().toISOString(), note: "Saliendo de la ciudad hacia centro de distribución" }
    ]
  } : null,
  isLoading: false,
  error: guideNumber && guideNumber.length <= 5 ? new Error("Not found") : null
})
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { getStatusColor, getStatusLabel, cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Link } from "wouter"

const STATUS_ORDER = ["created","assigned","picked_up","in_transit","out_for_delivery","delivered"]
const STEP_LABELS: Record<string, string> = {
  created: "Creado",
  assigned: "Asignado",
  picked_up: "Recogido",
  in_transit: "En Tránsito",
  out_for_delivery: "En Entrega",
  delivered: "Entregado",
}

function ProgressBar({ status }: { status: string }) {
  const idx = STATUS_ORDER.indexOf(status)
  const progress = status === "incident" ? -1 : idx
  return (
    <div className="flex items-center gap-0 w-full py-2">
      {STATUS_ORDER.map((s, i) => {
        const done = progress >= i
        const active = progress === i
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={cn(
              "relative flex flex-col items-center gap-1",
            )}>
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-500 text-xs font-bold shadow-sm",
                done
                  ? "bg-green-500 border-green-500 text-white"
                  : active
                    ? "bg-primary border-primary text-white animate-pulse"
                    : "bg-white border-slate-200 text-slate-400"
              )}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : <span>{i + 1}</span>}
              </div>
              <span className={cn(
                "text-[10px] font-semibold text-center leading-tight w-14",
                done ? "text-green-600" : "text-slate-400"
              )}>{STEP_LABELS[s]}</span>
            </div>
            {i < STATUS_ORDER.length - 1 && (
              <div className={cn(
                "h-0.5 flex-1 mx-1 rounded-full transition-all duration-700",
                progress > i ? "bg-green-400" : "bg-slate-200"
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function TrackingResult({ tracking }: { tracking: any }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "created": return <Package className="w-4 h-4" />
      case "assigned": return <CheckCircle2 className="w-4 h-4" />
      case "picked_up": return <CheckCircle2 className="w-4 h-4" />
      case "in_transit": return <Truck className="w-4 h-4" />
      case "out_for_delivery": return <MapPin className="w-4 h-4" />
      case "delivered": return <CheckCircle2 className="w-4 h-4" />
      case "incident": return <AlertTriangle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const sorted = [...tracking.history].sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="max-w-3xl mx-auto"
    >
      {/* Status header card */}
      <div className={cn(
        "rounded-2xl p-6 mb-4 border shadow-lg",
        tracking.status === "delivered"
          ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
          : tracking.status === "incident"
            ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-200"
            : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-1">Número de Guía</p>
            <h2 className="text-2xl font-bold tracking-tight">{tracking.guideNumber}</h2>
          </div>
          <div className={cn("px-5 py-2 rounded-full font-bold text-sm border-2 flex items-center gap-2 self-start sm:self-auto", getStatusColor(tracking.status))}>
            {getStatusIcon(tracking.status)}
            {getStatusLabel(tracking.status)}
          </div>
        </div>

        {tracking.status !== "incident" && (
          <div className="overflow-x-auto pb-2">
            <ProgressBar status={tracking.status} />
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/60">
          <div>
            <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-0.5">Origen</p>
            <p className="font-semibold text-sm">{tracking.senderCity}</p>
          </div>
          <div className="text-center">
            <ArrowRight className="w-5 h-5 text-muted-foreground mx-auto" />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-0.5">Destino</p>
            <p className="font-semibold text-sm">{tracking.recipientCity}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/60">
          <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-0.5">Destinatario</p>
          <p className="font-semibold text-sm">{tracking.recipientName}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Historial de movimientos
          </h3>
        </div>
        <div className="p-6">
          <div className="relative space-y-5">
            {sorted.map((event: any, idx: number) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="flex gap-4"
              >
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center shadow-md flex-shrink-0",
                    event.status === "delivered" ? "bg-green-500 text-white" :
                    event.status === "incident" ? "bg-red-500 text-white" :
                    idx === 0 ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
                  )}>
                    {getStatusIcon(event.status)}
                  </div>
                  {idx < sorted.length - 1 && (
                    <div className="w-0.5 flex-1 bg-slate-100 mt-2 min-h-4" />
                  )}
                </div>
                <div className={cn(
                  "flex-1 rounded-xl p-4 border mb-0",
                  idx === 0 ? "bg-primary/5 border-primary/20" : "bg-slate-50 border-slate-100"
                )}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-sm">{getStatusLabel(event.status)}</span>
                    <time className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(event.createdAt), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                    </time>
                  </div>
                  {event.note && (
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{event.note}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function PublicTracking() {
  const [guideInput, setGuideInput] = useState("")
  const [searchGuide, setSearchGuide] = useState("")
  const resultsRef = useRef<HTMLDivElement>(null)

  const { data: tracking, isLoading, error } = useTrackShipment(searchGuide, {
    query: { enabled: !!searchGuide, retry: false }
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (guideInput.trim()) {
      setSearchGuide(guideInput.trim().toUpperCase())
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">

      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-6 md:px-10 shadow-sm">
        <div className="flex items-center gap-2.5 font-black text-xl tracking-tight text-primary select-none">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <span>FRONTERAS<span className="text-accent font-black"> EXPRESS</span></span>
        </div>
        <div className="flex items-center gap-3">
          <a href="#servicios" className="hidden md:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Servicios</a>
          <a href="#contacto" className="hidden md:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Contacto</a>
          <Link href="/login">
            <Button variant="outline" size="sm" className="font-semibold border-primary/30 text-primary hover:bg-primary hover:text-white transition-all">
              Acceso Empleados
            </Button>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16">
        {/* Animated gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a2463] via-[#1a3a8f] to-[#0f1f6b]" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-accent/10 blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-400/10 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-indigo-500/5 blur-3xl" />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "50px 50px" }} />
        </div>

        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-sm font-semibold px-4 py-2 rounded-full mb-8 shadow-inner">
              <Zap className="w-4 h-4 text-accent" />
              Rastreo en tiempo real · Colombia y más
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-5"
          >
            Más que rápido,<br />
            <span className="text-accent">siempre a tiempo.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-blue-200 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Rastrea tu paquete en segundos. Ingresa tu número de guía y obtén la ubicación exacta y el historial completo de tu envío.
          </motion.p>

          {/* Search box */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto"
          >
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 z-10" />
              <Input
                value={guideInput}
                onChange={(e) => setGuideInput(e.target.value)}
                placeholder="Ej. FRON-102938"
                className="w-full h-[60px] pl-14 pr-4 rounded-2xl text-base font-semibold bg-white/95 backdrop-blur-md border-0 shadow-2xl shadow-black/30 focus-visible:ring-4 focus-visible:ring-accent/50 placeholder:text-slate-400"
              />
            </div>
            <Button
              type="submit"
              className="h-[60px] px-8 rounded-2xl text-base font-bold bg-accent hover:bg-accent/90 text-white shadow-2xl shadow-accent/30 flex items-center gap-2 hover:gap-3 transition-all"
            >
              Rastrear
              <ChevronRight className="w-5 h-5" />
            </Button>
          </motion.form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-blue-300/60 text-xs mt-4"
          >
            Formato: FRON-XXXXXX · Sin costo · Sin registro
          </motion.p>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 text-xs"
        >
          <div className="w-5 h-8 border-2 border-white/20 rounded-full flex justify-center pt-1.5">
            <div className="w-1 h-1.5 bg-white/40 rounded-full animate-bounce" />
          </div>
        </motion.div>
      </section>

      {/* RESULTS */}
      <div ref={resultsRef} className="w-full max-w-4xl mx-auto px-4 py-10">
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-16">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
              <p className="mt-5 text-muted-foreground font-medium">Buscando tu envío...</p>
            </motion.div>
          )}
          {error && !isLoading && (
            <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto text-center bg-white rounded-2xl shadow-xl border border-red-100 p-10">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Envío no encontrado</h3>
              <p className="text-slate-500 text-sm">Verifica el número de guía e intenta nuevamente. Recuerda incluir el prefijo FRON-.</p>
            </motion.div>
          )}
          {tracking && !isLoading && (
            <TrackingResult key={searchGuide} tracking={tracking} />
          )}
        </AnimatePresence>
      </div>

      {/* STATS */}
      <section className="w-full bg-white border-y border-slate-100 py-14">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { icon: <Box className="w-6 h-6" />, value: "+50.000", label: "Paquetes entregados", color: "text-primary" },
            { icon: <Users className="w-6 h-6" />, value: "+1.200", label: "Clientes satisfechos", color: "text-accent" },
            { icon: <Globe className="w-6 h-6" />, value: "32", label: "Ciudades cubiertas", color: "text-indigo-600" },
            { icon: <TrendingUp className="w-6 h-6" />, value: "98.7%", label: "Entregas a tiempo", color: "text-green-600" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className={cn("flex justify-center mb-3", stat.color)}>{stat.icon}</div>
              <div className={cn("text-3xl font-black mb-1", stat.color)}>{stat.value}</div>
              <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="servicios" className="py-20 max-w-6xl mx-auto px-4 w-full">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-accent font-bold text-sm uppercase tracking-widest">Nuestros Servicios</span>
            <h2 className="text-4xl font-black text-slate-900 mt-2 mb-3">Logística que no para</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Soluciones de transporte diseñadas para que tu negocio crezca sin límites.</p>
          </motion.div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Zap className="w-7 h-7" />,
              title: "Envío Express",
              desc: "Entrega el mismo día o al día siguiente dentro del área metropolitana. Velocidad garantizada.",
              color: "bg-amber-50 text-amber-600 border-amber-100",
            },
            {
              icon: <Globe className="w-7 h-7" />,
              title: "Cobertura Nacional",
              desc: "Llegamos a más de 32 ciudades y municipios de Colombia con conductores verificados.",
              color: "bg-blue-50 text-blue-600 border-blue-100",
            },
            {
              icon: <Shield className="w-7 h-7" />,
              title: "Envío Seguro",
              desc: "Seguro de carga incluido en todos los envíos. Tu mercancía protegida de principio a fin.",
              color: "bg-green-50 text-green-600 border-green-100",
            },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border", s.color)}>
                {s.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{s.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
              <div className="mt-6 flex items-center gap-1.5 text-primary font-semibold text-sm group-hover:gap-3 transition-all">
                Saber más <ArrowRight className="w-4 h-4" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-gradient-to-br from-[#0a2463] to-[#1a3a8f] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative z-10 max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-accent font-bold text-sm uppercase tracking-widest">Rastreo fácil</span>
            <h2 className="text-4xl font-black text-white mt-2 mb-3">¿Cómo funciona?</h2>
            <p className="text-blue-300 max-w-xl mx-auto">En 3 pasos simples sabes exactamente dónde está tu paquete.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: "01", title: "Ingresa tu guía", desc: "Escribe el número de guía que recibiste al momento del envío en el campo de búsqueda." },
              { n: "02", title: "Busca en tiempo real", desc: "Nuestro sistema consulta automáticamente el estado actualizado de tu envío al instante." },
              { n: "03", title: "Sigue tu paquete", desc: "Visualiza cada movimiento, fecha y hora de tu envío con un historial completo y detallado." },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="relative"
              >
                <div className="text-7xl font-black text-white/5 leading-none mb-2">{step.n}</div>
                <h3 className="text-white font-bold text-xl mb-3 -mt-4">{step.title}</h3>
                <p className="text-blue-300 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-accent font-bold text-sm uppercase tracking-widest">Testimonios</span>
            <h2 className="text-4xl font-black text-slate-900 mt-2">Lo que dicen nuestros clientes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Valentina Ríos", role: "Dueña de negocio, Medellín", text: "Mis pedidos llegan siempre a tiempo. El rastreo en tiempo real me da total tranquilidad." },
              { name: "Carlos Mejía", role: "E-commerce, Bogotá", text: "Desde que uso Fronteras Express mis clientes están más felices. Rapidez y puntualidad total." },
              { name: "Lucía Herrera", role: "Importadora, Cali", text: "El mejor servicio de mensajería que he probado. El equipo es profesional y siempre responde." },
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-50 rounded-2xl p-7 border border-slate-100 hover:border-primary/20 transition-colors"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{t.name}</p>
                  <p className="text-muted-foreground text-xs">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-accent relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="relative z-10 max-w-2xl mx-auto text-center px-4">
          <h2 className="text-4xl font-black text-white mb-4">¿Listo para enviar con nosotros?</h2>
          <p className="text-orange-100 mb-8">Contacta a nuestro equipo y obtén una cotización personalizada para tu negocio.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#contacto">
              <Button size="lg" className="bg-white text-accent hover:bg-white/90 font-bold rounded-2xl px-8 shadow-xl">
                Cotizar ahora
              </Button>
            </a>
            <a href="tel:+576000000000">
              <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 font-bold rounded-2xl px-8">
                <Phone className="w-4 h-4 mr-2" />
                Llamar ahora
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contacto" className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-3 gap-8">
          {[
            { icon: <Phone className="w-5 h-5" />, title: "Teléfono", val: "+57 600 000 0000", sub: "Lun–Vie 7am–7pm" },
            { icon: <Mail className="w-5 h-5" />, title: "Correo", val: "info@fronterasexpress.co", sub: "Respondemos en < 2h" },
            { icon: <MapPin className="w-5 h-5" />, title: "Oficina principal", val: "Calle 100 #15-30, Bogotá", sub: "Colombia" },
          ].map((c, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                {c.icon}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">{c.title}</p>
                <p className="text-slate-700 text-sm">{c.val}</p>
                <p className="text-muted-foreground text-xs">{c.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white/60 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2 font-bold text-white/90">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Truck className="w-4 h-4 text-white" />
            </div>
            FRONTERAS EXPRESS
          </div>
          <p>© {new Date().getFullYear()} Fronteras Express S.A.S · Todos los derechos reservados</p>
          <Link href="/login" className="text-white/40 hover:text-white/80 transition-colors text-xs">
            Acceso Empleados →
          </Link>
        </div>
      </footer>
    </div>
  )
}
