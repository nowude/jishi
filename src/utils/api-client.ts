/**
 * JiShi API Client - PWA 与 Cloudflare Worker API 通信
 */

import db from '@/db'
import { getSetting, setSetting } from '@/stores'

/* ─── 配置 ─── */

async function getApiUrl(): Promise<string> {
  return getSetting('apiUrl')
}

async function getApiToken(): Promise<string> {
  return getSetting('apiToken')
}

/* ─── 通用请求 ─── */

async function apiRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = await getApiUrl()
  const apiToken = await getApiToken()
  if (!baseUrl) throw new Error('请先配置 API 地址')

  const url = `${baseUrl}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error: ${res.status}`)
  }
  return res
}

/* ─── 打卡推送到服务器 ─── */

export async function pushClockInToServer(date: string): Promise<void> {
  try {
    await apiRequest('/api/clock', {
      method: 'POST',
      body: JSON.stringify({ action: 'in', date }),
    })
  } catch (e) {
    console.warn('推送上班打卡到服务器失败:', (e as Error).message)
  }
}

export async function pushClockOutToServer(date: string): Promise<void> {
  try {
    await apiRequest('/api/clock', {
      method: 'POST',
      body: JSON.stringify({ action: 'out', date }),
    })
  } catch (e) {
    console.warn('推送下班签退到服务器失败:', (e as Error).message)
  }
}

/* ─── 手动编辑推送到服务器 ─── */

export async function pushRecordToServer(date: string, clockIn: string, clockOut: string, note: string, isManual: boolean): Promise<void> {
  try {
    await apiRequest(`/api/records/${date}`, {
      method: 'PUT',
      body: JSON.stringify({ clockIn, clockOut, note, isManual }),
    })
  } catch (e) {
    console.warn('推送记录到服务器失败:', (e as Error).message)
  }
}

/* ─── 删除推送到服务器 ─── */

export async function pushDeleteToServer(date: string): Promise<void> {
  try {
    await apiRequest(`/api/records/${date}`, { method: 'DELETE' })
  } catch (e) {
    console.warn('推送删除到服务器失败:', (e as Error).message)
  }
}

/* ─── 从服务器拉取全部数据 ─── */

export async function pullAllFromServer(): Promise<{ records: number; leaves: number; settings: number }> {
  const baseUrl = await getApiUrl()
  if (!baseUrl) throw new Error('请先配置 API 地址')

  const today = new Date().toISOString().slice(0, 10)
  const yearStart = `${new Date().getFullYear()}-01-01`

  // 拉取记录
  const recordsRes = await apiRequest(`/api/records?start=${yearStart}&end=${today}`)
  const recordsData = await recordsRes.json() as {
    records: Array<{
      id: number; date: string; clock_in: string; clock_out: string;
      work_minutes: number; is_manual: number; note: string; created_at: string
    }>
  }

  // 拉取请假
  const leavesRes = await apiRequest(`/api/leaves?start=${yearStart}&end=${today}`)
  const leavesData = await leavesRes.json() as {
    leaves: Array<{
      id: number; date: string; type: string; hours: number; is_full_day: number; note: string
    }>
  }

  // 拉取配置
  const settingsRes = await apiRequest('/api/settings')
  const settingsData = await settingsRes.json() as { settings: Record<string, string> }

  // 导入到本地 IndexedDB
  await db.records.clear()
  for (const r of recordsData.records) {
    await db.records.add({
      date: r.date,
      clockIn: r.clock_in,
      clockOut: r.clock_out,
      breakMinutes: 0,
      workMinutes: r.work_minutes,
      isManual: !!r.is_manual,
      note: r.note || '',
      createdAt: r.created_at,
    })
  }

  await db.leaves.clear()
  for (const l of leavesData.leaves) {
    await db.leaves.add({
      date: l.date,
      type: l.type as 'annual' | 'sick' | 'personal' | 'compensatory',
      hours: l.hours,
      isFullDay: !!l.is_full_day,
      note: l.note || '',
    })
  }

  // 不覆盖连接配置
  const { apiToken: _t, apiUrl: _u, ...rest } = settingsData.settings
  for (const [key, value] of Object.entries(rest)) {
    if (key !== 'apiToken' && key !== 'apiUrl' && key !== 'gistToken' && key !== 'gistId' && key !== 'lastSyncAt') {
      await db.settings.put({ key, value })
    }
  }

  const now = new Date().toLocaleString('zh-CN')
  await setSetting('lastSyncAt', now)

  return {
    records: recordsData.records.length,
    leaves: leavesData.leaves.length,
    settings: Object.keys(rest).length,
  }
}
