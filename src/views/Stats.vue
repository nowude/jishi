<template>
  <div class="stats-page">
    <!-- 周期切换 -->
    <div class="period-tabs">
      <button
        v-for="p in periods"
        :key="p.value"
        class="tab-btn"
        :class="{ active: period === p.value }"
        @click="setPeriod(p.value)"
      >{{ p.label }}</button>
    </div>

    <!-- 期间导航 -->
    <div class="period-nav">
      <button class="nav-btn" @click="navigate(-1)">‹</button>
      <div class="period-label">{{ periodLabel }}</div>
      <button class="nav-btn" @click="navigate(1)">›</button>
    </div>

    <!-- 统计卡片 -->
    <div v-if="stats" class="stats-cards">
      <div class="stat-card primary">
        <div class="card-value">{{ formatMinutes(stats.avgMinutes) }}</div>
        <div class="card-label">日均工时</div>
        <div class="card-sub">
          共 {{ stats.actualWorkdays }} 个出勤日 · 请假 {{ stats.leaveDays }} 天
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-card small">
          <div class="card-value blue">{{ formatMinutesShort(stats.totalMinutes) }}</div>
          <div class="card-label">累计工时</div>
        </div>
        <div class="stat-card small">
          <div class="card-value blue">{{ stats.actualWorkdays }}</div>
          <div class="card-label">出勤天数</div>
        </div>
        <div class="stat-card small">
          <div class="card-value blue">{{ stats.workdays }}</div>
          <div class="card-label">工作日数</div>
        </div>
      </div>
    </div>

    <!-- 图表 -->
    <div class="chart-section">
      <div class="chart-title">工时趋势</div>

      <div v-if="loading" class="chart-loading">计算中...</div>
      <div v-else-if="chartItems.length === 0" class="chart-empty">
        暂无打卡数据，去首页打卡或日历补录吧
      </div>
      <div v-else class="bar-chart" :class="{ dense: chartItems.length > 10 }">
        <div
          v-for="(item, i) in chartItems"
          :key="i"
          class="bar-col"
        >
          <div class="bar-label-top">{{ item.label }}</div>
          <div class="bar-wrap">
            <div
              class="bar-fill"
              :class="{
                leave: item.isLeave,
                zero: item.minutes === 0 && !item.isLeave,
                met: item.minutes > 0 && item.isMet,
                unmet: item.minutes > 0 && !item.isMet && !item.isLeave,
              }"
              :style="{ height: barHeight(item.minutes) + 'px' }"
            />
            <div
              v-if="avgLineHeight > 0"
              class="standard-line"
              :style="{ bottom: avgLineHeight + 'px' }"
            />
          </div>
          <div class="bar-label-bottom">{{ item.name }}</div>
        </div>
      </div>

      <div class="chart-legend">
        <span><span class="dot met"></span>达标</span>
        <span><span class="dot unmet"></span>未达标</span>
        <span><span class="dot leave"></span>请假/无</span>
        <span><span class="line-mark"></span>日均要求</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useStats, type StatsPeriod } from '@/composables/useStats'
import { formatMinutes, formatMinutesShort } from '@/utils/time'

const { period, stats, periodLabel, loading, chartItems, avgRequiredMinutes, setPeriod, navigate, refresh } = useStats()

const periods: { value: StatsPeriod; label: string }[] = [
  { value: 'week', label: '本周' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
]

const BAR_MAX_H = 120

// 找出最大分钟数，用于动态计算柱高
const maxMinutes = computed(() => {
  const dataMax = chartItems.value.reduce((m, i) => Math.max(m, i.minutes), 0)
  return Math.max(dataMax, avgRequiredMinutes.value)
})

function barHeight(minutes: number): number {
  if (maxMinutes.value === 0) return 0
  return Math.round((minutes / maxMinutes.value) * BAR_MAX_H)
}

const avgLineHeight = computed(() => {
  if (maxMinutes.value === 0) return 0
  return Math.round((avgRequiredMinutes.value / maxMinutes.value) * BAR_MAX_H)
})

onMounted(() => refresh())
</script>

<style scoped>
.stats-page {
  padding: 16px;
  padding-top: calc(16px + var(--safe-top, 0px));
  background: var(--jishi-bg, #f7f8fa);
  min-height: 100%;
}

.period-tabs {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 16px;
}
.tab-btn {
  padding: 6px 20px;
  border-radius: 20px;
  border: 1px solid #ddd;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
  color: #666;
}
.tab-btn.active {
  background: #1989fa;
  border-color: #1989fa;
  color: #fff;
}

.period-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  margin-bottom: 16px;
}
.nav-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: #fff;
  border-radius: 50%;
  font-size: 22px;
  cursor: pointer;
  color: #1989fa;
  box-shadow: 0 1px 6px rgba(0,0,0,0.1);
}
.period-label {
  font-size: 15px;
  font-weight: 600;
}

.stats-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}
.stat-card {
  background: var(--jishi-card, #fff);
  border-radius: 12px;
  padding: 18px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.stat-card.primary {
  background: linear-gradient(135deg, #1989fa, #0a6ebd);
  color: #fff;
}
.stat-card.primary .card-sub { color: rgba(255,255,255,0.75); }
.card-value { font-size: 26px; font-weight: 700; }
.card-value.blue { color: #1989fa; }
.card-label { font-size: 13px; margin-top: 4px; opacity: 0.9; }
.card-sub { font-size: 12px; margin-top: 6px; }
.stats-row { display: flex; gap: 10px; }
.stat-card.small { flex: 1; padding: 14px 8px; }
.stat-card.small .card-value { font-size: 20px; }

/* 图表 */
.chart-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px 12px 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.chart-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
}
.chart-loading, .chart-empty {
  text-align: center;
  padding: 32px 20px;
  color: #999;
  font-size: 14px;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  min-height: 150px;
}
.bar-chart.dense {
  gap: 2px;
}

.bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  min-width: 36px;
}
.bar-chart.dense .bar-col {
  min-width: 24px;
}

.bar-label-top {
  font-size: 9px;
  color: #666;
  height: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 36px;
}

.bar-wrap {
  position: relative;
  width: 22px;
  height: 120px;
  display: flex;
  align-items: flex-end;
}
.bar-chart.dense .bar-wrap {
  width: 16px;
}

.bar-fill {
  width: 100%;
  border-radius: 4px 4px 0 0;
  min-height: 3px;
  transition: height 0.3s ease;
}
.bar-fill.met   { background: #07c160; }
.bar-fill.unmet { background: #ff976a; }
.bar-fill.leave { background: #c8c9cc; }
.bar-fill.zero  { background: #ebedf0; }

.standard-line {
  position: absolute;
  left: -4px;
  right: -4px;
  height: 2px;
  background: #ee0a24;
  opacity: 0.6;
  pointer-events: none;
}

.bar-label-bottom {
  font-size: 10px;
  color: #999;
  white-space: nowrap;
}

.chart-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  font-size: 11px;
  color: #666;
  flex-wrap: wrap;
}
.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 3px;
}
.dot.met   { background: #07c160; }
.dot.unmet { background: #ff976a; }
.dot.leave { background: #c8c9cc; }
.line-mark {
  display: inline-block;
  width: 18px;
  height: 2px;
  background: #ee0a24;
  opacity: 0.6;
  vertical-align: middle;
  margin-right: 3px;
}
</style>
