<template>
  <div class="settings-page">
    <div class="page-header">设置</div>

    <!-- 工作时间 -->
    <div class="group-label">工作时间</div>
    <div class="card">
      <div class="row" @click="openEdit('standardClockIn', '标准上班时间', '09:00', 'time')">
        <span class="row-title">标准上班时间</span>
        <span class="row-value">{{ settings.standardClockIn || '09:00' }} ›</span>
      </div>
      <div class="row" @click="openEdit('standardClockOut', '标准下班时间', '18:00', 'time')">
        <span class="row-title">标准下班时间</span>
        <span class="row-value">{{ settings.standardClockOut || '18:00' }} ›</span>
      </div>
      <div class="row" @click="openEdit('avgRequiredHours', '日均工时要求', '11.5', 'number')">
        <span class="row-title">日均工时要求</span>
        <span class="row-value">{{ settings.avgRequiredHours || '11.5' }}h ›</span>
      </div>
      <div class="row" @click="showWorkdaysPicker = true">
        <span class="row-title">工作日</span>
        <span class="row-value">{{ workdaysDisplay }} ›</span>
      </div>
    </div>

    <!-- 数据备份 -->
    <div class="group-label">数据备份与同步</div>
    <div class="card">
      <div class="row" @click="exportJSON">
        <span class="row-title">📤 导出 JSON 备份</span>
        <span class="row-value tag-blue">下载</span>
      </div>
      <div class="row" @click="importJSON">
        <span class="row-title">📥 导入 JSON 恢复</span>
        <span class="row-value tag-orange">选文件</span>
      </div>
      <div class="row" @click="exportCSV">
        <span class="row-title">📊 导出 CSV 表格</span>
        <span class="row-value tag-blue">下载</span>
      </div>
    </div>
    <div class="hint">导出 JSON 可在换设备时完整恢复所有数据</div>

    <!-- GitHub Gist 同步 -->
    <div class="group-label">GitHub Gist 云同步</div>
    <div class="card">
      <div class="row" @click="openGistTokenModal">
        <span class="row-title">GitHub Token</span>
        <span class="row-value" :class="gistToken ? 'tag-green' : 'tag-gray'">
          {{ gistToken ? '已配置' : '未设置' }} ›
        </span>
      </div>
      <div class="row" @click="openGistIdModal">
        <span class="row-title">Gist ID</span>
        <span class="row-value" :class="gistId ? 'tag-green' : 'tag-gray'">
          {{ gistId ? gistId.slice(0,8) + '…' : '未绑定' }} ›
        </span>
      </div>
      <div v-if="lastSyncAt" class="row no-tap">
        <span class="row-title">上次同步</span>
        <span class="row-value muted">{{ lastSyncAt }}</span>
      </div>
      <div class="row-actions">
        <button class="action-btn primary" @click="handlePush" :disabled="syncing">
          {{ syncing ? '同步中…' : '⬆ 推送到云端' }}
        </button>
        <button class="action-btn outline" @click="openPullConfirm" :disabled="syncing">
          ⬇ 从云端拉取
        </button>
      </div>
    </div>
    <div class="hint">
      使用 GitHub 免费私有 Gist 存储数据。<br>
      换手机时：新设备填入相同 Token + Gist ID → 拉取即可恢复。
      <span class="hint-link" @click="showGistGuide = true">查看配置教程 ›</span>
    </div>

    <!-- 危险操作 -->
    <div class="group-label danger-label">危险操作</div>
    <div class="card">
      <div class="row danger-row" @click="pendingClearAll = true">
        <span class="row-title danger-text">🗑 清除所有数据</span>
        <span class="row-value danger-text">不可恢复 ›</span>
      </div>
    </div>

    <!-- 关于 -->
    <div class="group-label">关于</div>
    <div class="card">
      <div class="row no-tap">
        <span class="row-title">积时</span>
        <span class="row-value muted">v1.2.0</span>
      </div>
      <div class="row no-tap">
        <span class="row-title">数据存储</span>
        <span class="row-value muted">本地 IndexedDB</span>
      </div>
      <div class="row no-tap">
        <span class="row-title">云同步</span>
        <span class="row-value muted">GitHub Gist</span>
      </div>
    </div>

    <div style="height:32px"/>

    <!-- ── 通用编辑弹窗 ── -->
    <div v-if="editModal.show" class="modal-mask" @click.self="editModal.show = false">
      <div class="modal-box">
        <div class="modal-title">{{ editModal.title }}</div>
        <input
          v-model="editModal.value"
          :type="editModal.inputType"
          class="modal-input"
          :placeholder="editModal.placeholder"
        />
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="editModal.show = false">取消</button>
          <button class="modal-btn confirm" @click="saveEdit">保存</button>
        </div>
      </div>
    </div>

    <!-- ── 工作日选择 ── -->
    <div v-if="showWorkdaysPicker" class="modal-mask" @click.self="showWorkdaysPicker = false">
      <div class="modal-box">
        <div class="modal-title">工作日设置</div>
        <div class="weekday-grid">
          <button
            v-for="d in weekdayOptions"
            :key="d.value"
            class="weekday-btn"
            :class="{ active: selectedWorkdays.includes(d.value) }"
            @click="toggleWorkday(d.value)"
          >{{ d.label }}</button>
        </div>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="showWorkdaysPicker = false">取消</button>
          <button class="modal-btn confirm" @click="saveWorkdays">保存</button>
        </div>
      </div>
    </div>

    <!-- ── GitHub Token 弹窗 ── -->
    <div v-if="showGistTokenModal" class="modal-mask" @click.self="showGistTokenModal = false">
      <div class="modal-box">
        <div class="modal-title">GitHub Token</div>
        <textarea
          v-model="gistTokenInput"
          class="modal-textarea"
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          rows="3"
        />
        <div class="modal-hint">
          GitHub → Settings → Developer settings →<br>
          Personal access tokens → Tokens (classic)<br>
          生成时勾选 <b>gist</b> 权限
        </div>
        <div v-if="tokenVerifyState !== 'idle'" class="token-verify-row" :class="tokenVerifyState">
          {{ tokenVerifyMsg }}
        </div>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="showGistTokenModal = false">取消</button>
          <button class="modal-btn verify-btn" @click="verifyToken" :disabled="tokenVerifyState === 'checking'">
            {{ tokenVerifyState === 'checking' ? '验证中…' : '验证' }}
          </button>
          <button class="modal-btn confirm" @click="saveGistToken">保存</button>
        </div>
      </div>
    </div>

    <!-- ── Gist ID 弹窗 ── -->
    <div v-if="showGistIdModal" class="modal-mask" @click.self="showGistIdModal = false">
      <div class="modal-box">
        <div class="modal-title">Gist ID</div>
        <input v-model="gistIdInput" class="modal-input" placeholder="首次推送后自动填入，换设备时手动输入" />
        <div class="modal-hint">首次点「推送」会自动创建 Gist 并记录 ID，<br>换设备时在新设备填入相同 ID 即可拉取数据</div>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="showGistIdModal = false">取消</button>
          <button class="modal-btn confirm" @click="saveGistId">保存</button>
        </div>
      </div>
    </div>

    <!-- ── 导入确认弹窗 ── -->
    <div v-if="pendingImport" class="modal-mask" @click.self="pendingImport = false">
      <div class="modal-box">
        <div class="modal-title">导入 JSON 备份</div>
        <p style="font-size:14px;color:#64748b;line-height:1.7;margin-bottom:4px">
          此操作将<b style="color:#ef4444">覆盖本地所有记录</b>，导入前建议先导出备份。确认继续？
        </p>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="pendingImport = false">取消</button>
          <button class="modal-btn confirm" @click="doConfirmImport">确认导入</button>
        </div>
      </div>
    </div>

    <!-- ── 拉取确认弹窗 ── -->
    <div v-if="pendingPull" class="modal-mask" @click.self="pendingPull = false">
      <div class="modal-box">
        <div class="modal-title">从云端拉取数据</div>
        <p style="font-size:14px;color:#64748b;line-height:1.7;margin-bottom:4px">
          此操作将用 Gist 中的备份<b style="color:#ef4444">覆盖本地所有记录</b>，确认继续？
        </p>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="pendingPull = false">取消</button>
          <button class="modal-btn confirm" @click="doConfirmPull">确认拉取</button>
        </div>
      </div>
    </div>
    <div v-if="pendingClearAll" class="modal-mask" @click.self="pendingClearAll = false">
      <div class="modal-box">
        <div class="modal-title danger-text">⚠️ 清除所有数据</div>
        <p class="danger-warn">此操作将删除全部打卡记录和请假记录，且不可恢复！</p>
        <p class="danger-warn" style="font-size:13px;margin-top:6px">请先导出备份，再执行此操作</p>
        <div class="modal-actions" style="margin-top:16px">
          <button class="modal-btn cancel" @click="pendingClearAll = false">取消</button>
          <button class="modal-btn danger" @click="doClearAll">确认清除</button>
        </div>
      </div>
    </div>

    <!-- ── Gist 配置教程 ── -->
    <div v-if="showGistGuide" class="modal-mask" @click.self="showGistGuide = false">
      <div class="modal-box guide-box">
        <div class="modal-title">Gist 同步配置教程</div>
        <ol class="guide-list">
          <li>用电脑打开 <b>github.com</b> 并登录</li>
          <li>右上角头像 → Settings → Developer settings → Personal access tokens → Tokens (classic)</li>
          <li>Generate new token → 填写 Note，勾选 <b>gist</b>，生成并复制 Token（以 <b>ghp_</b> 开头）</li>
          <li>回到积时 → 设置 → 粘贴 Token 保存</li>
          <li>点击「推送到云端」，首次会自动创建 Gist，Gist ID 自动保存</li>
          <li>换手机时：新手机重复步骤 4，然后手动填入相同 Gist ID，点「从云端拉取」</li>
        </ol>
        <button class="modal-btn confirm" style="width:100%;margin-top:16px" @click="showGistGuide = false">明白了</button>
      </div>
    </div>

    <!-- 同步进度覆盖层 -->
    <div v-if="syncing" class="sync-overlay">
      <div class="sync-card">
        <div class="sync-spinner" />
        <div class="sync-msg">{{ syncMessage }}</div>
      </div>
    </div>

    <!-- toast -->
    <div v-if="toast.show" class="toast" :class="toast.type">{{ toast.text }}</div>

    <!-- 隐藏 file input -->
    <input ref="fileInput" type="file" accept=".json" style="display:none" @change="handleFileImport" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getAllSettings, setSetting, clearAllData } from '@/stores'
