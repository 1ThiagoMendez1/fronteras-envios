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
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://api.fronterasexpress.com'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQ5MDEzNDYsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.0a6TORlXRmZfkD90SENJtdGOETbk2YtiTwleyYJgEf8'),
    'import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQ5MDEzNDYsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlzcyI6InN1cGFiYXNlIn0.-VQBliQtj3llnP4f8TMKiCo0So5Q9-qLdQMnA-T324g'),
    'import.meta.env.VITE_EVOLUTION_API_URL': JSON.stringify(process.env.VITE_EVOLUTION_API_URL || 'https://evo.fronterasexpress.com'),
    'import.meta.env.VITE_EVOLUTION_INSTANCE': JSON.stringify(process.env.VITE_EVOLUTION_INSTANCE || 'prueba'),
    'import.meta.env.VITE_EVOLUTION_API_KEY': JSON.stringify(process.env.VITE_EVOLUTION_API_KEY || 'LRKD1GkZOxX4SYWteX+4NjWg7+m8z5CneOblkxsP8vnfuzA/bWDrBL/Og5mPnxsZG3RQurjpzRw/hFVZUHuTjg=='),
  },
})