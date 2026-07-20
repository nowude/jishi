import { ref, computed } from 'vue'
import { calcPeriodStats, getAllSettings } from '@/stores'
import { dayjs, getWeekRange, getMonthRange } from '@/utils/time'
import type { PeriodStats } from '@/stores'

export type StatsPeriod = 'week' | 'month' | 'year'

export function useStats() {
  const period = ref<StatsPeriod>('week')
  const currentDate = ref(dayjs().format('YYYY-MM-DD'))
  const loading = ref(false)
  const stats = ref<PeriodStats | null>(null)

  const workdaysConfig = ref('1,2,3,4,5')

  async function loadSettings() {
    const s = await getAllSettings()
    workdaysConfig.value = s.workdays ?? '1,2,3,4,5'
  }

  const range = computed(() => {
    switch (period.value) {
      case 'week':
        return getWeekRange(currentDate.value)
      case 'month':
        return getMonthRange(currentDate.value)
      case 'year': {
        const y = dayjs(currentDate.value).year()
        return {
          start: `${y}-01-01`,
          end: `${y}-12-31`,
        }
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
      await loadSettings()
      stats.value = await calcPeriodStats(
        range.value.start,
        range.value.end,
        workdaysConfig.value
      )
    } finally {
      loading.value = false
    }
  }

  function setPeriod(p: StatsPeriod) {
    period.value = p
    refresh()
  }

  function navigate(dir: number) {
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
    refresh()
  }

  return {
    period,
    currentDate,
    loading,
    stats,
    range,
    periodLabel,
    workdaysConfig,
    setPeriod,
    navigate,
    refresh,
  }
}
