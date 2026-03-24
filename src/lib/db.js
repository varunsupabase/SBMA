import { supabase } from './supabase'
import { monthRange, todayStr, yesterdayStr } from './utils'

/* ─── EMPLOYEES ─────────────────────────────────────── */

export async function getEmployees(includeInactive = false) {
  let q = supabase.from('employees').select('*').order('name')
  if (!includeInactive) q = q.eq('is_active', true)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function addEmployee(emp) {
  const { data, error } = await supabase
    .from('employees').insert(emp).select().single()
  if (error) throw error
  return data
}

export async function updateEmployee(id, updates) {
  const { data, error } = await supabase
    .from('employees').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function toggleEmployeeActive(id, isActive) {
  return updateEmployee(id, { is_active: isActive })
}

/* ─── ATTENDANCE ─────────────────────────────────────── */

export async function getAttendanceForDate(date) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, employees(id, name, role)')
    .eq('date', date)
  if (error) throw error
  return data || []
}

export async function getMonthlyAttendance(year, month) {
  const { start, end } = monthRange(year, month)
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .gte('date', start)
    .lte('date', end)
  if (error) throw error
  return data || []
}

export async function getEmployeeMonthAttendance(employeeId, year, month) {
  const { start, end } = monthRange(year, month)
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('date', start)
    .lte('date', end)
  if (error) throw error
  return data || []
}

export async function upsertAttendance(employeeId, date, status) {
  const { data, error } = await supabase
    .from('attendance')
    .upsert(
      { employee_id: employeeId, date, status },
      { onConflict: 'employee_id,date' }
    )
    .select()
  if (error) throw error
  return data
}

export async function duplicateAttendance(fromDate, toDate) {
  const { data: records } = await supabase
    .from('attendance')
    .select('employee_id, status')
    .eq('date', fromDate)

  if (!records?.length) return 0

  const toUpsert = records.map(r => ({
    employee_id: r.employee_id,
    date: toDate,
    status: r.status,
  }))

  const { error } = await supabase
    .from('attendance')
    .upsert(toUpsert, { onConflict: 'employee_id,date' })
  if (error) throw error
  return toUpsert.length
}

/* ─── ADVANCES ─────────────────────────────────────── */

export async function getAdvances(employeeId = null) {
  let q = supabase
    .from('advances')
    .select('*, employees(id, name, role)')
    .order('date', { ascending: false })
  if (employeeId) q = q.eq('employee_id', employeeId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getMonthAdvances(employeeId, year, month) {
  const { start, end } = monthRange(year, month)
  const { data, error } = await supabase
    .from('advances')
    .select('amount')
    .eq('employee_id', employeeId)
    .eq('is_repaid', false)
    .gte('date', start)
    .lte('date', end)
  if (error) throw error
  return (data || []).reduce((s, a) => s + (a.amount || 0), 0)
}

export async function addAdvance(advance) {
  const { data, error } = await supabase
    .from('advances').insert(advance).select().single()
  if (error) throw error
  return data
}

export async function markAdvanceRepaid(id) {
  const { data, error } = await supabase
    .from('advances')
    .update({ is_repaid: true })
    .eq('id', id)
    .select().single()
  if (error) throw error
  return data
}

export async function getPendingAdvancesTotal() {
  const { data, error } = await supabase
    .from('advances')
    .select('amount')
    .eq('is_repaid', false)
  if (error) throw error
  return (data || []).reduce((s, a) => s + (a.amount || 0), 0)
}

/* ─── SALARY ─────────────────────────────────────── */

export async function getSalaryRecords(month, year) {
  const { data, error } = await supabase
    .from('salary_records')
    .select('*, employees(id, name, role, salary)')
    .eq('month', month)
    .eq('year', year)
    .order('created_at')
  if (error) throw error
  return data || []
}

export async function upsertSalaryRecord(record) {
  const { data, error } = await supabase
    .from('salary_records')
    .upsert(record, { onConflict: 'employee_id,month,year' })
    .select()
  if (error) throw error
  return data
}

export async function markSalaryPaid(id) {
  const { data, error } = await supabase
    .from('salary_records')
    .update({ is_paid: true, paid_date: todayStr() })
    .eq('id', id)
    .select().single()
  if (error) throw error
  return data
}

/* ─── WORK LOGS ──────────────────────────────────────── */

export async function getWorkLogs({ date, employeeId, year, month } = {}) {
  let q = supabase
    .from('work_logs')
    .select('*, employees(id, name, role)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (date)       q = q.eq('date', date)
  if (employeeId) q = q.eq('employee_id', employeeId)
  if (year && month) {
    const { start, end } = monthRange(year, month)
    q = q.gte('date', start).lte('date', end)
  }

  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function upsertWorkLog(log) {
  // If a log for this employee+date exists, update it; otherwise insert
  const { data, error } = await supabase
    .from('work_logs')
    .upsert(log, { onConflict: 'employee_id,date' })
    .select('*, employees(id, name, role)')
  if (error) throw error
  return data?.[0] || null
}

export async function deleteWorkLog(id) {
  const { error } = await supabase.from('work_logs').delete().eq('id', id)
  if (error) throw error
}

export async function getWorkLogForDate(date) {
  const { data, error } = await supabase
    .from('work_logs')
    .select('*, employees(id, name, role)')
    .eq('date', date)
    .order('orders_delivered', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getMonthlyWorkStats(year, month) {
  const { start, end } = monthRange(year, month)
  const { data, error } = await supabase
    .from('work_logs')
    .select('employee_id, orders_delivered, order_value, date, employees(id, name, role)')
    .gte('date', start)
    .lte('date', end)
  if (error) throw error
  return data || []
}

/* ─── DASHBOARD ─────────────────────────────────────── */

export async function getDashboardStats() {
  const today = todayStr()
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [attRes, salRes, advRes, empRes, workRes] = await Promise.all([
    supabase.from('attendance').select('status').eq('date', today),
    supabase.from('salary_records')
      .select('final_salary')
      .eq('month', month).eq('year', year).eq('is_paid', false),
    supabase.from('advances').select('amount').eq('is_repaid', false),
    supabase.from('employees').select('id', { count: 'exact' }).eq('is_active', true),
    supabase.from('work_logs').select('orders_delivered, order_value').eq('date', today),
  ])

  const att = attRes.data || []
  const present    = att.filter(a => a.status === 'present').length
  const absent     = att.filter(a => a.status === 'absent').length
  const halfDay    = att.filter(a => a.status === 'half_day').length
  const totalMarked    = att.length
  const totalEmployees = empRes.count || 0

  const monthlySalary  = (salRes.data || []).reduce((s, r) => s + (r.final_salary || 0), 0)
  const totalAdvances  = (advRes.data || []).reduce((s, a) => s + (a.amount || 0), 0)
  const todayOrders    = (workRes.data || []).reduce((s, w) => s + (w.orders_delivered || 0), 0)
  const todayValue     = (workRes.data || []).reduce((s, w) => s + (w.order_value || 0), 0)

  return {
    present, absent, halfDay, totalMarked, totalEmployees,
    monthlySalary, totalAdvances, todayOrders, todayValue,
  }
}
