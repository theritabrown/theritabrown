type Env = {
  SUPABASE_URL?: string
  VITE_SUPABASE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

type KeepAliveResponse = {
  ok: boolean
  recordedAt?: string
  error?: string
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(recordKeepAlive(env))
  },

  async fetch(_request: Request, env: Env) {
    return json(await recordKeepAlive(env))
  },
}

async function recordKeepAlive(env: Env): Promise<KeepAliveResponse> {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      ok: false,
      error: 'Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
    }
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/record_keep_alive`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      heartbeat_source: 'cloudflare-cron',
      heartbeat_note: 'Daily keep-alive ping for Rita Brown site.',
    }),
  })

  if (!response.ok) {
    return {
      ok: false,
      error: await response.text(),
    }
  }

  return {
    ok: true,
    recordedAt: String(await response.json()),
  }
}

function json(body: KeepAliveResponse) {
  return new Response(JSON.stringify(body), {
    status: body.ok ? 200 : 500,
    headers: {
      'content-type': 'application/json',
    },
  })
}
