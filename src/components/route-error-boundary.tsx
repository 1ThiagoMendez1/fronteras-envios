import { Component, type ErrorInfo, type ReactNode } from "react"
import { useLocation } from "wouter"

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Error al cargar la página", error, info) }
  render() {
    if (this.state.failed) return (
      <div role="alert" className="p-8 space-y-4">
        <p>No pudimos cargar esta página. Comprueba tu conexión e inténtalo de nuevo.</p>
        <button className="underline" onClick={() => window.location.reload()}>Reintentar</button>
      </div>
    )
    return this.props.children
  }
}

export function RouteErrorBoundary({ children, resetOnNavigation = true }: { children: ReactNode; resetOnNavigation?: boolean }) {
  const [location] = useLocation()
  return <Boundary key={resetOnNavigation ? location : "app"}>{children}</Boundary>
}
