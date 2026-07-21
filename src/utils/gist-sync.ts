/**
 * GitHub Gist 数据同步模块
 * 
 * 使用 GitHub Personal Access Token 将工时数据同步到私有 Gist
 * - 首次同步：创建私有 Gist
 * - 后续同步：更新已有 Gist
 * - 恢复：从 Gist 拉取数据导入
 */

const GIST_API = 'https://api.github.com/gists'
const GIST_FILENAME = 'jishi-backup.json'
const GIST_DESCRIPTION = 'JiShi 工时统计数据备份'

export interface SyncStatus {
  gistId: string | null
  lastSyncAt: string | null
  token: string | null
}

/* ─── Gist API 封装 ─── */

async function gistRequest(token: string, path: string, options: RequestInit = {}): Promise<Response> {
  const url = path.startsWith('http') ? path : `${GIST_API}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || `GitHub API error: ${res.status}`)
  }
  return res
}

/** 验证 Token 有效性 */
export async function validateToken(token: string): Promise<boolean> {
  try {
    await gistRequest(token, '?per_page=1')
    return true
  } catch {
    return false
  }
}

/** 查找已有的 JiShi Gist */
export async function findJiShiGist(token: string): Promise<string | null> {
  const res = await gistRequest(token, '?per_page=100')
  const gists = await res.json() as Array<{ id: string; description: string; files: Record<string, unknown> }>
  const found = gists.find(
    (g) => g.description === GIST_DESCRIPTION && GIST_FILENAME in g.files
  )
  return found?.id ?? null
}

/** 创建新 Gist */
export async function createGist(token: string, content: string): Promise<string> {
  const res = await gistRequest(token, '', {
    method: 'POST',
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: {
        [GIST_FILENAME]: { content },
      },
    }),
  })
  const data = await res.json() as { id: string }
  return data.id
}

/** 更新已有 Gist */
export async function updateGist(token: string, gistId: string, content: string): Promise<void> {
  await gistRequest(token, `/${gistId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      files: {
        [GIST_FILENAME]: { content },
      },
    }),
  })
}

/** 读取 Gist 内容（自动处理截断） */
export async function readGist(token: string, gistId: string): Promise<string> {
  const res = await gistRequest(token, `/${gistId}`)
  const data = await res.json() as {
    files: Record<string, { content: string; truncated: boolean; raw_url: string }>
  }
  const file = data.files[GIST_FILENAME]
  if (!file) throw new Error('Gist 中未找到积时备份文件，请先推送一次')

  // GitHub 超过 1MB 时会截断，通过 raw_url 获取完整内容
  if (file.truncated || !file.content) {
    const rawRes = await fetch(file.raw_url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!rawRes.ok) throw new Error(`获取完整内容失败: ${rawRes.status}`)
    return rawRes.text()
  }
  return file.content
}

/* ─── 高层同步逻辑 ─── */

import db from '@/db'

export interface SyncResult {
  success: boolean
  action: 'upload' | 'download' | 'merge' | 'none'
  message: string
}

/** 序列化本地数据为 JSON */
async function serializeLocalData(): Promise<string> {
  const data = {
    records: await db.records.toArray(),
    leaves: await db.leaves.toArray(),
    settings: await db.settings.toArray(),
    syncAt: new Date().toISOString(),
    version: 1,
  }
  return JSON.stringify(data, null, 2)
}

/** 反序列化并导入数据到本地 */
async function importData(json: string): Promise<void> {
  let data: Record<string, unknown>
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('数据格式错误，无法解析 JSON')
  }

  if (!data.records && !data.leaves) {
    throw new Error('备份文件中没有有效数据')
  }

  if (data.records && Array.isArray(data.records)) {
    await db.records.clear()
    // 去掉 id 让 Dexie 重新自增，避免主键冲突
    const records = (data.records as Record<string, unknown>[]).map(({ id: _id, ...rest }) => rest)
    await db.records.bulkAdd(records as unknown as Parameters<typeof db.records.bulkAdd>[0])
  }
  if (data.leaves && Array.isArray(data.leaves)) {
    await db.leaves.clear()
    const leaves = (data.leaves as Record<string, unknown>[]).map(({ id: _id, ...rest }) => rest)
    await db.leaves.bulkAdd(leaves as unknown as Parameters<typeof db.leaves.bulkAdd>[0])
  }
  if (data.settings && Array.isArray(data.settings)) {
    await db.settings.clear()
    await db.settings.bulkAdd(data.settings as unknown as Parameters<typeof db.settings.bulkAdd>[0])
  }
}

/** 上传数据到 Gist（推送） */
export async function pushToGist(token: string, gistId: string | null): Promise<string> {
  const content = await serializeLocalData()
  if (gistId) {
    await updateGist(token, gistId, content)
  } else {
    // 查找已有 Gist 或创建新的
    const existingId = await findJiShiGist(token)
    if (existingId) {
      await updateGist(token, existingId, content)
      gistId = existingId
    } else {
      gistId = await createGist(token, content)
    }
  }
  return gistId
}

/** 从 Gist 拉取数据到本地（拉取） */
export async function pullFromGist(token: string, gistId: string): Promise<void> {
  const content = await readGist(token, gistId)
  await importData(content)
}

/** 获取 Gist 中的同步时间 */
export async function getGistSyncTime(token: string, gistId: string): Promise<string | null> {
  try {
    const content = await readGist(token, gistId)
    const data = JSON.parse(content)
    return data.syncAt ?? null
  } catch {
    return null
  }
}
