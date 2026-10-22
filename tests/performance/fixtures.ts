import { test as base, expect, type BrowserContext } from '@playwright/test'

export const shipment = {
  id: 1, guide_number: 'TEST-1001', sender_document: 'TEST-9001', sender_name: 'Cliente Sintético',
  sender_phone: '0000000000', sender_address: 'Dirección de prueba', sender_city: 'Bogotá',
  recipient_document: 'TEST-9002', recipient_name: 'Destino Sintético', recipient_phone: '0000000000',
  recipient_address: 'Dirección ficticia', recipient_city: 'Medellín', status: 'in_transit',
  shipping_cost: 15000, driver_payment: 5000, declared_value: 10000, weight: 1, quantity: 1,
  payment_method: 'Efectivo', branch_origin: 'Bogotá', cash_on_delivery: 0,
  is_cash_on_delivery_collected: false, created_at: new Date().toISOString(),
  drivers: null, shipment_history: [], comentarios: [], package_contents: 'Prueba',
}

export function syntheticSession(role = 'admin') {
  const now = Math.floor(Date.now() / 1000)
  const user = { id: `synthetic-${role}`, email: `${role}@example.invalid`, aud: 'authenticated',
    role: 'authenticated', app_metadata: {}, user_metadata: { name: 'Prueba local', role, branch: 'Bogotá' },
    created_at: new Date().toISOString() }
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated',
    app_role: role, app_is_active: true, app_branch: 'Bogotá', app_permissions: {}, iat: now, exp: now + 3600 })}.offline-signature`
  return { access_token: token, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600,
    refresh_token: 'synthetic-refresh', user }
}

export async function signInOffline(context: BrowserContext, role = 'admin') {
  await context.addInitScript(session => {
    if (sessionStorage.getItem('fixture-seeded')) return
    localStorage.setItem('sb-review-auth-token', JSON.stringify(session))
    sessionStorage.setItem('fixture-seeded', 'true')
  }, syntheticSession(role))
}

type Traffic = { reads: URL[]; writes: string[]; blocked: number; clientName: string; paymentMethod: string }
export const test = base.extend<{ traffic: Traffic }>({
  traffic: [async ({ context }, use) => {
    const traffic: Traffic = { reads: [], writes: [], blocked: 0, clientName: 'Cliente Sintético', paymentMethod: 'Efectivo' }
    await context.routeWebSocket('**/*', socket => socket.close())
    await context.route('**/*', async route => {
      const request = route.request()
      const url = new URL(request.url())
      if (url.origin === 'http://127.0.0.1:4180' && ['GET', 'HEAD'].includes(request.method())) return route.continue()
      if (url.origin !== 'https://review.invalid') { traffic.blocked++; return route.abort('blockedbyclient') }
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*',
        'access-control-expose-headers': 'content-range', 'content-type': 'application/json' }
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
      const send = (body: unknown, extra = {}) => route.fulfill({ status: 200,
        headers: { ...headers, ...extra }, body: JSON.stringify(body) })
      if (url.pathname === '/auth/v1/token') {
        const input = request.postDataJSON() as { email?: string }
        return send(syntheticSession(input.email?.startsWith('operator') ? 'operator' : 'admin'))
      }
      if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers })
      if (!['GET', 'HEAD'].includes(request.method())) {
        traffic.writes.push(`${request.method()} ${url.pathname}`)
        return route.abort('blockedbyclient')
      }
      traffic.reads.push(url)
      if (url.pathname === '/auth/v1/user') return send(syntheticSession().user)
      if (url.pathname === '/auth/v1/admin/users') return send({ users: [syntheticSession().user] })
      const table = url.pathname.split('/').at(-1)
      let rows: unknown[] = []
      if (table === 'app_roles') rows = [
        { id: 'admin', name: 'Administrador', permissions: ['dashboard', 'clients', 'shipments', 'drivers', 'financial', 'daily_close', 'users'] },
        { id: 'operator', name: 'Operador', permissions: ['clients', 'shipments', 'daily_close'] },
      ]
      if (table === 'shipments') {
        rows = url.searchParams.get('cash_on_delivery') ? [] : [{ ...shipment, payment_method: traffic.paymentMethod }]
        const search = url.searchParams.get('or')
        if (search && !search.toLowerCase().includes('test')) rows = []
      }
      if (table === 'clients') rows = [{ id: 1, document: 'TEST-9001', name: traffic.clientName,
        phone: '0000000000', city: 'Bogotá', address: 'Dirección de prueba', total_shipments_this_month: 1 }]
      if (table === 'drivers') rows = [{ id: 1, name: 'Conductor Sintético', phone: '0000000000',
        city: 'Bogotá', is_active: true, vehicle_type: 'van', rate_per_delivery: 5000 }]
      if (request.method() === 'HEAD') return route.fulfill({ status: 200,
        headers: { ...headers, 'content-range': `0-0/${rows.length}` } })
      const single = request.headers().accept?.includes('vnd.pgrst.object+json')
      return send(single ? rows[0] ?? null : rows, { 'content-range': `0-${Math.max(0, rows.length - 1)}/${rows.length}` })
    })
    await use(traffic)
    expect(traffic.writes, 'No business mutations may execute in the offline suite').toEqual([])
  }, { auto: true }],
})
export { expect }
