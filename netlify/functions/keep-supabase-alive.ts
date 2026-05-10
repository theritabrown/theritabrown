import { schedule } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

type KeepAliveResponse = {
  ok: boolean
  recordedAt?: string
  error?: string
}

const handler = schedule('34 14 * * *', async () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, {
      ok: false,
      error: 'Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data, error } = await supabase.rpc('record_keep_alive', {
    heartbeat_source: 'netlify-schedule',
    heartbeat_note: 'Daily keep-alive ping for Rita Brown site.',
  })

  if (error) {
    return json(500, { ok: false, error: error.message })
  }

  return json(200, { ok: true, recordedAt: String(data) })
})

function json(statusCode: number, body: KeepAliveResponse) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }
}

export { handler }
