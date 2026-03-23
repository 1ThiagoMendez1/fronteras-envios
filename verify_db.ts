import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verify() {
  if (!supabaseUrl || !supabaseKey) return;
  console.log('Using URL:', supabaseUrl)
  console.log('Using Key (start):', supabaseKey.substring(0, 10) + '...')

  const tables = ['profiles', 'clients', 'drivers', 'shipments', 'daily_close', 'financial_movements']
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error(`Error in table ${table}:`, JSON.stringify(error, null, 2));
    } else {
      console.log(`Table ${table} exists. Count: ${count}`);
    }
  }
}

verify()
