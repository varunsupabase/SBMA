import { format, getDaysInMonth, startOfMonth, endOfMonth } from 'date-fns'

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return format(new Date(dateStr), 'dd MMM yyyy')
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

export function getWorkingDays(year, month) {
  // Standard 26 working days or calculate based on month (excluding Sundays)
  const days = getDaysInMonth(new Date(year, month - 1))
  let count = 0
  for (let d = 1; d <= days; d++) {
    const day = new Date(year, month - 1, d).getDay()
    if (day !== 0) count++ // exclude Sundays
  }
  return count
}

export function monthRange(year, month) {
  const start = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
  const end = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
  return { start, end }
}

export function calculateSalary(employee, attendanceRecords, advanceAmount, workingDays) {
  const presents = attendanceRecords.filter(a => a.status === 'present').length
  const halfDays = attendanceRecords.filter(a => a.status === 'half_day').length
  const absents = attendanceRecords.filter(a => a.status === 'absent').length
  const effectivePresent = presents + halfDays * 0.5
  const perDay = (employee.salary || 0) / (workingDays || 26)
  const grossSalary = Math.round(perDay * effectivePresent)
  const finalSalary = Math.max(0, grossSalary - (advanceAmount || 0))
  return {
    workingDays,
    presentDays: presents,
    halfDays,
    absentDays: absents,
    effectivePresent,
    grossSalary,
    advanceDeduction: advanceAmount || 0,
    finalSalary,
  }
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]
