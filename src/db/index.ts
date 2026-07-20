import Dexie, { type EntityTable } from 'dexie'

/* ─── 打卡记录 ─── */
export interface ClockRecord {
  id?: number
  date: string        // YYYY-MM-DD
  clockIn: string     // HH:mm
  clockOut: string    // HH:mm（可为空）
  breakMinutes: number
  workMinutes: number // 自动计算
  isManual: boolean
  note: string
  createdAt: string
}

/* ─── 请假记录 ─── */
export interface LeaveRecord {
  id?: number
  date: string        // YYYY-MM-DD
  type: 'annual' | 'sick' | 'personal' | 'compensatory'
  hours: number       // 请假时长
  isFullDay: boolean
  note: string
}

/* ─── 配置项 ─── */
export interface SettingItem {
  key: string
  value: string
}

/* ─── 默认配置 ─── */
export const DEFAULT_SETTINGS: Record<string, string> = {
  standardClockIn: '09:00',
  standardClockOut: '18:00',
  workdays: '1,2,3,4,5',
  dailyStandardHours: '8',
  avgRequiredHours: '11.5',
}

/* ─── 数据库 ─── */
class JiShiDB extends Dexie {
  records!: EntityTable<ClockRecord, 'id'>
  leaves!: EntityTable<LeaveRecord, 'id'>
  settings!: EntityTable<SettingItem, 'key'>

  constructor() {
    super('JiShiDB')
    this.version(1).stores({
      records: '++id, date, clockIn, clockOut, isManual, createdAt',
      leaves: '++id, date, type',
      settings: 'key',
    })
  }
}

const db = new JiShiDB()

export default db
