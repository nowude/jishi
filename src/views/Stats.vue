<template>
  <div class="stats-page">
    <!-- 周期切换 -->
    <div class="period-tabs">
      <button
        v-for="p in periods"
        :key="p.value"
        class="tab-btn"
        :class="{ active: period === p.value }"
        @click="wrappedSetPeriod(p.value)"
      >{{ p.label }}</button>
    </div>

    <!-- 期间导航 -->
    <div class="period-nav">
      <button class="nav-btn" @click="wrappedNavigate(-1)">‹</button>
      <div class="period-label">{{ periodLabel }}</div>
      <button class="nav-btn" @click="wrappedNavigate(1)">›</button>
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
    <div class="chart-section" v-if="chartData.labels.length">
      <div class="chart-title">工时明细</div>
      <div class="bar-chart">
        <div
          v-for="(item, i) in chartData.items"
          :key="i"
          class="bar-col"
        >
          <div class="bar-label-top">{{ item.label }}</div>
          <div class="bar-wrap">
            <div
              class="bar-fill"
              :class="{ leave: item.isLeave, zero: item.minutes === 0 }"
              :style="{ height: barHeight(item.minutes) + 'px' }"
            />
            <!-- 标准线 -->
            <div class="standard-line" :style="{ bottom: barHeight(avgRequiredMinutes) + 'px' }" />
          </div>
          <div class="bar-label-bottom">{{ item.name }}</div>
        </div>
      </div>
      <div class="chart-legend">
        <span class="legend-dot blue" />达标
        <span class="legend-dot orange" />未达标
        <span class="legend-dot gray" />请假/未打卡
        <span class="legend-line" />平均要求
      </div>
    </div>
    <div v-else class="empty-chart">
      <p>暂无打卡数据</p>
      <p style="font-size:13px;color:#999;margin-top:4px">去首页打卡或日历页补录吧</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useStats, type StatsPeriod } from '@/composables/useStats'
import { formatMinutes, formatMinutesShort } from '@/utils/time'
import { getRecordsInRange, getLeavesInRange, getAllSettings } from '@/stores'
import { dayjs } from '@/utils/time'

const { period, stats, periodLabel, range, setPeriod, navigate, refresh } = useStats()

