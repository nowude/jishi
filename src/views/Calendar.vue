<template>
  <div class="calendar-page">
    <!-- 月份导航 -->
    <div class="month-nav">
      <van-icon name="arrow-left" size="20" @click="prevMonth" />
      <div class="month-title" @click="goToday">
        {{ year }}年{{ month }}月
      </div>
      <van-icon name="arrow" size="20" @click="nextMonth" />
    </div>

    <!-- 星期头 -->
    <div class="weekday-header">
      <div v-for="w in weekdays" :key="w" class="weekday-cell">{{ w }}</div>
    </div>

    <!-- 日历网格 -->
    <div class="calendar-grid">
      <div
        v-for="day in days"
        :key="day.date"
        class="day-cell"
        :class="{
          'other-month': !day.isCurrentMonth,
          'today': day.isToday,
          'is-friday': day.isFriday && day.isCurrentMonth,
        }"
        @click="goDayDetail(day)"
      >
        <div class="day-number">
          {{ day.day }}
          <span v-if="day.isFriday && day.isCurrentMonth" class="fri-badge">五</span>
        </div>
        <div
          v-if="day.displayText && day.isCurrentMonth"
          class="day-work"
          :class="day.status"
        >
          {{ day.displayText }}
        </div>
        <div v-if="day.hasLeave && day.isCurrentMonth" class="day-leave">
          假
        </div>
      </div>
    </div>

    <!-- 图例 -->
    <div class="legend">
      <span class="legend-item"><i class="dot normal" />达标</span>
      <span class="legend-item"><i class="dot meet_avg" />周均达标</span>
      <span class="legend-item"><i class="dot below_avg" />未达标</span>
      <span class="legend-item"><i class="dot overtime" />加班</span>
      <span class="legend-item"><i class="dot leave" />请假</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCalendar, type CalendarDay } from '@/composables/useCalendar'

const router = useRouter()
const { year, month, days, loadMonth, prevMonth, nextMonth, goToday } = useCalendar()

const weekdays = ['一', '二', '三', '四', '五', '六', '日']

function goDayDetail(day: CalendarDay) {
  if (!day.isCurrentMonth) return
  router.push(`/day/${day.date}`)
}

onMounted(() => {
  loadMonth()
})
</script>

<style scoped>
.calendar-page {
  padding: 16px;
  padding-top: calc(16px + var(--safe-top, 0px));
  background: var(--jishi-bg);
  min-height: 100%;
}

.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  margin-bottom: 12px;
}

.month-title {
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
}

.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 4px;
}

.weekday-cell {
  font-size: 13px;
  color: var(--jishi-text-secondary);
  padding: 8px 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  background: var(--jishi-card, #fff);
  border-radius: 12px;
  padding: 8px 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.day-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 2px;
  min-height: 56px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.day-cell:active {
  background: #f0f0f0;
}

.day-cell.other-month {
  opacity: 0.3;
}

.day-cell.today .day-number {
  background: var(--jishi-primary);
  color: white;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.day-cell.is-friday {
  border-left: 2px solid var(--jishi-primary);
  padding-left: 0;
}

.day-number {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.fri-badge {
  font-size: 8px;
  color: var(--jishi-primary);
  font-weight: 400;
}

.day-work {
  font-size: 10px;
  font-weight: 600;
  border-radius: 4px;
  padding: 1px 4px;
}

.day-work.normal {
  color: var(--jishi-success);
}

.day-work.meet_avg {
  color: var(--jishi-success);
  background: rgba(7, 193, 96, 0.1);
}

.day-work.below_avg {
  color: var(--jishi-warning);
  background: rgba(255, 151, 106, 0.1);
}

.day-work.overtime {
  color: var(--jishi-primary);
}

.day-work.undertime {
  color: var(--jishi-warning);
}

.day-leave {
  font-size: 10px;
  color: #999;
  background: #f5f5f5;
  border-radius: 4px;
  padding: 1px 4px;
}

.legend {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
  font-size: 11px;
  color: var(--jishi-text-secondary);
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 3px;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot.normal { background: var(--jishi-success); }
.dot.meet_avg { background: var(--jishi-success); }
.dot.below_avg { background: var(--jishi-warning); }
.dot.overtime { background: var(--jishi-primary); }
.dot.leave { background: #999; }
</style>
