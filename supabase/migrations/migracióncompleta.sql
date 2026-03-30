-- ============================================================
-- FRONTERAS ENVÍOS - MIGRACIÓN COMPLETA UNIFICADA
-- ============================================================
-- Instrucciones: Pega TODO este código en el SQL Editor de Supabase
-- y presiona RUN. Esto limpiará ruidos, creará las tablas actualizadas 
-- (incluyendo 'comentarios' para chat, campos extendidos de clientes),
-- reseteará permisos (RLS) y cargará datos de prueba.

-- ----------------------------------------------------------------
-- 1. LIMPIEZA INICIAL (Asegurar estado limpio para políticas)
-- ----------------------------------------------------------------
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- (Opcional) Eliminar tabla vieja de chat si existe
DROP TABLE IF EXISTS public.chat_messages;

-- ----------------------------------------------------------------
-- 2. TABLAS Y ESQUEMA
-- ----------------------------------------------------------------

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT,
  role        TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin','operator','driver','client')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login  TIMESTAMPTZ
);

-- Clients
CREATE TABLE IF NOT EXISTS public.clients (
  id                  SERIAL PRIMARY KEY,
  document            TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  phone               TEXT NOT NULL,
  city                TEXT NOT NULL,
  address             TEXT NOT NULL DEFAULT '',
  email               TEXT,
  total_shipments     INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo_cliente        TEXT DEFAULT 'NATURAL',
  tipo_identificacion TEXT DEFAULT 'CC',
  apellido            TEXT,
  razon_social        TEXT,
  responsable_iva     TEXT DEFAULT 'NO',
  regimen             TEXT DEFAULT 'ORDINARIO',
  departamento        TEXT,
  categoria           TEXT DEFAULT 'CLIENTE'
);
CREATE INDEX IF NOT EXISTS idx_clients_document ON public.clients(document);