const periods: { value: StatsPeriod; label: string }[] = [
  { value: 'week', label: '本周' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
]

const avgRequiredMinutes = ref(11.5 * 60)

interface ChartItem {
  name: string      // 轴标签
  label: string     // 顶部数值
  minutes: number
  isLeave: boolean
}

const chartData = ref<{ labels: string[]; items: ChartItem[] }>({ labels: [], items: [] })

const BAR_MAX_H = 120 // px

function barHeight(minutes: number): number {
  const max = chartData.value.items.reduce((m, i) => Math.max(m, i.minutes), avgRequiredMinutes.value * 1.2)
  return Math.round((minutes / max) * BAR_MAX_H)
}

async function loadChartData() {
  const s = await getAllSettings()
  avgRequiredMinutes.value = Number(s.avgRequiredHours || '11.5') * 60

  const { start, end } = range.value
  const records = await getRecordsInRange(start, end)
  const leaves = await getLeavesInRange(start, end)

  const recordMap = new Map(records.map(r => [r.date, r]))
  const leaveSet = new Set(leaves.filter(l => l.isFullDay).map(l => l.date))

  const items: ChartItem[] = []

  if (period.value === 'week') {
    // 周视图：每天一列
    let cur = dayjs(start)
    const endD = dayjs(end)
    while (cur.isSameOrBefore(endD, 'day')) {
      const d = cur.format('YYYY-MM-DD')
      const rec = recordMap.get(d)
      const isLeave = leaveSet.has(d)
      const mins = rec?.workMinutes ?? 0
      const dayNames = ['日', '一', '二', '三', '四', '五', '六']
      items.push({
        name: `周${dayNames[cur.day()]}`,
        label: mins > 0 ? formatMinutesShort(mins) : (isLeave ? '假' : '-'),
        minutes: mins,
        isLeave,
      })
      cur = cur.add(1, 'day')
    }
  } else if (period.value === 'month') {
    // 月视图：每天一列（工作日）
    let cur = dayjs(start)
    const endD = dayjs(end)
    while (cur.isSameOrBefore(endD, 'day')) {
      const d = cur.format('YYYY-MM-DD')
      const day = cur.day()
      if ([1,2,3,4,5].includes(day)) { // 只显示工作日
        const rec = recordMap.get(d)
        const isLeave = leaveSet.has(d)
        const mins = rec?.workMinutes ?? 0
        items.push({
          name: `${cur.date()}`,
          label: mins > 0 ? formatMinutesShort(mins) : (isLeave ? '假' : ''),
          minutes: mins,
          isLeave,
        })
      }
      cur = cur.add(1, 'day')
    }
  } else {
    // 年视图：每月一列
    for (let m = 1; m <= 12; m++) {
      const monthStart = `${dayjs(start).year()}-${String(m).padStart(2,'0')}-01`
      const monthEnd = dayjs(monthStart).endOf('month').format('YYYY-MM-DD')
      let total = 0
      let cur2 = dayjs(monthStart)
      const endD2 = dayjs(monthEnd)
      while (cur2.isSameOrBefore(endD2, 'day')) {
        const d = cur2.format('YYYY-MM-DD')
        if (!leaveSet.has(d)) {
          total += recordMap.get(d)?.workMinutes ?? 0
        }
        cur2 = cur2.add(1, 'day')
      }
      items.push({
        name: `${m}月`,
        label: total > 0 ? formatMinutesShort(total) : '',
        minutes: total,
        isLeave: false,
      })
    }
  }

  chartData.value = {
    labels: items.map(i => i.name),
    items,
  }
}

async function doRefresh() {
  await refresh()
  await loadChartData()
}

function wrappedSetPeriod(p: StatsPeriod) {
  setPeriod(p)
  loadChartData()
}

function wrappedNavigate(dir: number) {
  navigate(dir)
  loadChartData()
}

onMounted(doRefresh)
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
  font-size: 20px;
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

.card-value {
  font-size: 28px;
  font-weight: 700;
}

.card-value.blue { color: #1989fa; }

.card-label {
  font-size: 13px;
  margin-top: 4px;
  opacity: 0.9;
}

.card-sub {
  font-size: 12px;
  margin-top: 6px;
}

.stats-row {
  display: flex;
  gap: 10px;
}

.stat-card.small {
  flex: 1;
  padding: 14px 8px;
}

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

.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  min-width: 32px;
}

.bar-label-top {
  font-size: 9px;
  color: #666;
  height: 14px;
  white-space: nowrap;
}

.bar-wrap {
  position: relative;
  width: 20px;
  height: 120px;
  display: flex;
  align-items: flex-end;
}

.bar-fill {
  width: 100%;
  border-radius: 4px 4px 0 0;
  background: #1989fa;
  min-height: 2px;
  transition: height 0.3s;
}

.bar-fill.leave { background: #c8c9cc; }
.bar-fill.zero  { background: #ebedf0; min-height: 2px; }

.standard-line {
  position: absolute;
  left: -3px;
  right: -3px;
  height: 2px;
  background: #ff976a;
  opacity: 0.7;
}

.bar-label-bottom {
  font-size: 10px;
  color: #999;
}

.chart-legend {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  font-size: 11px;
  color: #666;
  flex-wrap: wrap;
}

.legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.legend-dot.blue   { background: #1989fa; }
.legend-dot.orange { background: #ff976a; }
.legend-dot.gray   { background: #c8c9cc; }

.legend-line {
  display: inline-block;
  width: 20px;
  height: 2px;
  background: #ff976a;
  vertical-align: middle;
}

.empty-chart {
  text-align: center;
  padding: 40px 20px;
  color: #666;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
</style>
