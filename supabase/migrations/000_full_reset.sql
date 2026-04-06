-- ============================================================
-- Fronteras Envíos – FULL DATABASE RESET & SETUP
-- ⚠️ ESTO BORRA TODAS LAS TABLAS Y LAS RECREA DESDE CERO
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. DROP all existing tables (order matters for foreign keys)
DROP TABLE IF EXISTS public.financial_movements CASCADE;
DROP TABLE IF EXISTS public.daily_close CASCADE;
DROP TABLE IF EXISTS public.shipment_history CASCADE;
DROP TABLE IF EXISTS public.shipments CASCADE;
DROP TABLE IF EXISTS public.drivers CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.app_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP SEQUENCE IF EXISTS shipment_guide_seq CASCADE;

-- ================================================================
-- 2. TABLES
-- ================================================================

-- Profiles
CREATE TABLE public.profiles (
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

-- App Roles (module permissions)
CREATE TABLE public.app_roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.app_roles (id, name, permissions) VALUES
  ('admin', 'Administrador', ARRAY['dashboard','clients','shipments','drivers','financial','daily_close','users']),
  ('operator', 'Operador', ARRAY['dashboard','clients','shipments','drivers']),
  ('driver', 'Conductor', ARRAY['shipments']),
  ('client', 'Cliente', ARRAY['shipments']);

-- Clients
CREATE TABLE public.clients (
  id               SERIAL PRIMARY KEY,
  tipo_cliente     TEXT,
  tipo_identificacion TEXT,
  document         TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  apellido         TEXT,
  razon_social     TEXT,
  responsable_iva  TEXT,
  regimen          TEXT,
  categoria        TEXT,
  email            TEXT,
  phone            TEXT NOT NULL,
  departamento     TEXT,
  city             TEXT NOT NULL,
  address          TEXT NOT NULL DEFAULT '',
  total_shipments  INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_clients_document ON public.clients(document);

-- Drivers
CREATE TABLE public.drivers (
  id                SERIAL PRIMARY KEY,
  name              TEXT NOT NULL,
  phone             TEXT NOT NULL,
  email             TEXT,
  company           TEXT,
  vehicle_type      TEXT NOT NULL DEFAULT 'van'
                    CHECK (vehicle_type IN ('motorcycle','car','van','truck')),
  city              TEXT NOT NULL,
  rate_per_delivery NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shipments
CREATE SEQUENCE shipment_guide_seq START WITH 1001;

CREATE TABLE public.shipments (
  id                 SERIAL PRIMARY KEY,
  guide_number       TEXT NOT NULL UNIQUE DEFAULT (nextval('shipment_guide_seq')::TEXT),
  sender_document    TEXT,
  sender_name        TEXT NOT NULL,
  sender_phone       TEXT NOT NULL,
  sender_address     TEXT NOT NULL,
  sender_city        TEXT NOT NULL,
  recipient_document TEXT,
  recipient_name     TEXT NOT NULL,
  recipient_phone    TEXT NOT NULL,
  recipient_address  TEXT NOT NULL,
  recipient_city     TEXT NOT NULL,
  payment_method     TEXT NOT NULL DEFAULT 'Efectivo',
  weight             NUMERIC(8,2) NOT NULL DEFAULT 1,
  quantity           INTEGER NOT NULL DEFAULT 1,
  declared_value     NUMERIC(14,2) NOT NULL DEFAULT 0,
  shipping_cost      NUMERIC(14,2) NOT NULL DEFAULT 0,
  driver_payment     NUMERIC(14,2) NOT NULL DEFAULT 0,
  observations       TEXT,
  comentarios        JSONB,
  status             TEXT NOT NULL DEFAULT 'created'
                     CHECK (status IN ('created','assigned','picked_up','in_transit','out_for_delivery','delivered','incident','returned')),
  driver_id          INTEGER REFERENCES public.drivers(id) ON DELETE SET NULL,
  driver_signature   TEXT,
  branch_origin      TEXT NOT NULL DEFAULT 'Bogotá',
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shipments_status ON public.shipments(status);
CREATE INDEX idx_shipments_guide ON public.shipments(guide_number);
CREATE INDEX idx_shipments_created_at ON public.shipments(created_at DESC);
CREATE INDEX idx_shipments_driver ON public.shipments(driver_id);

-- Shipment History
CREATE TABLE public.shipment_history (
  id           SERIAL PRIMARY KEY,
  shipment_id  INTEGER NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  status       TEXT NOT NULL,
  notes        TEXT,
  changed_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily Close
CREATE TABLE public.daily_close (
  id                    SERIAL PRIMARY KEY,
  close_date            DATE NOT NULL,
  branch                TEXT NOT NULL DEFAULT 'Bogotá',
  total_shipments       INTEGER NOT NULL DEFAULT 0,
  total_revenue         NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_driver_payments NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_profit            NUMERIC(14,2) NOT NULL DEFAULT 0,
  cash_collected        NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes                 TEXT,
  closed_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(close_date, branch)
);

-- Financial Movements
CREATE TABLE public.financial_movements (
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

-- ================================================================
-- 3. FUNCTIONS & TRIGGERS
-- ================================================================

-- updated_at auto-update
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Log status changes
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

CREATE TRIGGER on_shipment_status_change
  AFTER UPDATE OF status ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.log_shipment_status_change();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    v_role,
    v_perms
  )
  ON CONFLICT (id) DO UPDATE SET 
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Increment client shipments helper
CREATE OR REPLACE FUNCTION public.increment_client_shipments(p_document TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.clients
  SET total_shipments = total_shipments + 1
  WHERE document = p_document;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_close ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated 
  USING (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Clients
CREATE POLICY "clients_all" ON public.clients FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Drivers
CREATE POLICY "drivers_all" ON public.drivers FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Shipments (authenticated full + anon tracking read)
CREATE POLICY "shipments_all" ON public.shipments FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "shipments_anon_tracking" ON public.shipments FOR SELECT TO anon USING (TRUE);

-- Shipment History
CREATE POLICY "history_all" ON public.shipment_history FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "history_anon_tracking" ON public.shipment_history FOR SELECT TO anon USING (TRUE);

-- Financial
CREATE POLICY "financial_all" ON public.financial_movements FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Daily Close
CREATE POLICY "daily_close_all" ON public.daily_close FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- App Roles
CREATE POLICY "app_roles_read_all" ON public.app_roles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "app_roles_admin_all" ON public.app_roles FOR ALL TO authenticated 
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin') 
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ================================================================
-- 5. RELOAD SCHEMA CACHE
-- ================================================================
NOTIFY pgrst, 'reload schema';

-- ✅ DONE! Now register your first admin user from the app's /register page.
