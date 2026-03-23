-- ============================================================
-- FRONTERAS ENVÍOS - FIX PERMISOS API (403 Forbidden)
-- ============================================================
-- Instrucciones: Pega este código en el SQL Editor de tu Supabase
-- self-hosted y presiona RUN. Esto permitirá que la página
-- de clientes y los demás módulos puedan leer los datos reales.

-- 1. Asegurar uso del esquema público
GRANT USAGE ON SCHEMA public TO postgres, service_role, anon, authenticated;

-- 2. Conceder permisos sobre todas las tablas existentes
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, service_role, anon, authenticated;

-- 3. Conceder permisos sobre todas las secuencias (para los IDs autoincrementales)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, anon, authenticated;

-- 4. Conceder permisos sobre todas las funciones
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role, anon, authenticated;

-- 5. Asegurar que las nuevas tablas hereden estos permisos automáticamente
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, service_role, anon, authenticated;

-- 6. Recargar PostgREST para asegurar los cambios (opcional en algunas versiones)
NOTIFY pgrst, 'reload schema';

-- Mensaje de verificación
DO $$ 
BEGIN 
  RAISE NOTICE 'Permisos restaurados con éxito. Prueba ahora a recargar el módulo de Clientes.'; 
END $$;
