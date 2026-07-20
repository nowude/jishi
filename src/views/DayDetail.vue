<template>
  <div class="day-detail-page">
    <van-nav-bar
      :title="dateDisplay"
      left-arrow
      @click-left="router.back()"
    />

    <!-- 打卡信息 -->
    <div class="section">
      <div class="section-title">打卡记录</div>
      <van-cell-group inset>
        <van-cell title="上班打卡" :value="record?.clockIn || '未打卡'" />
        <van-cell title="下班签退" :value="record?.clockOut || '未签退'" />
        <van-cell title="实际工时" :value="workTimeDisplay" />
        <van-cell v-if="record?.isManual" title="补录标记" value="手动补录" />
        <van-cell title="备注" :value="record?.note || '无'" />
        <van-cell
          v-if="record"
          title="删除当日打卡记录"
          is-link
          class="danger-cell"
          @click="handleDeleteDayRecord"
        >
          <template #right-icon>
            <van-icon name="delete-o" color="#ee0a24" />
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 操作按钮 -->
      <div class="actions">
        <van-button
          v-if="!record"
          type="primary"
          round
          block
          icon="edit"
          @click="showManualInput = true"
        >
          补录打卡
        </van-button>
        <van-button
          v-else
          type="default"
          round
          block
          icon="edit"
          @click="showManualInput = true"
        >
          编辑记录
        </van-button>
      </div>
    </div>

    <!-- 请假信息 -->
    <div class="section">
      <div class="section-title">
        请假记录
        <van-icon name="add-o" size="18" @click="showLeaveInput = true" />
      </div>
      <van-cell-group inset>
        <van-empty v-if="leaves.length === 0" description="无请假记录" image="search" />
        <van-cell
          v-for="leave in leaves"
          :key="leave.id"
          :title="leaveTypeLabel(leave.type)"
          :value="leave.isFullDay ? '全天' : `${leave.hours}小时`"
          :label="leave.note || undefined"
        >
          <template #right-icon>
            <van-icon name="delete-o" @click="handleDeleteLeave(leave.id!)" />
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 补录弹窗 -->
    <van-dialog
      v-model:show="showManualInput"
      title="补录打卡"
      show-cancel-button
      @confirm="handleManualSave"
    >
      <div class="manual-form">
        <van-field v-model="manualClockIn" label="上班时间" placeholder="09:00" />
        <van-field v-model="manualClockOut" label="下班时间" placeholder="18:00" />
        <van-field v-model="manualNote" label="备注" placeholder="可选" />
      </div>
    </van-dialog>

    <!-- 请假弹窗 -->
    <van-dialog
      v-model:show="showLeaveInput"
      title="添加请假"
      show-cancel-button
      @confirm="handleLeaveSave"
    >
      <div class="manual-form">
        <van-field v-model="leaveForm.type" label="类型" placeholder="annual/sick/personal/compensatory" />
        <van-field v-model="leaveForm.hours" label="时长(小时)" type="number" placeholder="8" />
        <van-cell title="全天请假">
          <template #right-icon>
            <van-switch v-model="leaveForm.isFullDay" size="18" />
          </template>
        </van-cell>
        <van-field v-model="leaveForm.note" label="备注" placeholder="可选" />
      </div>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRecord, saveRecord, getLeavesForDate, saveLeave, deleteLeave, deleteRecordByDate, deleteLeavesByDate } from '@/stores'
import { calcWorkMinutes, formatMinutes, dayjs } from '@/utils/time'
import { showToast, showConfirmDialog } from 'vant'
import type { ClockRecord, LeaveRecord } from '@/db'

const route = useRoute()
const router = useRouter()
const date = computed(() => route.params.date as string)
const dateDisplay = computed(() => dayjs(date.value).format('YYYY年M月D日'))

const record = ref<ClockRecord | undefined>()
const leaves = ref<LeaveRecord[]>([])

const workTimeDisplay = computed(() => {
  if (!record.value || !record.value.clockOut) return '--'
  return formatMinutes(record.value.workMinutes)
})

// 补录表单
const showManualInput = ref(false)
const manualClockIn = ref('09:00')
const manualClockOut = ref('18:00')
const manualNote = ref('')

// 请假表单
const showLeaveInput = ref(false)
const leaveForm = ref({
  type: 'annual',
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

async function loadData() {
  record.value = await getRecord(date.value)
  leaves.value = await getLeavesForDate(date.value)
  if (record.value) {
    manualClockIn.value = record.value.clockIn
    manualClockOut.value = record.value.clockOut || '18:00'
    manualNote.value = record.value.note
  }
}

async function handleManualSave() {
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
  showToast('保存成功')
  loadData()
}

async function handleLeaveSave() {
  await saveLeave({
    date: date.value,
    type: leaveForm.value.type as LeaveRecord['type'],
    hours: Number(leaveForm.value.hours),
    isFullDay: leaveForm.value.isFullDay,
    note: leaveForm.value.note,
  })
  showToast('请假已添加')
  leaveForm.value = { type: 'annual', hours: '8', isFullDay: true, note: '' }
  loadData()
}

async function handleDeleteLeave(id: number) {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: '确定要删除这条请假记录吗？',
      confirmButtonText: '删除',
      confirmButtonColor: '#ee0a24',
    })
    await deleteLeave(id)
    showToast('已删除')
    loadData()
  } catch {
    // 用户取消
  }
}

async function handleDeleteDayRecord() {
  try {
    await showConfirmDialog({
      title: '删除当日打卡记录',
      message: `确定要删除 ${dateDisplay.value} 的所有打卡和请假记录吗？此操作不可恢复。`,
      confirmButtonText: '确认删除',
      confirmButtonColor: '#ee0a24',
    })
    await deleteRecordByDate(date.value)
    await deleteLeavesByDate(date.value)
    showToast('当日记录已清除')
    loadData()
  } catch {
    // 用户取消
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.day-detail-page {
  background: var(--jishi-bg);
  min-height: 100%;
  padding-bottom: 20px;
}

.danger-cell :deep(.van-cell__title) {
  color: var(--jishi-danger);
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
  margin-bottom: 8px;
  padding: 0 4px;
}

.actions {
  padding: 12px 16px;
}

.action-row {
  display: flex;
  gap: 8px;
}

.action-row :deep(.van-button) {
  flex: 1;
}

.manual-form {
  padding: 16px;
}
</style>
