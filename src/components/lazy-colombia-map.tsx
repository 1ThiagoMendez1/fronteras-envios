import { lazy, Suspense, useEffect, useRef, useState } from "react"

const Map = lazy(() => import("./colombia-map").then(module => ({ default: module.ColombiaMap })))

export function ColombiaMap() {
  const container = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(() => typeof window !== "undefined" && !("IntersectionObserver" in window))
  useEffect(() => {
    if (!container.current) return
    if (!("IntersectionObserver" in window)) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true)
        observer.disconnect()
      }
    }, { rootMargin: "300px" })
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [])
  const placeholder = <div className="flex h-[640px] items-center justify-center rounded-2xl bg-slate-100 text-slate-500" role="status">Mapa de cobertura</div>
  return <div ref={container} data-testid="coverage-map" className="min-h-[640px]">
    {visible ? <Suspense fallback={placeholder}><Map /></Suspense> : placeholder}
  </div>
}