import db from '@/db'
import { pushToGist, pullFromGist } from '@/utils/gist-sync'

const settings = ref<Record<string, string>>({})

/* ── Toast ── */
const toast = ref({ show: false, text: '', type: 'info' })
function showMsg(text: string, type = 'info', duration = 2200) {
  toast.value = { show: true, text, type }
  setTimeout(() => { toast.value.show = false }, duration)
}

/* ── 通用编辑弹窗 ── */
const editModal = ref({ show: false, key: '', title: '', value: '', placeholder: '', inputType: 'text' })

function openEdit(key: string, title: string, placeholder: string, inputType = 'text') {
  editModal.value = { show: true, key, title, value: settings.value[key] || '', placeholder, inputType }
}

async function saveEdit() {
  await setSetting(editModal.value.key, editModal.value.value)
  editModal.value.show = false
  showMsg('已保存')
  loadSettings()
}

/* ── 工作日 ── */
const showWorkdaysPicker = ref(false)
const selectedWorkdays = ref<number[]>([1, 2, 3, 4, 5])
const weekdayOptions = [
  { value: 1, label: '一' }, { value: 2, label: '二' }, { value: 3, label: '三' },
  { value: 4, label: '四' }, { value: 5, label: '五' }, { value: 6, label: '六' },
  { value: 0, label: '日' },
]
const workdaysDisplay = computed(() => {
  const map: Record<number, string> = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 0: '日' }
  return (settings.value.workdays?.split(',').map(Number) || [1,2,3,4,5])
    .map(d => `周${map[d]}`).join('、')
})

