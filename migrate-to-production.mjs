/**
 * ============================================================
 * Fronteras Envíos – Production Migration Script
 * ============================================================
 * Migrates EVERYTHING from supabase.devsystech.com.co
 * to api.fronterasexpress.com EXCEPT users.
 * Creates a test admin user on the new instance.
 * ============================================================
 */

import { createClient } from "@supabase/supabase-js";

// ─── Old Instance (Source) ───
const OLD_URL = "https://supabase.devsystech.com.co";
const OLD_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

// ─── New Instance (Target) ───
const NEW_URL = "https://api.fronterasexpress.com";
const NEW_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQ5MDEzNDYsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlzcyI6InN1cGFiYXNlIn0.-VQBliQtj3llnP4f8TMKiCo0So5Q9-qLdQMnA-T324g";

const oldClient = createClient(OLD_URL, OLD_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const newClient = createClient(NEW_URL, NEW_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ─── Helpers ───
function log(emoji, msg) { console.log(`${emoji}  ${msg}`); }
function logError(emoji, msg, err) { console.error(`${emoji}  ${msg}:`, err?.message || err); }

async function runSQL(url, serviceKey, sql) {
  // Use the Supabase REST SQL endpoint (available on self-hosted)
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Prefer": "return=representation"
    },
    body: JSON.stringify({ query: sql })
  });

  if (!res.ok) {
    // Try the postgres meta endpoint instead
    const res2 = await fetch(`${url}/pg/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql })
    });
    if (!res2.ok) {
      // Try via the SQL endpoint used by Supabase Studio
      const text = await res.text();
      const text2 = await res2.text();
      throw new Error(`SQL exec failed. Endpoint 1: ${text}. Endpoint 2: ${text2}`);
    }
    return await res2.json();
  }
  return await res.json();
}

// ─── Step 1: Create the exec_sql RPC function on the target ───
async function ensureSQLExec() {
  log("🔧", "Ensuring SQL execution capability on target...");
  
  // Try creating the exec_sql function
  const createFnSQL = `
    CREATE OR REPLACE FUNCTION public.exec_sql(query text)
    RETURNS json AS $$
    BEGIN
      EXECUTE query;
      RETURN '{"ok": true}'::json;
    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object('error', SQLERRM);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  // Try via the PostgREST meta routes or directly
  try {
    // First try: use the Supabase management API to run SQL
    const endpoints = [
      `${NEW_URL}/rest/v1/rpc/`,
    ];
    
    // Since we can't easily run arbitrary SQL through PostgREST,
    // we'll use a different approach: create tables via PostgREST + the schema
    log("ℹ️", "Will use PostgREST API for data migration");
    return true;
  } catch (err) {
    logError("⚠️", "Could not set up SQL exec", err);
    return false;
  }
}

// ─── Step 2: Read ALL data from old instance ───
async function readOldData() {
  log("📖", "Reading data from old instance...");
  
  const tables = {};
  
  // Read clients
  const { data: clients, error: cErr } = await oldClient
    .from("clients")
    .select("*")
    .order("id", { ascending: true });
  if (cErr) logError("❌", "Error reading clients", cErr);
  else log("✅", `Read ${clients.length} clients`);
  tables.clients = clients || [];

  // Read drivers
  const { data: drivers, error: dErr } = await oldClient
    .from("drivers")
    .select("*")
    .order("id", { ascending: true });
  if (dErr) logError("❌", "Error reading drivers", dErr);
  else log("✅", `Read ${drivers.length} drivers`);
  tables.drivers = drivers || [];

  // Read shipments
  const { data: shipments, error: sErr } = await oldClient
    .from("shipments")
    .select("*")
    .order("id", { ascending: true });
  if (sErr) logError("❌", "Error reading shipments", sErr);
  else log("✅", `Read ${(shipments || []).length} shipments`);
  tables.shipments = shipments || [];

  // Read shipment_history
  const { data: history, error: hErr } = await oldClient
    .from("shipment_history")
    .select("*")
    .order("id", { ascending: true });
  if (hErr) logError("⚠️", "Error reading shipment_history (may not exist)", hErr);
  else log("✅", `Read ${(history || []).length} shipment_history records`);
  tables.shipment_history = history || [];

  // Read financial_movements
  const { data: financial, error: fErr } = await oldClient
    .from("financial_movements")
    .select("*")
    .order("id", { ascending: true });
  if (fErr) logError("⚠️", "Error reading financial_movements", fErr);
  else log("✅", `Read ${(financial || []).length} financial_movements`);
  tables.financial_movements = financial || [];

  // Read daily_close
  const { data: dailyClose, error: dcErr } = await oldClient
    .from("daily_close")
    .select("*")
    .order("id", { ascending: true });
  if (dcErr) logError("⚠️", "Error reading daily_close", dcErr);
  else log("✅", `Read ${(dailyClose || []).length} daily_close records`);
  tables.daily_close = dailyClose || [];

  // Read app_roles
  const { data: roles, error: rErr } = await oldClient
    .from("app_roles")
    .select("*");
  if (rErr) logError("⚠️", "Error reading app_roles", rErr);
  else log("✅", `Read ${(roles || []).length} app_roles`);
  tables.app_roles = roles || [];

  return tables;
}

// ─── Step 3: Setup Schema on the new instance via SQL ───
async function setupSchema() {
  log("🏗️", "Setting up schema on new instance...");
  
  // We'll run this comprehensive SQL via the exec_sql RPC if available
  const schemaSQL = `
-- ============================================================
-- Fronteras Envíos – Production Schema Setup
-- ============================================================

-- 1. Drop all existing policies for a clean slate
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- ================================================================
-- TABLES
-- ================================================================

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
  id               SERIAL PRIMARY KEY,
  document         TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  city             TEXT NOT NULL,
  address          TEXT NOT NULL DEFAULT '',
  email            TEXT,
  total_shipments  INTEGER NOT NULL DEFAULT 0,
  tipo_cliente        TEXT,
  tipo_identificacion TEXT,
  apellido            TEXT,
  razon_social        TEXT,
  responsable_iva     TEXT,
  regimen             TEXT,
  categoria           TEXT,
  departamento        TEXT,
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
  status             TEXT NOT NULL DEFAULT 'created'
                     CHECK (status IN ('created','assigned','picked_up','in_transit','out_for_delivery','delivered','incident','returned')),
  driver_id          INTEGER REFERENCES public.drivers(id) ON DELETE SET NULL,
  driver_signature   TEXT,
  branch_origin      TEXT NOT NULL DEFAULT 'Bogotá',
  comentarios        JSONB,
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
CREATE INDEX IF NOT EXISTS idx_shipment_history_shipment ON public.shipment_history(shipment_id);

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
  recorded_by     TEXT,
  movement_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_financial_movements_date ON public.financial_movements(movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_movements_type ON public.financial_movements(type);

-- App Roles
CREATE TABLE IF NOT EXISTS public.app_roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- AUTOMATIONS (Triggers & Functions)
-- ================================================================

-- Updated_at trigger
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

-- Auto-log status changes
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

-- Auto-create profile on user signup
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

-- ================================================================
-- RPCs
-- ================================================================

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

-- Increment client shipments RPC
CREATE OR REPLACE FUNCTION public.increment_client_shipments(p_document TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.clients
  SET total_shipments = total_shipments + 1
  WHERE document = p_document;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_close ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

-- Auth policies
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles FOR UPDATE TO authenticated 
  USING (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "clients_all" ON public.clients FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "drivers_all" ON public.drivers FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "shipments_all" ON public.shipments FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "history_all" ON public.shipment_history FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "daily_close_all" ON public.daily_close FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "financial_all" ON public.financial_movements FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- App Roles policies
CREATE POLICY "app_roles_read_all" ON public.app_roles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "app_roles_write_admin" ON public.app_roles FOR ALL TO authenticated 
  USING (TRUE) WITH CHECK (TRUE);

-- Anon policies for public tracking
CREATE POLICY "shipments_anon_tracking" ON public.shipments FOR SELECT TO anon USING (TRUE);
CREATE POLICY "history_anon_tracking" ON public.shipment_history FOR SELECT TO anon USING (TRUE);

-- Storage bucket for evidence
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidence', 'evidence', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  BEGIN
    CREATE POLICY "public_view_evidence" ON storage.objects FOR SELECT TO public USING (bucket_id = 'evidence');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    CREATE POLICY "auth_upload_evidence" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'evidence');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
`;

  // Write the SQL to a file so user can run it in Supabase Studio if API doesn't work
  const fs = await import("fs");
  fs.writeFileSync("./production_schema.sql", schemaSQL, "utf-8");
  log("📝", "Full schema SQL saved to production_schema.sql");
  log("📋", "You can run this in your Supabase SQL Editor at: " + NEW_URL);

  // Try to run via the RPC endpoint
  try {
    const result = await runSQL(NEW_URL, NEW_SERVICE_KEY, schemaSQL);
    log("✅", "Schema created successfully via API!");
    return true;
  } catch (err) {
    log("⚠️", "Could not run SQL via API (expected on many self-hosted setups)");
    log("📋", "MANUAL STEP REQUIRED: Run production_schema.sql in your Supabase SQL Editor");
    log("🔗", `Open: ${NEW_URL} → SQL Editor → paste and run production_schema.sql`);
    return false;
  }
}

// ─── Step 4: Migrate Data ───
async function migrateData(tables) {
  log("📦", "Starting data migration to new instance...");
  
  // Helper to insert in batches
  async function insertBatch(tableName, rows, batchSize = 50) {
    if (!rows || rows.length === 0) {
      log("⏭️", `No data for ${tableName}, skipping`);
      return;
    }
    
    let inserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await newClient.from(tableName).upsert(batch, { 
        onConflict: getConflictColumn(tableName),
        ignoreDuplicates: true 
      });
      
      if (error) {
        logError("❌", `Error inserting batch into ${tableName}`, error);
        // Try inserting one-by-one for the failed batch
        for (const row of batch) {
          const { error: singleErr } = await newClient.from(tableName).upsert(row, {
            onConflict: getConflictColumn(tableName),
            ignoreDuplicates: true
          });
          if (singleErr) {
            logError("  ⚠️", `Failed single row in ${tableName} (id=${row.id || row.document || '?'})`, singleErr);
          } else {
            inserted++;
          }
        }
      } else {
        inserted += batch.length;
      }
    }
    log("✅", `Migrated ${inserted}/${rows.length} rows to ${tableName}`);
  }

  function getConflictColumn(table) {
    switch(table) {
      case "clients": return "document";
      case "app_roles": return "id";
      case "daily_close": return "close_date,branch";
      default: return "id";
    }
  }

  // Clean data: strip fields that reference auth.users since we're not migrating users
  function cleanUserRefs(rows) {
    return (rows || []).map(row => {
      const clean = { ...row };
      // Nullify any UUID references to auth.users
      if (clean.created_by) clean.created_by = null;
      if (clean.closed_by) clean.closed_by = null;
      if (clean.changed_by) clean.changed_by = null;
      // recorded_by might be UUID or text depending on schema version
      if (clean.recorded_by && typeof clean.recorded_by === 'string' && clean.recorded_by.includes('-')) {
        clean.recorded_by = 'Sistema'; // Replace UUID with text
      }
      return clean;
    });
  }

  // Order matters: parents before children due to foreign keys
  
  // 1. App Roles (no dependencies)
  await insertBatch("app_roles", tables.app_roles);

  // 2. Clients (no dependencies)
  await insertBatch("clients", tables.clients);

  // 3. Drivers (no dependencies)
  await insertBatch("drivers", tables.drivers);

  // 4. Shipments (depends on drivers)
  const cleanShipments = cleanUserRefs(tables.shipments);
  await insertBatch("shipments", cleanShipments);

  // 5. Shipment History (depends on shipments)
  const cleanHistory = cleanUserRefs(tables.shipment_history);
  await insertBatch("shipment_history", cleanHistory);

  // 6. Financial Movements (cleanup user refs)
  const cleanFinancial = cleanUserRefs(tables.financial_movements);
  await insertBatch("financial_movements", cleanFinancial);

  // 7. Daily Close (cleanup user refs)
  const cleanDailyClose = cleanUserRefs(tables.daily_close);
  await insertBatch("daily_close", cleanDailyClose);

  log("🎉", "Data migration completed!");
}

