import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import {
  ChevronLeft, ChevronRight, Package, IndianRupee,
  Plus, Pencil, Trash2, Save, X, Download
} from 'lucide-react'
import {
  getEmployees, getWorkLogForDate, upsertWorkLog, deleteWorkLog
} from '../lib/db'
import { todayStr, yesterdayStr, formatCurrency } from '../lib/utils'
import { toast } from '../components/Toast'
import { isConfigured } from '../lib/supabase'
import ConfigBanner from '../components/ConfigBanner'

/* ─── Inline row editor ───────────────────────────── */
function LogRow({ emp, log, date, onSaved, onDeleted }) {
  const [editing, setEditing] = useState(!log)   // auto-open if no log yet
  const [orders, setOrders] = useState(log?.orders_delivered ?? '')
  const [value, setValue] = useState(log?.order_value ?? '')
  const [notes, setNotes] = useState(log?.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!orders || isNaN(orders) || Number(orders) < 0) {
      toast('Enter a valid order count', 'error'); return
    }
    setSaving(true)
    try {
      const saved = await upsertWorkLog({
        employee_id: emp.id,
        date,
        orders_delivered: Number(orders),
        order_value: value ? Number(value) : null,
        notes: notes || null,
      })
      toast('Saved')
      setEditing(false)
      onSaved(saved)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!log?.id) return
    if (!confirm('Delete this log entry?')) return
    try {
      await deleteWorkLog(log.id)
      toast('Deleted')
      onDeleted(emp.id)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${log ? 'rgba(167,139,250,0.2)' : 'var(--border)'}`,
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
          style={{
            background: log ? 'rgba(167,139,250,0.12)' : 'rgba(100,116,139,0.1)',
            color: log ? '#a78bfa' : '#64748b',
          }}
        >
          {emp.name[0]}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
            {emp.name}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{emp.role || '—'}</p>
        </div>

        {/* Summary if not editing */}
        {!editing && log && (
          <div className="flex items-center gap-3 mr-1">
            <div className="text-right">
              <p className="mono font-bold text-sm" style={{ color: '#a78bfa' }}>
                {log.orders_delivered} orders
              </p>
              {log.order_value > 0 && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatCurrency(log.order_value)}
                </p>
              )}
            </div>
          </div>
        )}

        {!editing && !log && (
          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Not logged</span>
        )}

        {/* Actions */}
        <div className="flex gap-1 shrink-0">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: 'var(--text-muted)' }}
              title="Edit"
            >
              <Pencil size={14} />
            </button>
          )}
          {!editing && log && (
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: '#f87171' }}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
          {editing && (
            <button
              onClick={() => { setEditing(false); if (!log) { setOrders(''); setValue(''); setNotes('') } }}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div
          className="px-4 pb-4 pt-2 space-y-3 animate-fade-in"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest mb-1 block"
                style={{ color: 'var(--text-muted)' }}>
                Orders Delivered *
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                className="input mono"
                value={orders}
                onChange={e => setOrders(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest mb-1 block"
                style={{ color: 'var(--text-muted)' }}>
                Order Value (₹)
              </label>
              <input
                type="number"
                min="0"
                placeholder="Optional"
                className="input mono"
                value={value}
                onChange={e => setValue(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest mb-1 block"
              style={{ color: 'var(--text-muted)' }}>
              Notes
            </label>
            <input
              className="input"
              placeholder="Optional note…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
          <button
            className="btn-primary w-full py-2"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={14} />
            {saving ? 'Saving…' : 'Save Log'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────── */
export default function WorkLogs() {
  const today = todayStr()
  const [date, setDate] = useState(today)
  const [employees, setEmployees] = useState([])
  const [logs, setLogs] = useState({})       // { empId: log }
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getEmployees().then(setEmployees).catch(e => toast(e.message, 'error'))
  }, [])

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getWorkLogForDate(date)
      const map = {}
      data.forEach(l => { map[l.employee_id] = l })
      setLogs(map)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { loadLogs() }, [loadLogs])

  function shiftDate(days) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    setDate(format(d, 'yyyy-MM-dd'))
  }

  function handleSaved(emp, savedLog) {
    setLogs(prev => ({ ...prev, [emp.id]: savedLog }))
  }

  function handleDeleted(empId) {
    setLogs(prev => { const n = { ...prev }; delete n[empId]; return n })
  }

  function exportCSV() {
    const rows = [['Employee', 'Role', 'Date', 'Orders Delivered', 'Order Value (₹)', 'Notes']]
    employees.forEach(emp => {
      const l = logs[emp.id]
      if (l) rows.push([emp.name, emp.role || '', l.date, l.orders_delivered, l.order_value || '', l.notes || ''])
    })
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `work_logs_${date}.csv`; a.click()
    toast('Exported CSV')
  }

  const loggedCount = Object.keys(logs).length
  const totalOrders = Object.values(logs).reduce((s, l) => s + (l.orders_delivered || 0), 0)
  const totalValue  = Object.values(logs).reduce((s, l) => s + (l.order_value || 0), 0)

  const filtered = employees.filter(e =>
    !search ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.role || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-2xl mx-auto">
      {!isConfigured && <ConfigBanner />}

      {/* Header */}
      <div className="page-header flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Work Logs</h1>
          <p className="page-sub">Track daily orders per employee</p>
        </div>
        <button className="btn-secondary text-xs px-3 py-2" onClick={exportCSV}>
          <Download size={13} /> CSV
        </button>
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-2 mb-4">
        <button className="btn-secondary p-2" onClick={() => shiftDate(-1)}>
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
        <button className="btn-secondary p-2" onClick={() => shiftDate(1)} disabled={date >= today}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 flex-1">
          <Package size={15} style={{ color: '#a78bfa' }} />
          <span className="mono font-bold text-base" style={{ color: '#a78bfa' }}>
            {totalOrders}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>orders</span>
        </div>
        {totalValue > 0 && (
          <div className="flex items-center gap-2">
            <span className="mono font-bold text-sm" style={{ color: '#34d399' }}>
              {formatCurrency(totalValue)}
            </span>
          </div>
        )}
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
          {loggedCount}/{employees.length} logged
        </span>
      </div>

      {/* Search */}
      <div className="mb-3">
        <input
          className="input"
          placeholder="Filter employees…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Employee log rows */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse"
              style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p style={{ color: 'var(--text-muted)' }}>No active employees found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(emp => (
            <LogRow
              key={emp.id}
              emp={emp}
              log={logs[emp.id] || null}
              date={date}
              onSaved={(saved) => handleSaved(emp, saved)}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}
    </div>
  )
}
