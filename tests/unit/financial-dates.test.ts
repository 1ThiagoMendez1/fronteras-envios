import { test } from 'node:test'
import assert from 'node:assert/strict'
import { colombiaDay, financialDayBounds, financialMovementDate } from '../../src/lib/financial-dates.ts'

test('calendar day follows Colombia rather than UTC', () => {
  assert.equal(colombiaDay(new Date('2026-10-21T04:59:59.999Z')), '2026-10-20')
  assert.equal(colombiaDay(new Date('2026-10-21T05:00:00Z')), '2026-10-21')
})
test('half-open day includes final fractional seconds and excludes next midnight', () => {
  const { start, endExclusive } = financialDayBounds('2026-10-20')
  assert.equal(new Date(start).toISOString(), '2026-10-20T05:00:00.000Z')
  assert.equal(endExclusive, '2026-10-21T05:00:00.000Z')
  assert.ok(Date.parse('2026-10-21T04:59:59.999Z') < Date.parse(endExclusive))
})
test('day boundaries handle leap days and year end', () => {
  assert.equal(financialDayBounds('2024-02-29').endExclusive, '2024-03-01T05:00:00.000Z')
  assert.equal(financialDayBounds('2026-12-31').endExclusive, '2027-01-01T05:00:00.000Z')
})
test('date-only movement values never shift to the preceding day', () => {
  assert.equal(financialMovementDate('2026-10-20'), '20/10')
})
