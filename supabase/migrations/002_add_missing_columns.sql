-- ============================================================
-- Fronteras Envíos – Migration: Add missing columns
-- Run this in Supabase SQL Editor (Studio Dashboard)
-- ============================================================

-- 1. Shipments: Add missing columns used by the application
ALTER TABLE public.shipments 
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.shipments 
  ADD COLUMN IF NOT EXISTS recipient_document TEXT;

ALTER TABLE public.shipments 
  ADD COLUMN IF NOT EXISTS driver_signature TEXT;

ALTER TABLE public.shipments 
  ADD COLUMN IF NOT EXISTS comentarios JSONB;

-- 2. Clients: Add missing extended fields
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tipo_cliente TEXT;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tipo_identificacion TEXT;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS apellido TEXT;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS razon_social TEXT;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS responsable_iva TEXT;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS regimen TEXT;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS categoria TEXT;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS departamento TEXT;

-- 3. App Roles table (for module permissions management)
CREATE TABLE IF NOT EXISTS public.app_roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default roles if they don't exist
INSERT INTO public.app_roles (id, name, permissions)
VALUES 
  ('admin', 'Administrador', ARRAY['dashboard','clients','shipments','drivers','financial','daily_close','users']),
  ('operator', 'Operador', ARRAY['dashboard','clients','shipments','drivers']),
  ('driver', 'Conductor', ARRAY['shipments']),
  ('client', 'Cliente', ARRAY['shipments'])
ON CONFLICT (id) DO NOTHING;

-- 4. RLS for app_roles
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_roles_read_all" ON public.app_roles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "app_roles_admin_all" ON public.app_roles FOR ALL TO authenticated 
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin') 
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 5. Increment client shipments RPC (used by shipment creation)
CREATE OR REPLACE FUNCTION public.increment_client_shipments(p_document TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.clients
  SET total_shipments = total_shipments + 1
  WHERE document = p_document;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Done! Restart PostgREST schema cache:
NOTIFY pgrst, 'reload schema';
