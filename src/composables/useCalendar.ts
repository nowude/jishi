import { ref } from 'vue'
import { getRecordsInRange, getLeavesInRange, getSetting, calcPeriodStats } from '@/stores'
import { dayjs, isWorkday, isFriday, formatMinutesShort, getWeekRange } from '@/utils/time'
import type { ClockRecord, LeaveRecord } from '@/db'

export interface CalendarDay {
  date: string
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  isWorkday: boolean
  isFriday: boolean
  workMinutes: number
  workHours: number
  weeklyAvgHours: number  // 周均工时（仅周五显示）
  hasClock: boolean
  hasLeave: boolean
  leaveType?: string
  displayText: string     // 日历上显示的文字
  status: 'normal' | 'overtime' | 'undertime' | 'meet_avg' | 'below_avg' | 'leave' | 'none'
}

export function useCalendar() {
  const year = ref(dayjs().year())
  const month = ref(dayjs().month() + 1) // 1-12
  const days = ref<CalendarDay[]>([])
  const loading = ref(false)

  async function loadMonth() {
    loading.value = true
    try {
      const workdays = await getSetting('workdays')
      const dailyStandard = Number(await getSetting('dailyStandardHours'))
      const avgRequired = Number(await getSetting('avgRequiredHours'))
      const dateStr = `${year.value}-${String(month.value).padStart(2, '0')}-01`
      const start = dayjs(dateStr).startOf('month')
      const end = dayjs(dateStr).endOf('month')

      // 获取前后填充的日期范围（从周一开始）
      const calStart = start.isoWeekday(1)
      const calEnd = end.isoWeekday(7)

      const records = await getRecordsInRange(
        calStart.format('YYYY-MM-DD'),
        calEnd.format('YYYY-MM-DD')
      )
      const leaves = await getLeavesInRange(
        calStart.format('YYYY-MM-DD'),
        calEnd.format('YYYY-MM-DD')
      )

      const recordMap = new Map<string, ClockRecord>()
      records.forEach((r) => recordMap.set(r.date, r))

      const leaveMap = new Map<string, LeaveRecord>()
      leaves.forEach((l) => leaveMap.set(l.date, l))

      const today = dayjs().format('YYYY-MM-DD')

      // 先计算每个周五所在周的周均工时
      const fridayWeeklyAvgMap = new Map<string, number>()
      // 遍历找所有周五
      let scanCur = calStart
      while (scanCur.isSameOrBefore(calEnd, 'day')) {
        if (isFriday(scanCur.format('YYYY-MM-DD')) && isWorkday(scanCur.format('YYYY-MM-DD'), workdays)) {
          const week = getWeekRange(scanCur.format('YYYY-MM-DD'))
          const weekStats = await calcPeriodStats(week.start, week.end, workdays)
          fridayWeeklyAvgMap.set(scanCur.format('YYYY-MM-DD'), weekStats.avgHours)
        }
        scanCur = scanCur.add(1, 'day')
      }

      const result: CalendarDay[] = []
      let cur = calStart

      while (cur.isSameOrBefore(calEnd, 'day')) {
        const date = cur.format('YYYY-MM-DD')
        const rec = recordMap.get(date)
        const leave = leaveMap.get(date)
        const isCurrent = cur.month() + 1 === month.value && cur.year() === year.value
        const isFri = isFriday(date)

        let workMinutes = 0
        let hasClock = false
        if (rec) {
          workMinutes = rec.workMinutes
          hasClock = Boolean(rec.clockIn)
        }

        const workHours = workMinutes / 60
        const weeklyAvgHours = fridayWeeklyAvgMap.get(date) ?? 0
        const standardMinutes = dailyStandard * 60
        const avgRequiredMinutes = avgRequired * 60

        let status: CalendarDay['status'] = 'none'
        let displayText = ''

        if (leave) {
          status = 'leave'
          displayText = '假'
        } else if (isFri && hasClock) {
          // 周五：看周均工时是否达标
          if (weeklyAvgHours >= avgRequired) {
            status = 'meet_avg'
            displayText = `${weeklyAvgHours.toFixed(1)}h`
          } else {
            status = 'below_avg'
            displayText = `${weeklyAvgHours.toFixed(1)}h`
          }
        } else if (hasClock) {
          // 非周五：看当天工时是否达标
          if (workMinutes >= avgRequiredMinutes) {
            status = workMinutes > standardMinutes + 30 ? 'overtime' : 'normal'
          } else {
            status = 'undertime'
          }
          displayText = formatMinutesShort(workMinutes)
        }

        result.push({
          date,
          day: cur.date(),
          isCurrentMonth: isCurrent,
          isToday: date === today,
          isWorkday: isWorkday(date, workdays),
          isFriday: isFri,
          workMinutes,
          workHours,
          weeklyAvgHours,
          hasClock,
          hasLeave: Boolean(leave),
          leaveType: leave?.type,
          displayText,
          status,
        })

        cur = cur.add(1, 'day')
      }

      days.value = result
    } finally {
      loading.value = false
    }
  }

  function prevMonth() {
    if (month.value === 1) {
      year.value--
      month.value = 12
    } else {
      month.value--
    }
    loadMonth()
  }

  function nextMonth() {
    if (month.value === 12) {
      year.value++
      month.value = 1
    } else {
      month.value++
    }
    loadMonth()
  }

  function goToday() {
    year.value = dayjs().year()
    month.value = dayjs().month() + 1
    loadMonth()
  }

  return {
    year,
    month,
    days,
    loading,
    loadMonth,
    prevMonth,
    nextMonth,
    goToday,
  }
}
