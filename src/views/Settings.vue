<template>
  <div class="settings-page">
    <van-nav-bar title="设置" />

    <!-- 工作时间配置 -->
    <div class="section">
      <div class="section-title">工作时间</div>
      <van-cell-group inset>
        <van-cell title="标准上班时间" :value="settings.standardClockIn" is-link @click="editSetting('standardClockIn')" />
        <van-cell title="标准下班时间" :value="settings.standardClockOut" is-link @click="editSetting('standardClockOut')" />
        <van-cell title="每日标准工时" :value="`${settings.dailyStandardHours}小时`" is-link @click="editSetting('dailyStandardHours')" />
        <van-cell title="平均工时要求" :value="`${settings.avgRequiredHours || '11.5'}小时/天`" is-link @click="editSetting('avgRequiredHours')" />
        <van-cell title="工作日" :value="workdaysDisplay" is-link @click="editWorkdays" />
      </van-cell-group>
    </div>

    <!-- 数据同步 -->
    <div class="section">
      <div class="section-title">数据同步 (API 服务器)</div>
      <van-cell-group inset>
        <van-cell
          title="API 地址"
          :value="apiUrl || '未配置'"
          is-link
          @click="showApiUrlInput = true"
        />
        <van-cell
          title="API Token"
          :value="apiTokenVal ? '已配置' : '未配置'"
          is-link
          @click="showApiTokenInput2 = true"
        />
        <van-cell
          v-if="lastSyncAt"
          title="上次同步"
          :value="lastSyncAt"
        />
        <van-cell title="从服务器拉取数据" is-link @click="handleApiPull" />
      </van-cell-group>
      <div class="sync-hint">
        配置 Cloudflare Worker API 地址后，可从服务器拉取 iOS 快捷指令自动打卡的数据。
      </div>
    </div>

    <!-- 数据同步 (GitHub Gist) -->
    <div class="section">
      <div class="section-title">数据备份 (GitHub Gist)</div>
      <van-cell-group inset>
        <van-cell
          title="GitHub Token"
          :value="gistToken ? '已配置' : '未配置'"
          is-link
          @click="showTokenInput = true"
        />
        <van-cell
          title="Gist ID"
          :value="gistId || '未绑定'"
          is-link
          @click="showGistIdInput = true"
        />
        <van-cell
          v-if="lastSyncAt"
          title="上次同步"
          :value="lastSyncAt"
        />
        <van-cell title="推送数据到 Gist" is-link @click="handlePush" />
        <van-cell title="从 Gist 拉取数据" is-link @click="handlePull" />
      </van-cell-group>
      <div class="sync-hint">
        使用 GitHub 私有 Gist 免费同步数据。换设备时输入相同 Token 即可恢复数据。
      </div>
    </div>

    <!-- 数据管理 -->
    <div class="section">
      <div class="section-title">数据管理</div>
      <van-cell-group inset>
        <van-cell title="导出 CSV" is-link @click="exportCSV" />
        <van-cell title="导出 JSON 备份" is-link @click="exportJSON" />
        <van-cell title="导入 JSON 恢复" is-link @click="importJSON" />
      </van-cell-group>
    </div>

    <!-- 危险区域 -->
    <div class="section">
      <div class="section-title danger-title">危险操作</div>
      <van-cell-group inset>
        <van-cell title="清除所有数据" is-link class="danger-cell" @click="handleClearAll" />
      </van-cell-group>
    </div>

    <!-- 关于 -->
    <div class="section">
      <div class="section-title">关于</div>
      <van-cell-group inset>
        <van-cell title="JiShi" value="v1.1.0" />
        <van-cell title="数据存储" value="本地 IndexedDB" />
        <van-cell title="技术栈" value="Vue 3 + PWA" />
        <van-cell title="同步方案" value="GitHub Gist" />
      </van-cell-group>
    </div>

    <!-- 编辑弹窗 -->
    <van-dialog
      v-model:show="showEdit"
      :title="editTitle"
      show-cancel-button
      @confirm="saveEdit"
    >
      <div class="edit-form">
        <van-field v-model="editValue" :label="editLabel" :placeholder="editPlaceholder" />
      </div>
    </van-dialog>

    <!-- 工作日选择 -->
    <van-dialog
      v-model:show="showWorkdaysEdit"
      title="选择工作日"
      show-cancel-button
      @confirm="saveWorkdays"
    >
      <div class="workdays-form">
        <van-checkbox-group v-model="selectedWorkdays">
          <van-cell
            v-for="item in weekdayOptions"
            :key="item.value"
            :title="item.label"
            clickable
            @click="toggleWorkday(item.value)"
          >
            <template #right-icon>
              <van-checkbox :name="item.value" />
            </template>
          </van-cell>
        </van-checkbox-group>
      </div>
    </van-dialog>

    <!-- Token 输入弹窗 -->
    <van-dialog
      v-model:show="showTokenInput"
      title="GitHub Token"
      show-cancel-button
      @confirm="saveGistToken"
    >
      <div class="edit-form">
        <van-field
          v-model="gistTokenInput"
          label="Token"
          placeholder="ghp_xxxxxxxxxxxx"
          type="textarea"
          rows="2"
          autosize
        />
        <div class="field-hint">
          在 GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) 中生成，勾选 gist 权限。
        </div>
      </div>
    </van-dialog>

    <!-- Gist ID 输入弹窗 -->
    <van-dialog
      v-model:show="showGistIdInput"
      title="Gist ID"
      show-cancel-button
      @confirm="saveGistId"
    >
      <div class="edit-form">
        <van-field
          v-model="gistIdInput"
          label="Gist ID"
          placeholder="留空则首次推送时自动创建"
        />
        <div class="field-hint">
          首次推送时自动创建私有 Gist 并绑定 ID，换设备恢复时填入此 ID。
        </div>
      </div>
    </van-dialog>

    <!-- API 地址输入弹窗 -->
    <van-dialog
      v-model:show="showApiUrlInput"
      title="API 地址"
      show-cancel-button
      @confirm="saveApiUrl"
    >
      <div class="edit-form">
        <van-field
          v-model="apiUrlInput"
          label="URL"
          placeholder="https://jishi-worker.your-name.workers.dev"
          type="textarea"
          rows="2"
          autosize
        />
        <div class="field-hint">
          Cloudflare Worker 部署后的 URL。
        </div>
      </div>
    </van-dialog>

    <!-- API Token 输入弹窗 -->
    <van-dialog
      v-model:show="showApiTokenInput2"
      title="API Token"
      show-cancel-button
      @confirm="saveApiToken2"
    >
      <div class="edit-form">
        <van-field
          v-model="apiTokenInput2"
          label="Token"
          placeholder="与 Worker D1 中 settings.apiToken 一致"
        />
        <div class="field-hint">
          在 schema.sql 中设置的 apiToken 值，用于 iOS 快捷指令和 PWA 调用 API 时鉴权。
        </div>
      </div>
    </van-dialog>

    <!-- 清除全部数据二次确认 -->
    <van-dialog
      v-model:show="showClearConfirm"
      title="清除所有数据"
      show-cancel-button
      confirm-button-text="确认清除"
      confirm-button-color="#ee0a24"
      :before-close="handleClearConfirm"
    >
      <div class="confirm-form">
        <p class="confirm-warning">此操作将清除所有打卡记录、请假记录，且不可恢复！</p>
        <van-field
          v-model="clearConfirmText"
          label="请输入"
          placeholder="确认删除"
        />
      </div>
    </van-dialog>

    <!-- 隐藏的文件输入 -->
    <input ref="fileInput" type="file" accept=".json" style="display:none" @change="handleFileImport" />

    <!-- 同步加载遮罩 -->
    <van-overlay :show="syncing" class="sync-overlay">
      <div class="sync-loading">
        <van-loading type="spinner" color="#1989fa" size="36" />
        <span class="sync-text">{{ syncMessage }}</span>
      </div>
    </van-overlay>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getAllSettings, setSetting, clearAllData } from '@/stores'
