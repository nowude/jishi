<template>
  <div class="home-page">
    <!-- 顶部日期 -->
    <div class="date-header">
      <div class="date-text">{{ dateDisplay }}</div>
      <div class="weekday-text">{{ weekdayDisplay }}</div>
    </div>

    <!-- 打卡状态卡片 -->
    <div class="clock-card">
      <div class="clock-status">
        <div class="status-row">
          <span class="label">上班</span>
          <span class="time" :class="{ active: hasClockedIn }">
            {{ clockInTime || '--:--' }}
          </span>
          <van-icon v-if="hasClockedIn" name="success" color="#07c160" size="18" />
        </div>
        <div class="divider" />
        <div class="status-row">
          <span class="label">下班</span>
          <span class="time" :class="{ active: hasClockedOut }">
            {{ clockOutTime || '--:--' }}
          </span>
          <van-icon v-if="hasClockedOut" name="success" color="#07c160" size="18" />
        </div>
      </div>

      <div v-if="hasClockedIn && !hasClockedOut" class="realtime-work">
        <div class="pulse-dot" />
        <span>已工作 {{ workTimeDisplay }}</span>
      </div>
      <div v-else-if="hasClockedOut" class="total-work">
        今日工时: {{ workTimeDisplay }}
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <van-button
        v-if="!hasClockedIn"
        type="primary"
        size="large"
        round
        icon="clock-o"
        @click="handleClockIn"
      >
        上班打卡
      </van-button>
      <van-button
        v-else-if="!hasClockedOut"
        type="success"
        size="large"
        round
        icon="clock-o"
        @click="handleClockOut"
      >
        下班签退
      </van-button>
      <van-button
        v-else
        type="default"
        size="large"
        round
        icon="passed"
        disabled
      >
        今日已签退
      </van-button>
    </div>

    <!-- 工时统计卡片 -->
    <div class="stats-card">
      <div class="stats-title">工时概览</div>

      <!-- 累计工时行 -->
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-value primary">{{ weeklyTotalDisplay }}</span>
          <span class="stat-label">本周累计</span>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <span class="stat-value primary">{{ monthlyTotalDisplay }}</span>
          <span class="stat-label">本月累计</span>
        </div>
      </div>

      <div class="stats-separator" />

      <!-- 还需工时行 -->
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-value" :class="todayRemaining <= 0 ? 'success' : 'warning'">
            {{ todayRemainingDisplay }}
          </span>
          <span class="stat-label">今日还需</span>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <span class="stat-value" :class="weekRemaining <= 0 ? 'success' : 'warning'">
            {{ weekRemainingDisplay }}
          </span>
          <span class="stat-label">本周还需</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useClock } from '@/composables/useClock'
import { dayjs, formatMinutes, getWeekRange, getMonthRange, getTotalWorkdaysThisWeek } from '@/utils/time'
import { calcPeriodStats, getAllSettings, getRecord } from '@/stores'
import { showToast } from 'vant'

const {
  clockInTime, clockOutTime, hasClockedIn, hasClockedOut,
  workTimeDisplay, currentWorkMinutes, clockIn, clockOut, init, stopTicking,
} = useClock()

const dateDisplay = computed(() => dayjs().format('YYYY年M月D日'))
const weekdayDisplay = computed(() => {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return weekdays[dayjs().day()]
})

// 统计数据
const weeklyTotalMinutes = ref(0)
const monthlyTotalMinutes = ref(0)
const todayRemaining = ref(0)  // 今日还需（分钟）
const weekRemaining = ref(0)   // 本周还需（分钟）
const dailyStandardMinutes = ref(480) // 日标准工时（分钟）
const avgRequiredMinutes = ref(480)   // 平均工时要求（分钟）

const weeklyTotalDisplay = computed(() => formatMinutes(weeklyTotalMinutes.value))
const monthlyTotalDisplay = computed(() => formatMinutes(monthlyTotalMinutes.value))
const todayRemainingDisplay = computed(() => {
  if (todayRemaining.value <= 0) return '已达标'
  return formatMinutes(todayRemaining.value)
})
const weekRemainingDisplay = computed(() => {
  if (weekRemaining.value <= 0) return '已达标'
  return formatMinutes(weekRemaining.value)
})

