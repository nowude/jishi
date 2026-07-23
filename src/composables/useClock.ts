import { ref } from 'vue'
import { getRecord, getLatestOpenRecord, saveRecord, getSetting } from '@/stores'
import { calcWorkMinutes, nowTimeString, todayString, dayjs, formatMinutes } from '@/utils/time'
import { pushClockInToServer, pushClockOutToServer } from '@/utils/api-client'
import type { ClockRecord } from '@/db'

export function useClock() {
  const today = ref(todayString())
  const record = ref<ClockRecord | undefined>()
  const loading = ref(false)
  const breakMinutes = ref(60)

  async function loadToday() {
    loading.value = true
    try {
      record.value = await getRecord(today.value)
      // 凌晨打开应用时，如果今天没有记录，继续显示最近一条未签退记录
      if (!record.value) record.value = await getLatestOpenRecord()
      breakMinutes.value = Number(await getSetting('breakMinutes'))
    } finally {
      loading.value = false
    }
  }

  const clockInTime = ref('')
  const clockOutTime = ref('')
  const hasClockedIn = ref(false)
  const hasClockedOut = ref(false)

  function updateClockState() {
    clockInTime.value = record.value?.clockIn ?? ''
    clockOutTime.value = record.value?.clockOut ?? ''
    hasClockedIn.value = Boolean(record.value?.clockIn)
    hasClockedOut.value = Boolean(record.value?.clockOut)
  }

  const workMinutes = ref(0)

  // 实时已工作时间（分钟），每秒更新
  const currentWorkMinutes = ref(0)

  function computeCurrentWorkMinutes(): number {
    if (!hasClockedIn.value) return 0
    if (hasClockedOut.value) return record.value?.workMinutes ?? 0
    const now = dayjs()
    const nowTime = now.format('HH:mm')
    const nowDate = now.format('YYYY-MM-DD')
    return calcWorkMinutes(
      clockInTime.value,
      nowTime,
      0,
      record.value?.date,
      nowDate,
    )
  }

  const workTimeDisplay = ref('0min')

  function refreshDisplay() {
    currentWorkMinutes.value = computeCurrentWorkMinutes()
    workTimeDisplay.value = formatMinutes(currentWorkMinutes.value)
  }

  async function clockIn() {
    const now = nowTimeString()
    if (record.value) {
      record.value.clockIn = now
      await saveRecord(record.value)
    } else {
      const newRecord: ClockRecord = {
        date: today.value,
        clockIn: now,
        clockOut: '',
        breakMinutes: 0,
        workMinutes: 0,
        isManual: false,
        note: '',
        createdAt: dayjs().toISOString(),
      }
      const id = await saveRecord(newRecord)
      record.value = { ...newRecord, id }
    }
    updateClockState()
    // 推送到服务器
    pushClockInToServer(today.value)
  }

  async function clockOut() {
    if (!record.value) return
    const now = dayjs()
    const nowTime = now.format('HH:mm')
    const nowDate = now.format('YYYY-MM-DD')
    record.value.clockOut = nowTime
    record.value.clockOutDate = nowDate
    record.value.workMinutes = calcWorkMinutes(
      record.value.clockIn,
      nowTime,
      0,
      record.value.date,
      nowDate,
    )
    await saveRecord(record.value)
    updateClockState()
    refreshDisplay()
    // 推送到服务器
    pushClockOutToServer(today.value)
  }

  // 定时器
  let timer: ReturnType<typeof setInterval> | null = null

  function startTicking() {
    if (timer) return
    refreshDisplay()
    timer = setInterval(() => {
      refreshDisplay()
    }, 1000)
  }

  function stopTicking() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  async function init() {
    await loadToday()
    updateClockState()
    refreshDisplay()
    if (hasClockedIn.value && !hasClockedOut.value) {
      startTicking()
    }
  }

  return {
    today,
    record,
    loading,
    clockInTime,
    clockOutTime,
    hasClockedIn,
    hasClockedOut,
    workMinutes,
    currentWorkMinutes,
    workTimeDisplay,
    loadToday,
    clockIn,
    clockOut,
    init,
    startTicking,
    stopTicking,
    refreshDisplay,
  }
}