import { showToast, showConfirmDialog } from 'vant'
import db from '@/db'
import { pushToGist, pullFromGist } from '@/utils/gist-sync'
import { pullAllFromServer } from '@/utils/api-client'

const settings = ref<Record<string, string>>({})
const showEdit = ref(false)
const editKey = ref('')
const editValue = ref('')
const editTitle = ref('')
const editLabel = ref('')
const editPlaceholder = ref('')

const showWorkdaysEdit = ref(false)
const selectedWorkdays = ref<number[]>([])

const weekdayOptions = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
]

const workdaysDisplay = computed(() => {
  const map: Record<number, string> = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 0: '日' }
  const days = settings.value.workdays?.split(',').map(Number) || []
  return days.map((d) => `周${map[d]}`).join('、')
})

async function loadSettings() {
  settings.value = await getAllSettings()
  selectedWorkdays.value = settings.value.workdays?.split(',').map(Number) || [1, 2, 3, 4, 5]
  gistToken.value = settings.value.gistToken || ''
  gistId.value = settings.value.gistId || ''
  lastSyncAt.value = settings.value.lastSyncAt || ''
  apiUrl.value = settings.value.apiUrl || ''
  apiTokenVal.value = settings.value.apiToken || ''
}

const settingMeta: Record<string, { title: string; label: string; placeholder: string }> = {
  standardClockIn: { title: '上班时间', label: '时间', placeholder: '09:00' },
  standardClockOut: { title: '下班时间', label: '时间', placeholder: '18:00' },
  dailyStandardHours: { title: '标准工时', label: '小时', placeholder: '8' },
  avgRequiredHours: { title: '平均工时要求', label: '小时', placeholder: '11.5' },
}

