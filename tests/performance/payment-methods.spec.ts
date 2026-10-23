import { test, expect, signInOffline, shipment } from './fixtures'

for (const path of ['/shipments/new', '/shipments/1/edit']) {
  test(`only cash and renamed Nequi are selectable: ${path}`, async ({ context, page, traffic }) => {
    traffic.paymentMethod = 'Nequi'
    await signInOffline(context)
    await page.goto(path)
    const method = page.getByRole('combobox', { name: 'Método de Pago', exact: true })
    await expect(method).toBeVisible()
    if (path.endsWith('/edit')) await expect(method).toContainText('Transferencia')
    await method.click()
    await expect(page.getByRole('option')).toHaveCount(2)
    await expect(page.getByRole('option', { name: 'Efectivo', exact: false })).toBeVisible()
    await page.getByRole('option', { name: 'Transferencia', exact: false }).click()
    await expect(method).toContainText('Transferencia')
    const backingSelect = page.locator('select').filter({ has: page.locator('option[value="Nequi"]') })
    await expect(backingSelect).toHaveValue('Nequi')
    await method.click()
    await page.getByRole('option', { name: 'Efectivo', exact: false }).click()
    await expect(backingSelect).toHaveValue('Efectivo')
  })
}

for (const legacy of ['DaviPlata', 'Tarjeta', 'Transferencia']) {
  test(`editing an existing ${legacy} shipment preserves its displayed method`, async ({ context, page, traffic }) => {
    traffic.paymentMethod = legacy
    await signInOffline(context)
    await page.goto('/shipments/1/edit')
    const method = page.getByRole('combobox', { name: 'Método de Pago', exact: true })
    await expect(method).toHaveText(legacy)
    await method.click()
    await expect(page.getByRole('option')).toHaveCount(2)
    await expect(page.getByRole('option', { name: 'Transferencia', exact: false })).toBeVisible()
  })
}

for (const [stored, visible, amount, explanation] of [
  ['Nequi', 'Transferencia', '15.000', 'brutos (total flete)'],
  ['Efectivo', 'Efectivo', '10.000', 'netos (tras caja conductor)'],
  ['Transferencia', 'Transferencia', '15.000', 'brutos (total flete)'],
]) {
  test(`financial calculation is unchanged for stored ${stored}`, async ({ context, page, traffic }) => {
    traffic.paymentMethod = stored
    await signInOffline(context)
    await page.goto('/financial')
    await page.getByRole('tab', { name: 'Rentabilidad Detallada' }).click()
    await expect(page.getByText(visible, { exact: true })).toBeVisible()
    const total = page.getByText(explanation, { exact: false })
    await expect(total).toContainText(amount)
  })
}

for (const stored of ['Nequi', 'Transferencia']) {
  test(`${stored} displays the full freight without conductor deduction`, async ({ context, page, traffic }) => {
    traffic.paymentMethod = stored
    await signInOffline(context)
    await page.goto('/shipments')
    const row = page.locator('tbody tr').filter({ hasText: 'TEST-1001' })
    await expect(row).toContainText('Transferencia')
    await expect(row).toContainText('15.000')
    await expect(row).not.toContainText('Neto:')
    await page.getByRole('link', { name: 'TEST-1001', exact: true }).click()
    await expect(page.getByText('Transferencia', { exact: true })).toBeVisible()
  })
}

test('cash still shows freight minus conductor payment', async ({ context, page }) => {
  await signInOffline(context)
  await page.goto('/shipments')
  const row = page.locator('tbody tr').filter({ hasText: 'TEST-1001' })
  await expect(row).toContainText('Neto:')
  await expect(row).toContainText('10.000')
})

test('Nequi and Transferencia combine into one gross transfer total', async ({ context, page }) => {
  await signInOffline(context)
  await page.route('https://review.invalid/rest/v1/shipments*', async route => {
    const url = new URL(route.request().url())
    const rows = url.searchParams.has('cash_on_delivery') ? [] : [
      { ...shipment, payment_method: 'Nequi' },
      { ...shipment, id: 2, guide_number: 'TEST-1002', payment_method: 'Transferencia' },
    ]
    await route.fulfill({ status: 200, headers: { 'content-type': 'application/json',
      'access-control-allow-origin': '*', 'content-range': '0-1/2' }, body: JSON.stringify(rows) })
  })
  await page.goto('/financial')
  await page.getByRole('tab', { name: 'Rentabilidad Detallada' }).click()
  await expect(page.getByText('Transferencia', { exact: true })).toHaveCount(1)
  await expect(page.getByText('brutos (total flete)', { exact: false })).toContainText('30.000')
})
