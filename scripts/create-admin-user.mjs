import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import ws from 'ws'

loadDotenv()

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_TEMP_PASSWORD

if (!supabaseUrl || !serviceRoleKey || !email || !password) {
  console.error(`
Missing required environment variables.

Required:
  SUPABASE_URL or VITE_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  ADMIN_EMAIL
  ADMIN_TEMP_PASSWORD

Example:
  SUPABASE_URL="https://project.supabase.co" \\
  SUPABASE_SERVICE_ROLE_KEY="service-role-key" \\
  ADMIN_EMAIL="Theritabrown@gmail.com" \\
  ADMIN_TEMP_PASSWORD="temporary-password" \\
  npm run create-admin
`)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: {
    transport: ws,
  },
})

const existingUser = await findUserByEmail(email)

if (existingUser) {
  const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
    password,
    email_confirm: true,
    app_metadata: {
      ...existingUser.app_metadata,
      role: 'admin',
    },
    user_metadata: {
      ...existingUser.user_metadata,
      full_name: existingUser.user_metadata?.full_name || 'Rita Brown',
    },
  })

  if (error) {
    console.error(error.message)
    process.exit(1)
  }

  console.log(`Updated admin user: ${data.user.email}`)
  process.exit(0)
}

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: {
    role: 'admin',
  },
  user_metadata: {
    full_name: 'Rita Brown',
  },
})

if (error) {
  console.error(error.message)
  process.exit(1)
}

console.log(`Created admin user: ${data.user.email}`)

async function findUserByEmail(userEmail) {
  let page = 1

  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    })

    if (error) {
      throw error
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === userEmail.toLowerCase())

    if (match || data.users.length < 100) {
      return match
    }

    page += 1
  }

  return null
}

function loadDotenv() {
  if (!existsSync('.env')) {
    return
  }

  const lines = readFileSync('.env', 'utf8').split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separator = trimmed.indexOf('=')

    if (separator === -1) {
      continue
    }

    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] ||= value
  }
}
