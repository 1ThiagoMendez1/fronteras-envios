import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Faltan las variables VITE_SUPABASE_URL o VITE_SUPABASE_SERVICE_ROLE_KEY en .env");
  process.exit(1);
}

// Usar Service Role Key para tener privilegios de administrador
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const demoUsers = [
  { email: "admin@fronteras.com", password: "admin123", name: "Admin Fronteras", role: "admin" },
  { email: "operator@fronteras.com", password: "operador123", name: "Operador Principal", role: "operator" },
  { email: "driver@fronteras.com", password: "driver123", name: "Conductor 1", role: "driver" },
  { email: "cliente@fronteras.com", password: "cliente123", name: "Cliente VIP", role: "client" }
];

async function seedUsers() {
  console.log("Iniciando creación de usuarios de prueba...");
  
  for (const user of demoUsers) {
    console.log(`Creando usuario: ${user.email}...`);
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // Auto-confirmar el correo!
      user_metadata: {
        name: user.name,
        role: user.role
      }
    });

    if (authError) {
      if (authError.message.includes('already exactly matches')) {
        console.log(`El usuario ${user.email} ya existe en Auth.`);
      } else {
        console.error(`Error creando auth para ${user.email}:`, authError.message);
      }
    } else {
      console.log(`Usuario Auth creado: ${user.email}`);
      const userId = authData.user.id;
      
      // Intentar insertar en la tabla perfiles públicos, aunque Supabase (si tiene triggers)
      // ya lo haya insertado.
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        email: user.email,
        name: user.name,
        role: user.role,
        is_active: true
      });

      if (profileError) {
        console.error(`Error upsert profile para ${user.email}:`, profileError.message);
      } else {
        console.log(`Perfil público creado/actualizado para ${user.email}`);
      }
    }
  }
  
  console.log("Proceso completado.");
}

seedUsers();
