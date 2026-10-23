import { test, expect, signInOffline, shipment } from './fixtures'

for (const timezone of ['UTC', 'Asia/Tokyo']) {
  test.describe(`exact financial day in browser timezone ${timezone}`, () => {
    test.use({ timezoneId: timezone })
    test('totals, expenses, transactions and branch use only the selected Colombia day', async ({ context, page }) => {
      await signInOffline(context)
      const observed: URL[] = []
      await page.route('https://review.invalid/rest/v1/**', async route => {
        if (!['GET', 'HEAD'].includes(route.request().method())) return route.fallback()
        const url = new URL(route.request().url())
        const table = url.pathname.split('/').at(-1)
        if (!['shipments', 'financial_movements', 'daily_close'].includes(table ?? '')) return route.fallback()
        if (url.searchParams.has('cash_on_delivery')) return route.fallback()
        observed.push(url)
        let rows: Record<string, unknown>[] = []
        if (table === 'shipments') {
          rows = [
            { ...shipment, id: 1, created_at: '2026-10-20T04:59:59.999Z', shipping_cost: 90000, driver_payment: 0 },
            { ...shipment, id: 2, created_at: '2026-10-20T05:00:00Z', shipping_cost: 1000, driver_payment: 200 },
            { ...shipment, id: 3, created_at: '2026-10-21T04:59:59.999999Z', shipping_cost: 2000, driver_payment: 300 },
            { ...shipment, id: 4, created_at: '2026-10-21T05:00:00Z', shipping_cost: 90000, driver_payment: 0 },
            { ...shipment, id: 5, created_at: '2026-10-20T12:00:00Z', shipping_cost: 5000, driver_payment: 0, branch_origin: 'Medellín' },
          ]
          for (const constraint of url.searchParams.getAll('created_at')) {
            const [operator, ...value] = constraint.split('.')
            const cutoff = Date.parse(value.join('.'))
            rows = rows.filter(row => operator === 'gte' ? Date.parse(String(row.created_at)) >= cutoff : operator === 'lt' ? Date.parse(String(row.created_at)) < cutoff : true)
          }
          const branch = url.searchParams.get('branch_origin')
          if (branch) rows = rows.filter(row => `eq.${row.branch_origin}` === branch)
        }
        if (table === 'financial_movements') {
          rows = [
            { id: 1, type: 'expense', amount: 150, description: 'Gasto del día', movement_date: '2026-10-20', branch: 'Bogotá' },
            { id: 2, type: 'income', amount: 300, description: 'Ingreso del día', reference_type: 'other', movement_date: '2026-10-20', branch: 'Bogotá' },
            { id: 3, type: 'expense', amount: 99000, description: 'Gasto de otro día', movement_date: '2026-10-21', branch: 'Bogotá' },
          ]
          const date = url.searchParams.get('movement_date')
          if (date?.startsWith('eq.')) rows = rows.filter(row => `eq.${row.movement_date}` === date)
          const branch = url.searchParams.get('branch')
          if (branch) rows = rows.filter(row => `eq.${row.branch}` === branch)
        }
        await route.fulfill({ status: 200, headers: { 'content-type': 'application/json',
          'access-control-allow-origin': '*', 'content-range': `0-${Math.max(0, rows.length - 1)}/${rows.length}` }, body: JSON.stringify(rows) })
      })
      await page.goto('/financial')
      await page.getByRole('button', { name: 'Día específico', exact: true }).click()
      await page.getByLabel('Fecha', { exact: true }).fill('2026-10-20')
      await page.getByLabel('Sede', { exact: true }).selectOption('Bogotá')
      const amount = (label: string) => page.getByText(label, { exact: true }).locator('..')
      await expect(amount('Ingresos Totales')).toContainText('3.000')
      await expect(amount('Pagos Conductores')).toContainText('500')
      await expect(amount('Gastos Extras')).toContainText('150')
      await expect(amount('Utilidad Neta')).toContainText('2.650')
      await expect(page.getByText('Ingresos vs Utilidad (Día seleccionado)', { exact: true })).toBeVisible()
      const dayShipments = observed.filter(url => url.pathname.endsWith('/shipments') && url.searchParams.get('branch_origin') === 'eq.Bogotá' && url.searchParams.getAll('created_at').includes('gte.2026-10-20T00:00:00-05:00'))
      expect(dayShipments.length).toBeGreaterThan(0)
      expect(dayShipments.at(-1)!.searchParams.getAll('created_at')).toContain('lt.2026-10-21T05:00:00.000Z')
      expect(observed.some(url => url.pathname.endsWith('/daily_close') && url.searchParams.get('close_date') === 'eq.2026-10-20')).toBe(true)
      await page.getByRole('tab', { name: 'Transacciones', exact: true }).click()
      await expect(page.getByText('Gasto del día', { exact: true })).toBeVisible()
      await expect(page.getByText('Ingreso del día', { exact: true })).toBeVisible()
      await expect(page.getByText('Gasto de otro día', { exact: true })).toHaveCount(0)
      await expect(page.locator('tbody')).toContainText('20/10')
      await page.getByLabel('Fecha', { exact: true }).fill('2026-10-19')
      await expect(page.getByRole('tab', { name: 'Transacciones', exact: true })).toHaveAttribute('aria-selected', 'true')
      await expect(page.getByText('Gasto del día', { exact: true })).toHaveCount(0)
      await page.getByRole('button', { name: 'Todo', exact: true }).click()
      await expect(page.getByLabel('Fecha', { exact: true })).toHaveCount(0)
      await expect(page.getByText('Gasto de otro día', { exact: true })).toBeVisible()
    })
  })
}
