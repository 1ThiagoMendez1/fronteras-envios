import { test, expect, signInOffline } from './fixtures'

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
  ['Transferencia', 'Transferencia', '10.000', 'netos (tras caja conductor)'],
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

test('historical Nequi displays as Transferencia without showing conductor net', async ({ context, page, traffic }) => {
  traffic.paymentMethod = 'Nequi'
  await signInOffline(context)
  await page.goto('/shipments')
  const row = page.locator('tbody tr').filter({ hasText: 'TEST-1001' })
  await expect(row).toContainText('Transferencia')
  await expect(row).not.toContainText('Neto:')
  await page.getByRole('link', { name: 'TEST-1001', exact: true }).click()
  await expect(page.getByText('Transferencia', { exact: true })).toBeVisible()
})
