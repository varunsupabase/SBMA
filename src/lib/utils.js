import { format, getDaysInMonth, startOfMonth, endOfMonth, addMonths, subDays } from 'date-fns'

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return format(new Date(dateStr + 'T00:00:00'), 'dd MMM yyyy')
}

export function formatMonth(month, year) {
  return format(new Date(year, month - 1, 1), 'MMMM yyyy')
}

export function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return format(d, 'yyyy-MM-dd')
}

export function monthRange(year, month) {
  const start = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
  const end   = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
  return { start, end }
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

/* ────────────────────────────────────────────────────────
   JOINING-DATE BASED SALARY CYCLE
   Cycle = joining_day of refMonth  →  (joining_day - 1) of refMonth+1
   Example: joining 10th, ref March → 10 Mar → 9 Apr
──────────────────────────────────────────────────────── */

export function getSalaryCycle(joiningDate, refMonth, refYear) {
  if (!joiningDate) return monthRange(refYear, refMonth)

  const joinDay    = new Date(joiningDate + 'T00:00:00').getDate()
  const daysInRef  = getDaysInMonth(new Date(refYear, refMonth - 1))
  const startDay   = Math.min(joinDay, daysInRef)
  const cycleStart = new Date(refYear, refMonth - 1, startDay)
  const cycleEnd   = subDays(addMonths(cycleStart, 1), 1)

  return {
    start: format(cycleStart, 'yyyy-MM-dd'),
    end:   format(cycleEnd,   'yyyy-MM-dd'),
  }
}

export function daysBetween(startStr, endStr) {
  const s = new Date(startStr + 'T00:00:00')
  const e = new Date(endStr   + 'T00:00:00')
  return Math.floor((e - s) / 86400000) + 1
}

export function countSundays(startStr, endStr) {
  const s = new Date(startStr + 'T00:00:00')
  const e = new Date(endStr   + 'T00:00:00')
  let n = 0
  const d = new Date(s)
  while (d <= e) {
    if (d.getDay() === 0) n++
    d.setDate(d.getDate() + 1)
  }
  return n
}

export function isSunday(dateStr) {
  return new Date(dateStr + 'T00:00:00').getDay() === 0
}

export function calculateCycleSalary(employee, attendanceRecords, advanceAmount, cycleStart, cycleEnd) {
  const totalDays   = daysBetween(cycleStart, cycleEnd)
  const sundays     = countSundays(cycleStart, cycleEnd)
  const workingDays = totalDays - sundays

  // Only non-Sunday days affect salary
  const nonSunRecs  = attendanceRecords.filter(a => !isSunday(a.date))
  const presentDays = nonSunRecs.filter(a => a.status === 'present').length
  const halfDays    = nonSunRecs.filter(a => a.status === 'half_day').length
  const absentDays  = nonSunRecs.filter(a => a.status === 'absent').length

  const effectivePresent = presentDays + halfDays * 0.5
  const perDay      = workingDays > 0 ? (employee.salary || 0) / workingDays : 0
  const grossSalary = Math.round(perDay * effectivePresent)
  const finalSalary = Math.max(0, grossSalary - (advanceAmount || 0))

  return {
    cycleStart, cycleEnd,
    totalDays, sundays, workingDays,
    presentDays, halfDays, absentDays,
    effectivePresent,
    perDay: Math.round(perDay * 100) / 100,
    grossSalary,
    advanceDeduction: advanceAmount || 0,
    finalSalary,
  }
}

// Legacy helpers (kept for attendance page)
export function getWorkingDays(year, month) {
  const days = getDaysInMonth(new Date(year, month - 1))
  let count = 0
  for (let d = 1; d <= days; d++) {
    if (new Date(year, month - 1, d).getDay() !== 0) count++
  }
  return count
}

export function calculateSalary(employee, attendanceRecords, advanceAmount, workingDays) {
  const presents = attendanceRecords.filter(a => a.status === 'present').length
  const halfDays = attendanceRecords.filter(a => a.status === 'half_day').length
  const absents  = attendanceRecords.filter(a => a.status === 'absent').length
  const effectivePresent = presents + halfDays * 0.5
  const perDay     = (employee.salary || 0) / (workingDays || 26)
  const grossSalary = Math.round(perDay * effectivePresent)
  const finalSalary = Math.max(0, grossSalary - (advanceAmount || 0))
  return { workingDays, presentDays: presents, halfDays, absentDays: absents, effectivePresent, grossSalary, advanceDeduction: advanceAmount || 0, finalSalary }
}
