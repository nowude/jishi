<template>
  <div class="home-page">
    <!-- 顶部 Header -->
    <div class="header">
      <div class="header-top">
        <div class="brand">
          <span class="brand-icon">⏱</span>
          <span class="brand-name">积时</span>
        </div>
        <div class="header-date">
          <div class="date-main">{{ dateDisplay }}</div>
          <div class="date-sub">{{ weekdayDisplay }}</div>
        </div>
      </div>

      <!-- 实时工时显示 -->
      <div class="timer-hero">
        <div class="timer-label">{{ timerLabel }}</div>
        <div class="timer-value">{{ workTimeDisplay }}</div>
        <div v-if="hasClockedIn && !hasClockedOut" class="timer-sub">
          {{ clockInTime }} 打卡 · 实时计算中
        </div>
        <div v-else-if="hasClockedOut" class="timer-sub">
          {{ clockInTime }} — {{ clockOutTime }}
        </div>
        <div v-else class="timer-sub">今天还没打卡</div>
      </div>
    </div>

    <!-- 打卡按钮 -->
    <div class="clock-section">
      <button
        v-if="!hasClockedIn"
        class="clock-btn clock-in"
        @click="handleClockIn"
      >
        <span class="clock-btn-icon">☀️</span>
        <span class="clock-btn-text">上班打卡</span>
      </button>
      <button
        v-else-if="!hasClockedOut"
        class="clock-btn clock-out"
        @click="handleClockOut"
      >
        <span class="clock-btn-icon">🌙</span>
        <span class="clock-btn-text">下班签退</span>
      </button>
      <div v-else class="clocked-done">
        <span>✓</span> 今日已完成打卡
      </div>
    </div>

    <!-- 四格统计 -->
    <div class="stats-grid">
      <div class="stat-cell">
        <div class="stat-num" :class="weeklyTotalMinutes > 0 ? 'purple' : 'muted'">
          {{ weeklyTotalDisplay }}
        </div>
        <div class="stat-lbl">本周累计</div>
      </div>
      <div class="stat-cell">
        <div class="stat-num" :class="monthlyTotalMinutes > 0 ? 'purple' : 'muted'">
          {{ monthlyTotalDisplay }}
        </div>
        <div class="stat-lbl">本月累计</div>
      </div>
      <div class="stat-cell">
        <div class="stat-num" :class="todayRemaining <= 0 ? 'green' : 'orange'">
          {{ todayRemainingDisplay }}
        </div>
        <div class="stat-lbl">今日还需</div>
      </div>
      <div class="stat-cell">
        <div class="stat-num" :class="weekRemaining <= 0 ? 'green' : 'orange'">
          {{ weekRemainingDisplay }}
        </div>
        <div class="stat-lbl">本周还需</div>
      </div>
    </div>

    <!-- 今日进度条 -->
    <div class="progress-section">
      <div class="progress-header">
        <span>今日进度</span>
        <span class="progress-pct">{{ todayProgressPct }}%</span>
      </div>
      <div class="progress-track">
        <div
          class="progress-fill"
          :style="{ width: Math.min(100, todayProgressPct) + '%' }"
          :class="{ done: todayProgressPct >= 100 }"
        />
      </div>
      <div class="progress-footer">
        <span>0h</span>
        <span>{{ avgRequiredHoursNum }}h 目标</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useClock } from '@/composables/useClock'
import { dayjs, formatMinutes, getWeekRange, getMonthRange, getTotalWorkdaysThisWeek } from '@/utils/time'
import { calcPeriodStats, getAllSettings, getRecord, getLeavesForDate } from '@/stores'
import { showToast } from 'vant'

const {
  clockInTime, clockOutTime, hasClockedIn, hasClockedOut,
  workTimeDisplay, currentWorkMinutes, clockIn, clockOut, init, stopTicking,
} = useClock()

const dateDisplay = computed(() => dayjs().format('M月D日'))
const weekdayDisplay = computed(() => {
  const days = ['周日','周一','周二','周三','周四','周五','周六']
  return days[dayjs().day()] + ' · ' + dayjs().format('YYYY')
})

const timerLabel = computed(() => {
  if (!hasClockedIn.value) return '今日工时'
  if (!hasClockedOut.value) return '已工作'
  return '今日工时'
})

// 统计
const weeklyTotalMinutes = ref(0)
const monthlyTotalMinutes = ref(0)
const todayRemaining = ref(0)
const weekRemaining = ref(0)
const avgRequiredMinutes = ref(11.5 * 60)
const avgRequiredHoursNum = ref(11.5)

const weeklyTotalDisplay = computed(() => formatMinutes(weeklyTotalMinutes.value))
const monthlyTotalDisplay = computed(() => formatMinutes(monthlyTotalMinutes.value))
const todayRemainingDisplay = computed(() => todayRemaining.value <= 0 ? '已达标 ✓' : formatMinutes(todayRemaining.value))
const weekRemainingDisplay = computed(() => weekRemaining.value <= 0 ? '已达标 ✓' : formatMinutes(weekRemaining.value))

const todayProgressPct = computed(() => {
  const worked = hasClockedOut.value
    ? (currentWorkMinutes.value || 0)
    : currentWorkMinutes.value
  if (avgRequiredMinutes.value === 0) return 0
  return Math.round((worked / avgRequiredMinutes.value) * 100)
})

