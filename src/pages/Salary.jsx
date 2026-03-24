import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Download, CheckCircle, Calculator, Calendar } from 'lucide-react'
import { getEmployees, getSalaryRecords, upsertSalaryRecord, markSalaryPaid, getAttendanceForRange, getAdvancesForRange } from '../lib/db'
import { formatCurrency, MONTHS, getSalaryCycle, calculateCycleSalary, formatDate } from '../lib/utils'
import { toast } from '../components/Toast'
import { isConfigured } from '../lib/supabase'
import ConfigBanner from '../components/ConfigBanner'

function exportSalaryCSV(employees, records, month, year) {
  const rows = [['Employee','Role','Cycle Start','Cycle End','Total Days','Sundays','Working Days','Present','Half Day','Absent','Gross','Advance','Final','Status','Paid Date']]
  employees.forEach(emp => {
    const r = records[emp.id]
    if (r) rows.push([emp.name, emp.role||'', r.cycle_start||'', r.cycle_end||'', r.total_days||'', r.sundays||'', r.working_days||'', r.present_days||'', r.half_days||'', r.absent_days||'', r.gross_salary||'', r.advance_deduction||'', r.final_salary||'', r.is_paid?'Paid':'Pending', r.paid_date||''])
  })
  const csv = rows.map(r => r.join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `salary_${year}_${String(month).padStart(2,'0')}.csv`
  a.click()
}

export default function Salary() {
  const now = new Date()
  const [month, setMonth]         = useState(now.getMonth() + 1)
  const [year,  setYear]          = useState(now.getFullYear())
  const [employees, setEmployees] = useState([])
  const [records, setRecords]     = useState({})
  const [loading, setLoading]     = useState(true)
  const [calculating, setCalc]    = useState(false)
  const [expanded, setExpanded]   = useState(null)

  async function load() {
    setLoading(true)
    try {
      const [emps, recs] = await Promise.all([getEmployees(), getSalaryRecords(month, year)])
      setEmployees(emps)
      const map = {}; recs.forEach(r => { map[r.employee_id] = r })
      setRecords(map)
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [month, year])

  async function calculateAll() {
    setCalc(true)
    try {
      await Promise.all(employees.map(async emp => {
        const cycle    = getSalaryCycle(emp.joining_date, month, year)
        const [att, adv] = await Promise.all([
          getAttendanceForRange(emp.id, cycle.start, cycle.end),
          getAdvancesForRange(emp.id, cycle.start, cycle.end),
        ])
        const calc = calculateCycleSalary(emp, att, adv, cycle.start, cycle.end)
        await upsertSalaryRecord({
          employee_id:       emp.id,
          month, year,
          cycle_start:       calc.cycleStart,
          cycle_end:         calc.cycleEnd,
          total_days:        calc.totalDays,
          sundays:           calc.sundays,
          working_days:      calc.workingDays,
          present_days:      calc.presentDays,
          half_days:         calc.halfDays,
          absent_days:       calc.absentDays,
          gross_salary:      calc.grossSalary,
          advance_deduction: calc.advanceDeduction,
          final_salary:      calc.finalSalary,
          is_paid:           records[emp.id]?.is_paid || false,
        })
      }))
      toast(`Calculated for ${employees.length} employees`)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setCalc(false) }
  }

  async function handlePaid(empId) {
    const rec = records[empId]
    if (!rec?.id) { toast('Calculate salary first', 'info'); return }
    try { await markSalaryPaid(rec.id); toast('Marked as paid'); load() }
    catch (err) { toast(err.message, 'error') }
  }

  const prevMonth = () => month === 1 ? (setMonth(12), setYear(y=>y-1)) : setMonth(m=>m-1)
  const nextMonth = () => month === 12? (setMonth(1),  setYear(y=>y+1)) : setMonth(m=>m+1)

  const totalPayable = employees.filter(e => !records[e.id]?.is_paid).reduce((s,e) => s+(records[e.id]?.final_salary||0),0)
  const totalPaid    = employees.filter(e =>  records[e.id]?.is_paid).reduce((s,e) => s+(records[e.id]?.final_salary||0),0)

  return (
    <div className="max-w-2xl mx-auto">
      {!isConfigured && <ConfigBanner />}

      <div className="page-header flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Salary</h1>
          <p className="page-sub">{formatCurrency(totalPayable)} payable · cycle-based calculation</p>
        </div>
        <button className="btn-secondary text-xs px-3 py-2"
          onClick={() => { exportSalaryCSV(employees, records, month, year); toast('Exported') }}>
          <Download size={13} /> CSV
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-between mb-4">
        <button className="btn-secondary p-2" onClick={prevMonth}><ChevronLeft size={16} /></button>
        <span className="font-semibold text-base" style={{ color: 'var(--text)' }}>{MONTHS[month-1]} {year}</span>
        <button className="btn-secondary p-2" onClick={nextMonth}><ChevronRight size={16} /></button>
      </div>

      {/* Info note */}
      <div className="rounded-xl px-4 py-3 mb-4 flex items-start gap-2 text-xs"
        style={{ background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.15)' }}>
        <Calendar size={14} className="text-amber-500 mt-0.5 shrink-0" />
        <span style={{ color:'var(--text-muted)' }}>
          Each employee's salary cycle starts on their <strong style={{color:'var(--text)'}}>joining date</strong> of {MONTHS[month-1]}.
          Sundays are excluded from working days but attendance is still tracked.
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl p-3.5" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
          <p className="text-xs mb-1" style={{ color:'var(--text-muted)' }}>Payable</p>
          <p className="mono font-bold text-lg" style={{ color:'#f87171' }}>{formatCurrency(totalPayable)}</p>
        </div>
        <div className="rounded-xl p-3.5" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
          <p className="text-xs mb-1" style={{ color:'var(--text-muted)' }}>Paid</p>
          <p className="mono font-bold text-lg" style={{ color:'#10b981' }}>{formatCurrency(totalPaid)}</p>
        </div>
      </div>

      <button className="btn-primary w-full mb-5 py-3" onClick={calculateAll}
        disabled={calculating || loading || employees.length === 0}>
        <Calculator size={16} />
        {calculating ? 'Calculating…' : `Calculate Salaries — ${MONTHS[month-1]} ${year}`}
      </button>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i)=>(
          <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background:'var(--surface)' }} />
        ))}</div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12"><p style={{ color:'var(--text-muted)' }}>No active employees</p></div>
      ) : (
        <div className="space-y-2">
          {employees.map(emp => {
            const rec = records[emp.id]
            const isEx = expanded === emp.id
            const cycle = getSalaryCycle(emp.joining_date, month, year)
            return (
              <div key={emp.id} className="rounded-xl overflow-hidden"
                style={{ background:'var(--surface)', border:`1px solid ${rec?.is_paid?'rgba(16,185,129,0.2)':'var(--border)'}` }}>

                <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                  onClick={() => setExpanded(isEx ? null : emp.id)}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{ background: rec?.is_paid?'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)', color:rec?.is_paid?'#10b981':'#f59e0b' }}>
                    {emp.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color:'var(--text)' }}>{emp.name}</p>
                    <p className="text-xs" style={{ color:'var(--text-muted)' }}>
                      {emp.role||'—'} · {formatDate(cycle.start)} → {formatDate(cycle.end)}
                    </p>
                  </div>
                  <div className="text-right">
                    {rec ? (
                      <>
                        <p className="mono font-bold text-base" style={{ color:rec.is_paid?'#10b981':'var(--text)' }}>
                          {formatCurrency(rec.final_salary)}
                        </p>
                        <p className="text-xs" style={{ color:'var(--text-faint)' }}>{rec.is_paid?'✓ Paid':'Pending'}</p>
                      </>
                    ) : (
                      <p className="text-xs" style={{ color:'var(--text-faint)' }}>Not calculated</p>
                    )}
                  </div>
                </button>

                {isEx && rec && (
                  <div className="px-4 pb-4 pt-3 space-y-3 animate-fade-in" style={{ borderTop:'1px solid var(--border)' }}>
                    {/* Cycle range */}
                    <div className="flex items-center gap-2 text-xs px-1" style={{ color:'var(--text-muted)' }}>
                      <Calendar size={13} className="text-amber-500" />
                      <span>Cycle: <strong style={{ color:'var(--text)' }}>{formatDate(rec.cycle_start)}</strong> → <strong style={{ color:'var(--text)' }}>{formatDate(rec.cycle_end)}</strong></span>
                    </div>
                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label:'Total Days',   value: rec.total_days },
                        { label:'Sundays',       value: rec.sundays, accent:'#64748b' },
                        { label:'Working Days',  value: rec.working_days, accent:'#38bdf8' },
                        { label:'Present',       value: rec.present_days, accent:'#10b981' },
                        { label:'Half Day',      value: rec.half_days, accent:'#f59e0b' },
                        { label:'Absent',        value: rec.absent_days, accent:'#f87171' },
                        { label:'Gross Salary',  value: formatCurrency(rec.gross_salary) },
                        { label:'Advance',       value: `-${formatCurrency(rec.advance_deduction)}`, accent:'#f87171' },
                        { label:'Per Day',       value: formatCurrency(rec.per_day||0) },
                      ].map(({ label, value, accent }) => (
                        <div key={label} className="rounded-lg p-2.5" style={{ background:'var(--surface2)' }}>
                          <p className="text-xs mb-0.5" style={{ color:'var(--text-muted)' }}>{label}</p>
                          <p className="mono text-sm font-semibold" style={{ color: accent||'var(--text)' }}>{value}</p>
                        </div>
                      ))}
                    </div>
                    {/* Final */}
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                      style={{ background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.15)' }}>
                      <span className="text-sm font-semibold text-amber-500">Final Salary</span>
                      <span className="mono font-bold text-lg text-amber-500">{formatCurrency(rec.final_salary)}</span>
                    </div>
                    {!rec.is_paid && (
                      <button className="btn-primary w-full py-2.5" onClick={() => handlePaid(emp.id)}>
                        <CheckCircle size={15} /> Mark as Paid
                      </button>
                    )}
                    {rec.is_paid && (
                      <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
                        <CheckCircle size={15} /> Paid on {rec.paid_date || '—'}
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
