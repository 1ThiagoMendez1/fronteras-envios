-- Script para habilitar las políticas de seguridad (Row Level Security) 
-- Ejecuta este script manualmente en el SQL Editor de tu Supabase Self-Hosted

-- 1. Asegurarte de que RLS esté activado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas restrictivas anteriores (opcional, por si acaso)
DROP POLICY IF EXISTS "Enable read access for all authenticated users on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all authenticated users on shipments" ON public.shipments;

-- 3. Crear políticas para PROFILES (Permitir a usuarios autenticados leer todos los perfiles)
CREATE POLICY "Enable read access for all authenticated users on profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- Permitir a los perfiles actualizarse a sí mismos
CREATE POLICY "Enable update for users based on id" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- 4. Crear políticas para SHIPMENTS (Permitir lectura general operativa)
CREATE POLICY "Enable read access for all authenticated users on shipments" 
ON public.shipments FOR SELECT 
TO authenticated 
USING (true);

-- (Opcional) permitir inserción de guías a autenticados
CREATE POLICY "Enable insert for authenticated users" 
ON public.shipments FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- (Opcional) permitir modificar cualquier envío a los operadores/admins (basado en rol)
CREATE POLICY "Enable update for authenticated users" 
ON public.shipments FOR UPDATE 
TO authenticated 
USING (true);

-- NOTA: Estas políticas (USING true) son permisivas para propósitos de demostración. 
-- En producción, restringe "USING (true)" a roles específicos.
