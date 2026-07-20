<template>
  <div class="day-detail-page">
    <!-- 顶部导航 -->
    <div class="page-header">
      <button class="back-btn" @click="router.back()">‹ 返回</button>
      <span class="page-title">{{ dateDisplay }}</span>
      <span style="width:60px" />
    </div>

    <!-- 打卡记录 -->
    <div class="section">
      <div class="section-title">打卡记录</div>
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">上班打卡</span>
          <span class="info-value">{{ record?.clockIn || '未打卡' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">下班签退</span>
          <span class="info-value">{{ record?.clockOut || '未签退' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">实际工时</span>
          <span class="info-value highlight">{{ workTimeDisplay }}</span>
        </div>
        <div v-if="record?.isManual" class="info-row">
          <span class="info-label">补录标记</span>
          <span class="info-value tag">手动补录</span>
        </div>
        <div v-if="record?.note" class="info-row">
          <span class="info-label">备注</span>
          <span class="info-value">{{ record.note }}</span>
        </div>
      </div>

      <div class="btn-group">
        <button class="btn btn-primary" @click="openManualInput">
          {{ record ? '✎ 编辑记录' : '+ 补录打卡' }}
        </button>
        <button v-if="record" class="btn btn-danger" @click="handleDeleteDayRecord">
          删除打卡
        </button>
      </div>
    </div>

    <!-- 请假记录 -->
    <div class="section">
      <div class="section-title">
        <span>请假记录</span>
        <button class="icon-btn" @click="openLeaveInput">+ 添加</button>
      </div>
      <div class="info-card">
        <div v-if="leaves.length === 0" class="empty-text">无请假记录</div>
        <div v-for="leave in leaves" :key="leave.id ?? leave.date" class="info-row leave-row">
          <span class="info-label">{{ leaveTypeLabel(leave.type) }}</span>
          <span class="info-value">{{ leave.isFullDay ? '全天' : `${leave.hours}小时` }}</span>
          <template v-if="pendingDeleteLeaveId === leave.id">
            <button class="confirm-del-btn" @click="doDeleteLeave(leave.id)">确认</button>
            <button class="cancel-del-btn" @click="pendingDeleteLeaveId = null">取消</button>
          </template>
          <button v-else class="delete-btn" @click="pendingDeleteLeaveId = leave.id!">删除</button>
        </div>
      </div>
      <div v-if="hasLeaveToday" class="leave-tip">
        ✓ 当天已标记全天请假，统计时将不计入工时
      </div>
    </div>

    <!-- 补录弹窗 -->
    <div v-if="showManualInput" class="modal-mask" @click.self="showManualInput = false">
      <div class="modal-box">
        <div class="modal-title">{{ record ? '编辑打卡记录' : '补录打卡' }}</div>
        <div class="form-item">
          <label>上班时间</label>
          <input v-model="manualClockIn" type="time" class="time-input" />
        </div>
        <div class="form-item">
          <label>下班时间</label>
          <input v-model="manualClockOut" type="time" class="time-input" />
        </div>
        <div class="form-item">
          <label>备注（可选）</label>
          <input v-model="manualNote" type="text" class="text-input" placeholder="备注" />
        </div>
        <div class="preview-minutes" v-if="manualClockIn && manualClockOut">
          预计工时: {{ previewMinutes }}
        </div>
        <div class="modal-btns">
          <button class="btn btn-default" @click="showManualInput = false">取消</button>
          <button class="btn btn-primary" @click="handleManualSave">保存</button>
        </div>
      </div>
    </div>

    <!-- 请假弹窗 -->
    <div v-if="showLeaveInput" class="modal-mask" @click.self="showLeaveInput = false">
      <div class="modal-box">
        <div class="modal-title">添加请假</div>
        <div class="form-item">
          <label>请假类型</label>
          <select v-model="leaveForm.type" class="select-input">
            <option value="annual">年假</option>
            <option value="sick">病假</option>
            <option value="personal">事假</option>
            <option value="compensatory">调休</option>
          </select>
        </div>
        <div class="form-item">
          <label class="toggle-label">
            <span>全天请假</span>
            <span class="toggle-desc">（统计时此日不计工时）</span>
            <input v-model="leaveForm.isFullDay" type="checkbox" class="toggle-check" />
          </label>
        </div>
        <div v-if="!leaveForm.isFullDay" class="form-item">
          <label>时长（小时）</label>
          <input v-model="leaveForm.hours" type="number" step="0.5" min="0.5" max="12" class="text-input" />
        </div>
        <div class="form-item">
          <label>备注（可选）</label>
          <input v-model="leaveForm.note" type="text" class="text-input" placeholder="备注" />
        </div>
        <div class="modal-btns">
          <button class="btn btn-default" @click="showLeaveInput = false">取消</button>
          <button class="btn btn-primary" @click="handleLeaveSave">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRecord, saveRecord, getLeavesForDate, saveLeave, deleteLeave, deleteRecordByDate } from '@/stores'
import { calcWorkMinutes, formatMinutes, dayjs } from '@/utils/time'
import type { ClockRecord, LeaveRecord } from '@/db'

const route = useRoute()
const router = useRouter()
const date = computed(() => route.params.date as string)
const dateDisplay = computed(() => dayjs(date.value).format('YYYY年M月D日 dddd'))

const record = ref<ClockRecord | undefined>()
const leaves = ref<LeaveRecord[]>([])

const hasLeaveToday = computed(() => leaves.value.some(l => l.isFullDay))

const workTimeDisplay = computed(() => {
  if (!record.value || !record.value.clockOut) return '--'
  return formatMinutes(record.value.workMinutes)
})

// 补录表单
const showManualInput = ref(false)
const manualClockIn = ref('09:00')
const manualClockOut = ref('21:30')
const manualNote = ref('')

// 预览工时
const previewMinutes = computed(() => {
  const mins = calcWorkMinutes(manualClockIn.value, manualClockOut.value)
  return formatMinutes(mins)
})

// 请假表单
const showLeaveInput = ref(false)
const leaveForm = ref({
  type: 'annual' as LeaveRecord['type'],
  hours: '8',
  isFullDay: true,
  note: '',
})

function leaveTypeLabel(type: string): string {
  const map: Record<string, string> = {
    annual: '年假',
    sick: '病假',
    personal: '事假',
    compensatory: '调休',
  }
  return map[type] || type
}

function openManualInput() {
  if (record.value) {
    manualClockIn.value = record.value.clockIn || '09:00'
    manualClockOut.value = record.value.clockOut || '21:30'
    manualNote.value = record.value.note || ''
  } else {
    manualClockIn.value = '09:00'
    manualClockOut.value = '21:30'
    manualNote.value = ''
  }
  showManualInput.value = true
}

function openLeaveInput() {
  leaveForm.value = { type: 'annual', hours: '8', isFullDay: true, note: '' }
  showLeaveInput.value = true
}

async function loadData() {
  record.value = await getRecord(date.value)
  leaves.value = await getLeavesForDate(date.value)
}

async function handleManualSave() {
  if (!manualClockIn.value) {
    alert('请填写上班时间')
    return
  }
  const workMins = calcWorkMinutes(manualClockIn.value, manualClockOut.value)
  const newRecord: ClockRecord = {
    id: record.value?.id,
    date: date.value,
    clockIn: manualClockIn.value,
    clockOut: manualClockOut.value,
    breakMinutes: 0,
    workMinutes: workMins,
    isManual: true,
    note: manualNote.value,
    createdAt: record.value?.createdAt || dayjs().toISOString(),
  }
  await saveRecord(newRecord)
  showManualInput.value = false
  await loadData()
}

async function handleLeaveSave() {
  await saveLeave({
    date: date.value,
    type: leaveForm.value.type,
    hours: Number(leaveForm.value.hours),
    isFullDay: leaveForm.value.isFullDay,
    note: leaveForm.value.note,
  })
  showLeaveInput.value = false
  await loadData()
}

// 请假删除二次确认（内联，不用 confirm()）
const pendingDeleteLeaveId = ref<number | null>(null)

async function doDeleteLeave(id: number) {
  await deleteLeave(id)
  pendingDeleteLeaveId.value = null
  await loadData()
}

async function handleDeleteDayRecord() {
  if (!confirm(`确认删除 ${dateDisplay.value} 的打卡记录？此操作不可恢复。`)) return
  await deleteRecordByDate(date.value)
  await loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.day-detail-page {
  background: var(--jishi-bg, #f7f8fa);
  min-height: 100%;
  padding-bottom: 32px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #ebedf0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  background: none;
  border: none;
  font-size: 17px;
  color: #1989fa;
  cursor: pointer;
  padding: 4px 8px;
  width: 60px;
  text-align: left;
}

.page-title {
  font-size: 15px;
  font-weight: 600;
}

.section {
  margin: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 10px;
}

.icon-btn {
  background: none;
  border: 1px solid #1989fa;
  color: #1989fa;
  border-radius: 12px;
  padding: 2px 10px;
  font-size: 12px;
  cursor: pointer;
}

.info-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.info-row {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #f5f5f5;
}
.info-row:last-child { border-bottom: none; }

.info-label {
  font-size: 14px;
  color: #666;
  width: 72px;
  flex-shrink: 0;
}

.info-value {
  flex: 1;
  font-size: 14px;
  color: #323233;
  font-weight: 500;
}

.info-value.highlight {
  color: #1989fa;
  font-weight: 600;
}

.info-value.tag {
  background: #fff7e6;
  color: #fa8c16;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 12px;
}

.delete-btn {
  background: none;
  border: none;
  color: #ee0a24;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  flex-shrink: 0;
}

.confirm-del-btn {
  background: #ee0a24;
  border: none;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 12px;
  flex-shrink: 0;
}

.cancel-del-btn {
  background: #f5f5f5;
  border: none;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 12px;
  margin-left: 4px;
  flex-shrink: 0;
}

.empty-text {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.leave-tip {
  margin-top: 8px;
  padding: 8px 12px;
  background: #f0fff4;
  border-radius: 8px;
  color: #07c160;
  font-size: 13px;
}

.btn-group {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.btn {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 22px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}
.btn-primary { background: #1989fa; color: #fff; }
.btn-danger  { background: #fff; color: #ee0a24; border: 1px solid #ee0a24; }
.btn-default { background: #f5f5f5; color: #333; }

/* Modal */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.modal-box {
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 24px 20px 40px;
  width: 100%;
  max-width: 480px;
}

.modal-title {
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 20px;
  text-align: center;
}

.form-item {
  margin-bottom: 16px;
}

.form-item label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}

.time-input, .text-input, .select-input {
  width: 100%;
  height: 44px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 16px;
  background: #fafafa;
  box-sizing: border-box;
  color: #323233;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #323233;
}

.toggle-desc {
  font-size: 12px;
  color: #999;
  flex: 1;
}

.toggle-check {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.preview-minutes {
  text-align: center;
  color: #1989fa;
  font-size: 14px;
  margin: -8px 0 12px;
}

.modal-btns {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}
</style>
