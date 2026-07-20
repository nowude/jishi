<template>
  <div class="stats-page">
    <!-- 周期切换 -->
    <div class="period-tabs">
      <van-button
        v-for="p in periods"
        :key="p.value"
        :type="period === p.value ? 'primary' : 'default'"
        size="small"
        round
        @click="setPeriod(p.value)"
      >
        {{ p.label }}
      </van-button>
    </div>

    <!-- 期间导航 -->
    <div class="period-nav">
      <van-icon name="arrow-left" size="20" @click="navigate(-1)" />
      <div class="period-label">{{ periodLabel }}</div>
      <van-icon name="arrow" size="20" @click="navigate(1)" />
    </div>

    <!-- 统计卡片 -->
    <div v-if="stats" class="stats-cards">
      <div class="stat-card primary">
        <div class="card-value">{{ stats.avgHours }}h</div>
        <div class="card-label">日均工时</div>
        <div class="card-sub">
          标准日 {{ stats.standardHours }}h
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-card small">
          <div class="card-value">{{ totalHoursDisplay }}h</div>
          <div class="card-label">累计工时</div>
        </div>
        <div class="stat-card small">
          <div class="card-value">{{ stats.actualWorkdays }}</div>
          <div class="card-label">出勤天数</div>
        </div>
        <div class="stat-card small">
          <div class="card-value">{{ stats.leaveDays }}</div>
          <div class="card-label">请假天数</div>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-card small">
          <div class="card-value">{{ stats.workdays }}</div>
          <div class="card-label">工作日总数</div>
        </div>
        <div class="stat-card small">
          <div class="card-value">{{ attendanceRate }}%</div>
          <div class="card-label">出勤率</div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="chart-section">
      <div class="chart-title">工时趋势</div>
      <v-chart :option="chartOption" autoresize style="height: 250px" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useStats, type StatsPeriod } from '@/composables/useStats'
import { minutesToHours } from '@/utils/time'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'

use([CanvasRenderer, LineChart, BarChart, GridComponent, TooltipComponent])

const { period, stats, periodLabel, setPeriod, navigate, refresh } = useStats()

const periods: { value: StatsPeriod; label: string }[] = [
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
]

const totalHoursDisplay = computed(() => {
  if (!stats.value) return 0
  return minutesToHours(stats.value.totalMinutes)
})

const attendanceRate = computed(() => {
  if (!stats.value || stats.value.workdays === 0) return 0
  return Math.round((stats.value.actualWorkdays / stats.value.workdays) * 100)
})

// 简易图表配置（后续接入真实数据）
const chartOption = computed(() => ({
  tooltip: { trigger: 'axis' as const },
  grid: { left: 40, right: 16, top: 16, bottom: 24 },
  xAxis: {
    type: 'category' as const,
    data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  },
  yAxis: {
    type: 'value' as const,
    name: '小时',
    min: 0,
    max: 12,
  },
  series: [
    {
      name: '工时',
      type: 'bar' as const,
      data: [8, 9.5, 8.5, 7, 8, 0, 0],
      itemStyle: { color: '#1989fa' },
      barWidth: '40%',
    },
    {
      name: '标准',
      type: 'line' as const,
      data: [8, 8, 8, 8, 8, 0, 0],
      lineStyle: { color: '#ee0a24', type: 'dashed' as const },
      symbol: 'none',
    },
  ],
}))

onMounted(() => {
  refresh()
})
</script>

<style scoped>
.stats-page {
  padding: 16px;
  padding-top: calc(16px + var(--safe-top, 0px));
  background: var(--jishi-bg);
  min-height: 100%;
}

.period-tabs {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 16px;
}

.period-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  margin-bottom: 16px;
}

.period-label {
  font-size: 16px;
  font-weight: 600;
}

.stats-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-card {
  background: var(--jishi-card, #fff);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.stat-card.primary {
  background: linear-gradient(135deg, #1989fa, #2b6cb0);
  color: white;
}

.stat-card.primary .card-sub {
  color: rgba(255, 255, 255, 0.7);
}

.card-value {
  font-size: 32px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.card-label {
  font-size: 13px;
  margin-top: 4px;
  opacity: 0.85;
}

.card-sub {
  font-size: 12px;
  margin-top: 8px;
  color: var(--jishi-text-secondary);
}

.stats-row {
  display: flex;
  gap: 8px;
}

.stat-card.small {
  flex: 1;
  padding: 14px 8px;
}

.stat-card.small .card-value {
  font-size: 22px;
  color: var(--jishi-primary);
}

.stat-card.small .card-label {
  font-size: 12px;
  color: var(--jishi-text-secondary);
}

.chart-section {
  margin-top: 20px;
  background: var(--jishi-card, #fff);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.chart-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 8px;
}
</style>