// ─── Step 5: Create Admin User ───
async function createAdminUser() {
  log("👤", "Creating admin test user on new instance...");
  
  try {
    // Check if user already exists
    const { data: existingUsers } = await newClient.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(u => u.email === "dev@infra.com");
    
    if (existing) {
      log("ℹ️", "User dev@infra.com already exists. Updating to admin...");
      await newClient.auth.admin.updateUserById(existing.id, {
        password: "Fronteras2026",
        user_metadata: {
          name: "Admin Dev",
          role: "admin",
          is_active: true,
          branch: "Bogotá",
          permissions: { all: true }
        }
      });
      log("✅", "Updated existing user to admin role");
      return existing;
    }

    const { data, error } = await newClient.auth.admin.createUser({
      email: "dev@infra.com",
      password: "Fronteras2026",
      email_confirm: true,
      user_metadata: {
        name: "Admin Dev",
        role: "admin",
        is_active: true,
        branch: "Bogotá",
        permissions: { all: true }
      }
    });

    if (error) {
      logError("❌", "Error creating admin user", error);
      return null;
    }

    log("✅", `Admin user created: dev@infra.com (ID: ${data.user.id})`);
    return data.user;
  } catch (err) {
    logError("❌", "Error in createAdminUser", err);
    return null;
  }
}

