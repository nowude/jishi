import db, { type ClockRecord, type LeaveRecord, DEFAULT_SETTINGS } from '@/db'
import dayjs from 'dayjs'

/* ─── Settings ─── */

export async function getSetting(key: string): Promise<string> {
  const item = await db.settings.get(key)
  return item?.value ?? DEFAULT_SETTINGS[key] ?? ''
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value })
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const items = await db.settings.toArray()
  const result: Record<string, string> = { ...DEFAULT_SETTINGS }
  items.forEach((item) => {
    result[item.key] = item.value
  })
  return result
}

/* ─── Clock Records ─── */

export async function getRecord(date: string): Promise<ClockRecord | undefined> {
  return db.records.where('date').equals(date).first()
}

export async function getRecordsInRange(start: string, end: string): Promise<ClockRecord[]> {
  return db.records
    .where('date')
    .between(start, end, true, true)
    .sortBy('date')
}

export async function saveRecord(record: ClockRecord): Promise<number> {
  if (record.id) {
    await db.records.update(record.id, record)
    return record.id
  }
  return db.records.add(record) as unknown as number
}

export async function deleteRecord(id: number): Promise<void> {
  await db.records.delete(id)
}

export async function deleteRecordByDate(date: string): Promise<void> {
  await db.records.where('date').equals(date).delete()
}

/* ─── Leave Records ─── */

export async function getLeavesInRange(start: string, end: string): Promise<LeaveRecord[]> {
  return db.leaves
    .where('date')
    .between(start, end, true, true)
    .sortBy('date')
}

export async function getLeavesForDate(date: string): Promise<LeaveRecord[]> {
  return db.leaves.where('date').equals(date).toArray()
}

export async function saveLeave(leave: LeaveRecord): Promise<number> {
  if (leave.id) {
    await db.leaves.update(leave.id, leave)
    return leave.id
  }
  return db.leaves.add(leave) as unknown as number
}

export async function deleteLeave(id: number): Promise<void> {
  await db.leaves.delete(id)
}

export async function deleteLeavesByDate(date: string): Promise<void> {
  await db.leaves.where('date').equals(date).delete()
}

export async function clearAllData(): Promise<void> {
  await db.records.clear()
  await db.leaves.clear()
  // 保留 settings（用户配置不删）
}

/* ─── Stats ─── */

export interface PeriodStats {
  totalMinutes: number
  workdays: number        // 该期间总工作日数
  actualWorkdays: number  // 实际打卡天数
  leaveDays: number      // 请假天数
  avgMinutes: number     // 平均每天工时(分钟)，排除请假
  avgHours: number       // 平均每天工时(小时)
  standardHours: number  // 标准日均工时
}

export async function calcPeriodStats(start: string, end: string, workdaysConfig: string): Promise<PeriodStats> {
  const records = await getRecordsInRange(start, end)
  const leaves = await getLeavesInRange(start, end)

  // 计算工作日数
  let totalWorkdays = 0
  const d = dayjs(start)
  const endD = dayjs(end)
  let cur = d
  while (cur.isSameOrBefore(endD, 'day')) {
    const day = cur.day()
    if (workdaysConfig.split(',').map(Number).includes(day)) {
      totalWorkdays++
    }
    cur = cur.add(1, 'day')
  }

  // 计算请假天数（全天请假算1天，半天请假算0.5天）
  let leaveDays = 0
  const fullDayLeaves = new Set<string>()
  leaves.forEach((l) => {
    if (l.isFullDay) {
      fullDayLeaves.add(l.date)
    } else {
      leaveDays += 0.5
    }
  })
  leaveDays += fullDayLeaves.size

  // 计算总工时
  let totalMinutes = 0
  let actualWorkdays = 0
  records.forEach((r) => {
    if (r.workMinutes > 0) {
      totalMinutes += r.workMinutes
      actualWorkdays++
    }
  })

  // 平均工时 = 总工时 / (实际打卡天数)，排除请假天
  const effectiveWorkdays = Math.max(1, actualWorkdays)
  const avgMinutes = Math.round(totalMinutes / effectiveWorkdays)

  return {
    totalMinutes,
    workdays: totalWorkdays,
    actualWorkdays,
    leaveDays,
    avgMinutes,
    avgHours: Math.round((avgMinutes / 60) * 10) / 10,
    standardHours: Number(DEFAULT_SETTINGS.dailyStandardHours),
  }
}
