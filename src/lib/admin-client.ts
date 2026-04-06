import { createClient } from "@supabase/supabase-js";

// Service Role Key para operaciones administrativas de alta seguridad
// Ahora se lee desde variables de entorno en lugar de estar hardcodeado
const SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

if (!SERVICE_ROLE_KEY || !SUPABASE_URL) {
  console.error("⚠️ VITE_SUPABASE_SERVICE_ROLE_KEY o VITE_SUPABASE_URL no están configurados en .env");
}

export const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export const getAdminClient = () => adminClient;
