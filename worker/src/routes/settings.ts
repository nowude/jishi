import type { Env } from '../index'
import { corsHeaders, validateToken } from '../utils'

/**
 * GET /api/settings
 */
export async function handleGetSettings(env: Env): Promise<Response> {
  const settings = await env.DB.prepare('SELECT * FROM settings').all()
  const map: Record<string, string> = {}
  settings.results.forEach((row: Record<string, unknown>) => {
    map[row.key as string] = row.value as string
  })
  return Response.json({ ok: true, settings: map }, { headers: corsHeaders() })
}

/**
 * PUT /api/settings - 更新配置
 *
 * Body: { key: value, ... }  (可批量更新)
 */
export async function handlePutSettings(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as Record<string, string>

  const authHeader = request.headers.get('Authorization')?.replace('Bearer ', '').trim() || body.token || ''
  if (!await validateToken(authHeader, env)) {
    return Response.json({ error: 'Invalid token' }, { status: 403, headers: corsHeaders() })
  }

  // 不允许通过 API 修改 apiToken 本身
  const entries = Object.entries(body).filter(([k]) => k !== 'token' && k !== 'apiToken')

  for (const [key, value] of entries) {
    await env.DB.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ).bind(key, value).run()
  }

  return Response.json({ ok: true, updated: entries.length }, { headers: corsHeaders() })
}