-- Drivers
CREATE TABLE IF NOT EXISTS public.drivers (
  id                SERIAL PRIMARY KEY,
  name              TEXT NOT NULL,
  phone             TEXT NOT NULL,
  email             TEXT,
  company           TEXT,
  vehicle_type      TEXT NOT NULL DEFAULT 'van' CHECK (vehicle_type IN ('motorcycle','car','van','truck')),
  city              TEXT NOT NULL,
  rate_per_delivery NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shipments
CREATE SEQUENCE IF NOT EXISTS shipment_guide_seq START WITH 1001;
CREATE TABLE IF NOT EXISTS public.shipments (
  id                 SERIAL PRIMARY KEY,
  guide_number       TEXT NOT NULL UNIQUE DEFAULT ('GUIA-' || nextval('shipment_guide_seq')),
  sender_document    TEXT,
  sender_name        TEXT NOT NULL,
  sender_phone       TEXT NOT NULL,
  sender_address     TEXT NOT NULL,
  sender_city        TEXT NOT NULL,
  recipient_name     TEXT NOT NULL,
  recipient_phone    TEXT NOT NULL,
  recipient_address  TEXT NOT NULL,
  recipient_city     TEXT NOT NULL,
  payment_method     TEXT NOT NULL DEFAULT 'Efectivo',
  weight             NUMERIC(8,2) NOT NULL DEFAULT 1,
  declared_value     NUMERIC(14,2) NOT NULL DEFAULT 0,
  shipping_cost      NUMERIC(14,2) NOT NULL DEFAULT 0,
  driver_payment     NUMERIC(14,2) NOT NULL DEFAULT 0,
  observations       TEXT,
  status             TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','assigned','picked_up','in_transit','out_for_delivery','delivered','incident','returned')),
  driver_id          INTEGER REFERENCES public.drivers(id) ON DELETE SET NULL,
  branch_origin      TEXT NOT NULL DEFAULT 'Bogotá',
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  driver_signature   TEXT,
  comentarios        JSONB NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_guide ON public.shipments(guide_number);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON public.shipments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_driver ON public.shipments(driver_id);

-- Shipment History
CREATE TABLE IF NOT EXISTS public.shipment_history (
  id           SERIAL PRIMARY KEY,
  shipment_id  INTEGER NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  status       TEXT NOT NULL,
  notes        TEXT,
  changed_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Financial Movements
CREATE TABLE IF NOT EXISTS public.financial_movements (
  id              SERIAL PRIMARY KEY,
  type            TEXT NOT NULL CHECK (type IN ('income','expense')),
  category        TEXT NOT NULL,
  amount          NUMERIC(14,2) NOT NULL,
  description     TEXT NOT NULL,
  reference_id    INTEGER,
  reference_type  TEXT,
  evidence_url    TEXT,
  branch          TEXT NOT NULL DEFAULT 'Bogotá',
  recorded_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  movement_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_financial_movements_date ON public.financial_movements(movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_movements_type ON public.financial_movements(type);

-- Daily Close
CREATE TABLE IF NOT EXISTS public.daily_close (
  id                   SERIAL PRIMARY KEY,
  close_date           DATE NOT NULL,
  branch               TEXT NOT NULL DEFAULT 'Bogotá',
  total_shipments      INTEGER NOT NULL DEFAULT 0,
  total_revenue        NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_driver_payments NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_profit           NUMERIC(14,2) NOT NULL DEFAULT 0,
  cash_collected       NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes                TEXT,
  closed_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(close_date, branch)
);

-- ----------------------------------------------------------------
-- 3. AUTOMATIZACIONES (Funciones & Triggers)
-- ----------------------------------------------------------------

-- Updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON public.drivers;
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_shipments_updated_at ON public.shipments;
CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Log Shipment status changes automatically
CREATE OR REPLACE FUNCTION public.log_shipment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.shipment_history (shipment_id, status, notes, changed_by)
    VALUES (NEW.id, NEW.status, NULL, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_shipment_status_change ON public.shipments;
CREATE TRIGGER on_shipment_status_change
  AFTER UPDATE OF status ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.log_shipment_status_change();

-- Profile auto-creation
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_perms JSONB;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'operator');
  v_perms := CASE 
    WHEN v_role = 'admin' THEN '{"all": true}'::jsonb
    WHEN v_role = 'operator' THEN '{"view_dashboard": true, "manage_shipments": true, "manage_clients": true}'::jsonb
    WHEN v_role = 'driver' THEN '{"view_assigned_shipments": true, "update_status": true}'::jsonb
    ELSE '{}'::jsonb
  END;

  INSERT INTO public.profiles (id, email, name, role, permissions)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), v_role, v_perms)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, permissions = EXCLUDED.permissions;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------
-- 4. INTERFACE (RPCs)
-- ----------------------------------------------------------------

-- Update Shipment Status via RPC
CREATE OR REPLACE FUNCTION public.update_shipment_status(
  p_shipment_id INTEGER,
  p_new_status TEXT,
  p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE public.shipments SET status = p_new_status, updated_at = NOW() WHERE id = p_shipment_id;
  INSERT INTO public.shipment_history (shipment_id, status, notes, changed_by)
  VALUES (p_shipment_id, p_new_status, p_notes, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment client shipment count atomically
CREATE OR REPLACE FUNCTION public.increment_client_shipments(p_document TEXT) RETURNS VOID AS $$
BEGIN
  UPDATE public.clients SET total_shipments = total_shipments + 1, updated_at = NOW() WHERE document = p_document;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------
-- 5. POLÍTICAS RLS DEFÍNITIVAS (Fix 403 Forbidden)
-- ----------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_close ENABLE ROW LEVEL SECURITY;

-- Politica Universal para usuarios autenticados: ACCESO TOTAL
CREATE POLICY "auth_full_access_profiles" ON public.profiles FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_full_access_clients" ON public.clients FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_full_access_drivers" ON public.drivers FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_full_access_shipments" ON public.shipments FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_full_access_history" ON public.shipment_history FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_full_access_financial" ON public.financial_movements FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_full_access_daily" ON public.daily_close FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Politica para Anon (Seguimiento Público)
CREATE POLICY "anon_tracking_shipments" ON public.shipments FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_tracking_history" ON public.shipment_history FOR SELECT TO anon USING (TRUE);

-- ----------------------------------------------------------------
-- 6. BUCKETS DE ALMACENAMIENTO (Evidencias)
-- ----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidence', 'evidence', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_view_evidence" ON storage.objects FOR SELECT TO public USING (bucket_id = 'evidence');
CREATE POLICY "auth_upload_evidence" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'evidence');

-- ----------------------------------------------------------------
-- 7. DATOS DE PRUEBA (Opcional - Demo)
-- ----------------------------------------------------------------
-- Clientes
INSERT INTO public.clients (document, name, phone, city, address) VALUES
('10101', 'Tiendas D1', '3001', 'Bogotá', 'Cl 100'),
('20202', 'Tiendas Ara', '3002', 'Medellín', 'Cra 50'),
('30303', 'Isimo', '3003', 'Cali', 'Av 5'),
('40404', 'Makro', '3004', 'Barranquilla', 'Cl 10'),
('50505', 'PriceSmart', '3005', 'Pereira', 'Av Sur')
ON CONFLICT (document) DO NOTHING;

-- Conductores
INSERT INTO public.drivers (name, phone, vehicle_type, city, rate_per_delivery) VALUES
('Juan Mecánico', '3111', 'truck', 'Bogotá', 20000),
('Carlos Vives', '3222', 'van', 'Medellín', 15000),
('Shakira Mebarak', '3333', 'car', 'Cali', 10000),
('Sofia Vergara', '3444', 'van', 'Barranquilla', 18000),
('J Balvin', '3555', 'motorcycle', 'Medellín', 5000)
ON CONFLICT DO NOTHING;

-- Fix para asegurar que exista el Super Admin (si existe el correo en auth.users)
UPDATE public.profiles SET role = 'admin', permissions = '{"all": true}'::jsonb WHERE email = 'admin@fronteras.com';
INSERT INTO public.profiles (id, email, name, role, permissions) 
SELECT id, email, 'Super Admin', 'admin', '{"all": true}'::jsonb FROM auth.users WHERE email = 'admin@fronteras.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin', permissions = '{"all": true}'::jsonb;
