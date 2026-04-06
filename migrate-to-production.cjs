/**
 * Fronteras Envios - Full Production Migration
 * 1. Creates schema on new instance via pg/query
 * 2. Reads & migrates data from old instance
 * 3. Creates admin user
 */
const { createClient } = require("@supabase/supabase-js");

const OLD_URL = "https://supabase.devsystech.com.co";
const OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

const NEW_URL = "https://api.fronterasexpress.com";
const NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzU1MDAyNTAsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlzcyI6InN1cGFiYXNlIn0.N3SaM86lgeQ-fzU1cKCN8AwFGikglUMuX7fkPRBE1u8";

const old = createClient(OLD_URL, OLD_KEY, { auth: { persistSession: false } });
const nw = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

async function runSQL(sql, label) {
  const res = await fetch(NEW_URL + "/pg/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": NEW_KEY,
      "Authorization": "Bearer " + NEW_KEY,
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.log("  SQL ERROR [" + label + "]: " + text.substring(0, 300));
    return false;
  }
  console.log("  OK: " + label);
  return true;
}

async function setupSchema() {
  console.log("\n=== STEP 1: Create schema on new instance ===\n");

  // Break into individual statements for better error handling

  // 1. Profiles table
  await runSQL(`
    CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin','operator','driver','client')),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login TIMESTAMPTZ
    )
  `, "profiles table");

  // 2. Clients table
  await runSQL(`
    CREATE TABLE IF NOT EXISTS public.clients (
      id SERIAL PRIMARY KEY,
      document TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      email TEXT,
      total_shipments INTEGER NOT NULL DEFAULT 0,
      tipo_cliente TEXT,
      tipo_identificacion TEXT,
      apellido TEXT,
      razon_social TEXT,
      responsable_iva TEXT,
      regimen TEXT,
      categoria TEXT,
      departamento TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, "clients table");

  await runSQL(`CREATE INDEX IF NOT EXISTS idx_clients_document ON public.clients(document)`, "clients index");

  // 3. Drivers table
  await runSQL(`
    CREATE TABLE IF NOT EXISTS public.drivers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      company TEXT,
      vehicle_type TEXT NOT NULL DEFAULT 'van' CHECK (vehicle_type IN ('motorcycle','car','van','truck')),
      city TEXT NOT NULL,
      rate_per_delivery NUMERIC(12,2) NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, "drivers table");

  // 4. Shipments
  await runSQL(`CREATE SEQUENCE IF NOT EXISTS shipment_guide_seq START WITH 1001`, "guide sequence");

  await runSQL(`
    CREATE TABLE IF NOT EXISTS public.shipments (
      id SERIAL PRIMARY KEY,
      guide_number TEXT NOT NULL UNIQUE DEFAULT (nextval('shipment_guide_seq')::TEXT),
      sender_document TEXT,
      sender_name TEXT NOT NULL,
      sender_phone TEXT NOT NULL,
      sender_address TEXT NOT NULL,
      sender_city TEXT NOT NULL,
      recipient_document TEXT,
      recipient_name TEXT NOT NULL,
      recipient_phone TEXT NOT NULL,
      recipient_address TEXT NOT NULL,
      recipient_city TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Efectivo',
      weight NUMERIC(8,2) NOT NULL DEFAULT 1,
      quantity INTEGER NOT NULL DEFAULT 1,
      declared_value NUMERIC(14,2) NOT NULL DEFAULT 0,
      shipping_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
      driver_payment NUMERIC(14,2) NOT NULL DEFAULT 0,
      observations TEXT,
      status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','assigned','picked_up','in_transit','out_for_delivery','delivered','incident','returned')),
      driver_id INTEGER REFERENCES public.drivers(id) ON DELETE SET NULL,
      driver_signature TEXT,
      branch_origin TEXT NOT NULL DEFAULT 'Bogota',
      comentarios JSONB,
      created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, "shipments table");

  await runSQL(`CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status)`, "shipments idx1");
  await runSQL(`CREATE INDEX IF NOT EXISTS idx_shipments_guide ON public.shipments(guide_number)`, "shipments idx2");
  await runSQL(`CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON public.shipments(created_at DESC)`, "shipments idx3");
  await runSQL(`CREATE INDEX IF NOT EXISTS idx_shipments_driver ON public.shipments(driver_id)`, "shipments idx4");

  // 5. Shipment History
  await runSQL(`
    CREATE TABLE IF NOT EXISTS public.shipment_history (
      id SERIAL PRIMARY KEY,
      shipment_id INTEGER NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      notes TEXT,
      changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, "shipment_history table");
  await runSQL(`CREATE INDEX IF NOT EXISTS idx_shipment_history_shipment ON public.shipment_history(shipment_id)`, "history index");

  // 6. Daily Close
  await runSQL(`
    CREATE TABLE IF NOT EXISTS public.daily_close (
      id SERIAL PRIMARY KEY,
      close_date DATE NOT NULL,
      branch TEXT NOT NULL DEFAULT 'Bogota',
      total_shipments INTEGER NOT NULL DEFAULT 0,
      total_revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
      total_driver_payments NUMERIC(14,2) NOT NULL DEFAULT 0,
      net_profit NUMERIC(14,2) NOT NULL DEFAULT 0,
      cash_collected NUMERIC(14,2) NOT NULL DEFAULT 0,
      notes TEXT,
      closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(close_date, branch)
    )
  `, "daily_close table");

  // 7. Financial Movements
  await runSQL(`
    CREATE TABLE IF NOT EXISTS public.financial_movements (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('income','expense')),
      category TEXT NOT NULL,
      amount NUMERIC(14,2) NOT NULL,
      description TEXT NOT NULL,
      reference_id INTEGER,
      reference_type TEXT,
      evidence_url TEXT,
      branch TEXT NOT NULL DEFAULT 'Bogota',
      recorded_by TEXT,
      movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, "financial_movements table");
  await runSQL(`CREATE INDEX IF NOT EXISTS idx_financial_movements_date ON public.financial_movements(movement_date DESC)`, "financial idx1");
  await runSQL(`CREATE INDEX IF NOT EXISTS idx_financial_movements_type ON public.financial_movements(type)`, "financial idx2");

  // 8. App Roles
  await runSQL(`
    CREATE TABLE IF NOT EXISTS public.app_roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, "app_roles table");

  console.log("\n--- Functions & Triggers ---\n");

  // updated_at trigger function
  await runSQL(`
    CREATE OR REPLACE FUNCTION public.update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$ LANGUAGE plpgsql
  `, "update_updated_at function");

  await runSQL(`DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles; CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()`, "profiles trigger");
  await runSQL(`DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients; CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()`, "clients trigger");
  await runSQL(`DROP TRIGGER IF EXISTS update_drivers_updated_at ON public.drivers; CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()`, "drivers trigger");
  await runSQL(`DROP TRIGGER IF EXISTS update_shipments_updated_at ON public.shipments; CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()`, "shipments trigger");

  // Log shipment status changes
  await runSQL(`
    CREATE OR REPLACE FUNCTION public.log_shipment_status_change()
    RETURNS TRIGGER AS $$
    BEGIN
      IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.shipment_history (shipment_id, status, notes, changed_by)
        VALUES (NEW.id, NEW.status, NULL, auth.uid());
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER
  `, "log_shipment_status_change function");

  await runSQL(`DROP TRIGGER IF EXISTS on_shipment_status_change ON public.shipments; CREATE TRIGGER on_shipment_status_change AFTER UPDATE OF status ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.log_shipment_status_change()`, "shipment status trigger");

  // Handle new user
  await runSQL(`
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    DECLARE v_role TEXT; v_perms JSONB;
    BEGIN
      v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'operator');
      v_perms := CASE 
        WHEN v_role = 'admin' THEN '{"all": true}'::jsonb
        WHEN v_role = 'operator' THEN '{"view_dashboard": true, "manage_shipments": true, "manage_clients": true}'::jsonb
        ELSE '{}'::jsonb
      END;
      INSERT INTO public.profiles (id, email, name, role, permissions)
      VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), v_role, v_perms)
      ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, permissions = EXCLUDED.permissions;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER
  `, "handle_new_user function");

  await runSQL(`DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users; CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()`, "auth user trigger");

  // RPCs
  await runSQL(`
    CREATE OR REPLACE FUNCTION public.update_shipment_status(p_shipment_id INTEGER, p_new_status TEXT, p_notes TEXT DEFAULT NULL)
    RETURNS VOID AS $$
    BEGIN
      UPDATE public.shipments SET status = p_new_status, updated_at = NOW() WHERE id = p_shipment_id;
      INSERT INTO public.shipment_history (shipment_id, status, notes, changed_by) VALUES (p_shipment_id, p_new_status, p_notes, auth.uid());
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER
  `, "update_shipment_status RPC");

  await runSQL(`
    CREATE OR REPLACE FUNCTION public.increment_client_shipments(p_document TEXT)
    RETURNS VOID AS $$
    BEGIN UPDATE public.clients SET total_shipments = total_shipments + 1 WHERE document = p_document; END;
    $$ LANGUAGE plpgsql SECURITY DEFINER
  `, "increment_client_shipments RPC");

  console.log("\n--- RLS Policies ---\n");

  // Enable RLS
  const rlsTables = ["profiles", "clients", "drivers", "shipments", "shipment_history", "daily_close", "financial_movements", "app_roles"];
  for (const t of rlsTables) {
    await runSQL(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY`, "RLS " + t);
  }

  // Drop existing policies first
  await runSQL(`
    DO $$ DECLARE r RECORD;
    BEGIN FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
      EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename);
    END LOOP; END $$
  `, "drop all policies");

  // Create policies
  await runSQL(`CREATE POLICY "profiles_read" ON public.profiles FOR SELECT TO authenticated USING (TRUE)`, "profiles select policy");
  await runSQL(`CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (TRUE)`, "profiles insert policy");
  await runSQL(`CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (TRUE)`, "profiles update policy");

  await runSQL(`CREATE POLICY "clients_all" ON public.clients FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE)`, "clients policy");
  await runSQL(`CREATE POLICY "drivers_all" ON public.drivers FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE)`, "drivers policy");
  await runSQL(`CREATE POLICY "shipments_all" ON public.shipments FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE)`, "shipments auth policy");
  await runSQL(`CREATE POLICY "shipments_anon" ON public.shipments FOR SELECT TO anon USING (TRUE)`, "shipments anon policy");
  await runSQL(`CREATE POLICY "history_all" ON public.shipment_history FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE)`, "history auth policy");
  await runSQL(`CREATE POLICY "history_anon" ON public.shipment_history FOR SELECT TO anon USING (TRUE)`, "history anon policy");
  await runSQL(`CREATE POLICY "daily_close_all" ON public.daily_close FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE)`, "daily_close policy");
  await runSQL(`CREATE POLICY "financial_all" ON public.financial_movements FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE)`, "financial policy");
  await runSQL(`CREATE POLICY "roles_read" ON public.app_roles FOR SELECT TO authenticated USING (TRUE)`, "roles read policy");
  await runSQL(`CREATE POLICY "roles_write" ON public.app_roles FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE)`, "roles write policy");

  // Storage bucket
  await runSQL(`INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', true) ON CONFLICT (id) DO NOTHING`, "evidence bucket");

  // Reload PostgREST schema
  await runSQL(`NOTIFY pgrst, 'reload schema'`, "reload schema");

  console.log("\n  Schema setup COMPLETE!");
}

