import { useState, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight, RefreshCw,
  Download, CheckCircle, Calculator
} from 'lucide-react'
import {
  getEmployees, getSalaryRecords, upsertSalaryRecord,
  markSalaryPaid, getEmployeeMonthAttendance, getMonthAdvances
} from '../lib/db'
import {
  formatCurrency, MONTHS, calculateSalary, getWorkingDays
} from '../lib/utils'
import { exportSalary } from '../lib/export'
import { toast } from '../components/Toast'
import { isConfigured } from '../lib/supabase'
import ConfigBanner from '../components/ConfigBanner'

export default function Salary() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const [employees, setEmployees] = useState([])
  const [records, setRecords] = useState({})     // { empId: record }
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [expanded, setExpanded] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const [emps, recs] = await Promise.all([
        getEmployees(),
        getSalaryRecords(month, year),
      ])
      setEmployees(emps)
      const map = {}
      recs.forEach(r => { map[r.employee_id] = r })
      setRecords(map)
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [month, year])

  async function calculateAll() {
    setCalculating(true)
    try {
      const workingDays = getWorkingDays(year, month)
      await Promise.all(employees.map(async emp => {
        const [attendance, advances] = await Promise.all([
          getEmployeeMonthAttendance(emp.id, year, month),
          getMonthAdvances(emp.id, year, month),
        ])
        const calc = calculateSalary(emp, attendance, advances, workingDays)
        await upsertSalaryRecord({
          employee_id: emp.id,
          month,
          year,
          working_days: calc.workingDays,
          present_days: calc.presentDays,
          half_days: calc.halfDays,
          absent_days: calc.absentDays,
          gross_salary: calc.grossSalary,
          advance_deduction: calc.advanceDeduction,
          final_salary: calc.finalSalary,
          is_paid: records[emp.id]?.is_paid || false,
        })
      }))
      toast(`Salary calculated for ${employees.length} employees`)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setCalculating(false) }
  }

  async function handleMarkPaid(empId) {
    const rec = records[empId]
    if (!rec?.id) { toast('Calculate salary first', 'info'); return }
    try {
      await markSalaryPaid(rec.id)
      toast('Salary marked as paid')
      load()
    } catch (err) { toast(err.message, 'error') }
  }

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const totalPayable = employees
    .filter(e => !records[e.id]?.is_paid)
    .reduce((s, e) => s + (records[e.id]?.final_salary || 0), 0)

  const totalPaid = employees
    .filter(e => records[e.id]?.is_paid)
    .reduce((s, e) => s + (records[e.id]?.final_salary || 0), 0)

  return (
    <div className="max-w-2xl mx-auto">
      {!isConfigured && <ConfigBanner />}

      <div className="page-header flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Salary</h1>
          <p className="page-sub">{formatCurrency(totalPayable)} payable this month</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            className="btn-secondary text-xs px-3 py-2"
            onClick={() => {
              exportSalary(Object.values(records).map(r => ({
                ...r,
                employees: employees.find(e => e.id === r.employee_id)
                  ? { name: employees.find(e => e.id === r.employee_id).name,
                      role: employees.find(e => e.id === r.employee_id).role }
                  : r.employees
              })), month, year)
              toast('Exported CSV')
            }}
          >
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-between mb-4">
        <button className="btn-secondary p-2" onClick={prevMonth}>
          <ChevronLeft size={16} />
        </button>
        <span className="font-semibold text-base" style={{ color: 'var(--text)' }}>
          {MONTHS[month - 1]} {year}
        </span>
        <button className="btn-secondary p-2" onClick={nextMonth}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl p-3.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Payable</p>
          <p className="mono font-bold text-lg" style={{ color: '#f87171' }}>
            {formatCurrency(totalPayable)}
          </p>
        </div>
        <div className="rounded-xl p-3.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Paid</p>
          <p className="mono font-bold text-lg" style={{ color: '#10b981' }}>
            {formatCurrency(totalPaid)}
          </p>
        </div>
      </div>

      {/* Calculate button */}
      <button
        className="btn-primary w-full mb-5 py-3"
        onClick={calculateAll}
        disabled={calculating || loading || employees.length === 0}
      >
        <Calculator size={16} />
        {calculating ? 'Calculating…' : `Calculate Salaries for ${MONTHS[month-1]}`}
      </button>

      {/* Employee salary cards */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse"
              style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12">
          <p style={{ color: 'var(--text-muted)' }}>No active employees</p>
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map(emp => {
            const rec = records[emp.id]
            const isExpanded = expanded === emp.id

            return (
              <div
                key={emp.id}
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${rec?.is_paid ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
                }}
              >
                <button
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                  onClick={() => setExpanded(isExpanded ? null : emp.id)}
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{
                      background: rec?.is_paid ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                      color: rec?.is_paid ? '#10b981' : '#f59e0b',
                    }}>
                    {emp.name[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {emp.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {emp.role || '—'} · base {formatCurrency(emp.salary)}
                    </p>
                  </div>

                  <div className="text-right">
                    {rec ? (
                      <>
                        <p className="mono font-bold text-base"
                          style={{ color: rec.is_paid ? '#10b981' : 'var(--text)' }}>
                          {formatCurrency(rec.final_salary)}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                          {rec.is_paid ? '✓ Paid' : 'Pending'}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                        Not calculated
                      </p>
                    )}
                  </div>
                </button>

                {/* Expanded breakdown */}
                {isExpanded && rec && (
                  <div
                    className="px-4 pb-4 pt-3 space-y-3 animate-fade-in"
                    style={{ borderTop: '1px solid var(--border)' }}
                  >
                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Working Days', value: rec.working_days },
                        { label: 'Present', value: rec.present_days },
                        { label: 'Half Day', value: rec.half_days },
                        { label: 'Absent', value: rec.absent_days },
                        { label: 'Gross', value: formatCurrency(rec.gross_salary) },
                        { label: 'Advance', value: `-${formatCurrency(rec.advance_deduction)}` },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg p-2.5"
                          style={{ background: 'var(--surface2)' }}>
                          <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
                            {label}
                          </p>
                          <p className="mono text-sm font-semibold" style={{ color: 'var(--text)' }}>
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Final salary */}
                    <div
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                      style={{
                        background: 'rgba(245,158,11,0.06)',
                        border: '1px solid rgba(245,158,11,0.15)',
                      }}
                    >
                      <span className="text-sm font-semibold text-amber-500">Final Salary</span>
                      <span className="mono font-bold text-lg text-amber-500">
                        {formatCurrency(rec.final_salary)}
                      </span>
                    </div>

                    {/* Action */}
                    {!rec.is_paid && (
                      <button
                        className="btn-primary w-full py-2.5"
                        onClick={() => handleMarkPaid(emp.id)}
                      >
                        <CheckCircle size={15} />
                        Mark as Paid
                      </button>
                    )}
                    {rec.is_paid && (
                      <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
                        <CheckCircle size={15} />
                        Paid on {rec.paid_date || '—'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
