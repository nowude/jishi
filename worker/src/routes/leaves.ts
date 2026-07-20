import type { Env } from '../index'
import { corsHeaders, validateToken } from '../utils'

/**
 * GET /api/leaves?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
export async function handleGetLeaves(_request: Request, env: Env, url: URL): Promise<Response> {
  const start = url.searchParams.get('start') || new Date().toISOString().slice(0, 10)
  const end = url.searchParams.get('end') || start

  const leaves = await env.DB.prepare(
    'SELECT * FROM leaves WHERE date >= ? AND date <= ? ORDER BY date'
  ).bind(start, end).all()

  return Response.json({ ok: true, leaves: leaves.results }, { headers: corsHeaders() })
}

/**
 * POST /api/leaves - 添加请假
 *
 * Body: { date, type, hours, isFullDay, note? }
 */
export async function handlePostLeave(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as {
    date: string; type: string; hours: number; isFullDay: boolean; note?: string; token?: string
  }

  const authHeader = request.headers.get('Authorization')?.replace('Bearer ', '').trim() || body.token || ''
  if (!await validateToken(authHeader, env)) {
    return Response.json({ error: 'Invalid token' }, { status: 403, headers: corsHeaders() })
  }

  const result = await env.DB.prepare(
    'INSERT INTO leaves (date, type, hours, is_full_day, note) VALUES (?, ?, ?, ?, ?)'
  ).bind(body.date, body.type, body.hours, body.isFullDay ? 1 : 0, body.note || '').run()

  return Response.json({
    ok: true,
    id: result.meta.last_row_id,
    date: body.date,
    type: body.type,
  }, { headers: corsHeaders() })
}

/**
 * DELETE /api/leaves/:id
 */
export async function handleDeleteLeave(env: Env, id: number): Promise<Response> {
  await env.DB.prepare('DELETE FROM leaves WHERE id = ?').bind(id).run()
  return Response.json({ ok: true, id, message: '请假记录已删除' }, { headers: corsHeaders() })
}