async function readTable(client, name) {
  const { data, error } = await client.from(name).select("*").order("id", { ascending: true });
  if (error) { console.log("  WARN reading " + name + ": " + error.message); return []; }
  console.log("  Read " + (data || []).length + " from " + name);
  return data || [];
}

async function insertRows(name, rows, conflict) {
  if (!rows.length) { console.log("  Skip " + name + " (empty)"); return 0; }
  const clean = rows.map(r => {
    const c = { ...r };
    if (c.created_by) c.created_by = null;
    if (c.closed_by) c.closed_by = null;
    if (c.changed_by) c.changed_by = null;
    if (c.recorded_by && typeof c.recorded_by === "string" && /^[0-9a-f-]{36}$/i.test(c.recorded_by)) c.recorded_by = "Sistema";
    return c;
  });

  let ok = 0, fail = 0;
  for (let i = 0; i < clean.length; i += 50) {
    const batch = clean.slice(i, i + 50);
    const opts = conflict ? { onConflict: conflict, ignoreDuplicates: true } : { ignoreDuplicates: true };
    const { error } = await nw.from(name).upsert(batch, opts);
    if (error) {
      for (const row of batch) {
        const { error: e2 } = await nw.from(name).upsert(row, opts);
        if (e2) { fail++; if (fail <= 5) console.log("    FAIL " + name + " id=" + (row.id || row.document || "?") + ": " + e2.message); }
        else ok++;
      }
    } else { ok += batch.length; }
  }
  console.log("  Migrated " + ok + "/" + rows.length + " to " + name + (fail ? " (" + fail + " failed)" : ""));
  return ok;
}