function toggleWorkday(v: number) {
  const i = selectedWorkdays.value.indexOf(v)
  if (i > -1) selectedWorkdays.value.splice(i, 1)
  else selectedWorkdays.value.push(v)
}

async function saveWorkdays() {
  await setSetting('workdays', [...selectedWorkdays.value].sort().join(','))
  showWorkdaysPicker.value = false
  showMsg('已保存')
  loadSettings()
}

/* ── Gist 同步 ── */
const gistToken = ref('')
const gistId = ref('')
const lastSyncAt = ref('')
const syncing = ref(false)
const syncMessage = ref('')

const showGistTokenModal = ref(false)
const showGistIdModal = ref(false)
const gistTokenInput = ref('')
const gistIdInput = ref('')
const showGistGuide = ref(false)

// 去掉所有空白和不可见字符（iOS粘贴时极易混入）
function cleanToken(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 控制字符
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')   // 零宽字符
    .replace(/\s/g, '')                             // 所有空白换行
    .trim()
}

const tokenVerifyState = ref<'idle' | 'checking' | 'ok' | 'fail'>('idle')
const tokenVerifyMsg = ref('')

async function verifyToken() {
  const t = cleanToken(gistTokenInput.value)
  if (!t) return
  tokenVerifyState.value = 'checking'
  tokenVerifyMsg.value = ''
  try {
    const res = await fetch('https://api.github.com/gists?per_page=1', {
      headers: { Authorization: `Bearer ${t}`, Accept: 'application/vnd.github+json' },
    })
    if (res.ok) {
      tokenVerifyState.value = 'ok'
      tokenVerifyMsg.value = 'Token 有效 ✓'
    } else {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      tokenVerifyState.value = 'fail'
      tokenVerifyMsg.value = err.message || `HTTP ${res.status}`
    }
  } catch (e: unknown) {
    tokenVerifyState.value = 'fail'
    tokenVerifyMsg.value = (e as Error).message
  }
}

