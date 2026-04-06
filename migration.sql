
-- ============================================================
-- Migration SQL for Fronteras Envíos
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. clients
CREATE TABLE IF NOT EXISTS public.clients (
  id BIGSERIAL PRIMARY KEY,
  tipo_cliente TEXT,
  tipo_identificacion TEXT,
  document TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  apellido TEXT,
  razon_social TEXT,
  responsable_iva TEXT,
  regimen TEXT,
  categoria TEXT,
  email TEXT,
  phone TEXT NOT NULL DEFAULT '',
  departamento TEXT,
  city TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  total_shipments INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. drivers
CREATE TABLE IF NOT EXISTS public.drivers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT,
  company TEXT,
  vehicle_type TEXT NOT NULL DEFAULT 'motorcycle',
  city TEXT NOT NULL DEFAULT '',
  rate_per_delivery NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. shipments  
CREATE TABLE IF NOT EXISTS public.shipments (
  id BIGSERIAL PRIMARY KEY,
  guide_number TEXT UNIQUE NOT NULL,
  sender_document TEXT,
  sender_name TEXT,
  sender_phone TEXT,
  sender_address TEXT,
  sender_city TEXT,
  recipient_document TEXT,
  recipient_name TEXT,
  recipient_phone TEXT,
  recipient_address TEXT,
  recipient_city TEXT,
  payment_method TEXT DEFAULT 'Efectivo',
  weight NUMERIC DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  declared_value NUMERIC DEFAULT 0,
  shipping_cost NUMERIC DEFAULT 0,
  driver_payment NUMERIC DEFAULT 0,
  observations TEXT,
  comentarios JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'registered',
  driver_id BIGINT REFERENCES public.drivers(id),
  driver_signature TEXT,
  branch_origin TEXT DEFAULT 'Bogotá',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. shipment_history
CREATE TABLE IF NOT EXISTS public.shipment_history (
  id BIGSERIAL PRIMARY KEY,
  shipment_id BIGINT REFERENCES public.shipments(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  changed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. financial_movements
CREATE TABLE IF NOT EXISTS public.financial_movements (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  reference_id BIGINT,
  reference_type TEXT,
  evidence_url TEXT,
  recorded_by TEXT,
  branch TEXT DEFAULT 'Bogotá',
  movement_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. daily_close
CREATE TABLE IF NOT EXISTS public.daily_close (
  id BIGSERIAL PRIMARY KEY,
  close_date TIMESTAMPTZ NOT NULL,
  branch TEXT DEFAULT 'Bogotá',
  total_shipments INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  total_driver_payments NUMERIC DEFAULT 0,
  net_profit NUMERIC DEFAULT 0,
  cash_collected NUMERIC DEFAULT 0,
  notes TEXT,
  closed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(close_date, branch)
);

-- 7. app_roles
CREATE TABLE IF NOT EXISTS public.app_roles (
  id TEXT PRIMARY KEY,
  label TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'operator',
  is_active BOOLEAN DEFAULT TRUE,
  branch TEXT DEFAULT 'Bogotá',
  permissions JSONB DEFAULT '{}'::jsonb,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_close ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (these policies ensure the app works with service key)
-- Also allow authenticated users to read most tables

-- clients
DROP POLICY IF EXISTS "service_role_all_clients" ON public.clients;
CREATE POLICY "service_role_all_clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

-- drivers
DROP POLICY IF EXISTS "service_role_all_drivers" ON public.drivers;
CREATE POLICY "service_role_all_drivers" ON public.drivers FOR ALL USING (true) WITH CHECK (true);

-- shipments
DROP POLICY IF EXISTS "service_role_all_shipments" ON public.shipments;
CREATE POLICY "service_role_all_shipments" ON public.shipments FOR ALL USING (true) WITH CHECK (true);

-- shipment_history
DROP POLICY IF EXISTS "service_role_all_shipment_history" ON public.shipment_history;
CREATE POLICY "service_role_all_shipment_history" ON public.shipment_history FOR ALL USING (true) WITH CHECK (true);

-- financial_movements
DROP POLICY IF EXISTS "service_role_all_financial_movements" ON public.financial_movements;
CREATE POLICY "service_role_all_financial_movements" ON public.financial_movements FOR ALL USING (true) WITH CHECK (true);

-- daily_close
DROP POLICY IF EXISTS "service_role_all_daily_close" ON public.daily_close;
CREATE POLICY "service_role_all_daily_close" ON public.daily_close FOR ALL USING (true) WITH CHECK (true);

-- app_roles
DROP POLICY IF EXISTS "service_role_all_app_roles" ON public.app_roles;
CREATE POLICY "service_role_all_app_roles" ON public.app_roles FOR ALL USING (true) WITH CHECK (true);

-- profiles
DROP POLICY IF EXISTS "service_role_all_profiles" ON public.profiles;
CREATE POLICY "service_role_all_profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
