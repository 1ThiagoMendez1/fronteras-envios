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
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzU1MDAyNTAsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.N9bHaUc-J_-xgiXAwmPbsPXBLpt7ZhB-5N3if8mO96Q'),
    'import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzU1MDAyNTAsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlzcyI6InN1cGFiYXNlIn0.N3SaM86lgeQ-fzU1cKCN8AwFGikglUMuX7fkPRBE1u8'),
    'import.meta.env.VITE_EVOLUTION_API_URL': JSON.stringify(process.env.VITE_EVOLUTION_API_URL || 'https://evo.fronterasexpress.com'),
    'import.meta.env.VITE_EVOLUTION_INSTANCE': JSON.stringify(process.env.VITE_EVOLUTION_INSTANCE || 'prueba'),
    'import.meta.env.VITE_EVOLUTION_API_KEY': JSON.stringify(process.env.VITE_EVOLUTION_API_KEY || 'LRKD1GkZOxX4SYWteX+4NjWg7+m8z5CneOblkxsP8vnfuzA/bWDrBL/Og5mPnxsZG3RQurjpzRw/hFVZUHuTjg=='),
  },
})