import { useState, useEffect } from 'react'
import {
  Plus, TrendingDown, Trash2, Download
} from 'lucide-react'
import { getExpenses, addExpense, deleteExpense } from '../lib/db'
import { formatCurrency, formatDate, todayStr } from '../lib/utils'
import { useSession } from '../lib/session'
import { toast } from '../components/Toast'
import Modal from '../components/Modal'

const CATS   = ['Petrol', 'Cargo', 'Courier', 'Office', 'Food', 'Repair', 'Cleaning', 'Other']
const COLORS  = {
  Petrol: '#f59e0b', Cargo: '#38bdf8', Courier: '#a78bfa',
  Office: '#10b981', Food: '#fb923c', Repair: '#f87171',
  Cleaning: '#34d399', Other: '#94a3b8',
}

/* ── Field outside component to prevent focus loss ── */
function LF({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
        style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

export default function MyExpenses() {
  const { employee } = useSession()

  const [expenses, setExpenses] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)

  // Form state — separate variables to avoid focus issues
  const [amount, setAmount] = useState('')
  const [cat,    setCat]    = useState('Petrol')
  const [date,   setDate]   = useState(todayStr())
  const [note,   setNote]   = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      // Query only this employee's expenses directly — no client-side filtering
      const data = await getExpenses(employee.id)
      setExpenses(data)
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      toast('Enter a valid amount', 'error'); return
    }
    setSaving(true)
    try {
      await addExpense({
        amount:      Number(amount),
        category:    cat,
        employee_id: employee.id,
        date,
        note:        note.trim() || null,
      })
      toast('Expense added')
      setAmount(''); setCat('Petrol'); setDate(todayStr()); setNote('')
      setModal(false)
      load()
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this expense?')) return
    try { await deleteExpense(id); toast('Deleted'); load() }
    catch (e) { toast(e.message, 'error') }
  }

  function exportCSV() {
    const rows = [['Date', 'Category', 'Amount', 'Note'],
      ...expenses.map(ex => [ex.date, ex.category, ex.amount, ex.note || ''])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `my_expenses.csv`; a.click()
    toast('Exported')
  }

  const totalSpent = expenses.reduce((s, e) => s + (e.amount || 0), 0)

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="page-header flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">My Expenses</h1>
          <p className="page-sub">{employee.name} · {formatCurrency(totalSpent)} total</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {expenses.length > 0 && (
            <button className="btn-secondary text-xs px-3 py-2" onClick={exportCSV}>
              <Download size={13} /> CSV
            </button>
          )}
          <button className="btn-primary text-xs px-3 py-2" onClick={() => setModal(true)}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Total card */}
      <div className="rounded-xl p-4 mb-5"
        style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: '#f87171' }}>Total Expenses</p>
        <p className="mono font-bold text-3xl" style={{ color: '#f87171' }}>
          {formatCurrency(totalSpent)}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {expenses.length} records
        </p>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_,i) => (
          <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
        ))}</div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-14 rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <TrendingDown size={28} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="font-semibold" style={{ color: 'var(--text)' }}>No expenses yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Tap + to log your first expense
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map(ex => {
            const col = COLORS[ex.category] || '#94a3b8'
            return (
              <div key={ex.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{ background: `${col}15`, color: col }}>
                  {ex.category.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {ex.category}
                    {ex.note && (
                      <span className="font-normal ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        · {ex.note}
                      </span>
                    )}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(ex.date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="mono font-bold text-sm" style={{ color: '#f87171' }}>
                    -{formatCurrency(ex.amount)}
                  </span>
                  <button onClick={() => handleDelete(ex.id)}
                    className="p-1.5 rounded-lg hover:bg-white/5"
                    style={{ color: 'var(--text-faint)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Log Expense">
        <form onSubmit={handleAdd} className="p-5 space-y-4">
          <LF label="Amount (₹) *">
            <input className="input mono text-xl" type="number" min="1" placeholder="0"
              value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
          </LF>

          {/* Category chips */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'var(--text-muted)' }}>Category</label>
            <div className="flex flex-wrap gap-2">
              {CATS.map(c => (
                <button key={c} type="button" onClick={() => setCat(c)}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: cat === c ? `${COLORS[c]}20` : 'var(--surface2)',
                    color:      cat === c ? COLORS[c] : 'var(--text-muted)',
                    border:     `1px solid ${cat === c ? COLORS[c] + '40' : 'transparent'}`,
                  }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <LF label="Date">
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </LF>

          <LF label="Note (optional)">
            <input className="input" placeholder="What was it for?" value={note}
              onChange={e => setNote(e.target.value)} />
          </LF>

          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-primary flex-1 py-3" disabled={saving}>
              <TrendingDown size={15} /> {saving ? 'Saving…' : 'Log Expense'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
