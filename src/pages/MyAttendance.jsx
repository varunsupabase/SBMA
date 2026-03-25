import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getMyAttendance } from '../lib/db'
import { MONTHS, formatDate } from '../lib/utils'
import { useSession } from '../lib/session'
import { getDaysInMonth } from 'date-fns'
import { toast } from '../components/Toast'

const STATUS_STYLE = {
  present:  { bg: 'rgba(16,185,129,0.18)',  color: '#10b981', label: 'Present' },
  absent:   { bg: 'rgba(239,68,68,0.18)',   color: '#f87171', label: 'Absent'  },
  half_day: { bg: 'rgba(245,158,11,0.18)',  color: '#f59e0b', label: 'Half Day'},
}

export default function MyAttendance() {
  const { employee } = useSession()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getMyAttendance(employee.id, year, month)
      setRecords(data)
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }, [employee.id, year, month])

  useEffect(() => { load() }, [load])

  const prevMonth = () => month === 1 ? (setMonth(12), setYear(y => y - 1)) : setMonth(m => m - 1)
  const nextMonth = () => month === 12 ? (setMonth(1), setYear(y => y + 1)) : setMonth(m => m + 1)

  const statusMap = {}
  records.forEach(r => { statusMap[r.date] = r.status })

  const daysInMonth = getDaysInMonth(new Date(year, month - 1))

  const presentCount  = records.filter(r => r.status === 'present').length
  const halfCount     = records.filter(r => r.status === 'half_day').length
  const absentCount   = records.filter(r => r.status === 'absent').length
  const markedCount   = records.length

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">My Attendance</h1>
        <p className="page-sub">
          {employee.name} · {MONTHS[month - 1]} {year}
        </p>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-5">
        <button className="btn-secondary p-2" onClick={prevMonth}>
          <ChevronLeft size={16} />
        </button>
        <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
          {MONTHS[month - 1]} {year}
        </span>
        <button className="btn-secondary p-2" onClick={nextMonth}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { label: 'Present',  value: presentCount, color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)' },
          { label: 'Half Day', value: halfCount,    color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)' },
          { label: 'Absent',   value: absentCount,  color: '#f87171', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'  },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} className="rounded-xl p-3 text-center"
            style={{ background: bg, border: `1px solid ${border}` }}>
            <p className="mono font-bold text-2xl" style={{ color }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="h-48 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)' }}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold"
                style={{ color: d === 'Sun' ? '#f87171' : 'var(--text-faint)' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="p-3">
            {(() => {
              const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
              const cells = []

              // Empty cells before month starts
              for (let i = 0; i < firstDayOfWeek; i++) {
                cells.push(<div key={`e-${i}`} />)
              }

              // Day cells
              for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                const status  = statusMap[dateStr]
                const isSun   = new Date(year, month - 1, d).getDay() === 0
                const st      = status ? STATUS_STYLE[status] : null
                const isToday = dateStr === new Date().toISOString().slice(0,10)

                cells.push(
                  <div key={d}
                    className="aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-semibold transition-all"
                    style={{
                      background: st ? st.bg : isSun ? 'rgba(248,113,113,0.05)' : 'transparent',
                      color:      st ? st.color : isSun ? '#f87171' : 'var(--text-muted)',
                      outline:    isToday ? '2px solid rgba(245,158,11,0.6)' : 'none',
                      outlineOffset: '-2px',
                    }}
                  >
                    <span>{d}</span>
                    {status && (
                      <span className="text-[9px] leading-none mt-0.5" style={{ color: st.color }}>
                        {status === 'present' ? 'P' : status === 'absent' ? 'A' : 'H'}
                      </span>
                    )}
                  </div>
                )
              }

              return (
                <div className="grid grid-cols-7 gap-1">
                  {cells}
                </div>
              )
            })()}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 px-4 py-3 border-t"
            style={{ borderColor: 'var(--border)' }}>
            {Object.entries(STATUS_STYLE).map(([key, { color, bg, label }]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-md"
                  style={{ background: bg, border: `1px solid ${color}40` }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs mt-4" style={{ color: 'var(--text-faint)' }}>
        Read-only — contact your admin to correct any records
      </p>
    </div>
  )
}
