import type { Env } from '../index'
import { corsHeaders, validateToken, calcWorkMinutes, todayDateString, nowTimeString } from '../utils'

/**
 * POST /api/clock - 打卡/签退 (iOS 快捷指令调用)
 *
 * Body: { action: "in" | "out", date?: "YYYY-MM-DD" }
 *
 * - action=in: 记录上班打卡时间
 * - action=out: 记录下班签退时间，并计算工时
 */
export async function handleClock(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { action: 'in' | 'out'; date?: string; token?: string }

  // Token auth
  const authHeader = request.headers.get('Authorization')?.replace('Bearer ', '').trim() || body.token || ''
  if (!await validateToken(authHeader, env)) {
    return Response.json({ error: 'Invalid token' }, { status: 403, headers: corsHeaders() })
  }

  const date = body.date || todayDateString()
  const action = body.action

  if (!['in', 'out'].includes(action)) {
    return Response.json({ error: 'action must be "in" or "out"' }, { status: 400, headers: corsHeaders() })
  }

  const time = nowTimeString()

  // Check existing record
  const existing = await env.DB.prepare('SELECT * FROM records WHERE date = ?').bind(date).first<{
    id: number; clock_in: string; clock_out: string; work_minutes: number
  }>()

  if (action === 'in') {
    if (existing) {
      // Update clock_in
      await env.DB.prepare(
        'UPDATE records SET clock_in = ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(time, existing.id).run()
      return Response.json({ ok: true, action: 'in', date, time, message: '上班打卡已更新' }, { headers: corsHeaders() })
    } else {
      // Create new record
      await env.DB.prepare(
        'INSERT INTO records (date, clock_in, clock_out, work_minutes) VALUES (?, ?, ?, 0)'
      ).bind(date, time, '').run()
      return Response.json({ ok: true, action: 'in', date, time, message: '上班打卡成功' }, { headers: corsHeaders() })
    }
  }

  if (action === 'out') {
    if (!existing) {
      // 没有上班记录，同时创建
      await env.DB.prepare(
        'INSERT INTO records (date, clock_in, clock_out, work_minutes) VALUES (?, ?, ?, ?)'
      ).bind(date, '', time, 0).run()
      return Response.json({ ok: true, action: 'out', date, time, message: '签退成功（无上班记录）' }, { headers: corsHeaders() })
    }

    const workMinutes = existing.clock_in ? calcWorkMinutes(existing.clock_in, time) : 0
    await env.DB.prepare(
      'UPDATE records SET clock_out = ?, work_minutes = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(time, workMinutes, existing.id).run()

    return Response.json({
      ok: true,
      action: 'out',
      date,
      time,
      clockIn: existing.clock_in,
      workMinutes,
      message: '签退成功',
    }, { headers: corsHeaders() })
  }

  return Response.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders() })
}

/**
 * GET /api/records?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
export async function handleGetRecords(request: Request, env: Env, url: URL): Promise<Response> {
  const start = url.searchParams.get('start') || todayDateString()
  const end = url.searchParams.get('end') || todayDateString()

  const records = await env.DB.prepare(
    'SELECT * FROM records WHERE date >= ? AND date <= ? ORDER BY date'
  ).bind(start, end).all()

  return Response.json({ ok: true, records: records.results }, { headers: corsHeaders() })
}

/**
 * PUT /api/records/:date - 更新指定日期记录 (PWA 手动编辑/补录)
 *
 * Body: { clockIn, clockOut, note?, isManual? }
 */
export async function handlePutRecord(request: Request, env: Env, date: string): Promise<Response> {
  const body = await request.json() as {
    clockIn: string; clockOut: string; note?: string; isManual?: boolean; token?: string
  }

  const authHeader = request.headers.get('Authorization')?.replace('Bearer ', '').trim() || body.token || ''
  if (!await validateToken(authHeader, env)) {
    return Response.json({ error: 'Invalid token' }, { status: 403, headers: corsHeaders() })
  }

  const workMinutes = calcWorkMinutes(body.clockIn, body.clockOut)
  const isManual = body.isManual ? 1 : 0

  // Upsert
  await env.DB.prepare(`
    INSERT INTO records (date, clock_in, clock_out, work_minutes, is_manual, note)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      clock_in = excluded.clock_in,
      clock_out = excluded.clock_out,
      work_minutes = excluded.work_minutes,
      is_manual = excluded.is_manual,
      note = excluded.note,
      updated_at = datetime('now')
  `).bind(date, body.clockIn, body.clockOut, workMinutes, isManual, body.note || '').run()

  return Response.json({ ok: true, date, workMinutes }, { headers: corsHeaders() })
}

/**
 * DELETE /api/records/:date - 删除指定日期记录
 */
export async function handleDeleteRecord(env: Env, date: string): Promise<Response> {
  await env.DB.prepare('DELETE FROM records WHERE date = ?').bind(date).run()
  await env.DB.prepare('DELETE FROM leaves WHERE date = ?').bind(date).run()
  return Response.json({ ok: true, date, message: '当日记录已删除' }, { headers: corsHeaders() })
}
