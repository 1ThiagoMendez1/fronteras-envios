import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'http://fronterasexpress-supabase-575038-85-239-249-209.traefik.me'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQ5MDEzNDYsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.0a6TORlXRmZfkD90SENJtdGOETbk2YtiTwleyYJgEf8'),
    'import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '')
  }
})