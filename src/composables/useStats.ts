import { ref, computed } from 'vue'
import { calcPeriodStats, getAllSettings, getRecordsInRange, getLeavesInRange } from '@/stores'
import { dayjs, getWeekRange, getMonthRange, formatMinutesShort } from '@/utils/time'
import type { PeriodStats } from '@/stores'

export type StatsPeriod = 'week' | 'month' | 'year'

export interface ChartItem {
  name: string
  label: string
  minutes: number
  isLeave: boolean
  isMet: boolean   // 是否达标
}

export function useStats() {
  const period = ref<StatsPeriod>('week')
  const currentDate = ref(dayjs().format('YYYY-MM-DD'))
  const loading = ref(false)
  const stats = ref<PeriodStats | null>(null)
  const chartItems = ref<ChartItem[]>([])
  const avgRequiredMinutes = ref(11.5 * 60)

  const workdaysConfig = ref('1,2,3,4,5')

  const range = computed(() => {
    switch (period.value) {
      case 'week':
        return getWeekRange(currentDate.value)
      case 'month':
        return getMonthRange(currentDate.value)
      case 'year': {
        const y = dayjs(currentDate.value).year()
        return { start: `${y}-01-01`, end: `${y}-12-31` }
      }
    }
  })

  const periodLabel = computed(() => {
    switch (period.value) {
      case 'week':
        return `${range.value.start} ~ ${range.value.end}`
      case 'month':
        return dayjs(currentDate.value).format('YYYY年M月')
      case 'year':
        return `${dayjs(currentDate.value).year()}年`
    }
  })

  async function refresh() {
    loading.value = true
    try {
      const s = await getAllSettings()
      workdaysConfig.value = s.workdays ?? '1,2,3,4,5'
      avgRequiredMinutes.value = Number(s.avgRequiredHours ?? '11.5') * 60

      const { start, end } = range.value

      // 统计卡片数据
      stats.value = await calcPeriodStats(start, end, workdaysConfig.value)

      // 图表数据
      chartItems.value = await buildChartItems(start, end)
    } finally {
      loading.value = false
    }
  }

  async function buildChartItems(start: string, end: string): Promise<ChartItem[]> {
    const records = await getRecordsInRange(start, end)
    const leaves = await getLeavesInRange(start, end)

    const recordMap = new Map(records.map(r => [r.date, r]))
    const leaveSet = new Set(leaves.filter(l => l.isFullDay).map(l => l.date))
    const today = dayjs().format('YYYY-MM-DD')
    const items: ChartItem[] = []

    const dayNames = ['日', '一', '二', '三', '四', '五', '六']

    if (period.value === 'week') {
      // 周视图：周一到周日，每天一列
      let cur = dayjs(start)
      const endD = dayjs(end)
      while (cur.isSameOrBefore(endD, 'day')) {
        const d = cur.format('YYYY-MM-DD')
        const isLeave = leaveSet.has(d)
        let mins = 0

        if (!isLeave) {
          const rec = recordMap.get(d)
          if (rec) {
            if (rec.workMinutes > 0) {
              mins = rec.workMinutes
            } else if (d === today && rec.clockIn && !rec.clockOut) {
              // 今天打卡中，实时计算
              const nowStr = `${String(dayjs().hour()).padStart(2,'0')}:${String(dayjs().minute()).padStart(2,'0')}`
              const [ih=0, im=0] = rec.clockIn.split(':').map(Number)
              const [oh=0, om=0] = nowStr.split(':').map(Number)
              mins = Math.max(0, (oh * 60 + om) - (ih * 60 + im))
            }
          }
        }

        items.push({
          name: `周${dayNames[cur.day()]}`,
          label: isLeave ? '假' : (mins > 0 ? formatMinutesShort(mins) : (cur.isAfter(dayjs(), 'day') ? '' : '-')),
          minutes: mins,
          isLeave,
          isMet: mins >= avgRequiredMinutes.value,
        })
        cur = cur.add(1, 'day')
      }
    } else if (period.value === 'month') {
      // 月视图：按周聚合（共4~5周）
      let cur = dayjs(start).isoWeekday(1)  // 该月包含的第一个周一
      const endD = dayjs(end)
      let weekNum = 1
      while (cur.isSameOrBefore(endD, 'day')) {
        const weekEnd = cur.add(6, 'day')
        let total = 0
        let hasData = false
        let innerCur = cur
        while (innerCur.isSameOrBefore(weekEnd, 'day') && innerCur.isSameOrBefore(endD, 'day')) {
          const d = innerCur.format('YYYY-MM-DD')
          const rec = recordMap.get(d)
          if (rec) {
            if (rec.workMinutes > 0) {
              total += rec.workMinutes
              hasData = true
            } else if (d === today && rec.clockIn && !rec.clockOut) {
              const nowStr = `${String(dayjs().hour()).padStart(2,'0')}:${String(dayjs().minute()).padStart(2,'0')}`
              const [ih=0, im=0] = rec.clockIn.split(':').map(Number)
              const [oh=0, om=0] = nowStr.split(':').map(Number)
              total += Math.max(0, (oh * 60 + om) - (ih * 60 + im))
              hasData = true
            }
          }
          innerCur = innerCur.add(1, 'day')
        }
        items.push({
          name: `第${weekNum}周`,
          label: hasData ? formatMinutesShort(total) : '',
          minutes: total,
          isLeave: false,
          isMet: total >= avgRequiredMinutes.value * 5,
        })
        weekNum++
        cur = cur.add(7, 'day')
      }
    } else {
      // 年视图：每月总工时
      const year = dayjs(start).year()
      for (let m = 1; m <= 12; m++) {
        const ms = `${year}-${String(m).padStart(2,'0')}-01`
        const me = dayjs(ms).endOf('month').format('YYYY-MM-DD')
        let total = 0
        let cur2 = dayjs(ms)
        const endD2 = dayjs(me)
        while (cur2.isSameOrBefore(endD2, 'day')) {
          const d = cur2.format('YYYY-MM-DD')
          total += recordMap.get(d)?.workMinutes ?? 0
          cur2 = cur2.add(1, 'day')
        }
        items.push({
          name: `${m}月`,
          label: total > 0 ? formatMinutesShort(total) : '',
          minutes: total,
          isLeave: false,
          isMet: false, // 年视图不做达标判断
        })
      }
    }

    return items
  }

  async function setPeriod(p: StatsPeriod) {
    period.value = p
    await refresh()
  }

  async function navigate(dir: number) {
    const d = dayjs(currentDate.value)
    switch (period.value) {
      case 'week':
        currentDate.value = d.add(dir * 7, 'day').format('YYYY-MM-DD')
        break
      case 'month':
        currentDate.value = d.add(dir, 'month').format('YYYY-MM-DD')
        break
      case 'year':
        currentDate.value = d.add(dir, 'year').format('YYYY-MM-DD')
        break
    }
    await refresh()
  }

  return {
    period,
    currentDate,
    loading,
    stats,
    chartItems,
    avgRequiredMinutes,
    range,
    periodLabel,
    workdaysConfig,
    setPeriod,
    navigate,
    refresh,
  }
}
