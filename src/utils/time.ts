import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
dayjs.extend(isoWeek)

export { dayjs }

/**
 * 计算两个时间字符串之间的工时（分钟）。
 * 传入日期时支持跨午夜；不传日期时兼容旧记录，按同一天计算。
 */
export function calcWorkMinutes(
  clockIn: string,
  clockOut: string,
  _breakMinutes = 0,
  clockInDate?: string,
  clockOutDate?: string,
): number {
  if (!clockIn || !clockOut) return 0

  const parseTime = (value: string) => {
    const [hours = 0, minutes = 0] = value.split(':').map(Number)
    return hours * 60 + minutes
  }

  if (clockInDate && clockOutDate) {
    const start = dayjs(`${clockInDate}T${clockIn}`)
    const end = dayjs(`${clockOutDate}T${clockOut}`)
    if (!start.isValid() || !end.isValid()) return 0
    return Math.max(0, end.diff(start, 'minute'))
  }

  return Math.max(0, parseTime(clockOut) - parseTime(clockIn))
}

/**
 * 分钟 -> 可读中文时间
 * 480  -> "8小时"
 * 510  -> "8小时30分钟"
 * 32   -> "32分钟"
 * 0    -> "0分钟"
 */
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0分钟'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}分钟`
  if (m === 0) return `${h}小时`
  return `${h}小时${m}分钟`
}

/**
 * 分钟 -> 短格式显示（日历等紧凑场景）
 * 480  -> "8.0h"
 * 510  -> "8.5h"
 * 492  -> "8.2h"
 */
export function formatMinutesShort(minutes: number): string {
  if (minutes <= 0) return ''
  const h = minutes / 60
  return `${h % 1 === 0 ? h.toFixed(0) : h.toFixed(1)}h`
}

/**
 * 分钟 -> 小时（保留1位小数）
 */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10
}

/**
 * 获取当前时间的 HH:mm 字符串
 */
export function nowTimeString(): string {
  return dayjs().format('HH:mm')
}

/**
 * 获取当前日期的 YYYY-MM-DD 字符串
 */
export function todayString(): string {
  return dayjs().format('YYYY-MM-DD')
}

/**
 * 判断是否是工作日（根据 workdays 配置）
 * workdays: 逗号分隔的 dayjs day 数字 (0=Sun,1=Mon..6=Sat)
 */
export function isWorkday(date: string, workdays: string): boolean {
  const day = dayjs(date).day()
  return workdays.split(',').map(Number).includes(day)
}

/**
 * 判断日期是否是周五
 */
export function isFriday(date: string): boolean {
  return dayjs(date).day() === 5
}

/**
 * 获取指定月份的工作日数量
 */
export function getWorkdaysInMonth(year: number, month: number, workdays: string): number {
  const start = dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
  const daysInMonth = start.daysInMonth()
  let count = 0
  for (let i = 1; i <= daysInMonth; i++) {
    const d = start.date(i)
    if (isWorkday(d.format('YYYY-MM-DD'), workdays)) count++
  }
  return count
}

/**
 * 获取本周的起止日期（周一到周日）
 */
export function getWeekRange(date?: string) {
  const d = dayjs(date)
  return {
    start: d.isoWeekday(1).format('YYYY-MM-DD'),
    end: d.isoWeekday(7).format('YYYY-MM-DD'),
  }
}

/**
 * 获取本月的起止日期
 */
export function getMonthRange(date?: string) {
  const d = dayjs(date)
  return {
    start: d.startOf('month').format('YYYY-MM-DD'),
    end: d.endOf('month').format('YYYY-MM-DD'),
  }
}

/**
 * 获取某一周内已过去的工作日数（不含今天之后的）
 */
export function getElapsedWorkdaysThisWeek(workdays: string): number {
  const today = dayjs()
  const weekStart = today.isoWeekday(1)
  let count = 0
  let cur = weekStart
  while (cur.isSameOrBefore(today, 'day')) {
    if (isWorkday(cur.format('YYYY-MM-DD'), workdays)) count++
    cur = cur.add(1, 'day')
  }
  return count
}

/**
 * 获取本周总工作日数
 */
export function getTotalWorkdaysThisWeek(workdays: string): number {
  let count = 0
  const weekStart = dayjs().isoWeekday(1)
  for (let i = 1; i <= 7; i++) {
    const d = weekStart.isoWeekday(i)
    if (isWorkday(d.format('YYYY-MM-DD'), workdays)) count++
  }
  return count
}
