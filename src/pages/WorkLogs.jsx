import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Package, Download, Minus, Plus, RotateCcw } from 'lucide-react'
import { getEmployees, getWorkLogForDate, upsertWorkLog, deleteWorkLog } from '../lib/db'
import { todayStr } from '../lib/utils'
import { toast } from '../components/Toast'
import { isConfigured } from '../lib/supabase'
import ConfigBanner from '../components/ConfigBanner'

/* ── Single employee counter row ─────────────────────
   - Shows employee name + role
   - + / − buttons to increment/decrement
   - Count displayed in the middle
   - Auto-saves 600ms after last tap (debounced)
   - Long-press − to reset to 0
──────────────────────────────────────────────────── */
function CounterRow({ emp, initialCount, date, onCountChange }) {
  const [count,   setCount]   = useState(initialCount ?? 0)
  const [saving,  setSaving]  = useState(false)
  const [flash,   setFlash]   = useState(null)   // 'up' | 'down' | null
  const saveTimer = useRef(null)
  const longPressTimer = useRef(null)

  // When date changes from parent, reset to new initial
  useEffect(() => {
    setCount(initialCount ?? 0)
  }, [initialCount, date])

  // Debounced auto-save
  function scheduleave(newCount) {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => persist(newCount), 600)
  }

  async function persist(newCount) {
    setSaving(true)
    try {
      if (newCount === 0) {
        await deleteWorkLog(emp.id, date)   // pass empId+date for cleanup
      } else {
        await upsertWorkLog({
          employee_id: emp.id,
          date,
          orders_delivered: newCount,
          order_value: null,
          notes: null,
        })
      }
      onCountChange(emp.id, newCount)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  function increment() {
    const next = count + 1
    setCount(next)
    setFlash('up')
    setTimeout(() => setFlash(null), 300)
    scheduleave(next)
  }

  function decrement() {
    const next = Math.max(0, count - 1)
    setCount(next)
    setFlash('down')
    setTimeout(() => setFlash(null), 300)
    scheduleave(next)
  }

  function reset() {
    setCount(0)
    clearTimeout(saveTimer.current)
    persist(0)
  }

  // Long-press minus to reset
  function onMinusDown() {
    longPressTimer.current = setTimeout(() => { reset() }, 700)
  }
  function onMinusUp() {
    clearTimeout(longPressTimer.current)
  }

  const hasCount = count > 0

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${hasCount ? 'rgba(167,139,250,0.25)' : 'var(--border)'}`,
      }}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
        style={{
          background: hasCount ? 'rgba(167,139,250,0.12)' : 'var(--surface2)',
          color: hasCount ? '#a78bfa' : 'var(--text-faint)',
          transition: 'all 0.2s',
        }}
      >
        {emp.name[0].toUpperCase()}
      </div>

      {/* Name + role */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
          {emp.name}
        </p>
        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
          {emp.role || '—'}
        </p>
      </div>

      {/* Saving indicator */}
      {saving && (
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>saving…</span>
      )}

      {/* Counter controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* − button */}
        <button
          onPointerDown={onMinusDown}
          onPointerUp={onMinusUp}
          onPointerLeave={onMinusUp}
          onClick={decrement}
          disabled={count === 0}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90"
          style={{
            background: count === 0 ? 'var(--surface2)' : 'rgba(248,113,113,0.1)',
            color: count === 0 ? 'var(--text-faint)' : '#f87171',
            border: `1px solid ${count === 0 ? 'var(--border)' : 'rgba(248,113,113,0.2)'}`,
          }}
          title="Hold to reset to 0"
        >
          <Minus size={16} />
        </button>

        {/* Count display */}
        <div
          className="w-12 h-10 rounded-xl flex items-center justify-center mono font-bold text-lg transition-all"
          style={{
            background: hasCount
              ? flash === 'up'   ? 'rgba(167,139,250,0.25)'
              : flash === 'down' ? 'rgba(248,113,113,0.15)'
              : 'rgba(167,139,250,0.1)'
              : 'var(--surface2)',
            color: hasCount ? '#a78bfa' : 'var(--text-faint)',
            transform: flash ? 'scale(1.15)' : 'scale(1)',
            border: `1px solid ${hasCount ? 'rgba(167,139,250,0.2)' : 'var(--border)'}`,
          }}
        >
          {count}
        </div>

        {/* + button */}
        <button
          onClick={increment}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90"
          style={{
            background: 'rgba(167,139,250,0.1)',
            color: '#a78bfa',
            border: '1px solid rgba(167,139,250,0.2)',
          }}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}

/* ── Main page ───────────────────────────────────── */
export default function WorkLogs() {
  const today = todayStr()
  const [date,      setDate]      = useState(today)
  const [employees, setEmployees] = useState([])
  const [counts,    setCounts]    = useState({})   // { empId: number }
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')

  // Load employees once
  useEffect(() => {
    getEmployees()
      .then(setEmployees)
      .catch(e => toast(e.message, 'error'))
  }, [])

  // Load existing logs whenever date changes
  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getWorkLogForDate(date)
      const map  = {}
      data.forEach(l => { map[l.employee_id] = l.orders_delivered })
      setCounts(map)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { loadLogs() }, [loadLogs])

  function shiftDate(days) {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() + days)
    setDate(format(d, 'yyyy-MM-dd'))
  }

  function handleCountChange(empId, newCount) {
    setCounts(prev => ({ ...prev, [empId]: newCount }))
  }

  function exportCSV() {
    const rows = [['Employee', 'Role', 'Date', 'Orders']]
    employees.forEach(emp => {
      const c = counts[emp.id] || 0
      if (c > 0) rows.push([emp.name, emp.role || '', date, c])
    })
    const csv  = rows.map(r => r.join(',')).join('\n')
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `work_logs_${date}.csv`
    a.click()
    toast('Exported CSV')
  }

  const totalOrders  = Object.values(counts).reduce((s, c) => s + (c || 0), 0)
  const loggedCount  = Object.values(counts).filter(c => c > 0).length

  const filtered = employees.filter(e =>
    !search ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.role || '').toLowerCase().includes(search.toLowerCase())
  )

  const isToday = date === today

  return (
    <div className="max-w-xl mx-auto">
      {!isConfigured && <ConfigBanner />}

      {/* Header */}
      <div className="page-header flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Work Logs</h1>
          <p className="page-sub">Tap + / − to update orders</p>
        </div>
        <button className="btn-secondary text-xs px-3 py-2" onClick={exportCSV}>
          <Download size={13} /> CSV
        </button>
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-2 mb-4">
        <button className="btn-secondary p-2.5" onClick={() => shiftDate(-1)}>
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1">
          <input
            type="date"
            value={date}
            max={today}
            onChange={e => setDate(e.target.value)}
            className="input text-center font-semibold"
          />
        </div>
        <button
          className="btn-secondary p-2.5"
          onClick={() => shiftDate(1)}
          disabled={date >= today}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Summary pill */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-xl mb-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <Package size={15} style={{ color: '#a78bfa' }} />
          <span className="mono font-bold text-lg" style={{ color: '#a78bfa' }}>
            {totalOrders}
          </span>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            orders {isToday ? 'today' : 'on this day'}
          </span>
        </div>
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
          {loggedCount} / {employees.length} logged
        </span>
      </div>

      {/* Optional search for large teams */}
      {employees.length > 6 && (
        <div className="mb-3">
          <input
            className="input"
            placeholder="Search employee…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Counter rows */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse"
              style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Package size={28} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="font-semibold" style={{ color: 'var(--text)' }}>No employees found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(emp => (
            <CounterRow
              key={emp.id}
              emp={emp}
              initialCount={counts[emp.id] ?? 0}
              date={date}
              onCountChange={handleCountChange}
            />
          ))}
        </div>
      )}

      {/* Long-press hint */}
      {employees.length > 0 && !loading && (
        <p className="text-center text-xs mt-5" style={{ color: 'var(--text-faint)' }}>
          Hold − to reset an employee's count to 0
        </p>
      )}
    </div>
  )
}