async function main() {
  // 1. Schema
  await setupSchema();

  // Wait for PostgREST to pick up new schema
  console.log("\n  Waiting 3s for schema reload...");
  await new Promise(r => setTimeout(r, 3000));

  // 2. Read old data
  console.log("\n=== STEP 2: Read data from old instance ===\n");
  const clients = await readTable(old, "clients");
  const drivers = await readTable(old, "drivers");
  const shipments = await readTable(old, "shipments");
  const history = await readTable(old, "shipment_history");
  const financial = await readTable(old, "financial_movements");
  const dailyClose = await readTable(old, "daily_close");
  const roles = await readTable(old, "app_roles");

  // 3. Create admin user
  console.log("\n=== STEP 3: Create admin user ===\n");
  const { data: existingUsers } = await nw.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(u => u.email === "dev@infra.com");
  if (existing) {
    console.log("  User exists, updating...");
    await nw.auth.admin.updateUserById(existing.id, {
      password: "Fronteras2026",
      email_confirm: true,
      user_metadata: { name: "Admin Dev", role: "admin", is_active: true, branch: "Bogota", permissions: { all: true } }
    });
    console.log("  Updated: " + existing.id);
  } else {
    const { data, error } = await nw.auth.admin.createUser({
      email: "dev@infra.com",
      password: "Fronteras2026",
      email_confirm: true,
      user_metadata: { name: "Admin Dev", role: "admin", is_active: true, branch: "Bogota", permissions: { all: true } }
    });
    if (error) console.log("  ERROR: " + error.message);
    else console.log("  Created: " + data.user.id + " (" + data.user.email + ")");
  }

  // 4. Migrate data
  console.log("\n=== STEP 4: Migrate data ===\n");
  await insertRows("app_roles", roles, "id");
  await insertRows("clients", clients, "document");
  await insertRows("drivers", drivers, "id");
  
  // For shipments, we need to handle the sequence
  const shipOk = await insertRows("shipments", shipments, "id");
  if (shipOk > 0) {
    // Update sequence to max guide_number + 1
    const maxGuide = Math.max(...shipments.map(s => parseInt(s.guide_number) || 0), 1000);
    await runSQL(`SELECT setval('shipment_guide_seq', ${maxGuide + 1}, false)`, "update guide sequence to " + (maxGuide + 1));
  }
  
  await insertRows("shipment_history", history, "id");
  await insertRows("financial_movements", financial, "id");
  await insertRows("daily_close", dailyClose, "id");

  // 5. Verify
  console.log("\n=== STEP 5: Verify ===\n");
  const tables = ["clients", "drivers", "shipments", "shipment_history", "financial_movements", "daily_close", "app_roles"];
  for (const t of tables) {
    const { count, error } = await nw.from(t).select("*", { count: "exact", head: true });
    console.log("  " + t + ": " + (error ? "ERROR " + error.message : count + " rows"));
  }

  // 6. Test login
  console.log("\n=== STEP 6: Test login ===\n");
  const { data: loginData, error: loginErr } = await nw.auth.signInWithPassword({ email: "dev@infra.com", password: "Fronteras2026" });
  if (loginErr) console.log("  LOGIN FAILED: " + loginErr.message);
  else console.log("  LOGIN OK! User: " + loginData.user.email + " Role: " + (loginData.user.user_metadata?.role || "?"));

  console.log("\n=== MIGRATION COMPLETE ===\n");
}

main().catch(e => console.error("FATAL:", e.message));