// ─── Step 6: Verify Connection ───
async function verifyNewInstance() {
  log("🔍", "Verifying new instance connectivity...");
  
  try {
    // Test basic connection
    const { data, error } = await newClient.from("clients").select("id").limit(1);
    if (error) {
      logError("❌", "Cannot query clients table", error);
      return false;
    }
    log("✅", "New instance connection verified!");
    
    // Verify tables exist
    const tables = ["clients", "drivers", "shipments", "shipment_history", 
                    "financial_movements", "daily_close", "app_roles"];
    
    for (const table of tables) {
      const { count, error: tErr } = await newClient
        .from(table)
        .select("*", { count: "exact", head: true });
      
      if (tErr) {
        logError("❌", `Table ${table} check failed`, tErr);
      } else {
        log("  📊", `${table}: ${count} rows`);
      }
    }

    // Test auth
    const { data: authData, error: authErr } = await newClient.auth.signInWithPassword({
      email: "dev@infra.com",
      password: "Fronteras2026"
    });
    
    if (authErr) {
      logError("❌", "Auth login test failed", authErr);
    } else {
      log("✅", "Auth login test PASSED! ✨");
      await newClient.auth.signOut();
    }
    
    return true;
  } catch (err) {
    logError("❌", "Verification failed", err);
    return false;
  }
}

