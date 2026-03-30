-- ============================================================
-- Fronteras Envíos – Unified Database Setup
-- Run this in Supabase SQL Editor
-- ============================================================

-- ----------------------------------------------------------------
-- 1. TABLES & SCHEMA
-- ----------------------------------------------------------------

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT,
  role        TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin','operator','driver','client')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb, -- New granular permissions
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login  TIMESTAMPTZ
);

-- Clients
CREATE TABLE IF NOT EXISTS public.clients (
  id               SERIAL PRIMARY KEY,
  document         TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  city             TEXT NOT NULL,
  address          TEXT NOT NULL DEFAULT '',
  email            TEXT,
  total_shipments  INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_document ON public.clients(document);

-- Drivers
CREATE TABLE IF NOT EXISTS public.drivers (
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
CREATE SEQUENCE IF NOT EXISTS shipment_guide_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS public.shipments (
  id                 SERIAL PRIMARY KEY,
  guide_number       TEXT NOT NULL UNIQUE DEFAULT (nextval('shipment_guide_seq')::TEXT),
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
  status             TEXT NOT NULL DEFAULT 'created'
                     CHECK (status IN ('created','assigned','picked_up','in_transit','out_for_delivery','delivered','incident','returned')),
  driver_id          INTEGER REFERENCES public.drivers(id) ON DELETE SET NULL,
  branch_origin      TEXT NOT NULL DEFAULT 'Bogotá',
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

-- ----------------------------------------------------------------
-- 2. AUTOMATIONS (Triggers & Functions)
-- ----------------------------------------------------------------

-- Updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
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
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_perms JSONB;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'operator');
  
  -- Default permissions mapping
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

-- ----------------------------------------------------------------
-- 3. INTERFACE (RPCs)
-- ----------------------------------------------------------------

-- Update Shipment Status via RPC
CREATE OR REPLACE FUNCTION public.update_shipment_status(
  p_shipment_id INTEGER,
  p_new_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.shipments
  SET status = p_new_status,
      updated_at = NOW()
  WHERE id = p_shipment_id;

  INSERT INTO public.shipment_history (shipment_id, status, notes, changed_by)
  VALUES (p_shipment_id, p_new_status, p_notes, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------
-- 4. SECURITY (RLS)
-- ----------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_close ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_movements ENABLE ROW LEVEL SECURITY;

-- Function to drop all policies on a table (to ensure clean state)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- Define new clean policies
-- Profiles: Users can read all, but only update their own (except admins)
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Clients: Auth users full control
CREATE POLICY "clients_all" ON public.clients FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Drivers: Auth users full control
CREATE POLICY "drivers_all" ON public.drivers FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Shipments: Auth users full control + Anon tracking
CREATE POLICY "shipments_all" ON public.shipments FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "shipments_anon_tracking" ON public.shipments FOR SELECT TO anon USING (TRUE);

-- History: Auth users full control + Anon tracking
CREATE POLICY "history_all" ON public.shipment_history FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "history_anon_tracking" ON public.shipment_history FOR SELECT TO anon USING (TRUE);

-- Financial: Auth users full control
CREATE POLICY "financial_all" ON public.financial_movements FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Daily Close: Auth users full control
CREATE POLICY "daily_close_all" ON public.daily_close FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Additional Anon policies for public tracking if not already covered
CREATE POLICY "anon_read_profiles_limited" ON public.profiles FOR SELECT TO anon USING (FALSE); -- No anon profiles

-- ----------------------------------------------------------------
-- 5. INITIAL DATA
-- ----------------------------------------------------------------

-- Insert sample profiles (including permissions)
-- We use a dummy UUID if the Auth user isn't created yet, but the trigger will update it if it exists.
-- Better yet, we just ensure the admin profile exists if the Auth user 'admin@fronteras.com' is there.
INSERT INTO public.profiles (id, email, name, role, permissions, is_active)
SELECT id, email, 'Super Admin', 'admin', '{"all": true}', TRUE
FROM auth.users 
WHERE email = 'admin@fronteras.com'
ON CONFLICT (id) DO UPDATE SET 
  permissions = '{"all": true}',
  role = 'admin';

-- Insert sample clients
INSERT INTO public.clients (document, name, phone, city, address)
VALUES 
  ('111', 'Almacenes Éxito', '3001234567', 'Bogotá', 'Calle Principal 123'),
  ('222', 'Homecenter', '3109876543', 'Medellín', 'Carrera 45 #67-89')
ON CONFLICT (document) DO NOTHING;

-- Insert sample drivers
INSERT INTO public.drivers (name, phone, vehicle_type, city, rate_per_delivery, is_active)
VALUES 
  ('Pedro Picapiedra', '3001234567', 'truck', 'Bogotá', 15000, TRUE),
  ('Pablo Marmol', '3109876543', 'van', 'Bogotá', 12000, TRUE)
ON CONFLICT DO NOTHING;