function openGistTokenModal() {
  gistTokenInput.value = gistToken.value
  tokenVerifyState.value = 'idle'
  tokenVerifyMsg.value = ''
  showGistTokenModal.value = true
}
function openGistIdModal() {
  gistIdInput.value = gistId.value
  showGistIdModal.value = true
}

async function saveGistToken() {
  const t = cleanToken(gistTokenInput.value)  // 清洗不可见字符
  await setSetting('gistToken', t)
  gistToken.value = t
  showGistTokenModal.value = false
  showMsg(t ? `Token 已保存 (${t.slice(0,8)}…)` : 'Token 已清除')
}

async function saveGistId() {
  const id = gistIdInput.value.trim()
  await setSetting('gistId', id)
  gistId.value = id
  showGistIdModal.value = false
  showMsg(id ? 'Gist ID 已保存' : '将在首次推送时自动创建')
}

async function handlePush() {
  if (!gistToken.value) {
    showMsg('请先配置 GitHub Token', 'warn')
    openGistTokenModal()
    return
  }
  syncing.value = true
  syncMessage.value = '正在推送数据到 Gist…'
  try {
    const newId = await pushToGist(gistToken.value, gistId.value || null)
    gistId.value = newId
    await setSetting('gistId', newId)
    const now = new Date().toLocaleString('zh-CN')
    lastSyncAt.value = now
    await setSetting('lastSyncAt', now)
    showMsg('✓ 推送成功', 'success')
    loadSettings()
  } catch (e: unknown) {
    showMsg(`推送失败: ${(e as Error).message}`, 'error', 4000)
  } finally {
    syncing.value = false
  }
}

// 点拉取按钮时先校验，再弹确认
function openPullConfirm() {
  if (!gistToken.value) { showMsg('请先配置 GitHub Token', 'warn'); openGistTokenModal(); return }
  if (!gistId.value) { showMsg('请先配置 Gist ID（首次推送后自动填入）', 'warn'); return }
  pendingPull.value = true
}

