import { lazy, type ComponentType } from "react"

function preloadable(load: () => Promise<{ default: ComponentType }>) {
  let pending: ReturnType<typeof load> | undefined
  const preload = () => {
    pending ??= load().catch((error: unknown) => { pending = undefined; throw error })
    return pending
  }
  return Object.assign(lazy(preload), { preload })
}

export const pages = {
  login: preloadable(() => import("@/pages/login")),
  register: preloadable(() => import("@/pages/register")),
  tracking: preloadable(() => import("@/pages/public-tracking")),
  dashboard: preloadable(() => import("@/pages/dashboard")),
  shipments: preloadable(() => import("@/pages/shipments")),
  newShipment: preloadable(() => import("@/pages/shipment-new")),
  editShipment: preloadable(() => import("@/pages/shipment-edit")),
  shipmentDetail: preloadable(() => import("@/pages/shipment-detail")),
  drivers: preloadable(() => import("@/pages/drivers")),
  financial: preloadable(() => import("@/pages/financial")),
  dailyClose: preloadable(() => import("@/pages/daily-close")),
  clients: preloadable(() => import("@/pages/clients")),
  users: preloadable(() => import("@/pages/users")),
  notFound: preloadable(() => import("@/pages/not-found")),
}

const destinations: Record<string, typeof pages.clients | undefined> = {
  "/": pages.tracking, "/login": pages.login, "/register": pages.register,
  "/dashboard": pages.dashboard, "/shipments": pages.shipments,
  "/shipments/new": pages.newShipment, "/clients": pages.clients,
  "/drivers": pages.drivers, "/financial": pages.financial,
  "/daily-close": pages.dailyClose, "/users": pages.users,
}

export function preloadRoute(path: string) {
  const page = destinations[path] ?? (/^\/shipments\/[^/]+\/edit$/.test(path)
    ? pages.editShipment : /^\/shipments\/[^/]+$/.test(path) ? pages.shipmentDetail : undefined)
  // Prefetch is only a hint. A failed chunk is handled by the route boundary.
  void page?.preload().catch(() => undefined)
}

export function isPrivatePath(path: string) {
  const normalized = path.length > 1 ? path.replace(/\/+$/, "") : path
  return /^(?:\/(?:dashboard|clients|drivers|financial|daily-close|users)|\/shipments(?:\/[^/]+(?:\/edit)?)?)$/.test(normalized)
}
