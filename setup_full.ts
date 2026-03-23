import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Simple .env parser to avoid dependency issues
function getEnv() {
  const envPath = path.join(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return {}
  const content = fs.readFileSync(envPath, 'utf-8')
  const env: Record<string, string> = {}
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (match) {
      let value = match[2] || ''
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
      env[match[1]] = value
    }
  })
  return env
}

const env = getEnv()
const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseServiceKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function seed() {
  const adminEmail = 'admin@fronteras.com'
  const adminPass = 'admin123'

  console.log('--- Setting up Admin User ---')
  const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPass,
    email_confirm: true,
    user_metadata: { name: 'Super Admin', role: 'admin' }
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log('Admin user already exists.')
    } else {
      console.error('Error creating admin:', authError.message)
    }
  } else {
    console.log('Admin user created successfully.')
  }

  // Ensure Admin Profile has full permissions
  console.log('--- Ensuring Admin Profile permissions ---')
  await supabase.from('profiles').upsert({
    id: user?.id || '00000000-0000-0000-0000-000000000000', // fallback if exists
    email: adminEmail,
    name: 'Super Admin',
    role: 'admin',
    permissions: { all: true },
    is_active: true
  }, { onConflict: 'email' })

  console.log('--- Seeding Data (5 entries per module) ---')

  // 1. Clients (if not already there)
  const clients = [
    { document: '111', name: 'Almacenes Éxito', phone: '123', city: 'Bogotá', address: 'Cl 1' },
    { document: '222', name: 'Homecenter', phone: '456', city: 'Medellín', address: 'Cl 2' },
    { document: '333', name: 'Sodimac', phone: '789', city: 'Cali', address: 'Cl 3' },
    { document: '444', name: 'Mercado Libre', phone: '012', city: 'Barranquilla', address: 'Cl 4' },
    { document: '555', name: 'Amazon Logistics', phone: '345', city: 'Pereira', address: 'Cl 5' }
  ]
  await supabase.from('clients').upsert(clients, { onConflict: 'document' })
  console.log('Clients seeded.')

  // 2. Drivers
  const drivers = [
    { name: 'Pedro Picapiedra', phone: '1', vehicle_type: 'truck', city: 'Bogotá', rate_per_delivery: 15000 },
    { name: 'Pablo Marmol', phone: '2', vehicle_type: 'van', city: 'Bogotá', rate_per_delivery: 12000 },
    { name: 'Vilma Traca', phone: '3', vehicle_type: 'car', city: 'Medellín', rate_per_delivery: 10000 },
    { name: 'Betty Marmol', phone: '4', vehicle_type: 'motorcycle', city: 'Cali', rate_per_delivery: 8000 },
    { name: 'Bamm-Bamm', phone: '5', vehicle_type: 'truck', city: 'Barranquilla', rate_per_delivery: 20000 }
  ]
  const { data: driverData } = await supabase.from('drivers').upsert(drivers).select()
  console.log('Drivers seeded.')

  // 3. Shipments
  if (driverData && driverData.length > 0) {
    const shipments = Array.from({ length: 10 }).map((_, i) => ({
      sender_name: 'Envía S.A.',
      sender_phone: '123',
      sender_address: 'Av 1',
      sender_city: 'Bogotá',
      recipient_name: `Destinatario ${i+1}`,
      recipient_phone: '321',
      recipient_address: `Calle ${i+10}`,
      recipient_city: i % 2 === 0 ? 'Medellín' : 'Bogotá',
      status: i < 3 ? 'delivered' : i < 6 ? 'in_transit' : 'created',
      driver_id: driverData[i % driverData.length].id,
      shipping_cost: 50000 + (i * 1000),
      driver_payment: 15000,
      declared_value: 200000
    }))
    await supabase.from('shipments').insert(shipments)
    console.log('Shipments seeded.')
  }

  // 4. Financial Movements
  const movements = [
    { type: 'income', category: 'Fletes', amount: 500000, description: 'Ingresos del lunes' },
    { type: 'expense', category: 'Combustible', amount: 120000, description: 'Tanqueo camión 1' },
    { type: 'income', category: 'Otros', amount: 45000, description: 'Venta de empaques' },
    { type: 'expense', category: 'Mantenimiento', amount: 80000, description: 'Cambio aceite' },
    { type: 'expense', category: 'Nómina', amount: 1500000, description: 'Pago operarios' }
  ]
  await supabase.from('financial_movements').insert(movements)
  console.log('Financial movements seeded.')

  // 5. Daily Close
  const closes = [
    { close_date: '2024-03-20', branch: 'Bogotá', total_shipments: 25, total_revenue: 1250000, total_driver_payments: 375000, net_profit: 875000, cash_collected: 1250000 },
    { close_date: '2024-03-21', branch: 'Bogotá', total_shipments: 30, total_revenue: 1500000, total_driver_payments: 450000, net_profit: 1050000, cash_collected: 1500000 }
  ]
  await supabase.from('daily_close').upsert(closes, { onConflict: 'close_date, branch' })
  console.log('Daily closes seeded.')

  console.log('--- ALL DONE ---')
}

seed().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
