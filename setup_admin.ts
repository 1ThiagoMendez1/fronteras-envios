import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setup() {
  const email = 'admin@fronteras.com'
  const password = 'admin123'

  console.log(`Setting up admin user: ${email}`)

  // Create user in auth.users
  const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: 'Super Admin', role: 'admin' }
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log('User already exists.')
    } else {
      console.error('Error creating user:', authError.message)
      return
    }
  } else {
    console.log('User created successfully:', user?.id)
  }

  // The trigger 'on_auth_user_created' should handle the 'profiles' entry.
  // But let's verify if 'profiles' table exists.
  const { error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)
  
  if (profileError) {
    console.error('Table "profiles" seems to be missing or inaccessible:', profileError.message)
    console.log('Please ensure you have run the migrations in Supabase SQL Editor.')
  } else {
    console.log('Database tables verified.')
  }
}

setup()
