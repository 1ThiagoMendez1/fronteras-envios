import { test, expect, signInOffline } from './fixtures'

const privatePages = [
  ['/dashboard', 'Panel de Control'], ['/clients', 'Directorio de Clientes'],
  ['/shipments', 'Gestión de Envíos'], ['/shipments/new', 'Registrar Nuevo Envío'],
  ['/shipments/1', 'Guía'], ['/shipments/1/edit', 'Editar Envío'],
  ['/drivers', 'Flota de Conductores'], ['/financial', 'Gestión Financiera'],
  ['/daily-close', 'Cierre Diario de Operación'], ['/users', 'Configuración de Accesos'],
] as const

for (const [path, heading] of privatePages) {
  test(`authenticated synthetic data: ${path}`, async ({ context, page }) => {
    await signInOffline(context)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(path)
    await expect(page.getByRole('heading', { name: heading, exact: false }).first()).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: heading, exact: false }).first()).toBeVisible()
    expect(errors).toEqual([])
    await expect(page.getByRole('alert').filter({ hasText: 'No pudimos cargar' })).toHaveCount(0)
  })
}

for (const [path] of privatePages) {
  test(`anonymous gate preserves protection: ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Iniciar Sesión' })).toBeVisible()
  })
}

test('login loads no protected screen, charts, map or Excel', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Iniciar Sesión' })).toBeVisible()
  expect(requests.filter(url => /\/(?:dashboard|clients|xlsx|colombia-map|AreaChart|shipment-detail)-/.test(url))).toEqual([])
})

test('persistent sidebar, prefetch and client-side navigation', async ({ context, page }) => {
  await signInOffline(context)
  await page.goto('/shipments')
  await expect(page.getByRole('heading', { name: 'Gestión de Envíos' })).toBeVisible()
  await page.getByRole('button', { name: 'Expandir menú', exact: true }).click()
  await page.evaluate(() => { document.documentElement.dataset.navigationMarker = 'retained' })
  const prefetched = page.waitForResponse(response => /\/clients-[^/]+\.js/.test(response.url()))
  await page.locator('nav a[href="/clients"]').hover()
  await prefetched
  await page.locator('nav a[href="/clients"]').click()
  await expect(page.getByRole('heading', { name: 'Directorio de Clientes' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Contraer menú', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.dataset.navigationMarker)).toBe('retained')
})

test('search coalesces rapid keystrokes into one read', async ({ context, page, traffic }) => {
  await signInOffline(context)
  await page.goto('/shipments')
  await expect(page.getByText('TEST-1001', { exact: true }).first()).toBeVisible()
  const input = page.getByPlaceholder(/Buscar por/)
  await input.pressSequentially('TEST', { delay: 20 })
  await expect.poll(() => traffic.reads.filter(url => url.pathname.endsWith('/shipments') && url.searchParams.has('or')).length).toBe(1)
  expect(traffic.reads.find(url => url.searchParams.has('or'))?.searchParams.get('or')).toContain('TEST')
})

test('page failures keep the sidebar usable', async ({ context, page }) => {
  await signInOffline(context)
  await page.route('**/clients-*.js', route => route.abort())
  await page.goto('/shipments')
  await page.locator('nav a[href="/clients"]').click()
  await expect(page.getByRole('alert').filter({ hasText: 'No pudimos cargar' })).toBeVisible()
  await page.locator('nav a[href="/drivers"]').click()
  await expect(page.getByRole('heading', { name: 'Flota de Conductores' })).toBeVisible()
})

test('operator retains allowed and denied routes', async ({ context, page }) => {
  await signInOffline(context, 'operator')
  await page.goto('/clients')
  await expect(page.getByRole('heading', { name: 'Directorio de Clientes' })).toBeVisible()
  await page.goto('/users')
  await expect(page.getByRole('heading', { name: 'Acceso Denegado' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Configuración de Accesos' })).toHaveCount(0)
})

test('public map loads only near its viewport', async ({ page }) => {
  const loaded: string[] = []
  page.on('request', request => loaded.push(request.url()))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Más que rápido/ }).first()).toBeVisible()
  expect(loaded.some(url => /\/colombia-map-/.test(url))).toBe(false)
  const map = page.getByTestId('coverage-map')
  await map.scrollIntoViewIfNeeded()
  await expect(map.locator('.leaflet-container')).toBeVisible()
  expect(loaded.some(url => /\/colombia-map-/.test(url))).toBe(true)
})

test('Excel is deferred and the same template can be downloaded', async ({ context, page }) => {
  await signInOffline(context)
  const loaded: string[] = []
  page.on('request', request => loaded.push(request.url()))
  await page.goto('/clients')
  await expect(page.getByRole('heading', { name: 'Directorio de Clientes' })).toBeVisible()
  expect(loaded.some(url => /\/xlsx-/.test(url))).toBe(false)
  await page.getByRole('button', { name: /Importar/ }).first().click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /plantilla/i }).click()
  expect((await download).suggestedFilename()).toBe('plantilla_clientes.xlsx')
  expect(loaded.some(url => /\/xlsx-/.test(url))).toBe(true)
})

test('mobile menu opens and closes after navigation', async ({ context, page }) => {
  await signInOffline(context)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/shipments')
  await expect(page.getByRole('heading', { name: 'Gestión de Envíos' })).toBeVisible()
  await page.getByRole('button', { name: 'Abrir menú' }).click()
  await page.locator('nav a[href="/clients"]').click()
  await expect(page.getByRole('heading', { name: 'Directorio de Clientes' })).toBeVisible()
  await expect(page.locator('aside')).not.toBeInViewport()
})

test('financial aggregates start independent reads concurrently without changing totals', async ({ context, page }) => {
  await signInOffline(context)
  const started = new Set<string>()
  let release: () => void = () => {}
  const allStarted = new Promise<void>(resolve => { release = resolve })
  await page.route('https://review.invalid/rest/v1/**', async route => {
    const url = new URL(route.request().url())
    const table = url.pathname.split('/').at(-1) ?? ''
    const isSummary = table === 'shipments' && url.searchParams.get('select')?.startsWith('shipping_cost,driver_payment,status,')
    if (isSummary || table === 'financial_movements' || table === 'daily_close') {
      started.add(table)
      if (started.size === 3) release()
      await allStarted
    }
    await route.fallback()
  })
  await page.goto('/financial')
  await expect(page.getByRole('heading', { name: 'Gestión Financiera' })).toBeVisible()
  expect([...started].sort()).toEqual(['daily_close', 'financial_movements', 'shipments'])
  await expect(page.getByText(/15\.000/).first()).toBeVisible()
})

for (const role of ['admin', 'operator']) {
  test(`synthetic ${role} login preserves SPA and destination`, async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Iniciar Sesión' })).toBeVisible()
    await page.evaluate(() => { document.documentElement.dataset.navigationMarker = 'retained' })
    await page.getByLabel('Correo Electrónico').fill(`${role}@example.invalid`)
    await page.getByLabel('Contraseña', { exact: true }).fill('synthetic-password')
    await page.getByRole('button', { name: 'Ingresar al Sistema Seguro' }).click()
    await expect(page).toHaveURL(role === 'operator' ? /\/clients$/ : /\/dashboard$/)
    await expect(page.getByRole('heading', { name: role === 'operator' ? 'Directorio de Clientes' : 'Panel de Control' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.dataset.navigationMarker)).toBe('retained')
  })
}

test('logout clears the previous session query cache', async ({ context, page, traffic }) => {
  await signInOffline(context)
  await page.goto('/clients')
  await expect(page.getByText('Cliente Sintético', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar Sesión', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  traffic.clientName = 'Cliente Nueva Sesión'
  let releaseClients: () => void = () => {}
  const gate = new Promise<void>(resolve => { releaseClients = resolve })
  await page.route('https://review.invalid/rest/v1/clients*', async route => {
    await gate
    await route.fallback()
  })
  await page.getByLabel('Correo Electrónico').fill('operator@example.invalid')
  await page.getByLabel('Contraseña', { exact: true }).fill('synthetic-password')
  await page.getByRole('button', { name: 'Ingresar al Sistema Seguro' }).click()
  await expect(page).toHaveURL(/\/clients$/)
  await expect(page.getByRole('heading', { name: 'Directorio de Clientes' })).toBeVisible()
  await expect(page.getByText('Cliente Sintético', { exact: true })).toHaveCount(0)
  releaseClients()
  await expect(page.getByText('Cliente Nueva Sesión', { exact: true })).toBeVisible()
})

test('dashboard reads start together and retain synthetic totals', async ({ context, page }) => {
  await signInOffline(context)
  const started = new Set<string>()
  let release: () => void = () => {}
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('https://review.invalid/rest/v1/**', async route => {
    const url = new URL(route.request().url())
    const table = url.pathname.split('/').at(-1)
    const select = url.searchParams.get('select')
    let key: string | undefined
    if (table === 'drivers') key = 'drivers'
    if (table === 'daily_close') key = 'close'
    if (table === 'shipments' && !url.searchParams.has('cash_on_delivery')) {
      if (select === '*') key = url.searchParams.get('limit') === '15' ? 'recent' : 'period'
      else if (select?.includes('branch_origin')) key = 'sparkline'
    }
    if (key) {
      started.add(key)
      if (started.size === 5) release()
      await gate
    }
    await route.fallback()
  })
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Panel de Control' })).toBeVisible()
  expect([...started].sort()).toEqual(['close', 'drivers', 'period', 'recent', 'sparkline'])
  await expect(page.getByText(/15\.000/).first()).toBeVisible()
})

test('private routes still accept their trailing slash', async ({ context, page }) => {
  await signInOffline(context)
  await page.goto('/shipments/')
  await expect(page.getByRole('heading', { name: 'Gestión de Envíos' })).toBeVisible()
})