async function loadQuickStats() {
  const settings = await getAllSettings()
  const dailyStd = Number(settings.dailyStandardHours) || 8
  const avgReq = Number(settings.avgRequiredHours) || dailyStd
  dailyStandardMinutes.value = dailyStd * 60
  avgRequiredMinutes.value = avgReq * 60

  const week = getWeekRange()
  const month = getMonthRange()
  const workdays = settings.workdays ?? '1,2,3,4,5'

  const weekStats = await calcPeriodStats(week.start, week.end, workdays)
  const monthStats = await calcPeriodStats(month.start, month.end, workdays)

  weeklyTotalMinutes.value = weekStats.totalMinutes
  monthlyTotalMinutes.value = monthStats.totalMinutes

  // 今日还需 = 日均要求 - 已工作（请假全天则为0）
  const todayRecord = await getRecord(dayjs().format('YYYY-MM-DD'))
  const { getLeavesForDate } = await import('@/stores')
  const todayLeaves = await getLeavesForDate(dayjs().format('YYYY-MM-DD'))
  const hasTodayFullLeave = todayLeaves.some((l: { isFullDay: boolean }) => l.isFullDay)
  let todayWorked = 0
  if (!hasTodayFullLeave) {
    if (todayRecord?.workMinutes) {
      todayWorked = todayRecord.workMinutes
    } else if (hasClockedIn.value && !hasClockedOut.value) {
      todayWorked = currentWorkMinutes.value
    }
  }
  todayRemaining.value = hasTodayFullLeave ? 0 : Math.max(0, avgRequiredMinutes.value - todayWorked)

  // 本周还需 = (周工作日数 × 日均要求) - 本周已累计
  const totalWorkdays = getTotalWorkdaysThisWeek(workdays)
  const weekRequiredTotal = totalWorkdays * avgRequiredMinutes.value
  weekRemaining.value = Math.max(0, weekRequiredTotal - weekStats.totalMinutes)
}

async function handleClockIn() {
  await clockIn()
  showToast('上班打卡成功')
  loadQuickStats()
}

async function handleClockOut() {
  await clockOut()
  stopTicking()
  showToast('下班签退成功')
  loadQuickStats()
}

onMounted(() => {
  init()
  loadQuickStats()
})

onUnmounted(() => {
  stopTicking()
})

// 每分钟刷新实时数据
let refreshTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  refreshTimer = setInterval(() => {
    if (hasClockedIn.value && !hasClockedOut.value) {
      // 更新今日还需
      const todayWorked = currentWorkMinutes.value
      todayRemaining.value = Math.max(0, avgRequiredMinutes.value - todayWorked)
    }
  }, 30000) // 30秒刷新
})
onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.home-page {
  padding: 20px 16px;
  padding-top: calc(20px + var(--safe-top, 0px));
  min-height: 100%;
  background: linear-gradient(180deg, #1989fa 0%, #f7f8fa 40%);
}

.date-header {
  text-align: center;
  color: white;
  padding: 16px 0 24px;
}

.date-text {
  font-size: 20px;
  font-weight: 600;
}

.weekday-text {
  font-size: 14px;
  opacity: 0.85;
  margin-top: 4px;
}

.clock-card {
  background: var(--jishi-card, #fff);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.clock-status {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-row .label {
  font-size: 14px;
  color: var(--jishi-text-secondary);
  width: 36px;
}

.status-row .time {
  font-size: 28px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--jishi-text-secondary);
  flex: 1;
}

.status-row .time.active {
  color: var(--jishi-text);
}

.divider {
  height: 1px;
  background: #ebedf0;
  margin: 0 -4px;
}

.realtime-work {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebedf0;
  font-size: 15px;
  color: var(--jishi-primary);
  font-weight: 500;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--jishi-primary);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.total-work {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebedf0;
  font-size: 15px;
  color: var(--jishi-success);
  font-weight: 500;
}

.action-buttons {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

.action-buttons :deep(.van-button) {
  width: 200px;
  height: 48px;
  font-size: 16px;
}

/* 工时统计卡片 */
.stats-card {
  margin-top: 20px;
  background: var(--jishi-card, #fff);
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.stats-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--jishi-text);
}

.stats-row {
  display: flex;
  align-items: center;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.stat-value.primary {
  color: var(--jishi-primary);
}

.stat-value.warning {
  color: var(--jishi-warning);
}

.stat-value.success {
  color: var(--jishi-success);
}

.stat-label {
  font-size: 12px;
  color: var(--jishi-text-secondary);
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: #ebedf0;
}

.stats-separator {
  height: 1px;
  background: #ebedf0;
  margin: 12px 0;
}
</style>
