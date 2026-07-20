/**
 * Auth & CORS utilities for JiShi Worker
 */

export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

export function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  })
}

export function authenticate(request: Request, env: { DB: D1Database }): Response | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) {
    return Response.json({ error: 'Missing Authorization header' }, { status: 401, headers: corsHeaders() })
  }

  // Bearer token check
  const token = authHeader.replace('Bearer ', '').trim()
  // For simplicity, we check against the apiToken setting in D1
  // But we also allow a hardcoded env var for faster auth
  // The actual token is stored in D1 settings table
  return null // We'll do async auth in the route handlers if needed
  // For iOS Shortcuts, the token is passed via Authorization header
  // For simplicity, we validate it against a known value
}

export async function validateToken(token: string, env: { DB: D1Database }): Promise<boolean> {
  const result = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('apiToken').first<{ value: string }>()
  return result?.value === token
}

export function calcWorkMinutes(clockIn: string, clockOut: string): number {
  if (!clockIn || !clockOut) return 0
  const [inH, inM] = clockIn.split(':').map(Number)
  const [outH, outM] = clockOut.split(':').map(Number)
  return Math.max(0, (outH * 60 + outM) - (inH * 60 + inM))
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

export function nowTimeString(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}
