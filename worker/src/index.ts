/**
 * JiShi Worker API - Cloudflare Worker + D1
 *
 * Endpoints:
 *   POST /api/clock       - 打卡/签退 (iOS 快捷指令调用)
 *   GET  /api/records      - 查询记录 (?start=YYYY-MM-DD&end=YYYY-MM-DD)
 *   PUT  /api/records/:date - 更新指定日期记录
 *   DELETE /api/records/:date - 删除指定日期记录
 *   GET  /api/leaves       - 查询请假 (?start=&end=)
 *   POST /api/leaves       - 添加请假
 *   DELETE /api/leaves/:id - 删除请假
 *   GET  /api/settings     - 获取配置
 *   PUT  /api/settings     - 更新配置
 *   GET  /api/ping         - 健康检查
 */

import { handleClock, handleGetRecords, handlePutRecord, handleDeleteRecord } from './routes/records'
import { handleGetLeaves, handlePostLeave, handleDeleteLeave } from './routes/leaves'
import { handleGetSettings, handlePutSettings } from './routes/settings'
import { authenticate, corsHeaders, handleOptions } from './utils'

export interface Env {
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions()
    }

    // Health check
    if (path === '/api/ping') {
      return Response.json({ ok: true, time: new Date().toISOString() }, { headers: corsHeaders() })
    }

    // Auth check for all /api/* routes
    const authError = authenticate(request, env)
    if (authError) return authError

    try {
      // Routes
      if (path === '/api/clock' && request.method === 'POST') {
        return await handleClock(request, env)
      }
      if (path === '/api/records' && request.method === 'GET') {
        return await handleGetRecords(request, env, url)
      }
      if (path.match(/^\/api\/records\/\d{4}-\d{2}-\d{2}$/) && request.method === 'PUT') {
        const date = path.split('/').pop()!
        return await handlePutRecord(request, env, date)
      }
      if (path.match(/^\/api\/records\/\d{4}-\d{2}-\d{2}$/) && request.method === 'DELETE') {
        const date = path.split('/').pop()!
        return await handleDeleteRecord(env, date)
      }
      if (path === '/api/leaves' && request.method === 'GET') {
        return await handleGetLeaves(request, env, url)
      }
      if (path === '/api/leaves' && request.method === 'POST') {
        return await handlePostLeave(request, env)
      }
      if (path.match(/^\/api\/leaves\/\d+$/) && request.method === 'DELETE') {
        const id = Number(path.split('/').pop())
        return await handleDeleteLeave(env, id)
      }
      if (path === '/api/settings' && request.method === 'GET') {
        return await handleGetSettings(env)
      }
      if (path === '/api/settings' && request.method === 'PUT') {
        return await handlePutSettings(request, env)
      }

      return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders() })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal error'
      return Response.json({ error: message }, { status: 500, headers: corsHeaders() })
    }
  },
}
