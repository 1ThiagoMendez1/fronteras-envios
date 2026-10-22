import { spawnSync } from 'node:child_process'

// A disconnected build for tests: never compile production credentials into fixtures.
const result = spawnSync('npm', ['run', 'build', '--', '--outDir', '.perf-dist'], {
  stdio: 'inherit',
  env: { ...process.env,
    VITE_SUPABASE_URL: 'https://review.invalid',
    VITE_SUPABASE_ANON_KEY: 'offline-anon',
    VITE_SUPABASE_SERVICE_ROLE_KEY: 'offline-service',
    VITE_EVOLUTION_API_URL: 'https://whatsapp.invalid',
    VITE_EVOLUTION_INSTANCE: 'offline', VITE_EVOLUTION_API_KEY: 'offline-key',
  },
})
process.exit(result.status ?? 1)
