import { format } from 'date-fns'
import { formatCurrency } from './utils'

function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(cell => {
    const v = String(cell ?? '').replace(/"/g, '""')
    return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v}"` : v
  }).join(',')).join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${format(new Date(), 'yyyyMMdd')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportEmployees(employees) {
  const rows = [
    ['Name', 'Role', 'Phone', 'Salary (₹)', 'Joining Date', 'Status'],
    ...employees.map(e => [
      e.name, e.role, e.phone, e.salary,
      e.joining_date || '', e.is_active ? 'Active' : 'Inactive'
    ])
  ]
  downloadCSV(rows, 'employees')
}

export function exportAttendance(employees, attendanceMap, month, year) {
  const header = ['Employee', 'Role', 'Present', 'Half Day', 'Absent', 'Total Marked']
  const rows = [header]
  employees.forEach(emp => {
    const recs = (attendanceMap[emp.id] || [])
    const p = recs.filter(a => a.status === 'present').length
    const h = recs.filter(a => a.status === 'half_day').length
    const ab = recs.filter(a => a.status === 'absent').length
    rows.push([emp.name, emp.role || '', p, h, ab, recs.length])
  })
  downloadCSV(rows, `attendance_${year}_${String(month).padStart(2,'0')}`)
}

export function exportSalary(records, month, year) {
  const rows = [
    ['Employee', 'Role', 'Gross Salary', 'Advance Deduction', 'Final Salary', 'Status', 'Paid Date']
  ]
  records.forEach(r => {
    rows.push([
      r.employees?.name || '',
      r.employees?.role || '',
      r.gross_salary || 0,
      r.advance_deduction || 0,
      r.final_salary || 0,
      r.is_paid ? 'Paid' : 'Pending',
      r.paid_date || '',
    ])
  })
  downloadCSV(rows, `salary_${year}_${String(month).padStart(2,'0')}`)
}

export function exportAdvances(advances) {
  const rows = [
    ['Employee', 'Amount (₹)', 'Date', 'Note', 'Status']
  ]
  advances.forEach(a => {
    rows.push([
      a.employees?.name || '',
      a.amount,
      a.date,
      a.note || '',
      a.is_repaid ? 'Repaid' : 'Pending'
    ])
  })
  downloadCSV(rows, 'advances')
}