function editSetting(key: string) {
  editKey.value = key
  editValue.value = settings.value[key] || ''
  const meta = settingMeta[key]
  editTitle.value = meta?.title || '编辑'
  editLabel.value = meta?.label || '值'
  editPlaceholder.value = meta?.placeholder || ''
  showEdit.value = true
}

async function saveEdit() {
  await setSetting(editKey.value, editValue.value)
  showToast('已保存')
  loadSettings()
}

function editWorkdays() {
  showWorkdaysEdit.value = true
}

function toggleWorkday(val: number) {
  const idx = selectedWorkdays.value.indexOf(val)
  if (idx > -1) selectedWorkdays.value.splice(idx, 1)
  else selectedWorkdays.value.push(val)
}

async function saveWorkdays() {
  const sorted = [...selectedWorkdays.value].sort().join(',')
  await setSetting('workdays', sorted)
  showToast('已保存')
  loadSettings()
}

/* ─── GitHub Gist 同步 ─── */

const gistToken = ref('')
const gistId = ref('')
const lastSyncAt = ref('')
const syncing = ref(false)
const syncMessage = ref('')

const showTokenInput = ref(false)
const gistTokenInput = ref('')
const showGistIdInput = ref(false)
const gistIdInput = ref('')

/* ─── API 服务器配置 ─── */

const apiUrl = ref('')
const apiTokenVal = ref('')
const showApiUrlInput = ref(false)
const apiUrlInput = ref('')
const showApiTokenInput2 = ref(false)
const apiTokenInput2 = ref('')

function saveGistToken() {
  const token = gistTokenInput.value.trim()
  if (token) {
    setSetting('gistToken', token)
    gistToken.value = token
    showToast('Token 已保存')
  } else {
    setSetting('gistToken', '')
    gistToken.value = ''
    showToast('Token 已清除')
  }
}

function saveGistId() {
  const id = gistIdInput.value.trim()
  setSetting('gistId', id)
  gistId.value = id
  showToast(id ? 'Gist ID 已保存' : 'Gist ID 已清除，将自动创建')
}

/* ─── API 服务器配置 ─── */

function saveApiUrl() {
  const url = apiUrlInput.value.trim().replace(/\/$/, '')
  setSetting('apiUrl', url)
  apiUrl.value = url
  showToast(url ? 'API 地址已保存' : 'API 地址已清除')
}

function saveApiToken2() {
  const token = apiTokenInput2.value.trim()
  setSetting('apiToken', token)
  apiTokenVal.value = token
  showToast(token ? 'API Token 已保存' : 'API Token 已清除')
}

async function handleApiPull() {
  if (!apiUrl.value) {
    showToast('请先配置 API 地址')
    showApiUrlInput.value = true
    apiUrlInput.value = ''
    return
  }

  try {
    await showConfirmDialog({
      title: '拉取确认',
      message: '从服务器拉取数据将覆盖本地所有记录，是否继续？',
      confirmButtonText: '确认拉取',
      confirmButtonColor: '#ee0a24',
    })
  } catch {
    return
  }

  syncing.value = true
  syncMessage.value = '正在从服务器拉取数据...'
  try {
    const result = await pullAllFromServer()
    showToast(`拉取成功: ${result.records}条记录, ${result.leaves}条请假`)
    loadSettings()
  } catch (e: unknown) {
    showToast(`拉取失败: ${(e as Error).message}`)
  } finally {
    syncing.value = false
  }
}

async function handlePush() {
  if (!gistToken.value) {
    showToast('请先配置 GitHub Token')
    showTokenInput.value = true
    gistTokenInput.value = ''
    return
  }

  syncing.value = true
  syncMessage.value = '正在推送数据到 Gist...'
  try {
    const newGistId = await pushToGist(gistToken.value, gistId.value || null)
    gistId.value = newGistId
    await setSetting('gistId', newGistId)
    const now = new Date().toLocaleString('zh-CN')
    lastSyncAt.value = now
    await setSetting('lastSyncAt', now)
    showToast('推送成功')
  } catch (e: unknown) {
    showToast(`推送失败: ${(e as Error).message}`)
  } finally {
    syncing.value = false
  }
}

