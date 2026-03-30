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
