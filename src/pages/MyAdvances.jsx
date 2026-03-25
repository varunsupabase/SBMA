import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Wallet, CheckCircle, Clock } from 'lucide-react'
import { getMyAdvances } from '../lib/db'
import { useSession } from '../lib/session'
import { getSalaryCycle, formatCurrency, formatDate, MONTHS } from '../lib/utils'
import { toast } from '../components/Toast'

export default function MyAdvances() {
  const { employee } = useSession()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [advances, setAdvances] = useState([])
  const [loading,  setLoading]  = useState(true)

  // Compute cycle based on employee joining date
  const cycle = getSalaryCycle(employee.joining_date, month, year)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getMyAdvances(employee.id, cycle.start, cycle.end)
      setAdvances(data)
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }, [employee.id, cycle.start, cycle.end])

  useEffect(() => { load() }, [load])

  const prevMonth = () => month === 1 ? (setMonth(12), setYear(y => y - 1)) : setMonth(m => m - 1)
  const nextMonth = () => month === 12 ? (setMonth(1), setYear(y => y + 1)) : setMonth(m => m + 1)

  const totalTaken   = advances.reduce((s, a) => s + (a.amount || 0), 0)
  const totalPending = advances.filter(a => !a.is_repaid).reduce((s, a) => s + (a.amount || 0), 0)
  const totalRepaid  = advances.filter(a =>  a.is_repaid).reduce((s, a) => s + (a.amount || 0), 0)

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">My Advances</h1>
        <p className="page-sub">{employee.name}</p>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button className="btn-secondary p-2" onClick={prevMonth}><ChevronLeft size={16} /></button>
        <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
          {MONTHS[month - 1]} {year}
        </span>
        <button className="btn-secondary p-2" onClick={nextMonth}><ChevronRight size={16} /></button>
      </div>

      {/* Cycle range label */}
      <p className="text-center text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
        Salary cycle: <strong style={{ color: 'var(--text)' }}>{formatDate(cycle.start)}</strong>
        {' '}→{' '}
        <strong style={{ color: 'var(--text)' }}>{formatDate(cycle.end)}</strong>
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { label: 'Total Taken',  value: totalTaken,   color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)' },
          { label: 'Pending',      value: totalPending, color: '#f87171', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'  },
          { label: 'Repaid',       value: totalRepaid,  color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} className="rounded-xl p-3 text-center"
            style={{ background: bg, border: `1px solid ${border}` }}>
            <p className="mono font-bold text-lg leading-none" style={{ color }}>
              {formatCurrency(value)}
            </p>
            <p className="text-xs mt-1" style={{ color }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Advances list */}
      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
        ))}</div>
      ) : advances.length === 0 ? (
        <div className="text-center py-14 rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Wallet size={28} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="font-semibold" style={{ color: 'var(--text)' }}>No advances this cycle</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            You haven't taken any advances in this period
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {advances.map(adv => (
            <div key={adv.id}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
              style={{
                background: 'var(--surface)',
                border: `1px solid ${adv.is_repaid ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
              }}>
              {/* Status icon */}
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: adv.is_repaid ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                }}>
                {adv.is_repaid
                  ? <CheckCircle size={16} style={{ color: '#10b981' }} />
                  : <Clock size={16} style={{ color: '#f59e0b' }} />
                }
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {formatDate(adv.date)}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {adv.is_repaid ? '✓ Repaid' : 'Pending repayment'}
                  {adv.note ? ` · ${adv.note}` : ''}
                </p>
              </div>

              <span className="mono font-bold text-base"
                style={{ color: adv.is_repaid ? '#10b981' : '#f59e0b' }}>
                {formatCurrency(adv.amount)}
              </span>
            </div>
          ))}

          {/* Total pending deduction note */}
          {totalPending > 0 && (
            <div className="px-4 py-3 rounded-xl mt-1 text-sm"
              style={{
                background: 'rgba(248,113,113,0.06)',
                border: '1px solid rgba(248,113,113,0.15)',
                color: '#f87171',
              }}>
              ⚠ <strong>{formatCurrency(totalPending)}</strong> will be deducted from your salary this cycle
            </div>
          )}
        </div>
      )}

      <p className="text-center text-xs mt-5" style={{ color: 'var(--text-faint)' }}>
        Contact your admin to clarify any advance records
      </p>
    </div>
  )
}
