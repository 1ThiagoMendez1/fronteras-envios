import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import assert from 'node:assert/strict'

const manifest = JSON.parse(readFileSync('.perf-dist/.vite/manifest.json', 'utf8'))
const baseline = JSON.parse(readFileSync('scripts/performance/baseline.json', 'utf8'))
function closure(key, seen = new Set()) {
  if (seen.has(key)) return seen
  assert.ok(manifest[key], `Missing manifest entry ${key}`)
  seen.add(key)
  for (const dependency of manifest[key].imports ?? []) closure(dependency, seen)
  return seen
}
function bytes(keys) {
  const files = new Set([...keys].map(key => manifest[key].file).filter(file => file.endsWith('.js')))
  return [...files].reduce((sum, file) => sum + gzipSync(readFileSync(`.perf-dist/${file}`)).length, 0)
}
const entry = closure('index.html')
const login = new Set([...entry, ...closure('src/pages/login.tsx')])
const tracking = new Set([...entry, ...closure('src/pages/public-tracking.tsx')])
const clients = new Set([...entry, ...closure('src/pages/clients.tsx')])
for (const key of login) assert.ok(!/xlsx|colombia-map|AreaChart|pages\/(dashboard|clients|financial)/.test(key + manifest[key].file), `Heavy dependency in login: ${key}`)
for (const key of tracking) assert.ok(!/(?:^|[/_])colombia-map(?:-|\.tsx)|xlsx|AreaChart/.test(key + manifest[key].file), `Heavy dependency in tracking: ${key}`)
for (const key of clients) assert.ok(!/xlsx/.test(key + manifest[key].file), `Excel loaded before user action: ${key}`)
const loginBytes = bytes(login)
const trackingBytes = bytes(tracking)
assert.ok(loginBytes < 200_000, `Login exceeds 200 kB gzip: ${loginBytes}`)
assert.ok(trackingBytes < 270_000, `Tracking exceeds 270 kB gzip: ${trackingBytes}`)
console.log(JSON.stringify({ baselineGzipBytes: baseline.jsGzipBytes, loginGzipBytes: loginBytes,
  trackingGzipBytes: trackingBytes, clientsGzipBytes: bytes(clients),
  loginReductionPercent: Number(((1 - loginBytes / baseline.jsGzipBytes) * 100).toFixed(1)),
  trackingReductionPercent: Number(((1 - trackingBytes / baseline.jsGzipBytes) * 100).toFixed(1)),
  note: 'Static JS import closures; dynamic assets load on demand. Excludes CSS and runtime compression.' }, null, 2))