async function loadQuickStats() {
  const settings = await getAllSettings()
  const avgReq = Number(settings.avgRequiredHours || '11.5')
  avgRequiredHoursNum.value = avgReq
  avgRequiredMinutes.value = avgReq * 60

  const week = getWeekRange()
  const month = getMonthRange()
  const workdays = settings.workdays ?? '1,2,3,4,5'

  const [weekStats, monthStats] = await Promise.all([
    calcPeriodStats(week.start, week.end, workdays),
    calcPeriodStats(month.start, month.end, workdays),
  ])

  weeklyTotalMinutes.value = weekStats.totalMinutes
  monthlyTotalMinutes.value = monthStats.totalMinutes

  const todayStr = dayjs().format('YYYY-MM-DD')
  const [todayRecord, todayLeaves] = await Promise.all([
    getRecord(todayStr),
    getLeavesForDate(todayStr),
  ])
  const hasTodayLeave = todayLeaves.some((l: { isFullDay: boolean }) => l.isFullDay)
  let todayWorked = 0
  if (!hasTodayLeave) {
    if (todayRecord?.workMinutes) todayWorked = todayRecord.workMinutes
    else if (hasClockedIn.value && !hasClockedOut.value) todayWorked = currentWorkMinutes.value
  }
  todayRemaining.value = hasTodayLeave ? 0 : Math.max(0, avgRequiredMinutes.value - todayWorked)

  const totalWorkdays = getTotalWorkdaysThisWeek(workdays)
  weekRemaining.value = Math.max(0, totalWorkdays * avgRequiredMinutes.value - weekStats.totalMinutes)
}

async function handleClockIn() {
  await clockIn()
  showToast('上班打卡成功 ☀️')
  loadQuickStats()
}

async function handleClockOut() {
  await clockOut()
  stopTicking()
  showToast('下班签退成功 🌙')
  loadQuickStats()
}

let refreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  init()
  loadQuickStats()
  refreshTimer = setInterval(() => {
    if (hasClockedIn.value && !hasClockedOut.value) {
      todayRemaining.value = Math.max(0, avgRequiredMinutes.value - currentWorkMinutes.value)
    }
  }, 30000)
})

onUnmounted(() => {
  stopTicking()
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.home-page {
  min-height: 100%;
  background: var(--ji-bg, #f1f5f9);
  padding-bottom: 24px;
}

/* Header */
.header {
  background: linear-gradient(145deg, #6366f1 0%, #8b5cf6 60%, #a855f7 100%);
  padding: 16px 20px 32px;
  padding-top: calc(16px + var(--safe-top, 0px));
  color: white;
  position: relative;
  overflow: hidden;
}

.header::before {
  content: '';
  position: absolute;
  top: -40px;
  right: -40px;
  width: 200px;
  height: 200px;
  background: rgba(255,255,255,0.05);
  border-radius: 50%;
}

.header::after {
  content: '';
  position: absolute;
  bottom: -60px;
  left: -30px;
  width: 160px;
  height: 160px;
  background: rgba(255,255,255,0.04);
  border-radius: 50%;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}

.brand {
  display: flex;
  align-items: center;
  gap: 6px;
}

.brand-icon { font-size: 20px; }
.brand-name {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
}

.header-date { text-align: right; }
.date-main { font-size: 18px; font-weight: 600; }
.date-sub { font-size: 12px; opacity: 0.75; margin-top: 2px; }

.timer-hero {
  text-align: center;
  position: relative;
  z-index: 1;
}

.timer-label {
  font-size: 13px;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.timer-value {
  font-size: 52px;
  font-weight: 800;
  letter-spacing: -1px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.timer-sub {
  font-size: 13px;
  opacity: 0.7;
  margin-top: 8px;
}

/* 打卡按钮 */
.clock-section {
  display: flex;
  justify-content: center;
  margin-top: -22px;
  position: relative;
  z-index: 10;
  padding: 0 24px;
}

.clock-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 48px;
  border: none;
  border-radius: 50px;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  transition: transform 0.15s, box-shadow 0.15s;
  letter-spacing: 1px;
}

.clock-btn:active {
  transform: scale(0.96);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.clock-in {
  background: linear-gradient(135deg, #ffffff, #f0f4ff);
  color: #6366f1;
}

.clock-out {
  background: linear-gradient(135deg, #1e293b, #334155);
  color: #f1f5f9;
}

.clock-btn-icon { font-size: 20px; }

.clocked-done {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1.5px solid rgba(16, 185, 129, 0.3);
  border-radius: 50px;
  padding: 14px 36px;
  font-size: 15px;
  font-weight: 600;
}

/* 四格统计 */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 20px 16px 0;
}

.stat-cell {
  background: var(--ji-card, #fff);
  border-radius: 16px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
  border: 1px solid rgba(0,0,0,0.04);
}

.stat-num {
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.stat-num.purple { color: #6366f1; }
.stat-num.green  { color: #10b981; }
.stat-num.orange { color: #f59e0b; }
.stat-num.muted  { color: #94a3b8; }

.stat-lbl {
  font-size: 11px;
  color: var(--ji-text-sec, #64748b);
  margin-top: 4px;
}

/* 进度条 */
.progress-section {
  margin: 12px 16px 0;
  background: var(--ji-card, #fff);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
  border: 1px solid rgba(0,0,0,0.04);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--ji-text-sec, #64748b);
  margin-bottom: 10px;
}

.progress-pct {
  font-weight: 600;
  color: #6366f1;
}

.progress-track {
  height: 8px;
  background: #f1f5f9;
  border-radius: 99px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #6366f1, #a855f7);
  transition: width 0.4s ease;
}

.progress-fill.done {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.progress-footer {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #94a3b8;
  margin-top: 6px;
}
</style>
