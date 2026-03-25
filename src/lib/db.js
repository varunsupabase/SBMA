import { supabase } from './supabase'
import { monthRange, todayStr } from './utils'

/* ─── EMPLOYEES ──────────────────────────────────── */
export async function getEmployees(includeInactive = false) {
  let q = supabase.from('employees').select('*').order('name')
  if (!includeInactive) q = q.eq('is_active', true)
  const { data, error } = await q
  if (error) throw error
  return data || []
}
export async function addEmployee(emp) {
  const { data, error } = await supabase.from('employees').insert(emp).select().single()
  if (error) throw error
  return data
}
export async function updateEmployee(id, updates) {
  const { data, error } = await supabase.from('employees').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function toggleEmployeeActive(id, isActive) {
  return updateEmployee(id, { is_active: isActive })
}

/* ─── ATTENDANCE ─────────────────────────────────── */
export async function getAttendanceForDate(date) {
  const { data, error } = await supabase.from('attendance').select('*, employees(id, name, role)').eq('date', date)
  if (error) throw error
  return data || []
}
export async function getMonthlyAttendance(year, month) {
  const { start, end } = monthRange(year, month)
  const { data, error } = await supabase.from('attendance').select('*').gte('date', start).lte('date', end)
  if (error) throw error
  return data || []
}
export async function getAttendanceForRange(employeeId, startDate, endDate) {
  const { data, error } = await supabase.from('attendance').select('*')
    .eq('employee_id', employeeId).gte('date', startDate).lte('date', endDate)
  if (error) throw error
  return data || []
}
export async function getEmployeeMonthAttendance(employeeId, year, month) {
  const { start, end } = monthRange(year, month)
  const { data, error } = await supabase.from('attendance').select('*')
    .eq('employee_id', employeeId).gte('date', start).lte('date', end)
  if (error) throw error
  return data || []
}
export async function upsertAttendance(employeeId, date, status) {
  const { data, error } = await supabase.from('attendance')
    .upsert({ employee_id: employeeId, date, status }, { onConflict: 'employee_id,date' }).select()
  if (error) throw error
  return data
}
export async function duplicateAttendance(fromDate, toDate) {
  const { data: records } = await supabase.from('attendance').select('employee_id, status').eq('date', fromDate)
  if (!records?.length) return 0
  const { error } = await supabase.from('attendance')
    .upsert(records.map(r => ({ employee_id: r.employee_id, date: toDate, status: r.status })), { onConflict: 'employee_id,date' })
  if (error) throw error
  return records.length
}

/* ─── ADVANCES ───────────────────────────────────── */
export async function getAdvances(employeeId = null) {
  let q = supabase.from('advances').select('*, employees(id, name, role)').order('date', { ascending: false })
  if (employeeId) q = q.eq('employee_id', employeeId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}
export async function getAdvancesForRange(employeeId, startDate, endDate) {
  const { data, error } = await supabase.from('advances').select('amount')
    .eq('employee_id', employeeId).eq('is_repaid', false).gte('date', startDate).lte('date', endDate)
  if (error) throw error
  return (data || []).reduce((s, a) => s + (a.amount || 0), 0)
}
export async function getMonthAdvances(employeeId, year, month) {
  const { start, end } = monthRange(year, month)
  return getAdvancesForRange(employeeId, start, end)
}
export async function addAdvance(advance) {
  const { data, error } = await supabase.from('advances').insert(advance).select().single()
  if (error) throw error
  return data
}
export async function markAdvanceRepaid(id) {
  const { data, error } = await supabase.from('advances').update({ is_repaid: true }).eq('id', id).select().single()
  if (error) throw error
  return data
}

/* ─── SALARY ─────────────────────────────────────── */
export async function getSalaryRecords(month, year) {
  const { data, error } = await supabase.from('salary_records')
    .select('*, employees(id, name, role, salary)').eq('month', month).eq('year', year).order('created_at')
  if (error) throw error
  return data || []
}
export async function upsertSalaryRecord(record) {
  const { data, error } = await supabase.from('salary_records')
    .upsert(record, { onConflict: 'employee_id,month,year' }).select()
  if (error) throw error
  return data
}
export async function markSalaryPaid(id) {
  const { data, error } = await supabase.from('salary_records')
    .update({ is_paid: true, paid_date: todayStr() }).eq('id', id).select().single()
  if (error) throw error
  return data
}

/* ─── WORK LOGS ──────────────────────────────────── */
export async function getWorkLogForDate(date) {
  const { data, error } = await supabase.from('work_logs')
    .select('*, employees(id, name, role)').eq('date', date).order('orders_delivered', { ascending: false })
  if (error) throw error
  return data || []
}
export async function upsertWorkLog(log) {
  const { data, error } = await supabase.from('work_logs')
    .upsert(log, { onConflict: 'employee_id,date' }).select('*, employees(id, name, role)')
  if (error) throw error
  return data?.[0] || null
}
export async function deleteWorkLog(employeeId, date) {
  const { error } = await supabase.from('work_logs').delete().eq('employee_id', employeeId).eq('date', date)
  if (error) throw error
}
export async function getMonthlyWorkStats(year, month) {
  const { start, end } = monthRange(year, month)
  const { data, error } = await supabase.from('work_logs')
    .select('employee_id, orders_delivered, order_value, date, employees(id, name, role)')
    .gte('date', start).lte('date', end)
  if (error) throw error
  return data || []
}

/* ─── CONTACTS ───────────────────────────────────── */
export async function getContacts(type = null) {
  let q = supabase.from('contacts').select('*').order('name')
  if (type) q = q.eq('type', type)
  const { data, error } = await q
  if (error) throw error
  return data || []
}
export async function addContact(contact) {
  const { data, error } = await supabase.from('contacts').insert(contact).select().single()
  if (error) throw error
  return data
}
export async function updateContact(id, updates) {
  const { data, error } = await supabase.from('contacts').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function deleteContact(id) {
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) throw error
}
export async function bulkInsertContacts(contacts) {
  const { data, error } = await supabase.from('contacts').insert(contacts).select()
  if (error) throw error
  return data || []
}

/* ─── BUDGET & EXPENSES ──────────────────────────── */
export async function getBudgetEntries() {
  const { data, error } = await supabase.from('budget_entries').select('*').order('date', { ascending: false })
  if (error) throw error
  return data || []
}
export async function addBudgetEntry(entry) {
  const { data, error } = await supabase.from('budget_entries').insert(entry).select().single()
  if (error) throw error
  return data
}
export async function deleteBudgetEntry(id) {
  const { error } = await supabase.from('budget_entries').delete().eq('id', id)
  if (error) throw error
}
export async function getExpenses(employeeId = null) {
  let q = supabase.from('expenses')
    .select('*, employees(id, name)').order('date', { ascending: false })
  if (employeeId) q = q.eq('employee_id', employeeId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}
export async function addExpense(expense) {
  const { data, error } = await supabase.from('expenses').insert(expense).select('*, employees(id, name)').single()
  if (error) throw error
  return data
}
export async function deleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

/* ─── DASHBOARD ──────────────────────────────────── */
export async function getDashboardStats() {
  const today = todayStr()
  const now   = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()

  const [attRes, salRes, advRes, empRes, workRes, budgetRes, expRes] = await Promise.all([
    supabase.from('attendance').select('status').eq('date', today),
    supabase.from('salary_records').select('final_salary').eq('month', month).eq('year', year).eq('is_paid', false),
    supabase.from('advances').select('amount').eq('is_repaid', false),
    supabase.from('employees').select('id', { count: 'exact' }).eq('is_active', true),
    supabase.from('work_logs').select('orders_delivered, order_value').eq('date', today),
    supabase.from('budget_entries').select('amount'),
    supabase.from('expenses').select('amount'),
  ])

  const att            = attRes.data || []
  const present        = att.filter(a => a.status === 'present').length
  const absent         = att.filter(a => a.status === 'absent').length
  const halfDay        = att.filter(a => a.status === 'half_day').length
  const totalMarked    = att.length
  const totalEmployees = empRes.count || 0
  const monthlySalary  = (salRes.data || []).reduce((s, r) => s + (r.final_salary || 0), 0)
  const totalAdvances  = (advRes.data || []).reduce((s, a) => s + (a.amount || 0), 0)
  const todayOrders    = (workRes.data || []).reduce((s, w) => s + (w.orders_delivered || 0), 0)
  const todayValue     = (workRes.data || []).reduce((s, w) => s + (w.order_value || 0), 0)
  const totalBudget    = (budgetRes.data || []).reduce((s, b) => s + (b.amount || 0), 0)
  const totalExpenses  = (expRes.data || []).reduce((s, e) => s + (e.amount || 0), 0)
  const budgetBalance  = totalBudget - totalExpenses

  return {
    present, absent, halfDay, totalMarked, totalEmployees,
    monthlySalary, totalAdvances, todayOrders, todayValue,
    totalBudget, totalExpenses, budgetBalance,
  }
}

/* ─── EMPLOYEE LOGIN ─────────────────────────────────── */
// Returns all active employees with their PIN hash (for login screen)
export async function getEmployeesForLogin() {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, role, employee_pin')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data || []
}

// Returns full employee record by id (for session after login)
export async function getEmployeeById(id) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

/* ─── EMPLOYEE: OWN ATTENDANCE ───────────────────────── */
export async function getMyAttendance(employeeId, year, month) {
  const { start, end } = monthRange(year, month)
  const { data, error } = await supabase
    .from('attendance')
    .select('date, status')
    .eq('employee_id', employeeId)
    .gte('date', start)
    .lte('date', end)
    .order('date')
  if (error) throw error
  return data || []
}