async function doConfirmPull() {
  pendingPull.value = false
  syncing.value = true
  syncMessage.value = '正在从 Gist 拉取数据…'
  try {
    await pullFromGist(gistToken.value, gistId.value)
    const now = new Date().toLocaleString('zh-CN')
    lastSyncAt.value = now
    await setSetting('lastSyncAt', now)
    showMsg('✓ 拉取成功，数据已恢复', 'success')
    loadSettings()
  } catch (e: unknown) {
    showMsg(`拉取失败: ${(e as Error).message}`, 'error', 4000)
  } finally {
    syncing.value = false
  }
}

/* ── 导出 ── */
async function exportJSON() {
  const data = {
    records: await db.records.toArray(),
    leaves: await db.leaves.toArray(),
    settings: await db.settings.toArray(),
    exportDate: new Date().toISOString(),
    version: '1.2',
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const d = new Date().toISOString().slice(0, 10)
  a.href = url; a.download = `jishi-backup-${d}.json`; a.click()
  URL.revokeObjectURL(url)
  showMsg('✓ 备份文件已下载', 'success')
}

async function exportCSV() {
  const records = await db.records.toArray()
  const rows = ['日期,上班,下班,工时(分钟),补录,备注',
    ...records.map(r => `${r.date},${r.clockIn},${r.clockOut},${r.workMinutes},${r.isManual ? '是' : '否'},"${r.note || ''}"`)
  ].join('\n')
  const blob = new Blob(['\uFEFF' + rows], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `jishi-records-${new Date().toISOString().slice(0,10)}.csv`; a.click()
  URL.revokeObjectURL(url)
  showMsg('✓ CSV 已下载', 'success')
}

/* ── 导入 ── */
const fileInput = ref<HTMLInputElement | null>(null)
function importJSON() { fileInput.value?.click() }

async function handleFileImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  pendingImportFile.value = file
  pendingImport.value = true
  ;(e.target as HTMLInputElement).value = ''
}

async function doConfirmImport() {
  const file = pendingImportFile.value
  pendingImport.value = false
  if (!file) return
  try {
    const data = JSON.parse(await file.text())
    if (data.records) { await db.records.clear(); await db.records.bulkAdd(data.records) }
    if (data.leaves)  { await db.leaves.clear();  await db.leaves.bulkAdd(data.leaves) }
    if (data.settings){ await db.settings.clear(); await db.settings.bulkAdd(data.settings) }
    showMsg('✓ 导入成功', 'success')
    loadSettings()
  } catch {
    showMsg('导入失败，文件格式错误', 'error')
  }
}

/* ── 清除全部 ── */
const pendingPull = ref(false)
const pendingImport = ref(false)
const pendingImportFile = ref<File | null>(null)
const pendingClearAll = ref(false)
async function doClearAll() {
  await clearAllData()
  pendingClearAll.value = false
  showMsg('所有数据已清除', 'success')
  loadSettings()
}

async function loadSettings() {
  const s = await getAllSettings()
  settings.value = s
  selectedWorkdays.value = s.workdays?.split(',').map(Number) || [1, 2, 3, 4, 5]
  // 读出时也清洗，修复旧数据里的不可见字符
  gistToken.value = cleanToken(s.gistToken || '')
  gistId.value = (s.gistId || '').trim()
  lastSyncAt.value = s.lastSyncAt || ''
  // 如果清洗后 token 与存储不同，回写干净版本
  if (s.gistToken && gistToken.value !== s.gistToken) {
    await setSetting('gistToken', gistToken.value)
  }
}

onMounted(loadSettings)
</script>

<style scoped>
.settings-page {
  padding: 0 0 40px;
  background: var(--ji-bg, #f1f5f9);
  min-height: 100%;
}

.page-header {
  font-size: 22px;
  font-weight: 700;
  padding: 20px 20px 12px;
  padding-top: calc(20px + var(--safe-top, 0px));
  color: var(--ji-text, #1e293b);
}

.group-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ji-text-sec, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  padding: 16px 20px 6px;
}

.danger-label { color: #ef4444; }

.card {
  margin: 0 16px;
  background: var(--ji-card, #fff);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 8px rgba(0,0,0,0.06);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--ji-border, #f1f5f9);
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.row:last-child { border-bottom: none; }
.row:active:not(.no-tap) { background: #f8faff; }
.no-tap { cursor: default; }

.row-title { font-size: 15px; color: var(--ji-text, #1e293b); }
.row-value { font-size: 14px; color: var(--ji-text-sec, #64748b); }

.tag-blue  { color: #6366f1; font-weight: 600; }
.tag-green { color: #10b981; font-weight: 600; }
.tag-orange{ color: #f59e0b; font-weight: 600; }
.tag-gray  { color: #94a3b8; }
.muted     { color: #94a3b8; }
.danger-row { background: #fff5f5; }
.danger-text { color: #ef4444; font-weight: 600; }

.row-actions {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
}

.action-btn {
  flex: 1;
  height: 40px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.action-btn:disabled { opacity: 0.5; }
.action-btn.primary { background: #6366f1; color: #fff; }
.action-btn.outline { background: #f1f5f9; color: #6366f1; border: 1.5px solid #6366f1; }

.hint {
  font-size: 12px;
  color: var(--ji-text-sec, #64748b);
  padding: 7px 20px 0;
  line-height: 1.6;
}
.hint-link { color: #6366f1; cursor: pointer; }

/* ── 弹窗 ── */
.modal-mask {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}

.modal-box {
  background: #fff;
  border-radius: 18px;
  padding: 24px 20px 20px;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 16px 40px rgba(0,0,0,0.2);
}

.modal-title {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 16px;
  color: #1e293b;
}

.modal-input {
  width: 100%;
  height: 46px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  padding: 0 14px;
  font-size: 16px;
  color: #1e293b;
  background: #f8faff;
  box-sizing: border-box;
}
.modal-input:focus { outline: none; border-color: #6366f1; }

.modal-textarea {
  width: 100%;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 14px;
  font-family: monospace;
  color: #1e293b;
  background: #f8faff;
  box-sizing: border-box;
  resize: none;
}
.modal-textarea:focus { outline: none; border-color: #6366f1; }

.modal-hint {
  font-size: 12px;
  color: #64748b;
  margin-top: 10px;
  line-height: 1.6;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.modal-btn {
  flex: 1;
  height: 44px;
  border-radius: 10px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
.modal-btn.cancel  { background: #f1f5f9; color: #64748b; }
.modal-btn.confirm { background: #6366f1; color: #fff; }
.modal-btn.verify-btn {
  flex: 0 0 auto;
  padding: 0 16px;
  background: #f1f5f9;
  color: #6366f1;
  border: 1.5px solid #6366f1;
}

.token-verify-row {
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
}
.token-verify-row.checking { background: #f1f5f9; color: #64748b; }
.token-verify-row.ok       { background: #d1fae5; color: #065f46; }
.token-verify-row.fail     { background: #fee2e2; color: #991b1b; }

/* 工作日 */
.weekday-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 4px;
}
.weekday-btn {
  height: 44px;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  background: #f8faff;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
}
.weekday-btn.active {
  border-color: #6366f1;
  background: #eef2ff;
  color: #6366f1;
  font-weight: 700;
}

/* 教程 */
.guide-box { max-height: 80vh; overflow-y: auto; }
.guide-list {
  padding-left: 18px;
  line-height: 2;
  font-size: 14px;
  color: #334155;
}
.guide-list b { color: #6366f1; }

/* 危险弹窗 */
.danger-warn {
  font-size: 14px;
  color: #ef4444;
  line-height: 1.6;
}

/* 同步覆盖层 */
.sync-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
}
.sync-card {
  background: #fff;
  border-radius: 16px;
  padding: 28px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.2);
}
.sync-spinner {
  width: 36px; height: 36px;
  border: 3px solid #eef2ff;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.sync-msg { font-size: 14px; color: #334155; }

/* Toast */
.toast {
  position: fixed;
  bottom: calc(80px + var(--safe-bottom, 0px));
  left: 50%; transform: translateX(-50%);
  padding: 10px 22px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  z-index: 300;
  pointer-events: none;
  animation: fadeup 0.25s ease;
}
.toast.info    { background: #334155; color: #fff; }
.toast.success { background: #10b981; color: #fff; }
.toast.warn    { background: #f59e0b; color: #fff; }
.toast.error   { background: #ef4444; color: #fff; }
@keyframes fadeup {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>