async function handlePull() {
  if (!gistToken.value) {
    showToast('请先配置 GitHub Token')
    showTokenInput.value = true
    gistTokenInput.value = ''
    return
  }
  if (!gistId.value) {
    showToast('请先配置 Gist ID（首次推送后自动生成）')
    return
  }

  try {
    await showConfirmDialog({
      title: '拉取确认',
      message: '从 Gist 拉取数据将覆盖本地所有记录，是否继续？',
      confirmButtonText: '确认拉取',
      confirmButtonColor: '#ee0a24',
    })
  } catch {
    return // 用户取消
  }

  syncing.value = true
  syncMessage.value = '正在从 Gist 拉取数据...'
  try {
    await pullFromGist(gistToken.value, gistId.value)
    const now = new Date().toLocaleString('zh-CN')
    lastSyncAt.value = now
    await setSetting('lastSyncAt', now)
    showToast('拉取成功，数据已恢复')
    loadSettings()
  } catch (e: unknown) {
    showToast(`拉取失败: ${(e as Error).message}`)
  } finally {
    syncing.value = false
  }
}

/* ─── 导出 ─── */

async function exportCSV() {
  const records = await db.records.toArray()
  const header = '日期,上班,下班,午休(分钟),工时(分钟),补录,备注\n'
  const rows = records.map((r) =>
    `${r.date},${r.clockIn},${r.clockOut},${r.breakMinutes},${r.workMinutes},${r.isManual ? '是' : '否'},"${r.note}"`
  ).join('\n')
  downloadFile(header + rows, 'jishi-records.csv', 'text/csv')
  showToast('导出成功')
}

async function exportJSON() {
  const data = {
    records: await db.records.toArray(),
    leaves: await db.leaves.toArray(),
    settings: await db.settings.toArray(),
    exportDate: new Date().toISOString(),
  }
  downloadFile(JSON.stringify(data, null, 2), 'jishi-backup.json', 'application/json')
  showToast('备份成功')
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type: `${type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ─── 导入 ─── */

const fileInput = ref<HTMLInputElement | null>(null)

function importJSON() {
  fileInput.value?.click()
}

async function handleFileImport(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    await showConfirmDialog({
      title: '导入确认',
      message: '导入 JSON 将覆盖本地所有记录，是否继续？',
      confirmButtonText: '确认导入',
      confirmButtonColor: '#ee0a24',
    })
  } catch {
    return // 用户取消
  }

  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (data.records) {
      await db.records.clear()
      await db.records.bulkAdd(data.records)
    }
    if (data.leaves) {
      await db.leaves.clear()
      await db.leaves.bulkAdd(data.leaves)
    }
    if (data.settings) {
      await db.settings.clear()
      await db.settings.bulkAdd(data.settings)
    }

    showToast('导入成功')
    loadSettings()
  } catch {
    showToast('导入失败，文件格式错误')
  }
}

/* ─── 清除所有数据 ─── */

const showClearConfirm = ref(false)
const clearConfirmText = ref('')

function handleClearAll() {
  clearConfirmText.value = ''
  showClearConfirm.value = true
}

async function handleClearConfirm(action: string): Promise<boolean> {
  if (action !== 'confirm') return true
  if (clearConfirmText.value !== '确认删除') {
    showToast('请输入"确认删除"以确认操作')
    return false
  }
  await clearAllData()
  showToast('所有数据已清除')
  loadSettings()
  return true
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings-page {
  background: var(--jishi-bg);
  min-height: 100%;
  padding-bottom: 20px;
}

.section {
  margin: 16px;
}

.section-title {
  font-size: 14px;
  color: var(--jishi-text-secondary);
  margin-bottom: 8px;
  padding: 0 4px;
}

.danger-title {
  color: var(--jishi-danger);
}

.danger-cell :deep(.van-cell__title) {
  color: var(--jishi-danger);
}

.edit-form {
  padding: 16px;
}

.workdays-form {
  padding: 8px 16px;
}

.field-hint {
  font-size: 12px;
  color: var(--jishi-text-secondary);
  padding: 8px 16px 0;
  line-height: 1.5;
}

.sync-hint {
  font-size: 12px;
  color: var(--jishi-text-secondary);
  padding: 8px 20px;
  line-height: 1.5;
}

.confirm-form {
  padding: 16px;
}

.confirm-warning {
  color: var(--jishi-danger);
  font-size: 14px;
  margin-bottom: 12px;
  line-height: 1.5;
}

.sync-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
}

.sync-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: var(--jishi-card, #fff);
  padding: 32px 40px;
  border-radius: 12px;
}

.sync-text {
  font-size: 14px;
  color: var(--jishi-text);
}
</style>
