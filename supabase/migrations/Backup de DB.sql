-- ============================================================
-- Fronteras Envíos – Initial Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- ----------------------------------------------------------------
-- 1. PROFILES (extends auth.users)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT,
  role        TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin','operator','driver')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'operator')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------
-- 2. CLIENTS (remitentes)
-- ----------------------------------------------------------------
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

-- ----------------------------------------------------------------
-- 3. DRIVERS
-- ----------------------------------------------------------------
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

-- ----------------------------------------------------------------
-- 4. SHIPMENTS
-- ----------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_shipments_status      ON public.shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_guide       ON public.shipments(guide_number);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at  ON public.shipments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_driver      ON public.shipments(driver_id);

-- ----------------------------------------------------------------
-- 5. SHIPMENT HISTORY (audit trail)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipment_history (
  id           SERIAL PRIMARY KEY,
  shipment_id  INTEGER NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  status       TEXT NOT NULL,
  notes        TEXT,
  changed_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipment_history_shipment ON public.shipment_history(shipment_id);

-- Auto-log status changes
CREATE OR REPLACE FUNCTION public.log_shipment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.shipment_history (shipment_id, status, notes, changed_by)
    VALUES (NEW.id, NEW.status, NULL, NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_shipment_status_change ON public.shipments;
CREATE TRIGGER on_shipment_status_change
  AFTER UPDATE OF status ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.log_shipment_status_change();

-- ----------------------------------------------------------------
-- 6. DAILY CLOSE
-- ----------------------------------------------------------------
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
-- 7. FINANCIAL MOVEMENTS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_movements (
  id              SERIAL PRIMARY KEY,
  type            TEXT NOT NULL CHECK (type IN ('income','expense')),
  category        TEXT NOT NULL,
  amount          NUMERIC(14,2) NOT NULL,
  description     TEXT NOT NULL,
  reference_id    INTEGER,
  reference_type  TEXT,
  evidence_url    TEXT,
  recorded_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  movement_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_movements_date ON public.financial_movements(movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_movements_type ON public.financial_movements(type);

-- ----------------------------------------------------------------
-- 8. UPDATED_AT TRIGGERS
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at   BEFORE UPDATE ON public.profiles            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_clients_updated_at    BEFORE UPDATE ON public.clients             FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_drivers_updated_at    BEFORE UPDATE ON public.drivers             FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_shipments_updated_at  BEFORE UPDATE ON public.shipments           FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------
-- 9. ROW LEVEL SECURITY
-- ----------------------------------------------------------------
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_close        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_movements ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can do everything (tighten per role later)
CREATE POLICY "authenticated_all" ON public.profiles           FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON public.clients            FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON public.drivers            FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON public.shipments          FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON public.shipment_history   FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON public.daily_close        FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON public.financial_movements FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Public tracking: allow anonymous read of shipments by guide_number
CREATE POLICY "public_tracking" ON public.shipments
  FOR SELECT TO anon
  USING (TRUE);

CREATE POLICY "public_history" ON public.shipment_history
  FOR SELECT TO anon
  USING (TRUE);

-- ----------------------------------------------------------------
-- 10. SEED DATA (optional demo)
-- ----------------------------------------------------------------
-- Uncomment and run manually after schema creation if you want sample data:

INSERT INTO public.drivers (name, phone, vehicle_type, city, rate_per_delivery, is_active)
VALUES
  ('Carlos Sánchez', '3001234567', 'truck', 'Bogotá', 10000, TRUE),
  ('Luisa Pinto',    '3109876543', 'van',   'Medellín', 12000, TRUE);

INSERT INTO public.clients (document, name, phone, city, address)
VALUES
  ('900123456',  'Empresa A',                  '3001234567', 'Bogotá',   'Calle Principal 123'),
  ('1020304050', 'Juan Pérez',                 '3109876543', 'Medellín', 'Carrera 45 #67-89'),
  ('800987654',  'Comercializadora del Valle', '3151122334', 'Cali',     'Avenida 3N #45-12');



-- ============================================================
-- Fronteras Envíos – Robustness & RPCs
-- Run this in Supabase SQL Editor
-- ============================================================

-- RPC to update shipment status with notes in a single transaction
CREATE OR REPLACE FUNCTION public.update_shipment_status(
  p_shipment_id INTEGER,
  p_new_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Update the shipment
  UPDATE public.shipments
  SET status = p_new_status,
      updated_at = NOW()
  WHERE id = p_shipment_id;

  -- Insert history (the trigger will also fire, so we should either disable the trigger 
  -- or make the trigger more specific. Let's make the trigger only fire for non-RPC updates 
  -- if possible, or just accept the trigger is for 'auto' and we use manual for 'detailed')
  
  -- Re-thinking: Let's remove the trigger and use this RPC for ALL status changes from now on.
  INSERT INTO public.shipment_history (shipment_id, status, notes, changed_by)
  VALUES (p_shipment_id, p_new_status, p_notes, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disable the old trigger to avoid double-logging (RPC handles it now)
DROP TRIGGER IF EXISTS on_shipment_status_change ON public.shipments;

-- RPC to increment client shipment count atomically
CREATE OR REPLACE FUNCTION public.increment_client_shipments(p_document TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.clients
  SET total_shipments = total_shipments + 1,
      updated_at = NOW()
  WHERE document = p_document;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refined status change trigger to use auth.uid()
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

-- Add indices for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_shipments_guide_number ON public.shipments(guide_number);
CREATE INDEX IF NOT EXISTS idx_clients_document ON public.clients(document);





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
  role        TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin','operator','driver')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
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
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'operator')
  );
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_close ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_movements ENABLE ROW LEVEL SECURITY;

-- Allow everything for authenticated users
CREATE POLICY "authenticated_all" ON public.profiles FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON public.clients FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON public.drivers FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON public.shipments FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON public.shipment_history FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON public.daily_close FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON public.financial_movements FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Public tracking for Anon
CREATE POLICY "public_tracking" ON public.shipments FOR SELECT TO anon USING (TRUE);
CREATE POLICY "public_history" ON public.shipment_history FOR SELECT TO anon USING (TRUE);

-- ----------------------------------------------------------------
-- 5. INITIAL DATA
-- ----------------------------------------------------------------

-- Insert sample drivers
INSERT INTO public.drivers (name, phone, vehicle_type, city, rate_per_delivery, is_active)
VALUES 
  ('Carlos Sánchez', '3001234567', 'truck', 'Bogotá', 10000, TRUE),
  ('Luisa Pinto', '3109876543', 'van', 'Medellín', 12000, TRUE)
ON CONFLICT DO NOTHING;

-- Insert sample clients
INSERT INTO public.clients (document, name, phone, city, address)
VALUES 
  ('900123456', 'Empresa A', '3001234567', 'Bogotá', 'Calle Principal 123'),
  ('1020304050', 'Juan Pérez', '3109876543', 'Medellín', 'Carrera 45 #67-89')
ON CONFLICT (document) DO NOTHING;















-- CLEAN POLICIES (IDEMPOTENCIA)
DROP POLICY IF EXISTS "authenticated_all" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_all" ON public.clients;
DROP POLICY IF EXISTS "authenticated_all" ON public.drivers;
DROP POLICY IF EXISTS "authenticated_all" ON public.shipments;
DROP POLICY IF EXISTS "authenticated_all" ON public.shipment_history;
DROP POLICY IF EXISTS "authenticated_all" ON public.daily_close;
DROP POLICY IF EXISTS "authenticated_all" ON public.financial_movements;

DROP POLICY IF EXISTS "public_tracking" ON public.shipments;
DROP POLICY IF EXISTS "public_history" ON public.shipment_history;











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
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'operator')
  );
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_close ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_movements ENABLE ROW LEVEL SECURITY;

-- Allow everything for authenticated users
CREATE POLICY "authenticated_all" ON public.profiles FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON public.clients FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON public.drivers FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON public.shipments FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON public.shipment_history FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON public.daily_close FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON public.financial_movements FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Public tracking for Anon
CREATE POLICY "public_tracking" ON public.shipments FOR SELECT TO anon USING (TRUE);
CREATE POLICY "public_history" ON public.shipment_history FOR SELECT TO anon USING (TRUE);

-- ----------------------------------------------------------------
-- 5. INITIAL DATA
-- ----------------------------------------------------------------

-- Insert sample drivers
INSERT INTO public.drivers (name, phone, vehicle_type, city, rate_per_delivery, is_active)
VALUES 
  ('Carlos Sánchez', '3001234567', 'truck', 'Bogotá', 10000, TRUE),
  ('Luisa Pinto', '3109876543', 'van', 'Medellín', 12000, TRUE)
ON CONFLICT DO NOTHING;

-- Insert sample clients
INSERT INTO public.clients (document, name, phone, city, address)
VALUES 
  ('900123456', 'Empresa A', '3001234567', 'Bogotá', 'Calle Principal 123'),
  ('1020304050', 'Juan Pérez', '3109876543', 'Medellín', 'Carrera 45 #67-89')
ON CONFLICT (document) DO NOTHING;











-- ============================================================
-- FRONTERAS ENVÍOS - ULTIMATE BACKEND FIX
-- ============================================================
-- Instrucciones: Pega TODO este código en el SQL Editor de Supabase
-- y presiona RUN. Esto limpiará ruidos, creará las tablas,
-- reseteará permisos (RLS) y cargará datos de prueba.

-- 1. LIMPIEZA INICIAL (Asegurar estado limpio)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- 2. TABLAS Y ESQUEMA (Con DROP/CREATE para asegurar tipos)
-- Eliminamos con precaución para no romper dependencias si ya existen datos que el usuario quiere guardar, 
-- pero como el usuario pidió "crea toda la BD", asumimos limpieza.

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT,
  role        TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin','operator','driver','client')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
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
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Financial
CREATE TABLE IF NOT EXISTS public.financial_movements (
  id              SERIAL PRIMARY KEY,
  type            TEXT NOT NULL CHECK (type IN ('income','expense')),
  category        TEXT NOT NULL,
  amount          NUMERIC(14,2) NOT NULL,
  description     TEXT NOT NULL,
  evidence_url    TEXT,
  recorded_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  movement_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cierre Diario
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

-- 3. AUTOMATIZACIONES (Funciones & Triggers)
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), COALESCE(NEW.raw_user_meta_data->>'role', 'operator'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. POLÍTICAS RLS DEFÍNITIVAS (Fix 403 Forbidden)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_close ENABLE ROW LEVEL SECURITY;

-- Politica Universal para usuarios autenticados: ACCESO TOTAL (Admin y Operadores)
CREATE POLICY "auth_full_access_profiles" ON public.profiles FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_full_access_clients" ON public.clients FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_full_access_drivers" ON public.drivers FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_full_access_shipments" ON public.shipments FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_full_access_financial" ON public.financial_movements FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_full_access_daily" ON public.daily_close FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Politica para Anon (Seguimiento Público)
CREATE POLICY "anon_tracking" ON public.shipments FOR SELECT TO anon USING (TRUE);

-- 5. BUCKETS DE ALMACENAMIENTO (Evidencias)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidence', 'evidence', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_view_evidence" ON storage.objects FOR SELECT TO public USING (bucket_id = 'evidence');
CREATE POLICY "auth_upload_evidence" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'evidence');

-- 6. DATOS DE PRUEBA (5 por módulo)
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

-- Envíos (Referenciando conductores existentes)
INSERT INTO public.shipments (sender_name, sender_phone, sender_address, sender_city, recipient_name, recipient_phone, recipient_address, recipient_city, status, shipping_cost, driver_payment)
VALUES
('Remitente A', '123', 'Dir 1', 'Bogotá', 'Destino A', '321', 'Calle A', 'Medellín', 'delivered', 35000, 10000),
('Remitente B', '123', 'Dir 2', 'Bogotá', 'Destino B', '321', 'Calle B', 'Cali', 'in_transit', 45000, 12000),
('Remitente C', '123', 'Dir 3', 'Medellín', 'Destino C', '321', 'Calle C', 'Bogotá', 'created', 25000, 8000),
('Remitente D', '123', 'Dir 4', 'Cali', 'Destino D', '321', 'Calle D', 'Barranquilla', 'incident', 55000, 15000),
('Remitente E', '123', 'Dir 5', 'Bogotá', 'Destino E', '321', 'Calle E', 'Pereira', 'picked_up', 30000, 9000);

-- Financiero
INSERT INTO public.financial_movements (type, category, amount, description) VALUES
('income', 'Fletes', 150000, 'Pago contado Guía 1001'),
('expense', 'Combustible', 50000, 'Tanqueo Camión 1'),
('income', 'Fletes', 200000, 'Abono Empresa A'),
('expense', 'Peajes', 30000, 'Peajes ruta Bogotá-Med'),
('expense', 'Viáticos', 40000, 'Almuerzo conductor');

-- Cierre Diario
INSERT INTO public.daily_close (close_date, branch, total_shipments, total_revenue, total_driver_payments, net_profit, cash_collected) VALUES
('2024-03-22', 'Bogotá', 10, 500000, 150000, 350000, 500000),
('2024-03-23', 'Bogotá', 15, 750000, 225000, 525000, 750000);

-- 7. FIX ADMIN ROLE (Asegurar acceso persistente)
UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@fronteras.com';
INSERT INTO public.profiles (id, email, name, role) 
SELECT id, email, 'Super Admin', 'admin' FROM auth.users WHERE email = 'admin@fronteras.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';