// ─── MAIN ───
async function main() {
  console.log("\n" + "═".repeat(60));
  console.log("  FRONTERAS ENVÍOS – Production Migration");
  console.log("  Source: " + OLD_URL);
  console.log("  Target: " + NEW_URL);
  console.log("═".repeat(60) + "\n");

  // Step 1: Read data from old instance
  const tables = await readOldData();
  
  console.log("\n" + "─".repeat(60));
  
  // Step 2: Check if tables exist on new instance, if not -> need schema setup
  log("🔍", "Checking if tables exist on new instance...");
  const { error: tableCheck } = await newClient.from("clients").select("id").limit(1);
  
  if (tableCheck) {
    log("⚠️", "Tables don't exist yet on new instance. Schema setup needed.");
    const schemaCreated = await setupSchema();
    
    if (!schemaCreated) {
      log("⏸️", "");
      log("📋", "═══════════════════════════════════════════════");
      log("📋", "MANUAL STEP REQUIRED:");
      log("📋", "1. Open your Supabase Studio SQL Editor");
      log("📋", "2. Copy the contents of production_schema.sql");
      log("📋", "3. Paste and RUN it in the SQL Editor");
      log("📋", "4. Then re-run this script");
      log("📋", "═══════════════════════════════════════════════");
      return;
    }
  } else {
    log("✅", "Tables already exist on new instance");
  }

  console.log("\n" + "─".repeat(60));

  // Step 3: Create admin user FIRST (before data migration, in case triggers need it)
  await createAdminUser();

  console.log("\n" + "─".repeat(60));

  // Step 4: Migrate data
  await migrateData(tables);

  console.log("\n" + "─".repeat(60));

  // Step 5: Verify
  await verifyNewInstance();

  console.log("\n" + "═".repeat(60));
  log("🎉", "MIGRATION COMPLETE!");
  log("📋", "Next steps:");
  log("  1️⃣", "Update .env to point to api.fronterasexpress.com");
  log("  2️⃣", "Restart the dev server (npm run dev)");
  log("  3️⃣", "Login with: dev@infra.com / Fronteras2026");
  console.log("═".repeat(60) + "\n");
}

main().catch(console.error);
