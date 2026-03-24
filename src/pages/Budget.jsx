import { useState, useEffect } from 'react'
import {
  Plus, Wallet, TrendingDown, TrendingUp, Trash2,
  ChevronDown, Download, IndianRupee
} from 'lucide-react'
import { getBudgetEntries, addBudgetEntry, deleteBudgetEntry, getExpenses, addExpense, deleteExpense, getEmployees } from '../lib/db'
import { formatCurrency, formatDate, todayStr } from '../lib/utils'
import { toast } from '../components/Toast'
import Modal from '../components/Modal'
import { isConfigured } from '../lib/supabase'
import ConfigBanner from '../components/ConfigBanner'

const EXPENSE_CATS = ['Petrol', 'Cargo', 'Courier', 'Office', 'Food', 'Repair', 'Cleaning', 'Other']
const CAT_COLORS   = {
  Petrol: '#f59e0b', Cargo: '#38bdf8', Courier: '#a78bfa',
  Office: '#10b981', Food: '#fb923c', Repair: '#f87171',
  Cleaning: '#34d399', Other: '#94a3b8',
}

/* ── Field outside component ── */
function LF({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
        style={{ color:'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

export default function Budget() {
  const [budgets,   setBudgets]   = useState([])
  const [expenses,  setExpenses]  = useState([])
  const [employees, setEmployees] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('overview')  // overview | expenses | budget
  const [modal,     setModal]     = useState(null)        // null | 'budget' | 'expense'

  // Budget form state
  const [bAmount, setBAmount] = useState('')
  const [bNote,   setBNote]   = useState('')
  const [bDate,   setBDate]   = useState(todayStr())
  const [bSaving, setBSaving] = useState(false)

  // Expense form state
  const [eAmount,   setEAmount]   = useState('')
  const [eCat,      setECat]      = useState('Petrol')
  const [eEmp,      setEEmp]      = useState('')
  const [eNote,     setENote]     = useState('')
  const [eDate,     setEDate]     = useState(todayStr())
  const [eSaving,   setESaving]   = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [b, ex, emps] = await Promise.all([getBudgetEntries(), getExpenses(), getEmployees()])
      setBudgets(b); setExpenses(ex); setEmployees(emps)
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleAddBudget(e) {
    e.preventDefault()
    if (!bAmount || isNaN(bAmount) || Number(bAmount) <= 0) { toast('Enter valid amount', 'error'); return }
    setBSaving(true)
    try {
      await addBudgetEntry({ amount: Number(bAmount), date: bDate, note: bNote.trim() || null })
      toast('Budget added')
      setBAmount(''); setBNote(''); setBDate(todayStr())
      setModal(null); load()
    } catch (err) { toast(err.message, 'error') }
    finally { setBSaving(false) }
  }

  async function handleAddExpense(e) {
    e.preventDefault()
    if (!eAmount || isNaN(eAmount) || Number(eAmount) <= 0) { toast('Enter valid amount', 'error'); return }
    setESaving(true)
    try {
      await addExpense({
        amount: Number(eAmount), category: eCat,
        employee_id: eEmp || null, date: eDate, note: eNote.trim() || null,
      })
      toast('Expense recorded')
      setEAmount(''); setECat('Petrol'); setEEmp(''); setENote(''); setEDate(todayStr())
      setModal(null); load()
    } catch (err) { toast(err.message, 'error') }
    finally { setESaving(false) }
  }

  async function handleDeleteBudget(id) {
    if (!confirm('Delete this budget entry?')) return
    try { await deleteBudgetEntry(id); toast('Deleted'); load() }
    catch (err) { toast(err.message, 'error') }
  }

  async function handleDeleteExpense(id) {
    if (!confirm('Delete this expense?')) return
    try { await deleteExpense(id); toast('Deleted'); load() }
    catch (err) { toast(err.message, 'error') }
  }

  function exportCSV() {
    const rows = [['Date','Type','Category/Note','Amount','Employee']]
    budgets.forEach(b => rows.push([b.date,'Budget',b.note||'',b.amount,'']))
    expenses.forEach(ex => rows.push([ex.date,'Expense',ex.category+(ex.note?` — ${ex.note}`:''),ex.amount,ex.employees?.name||'']))
    const csv = rows.map(r=>r.join(',')).join('\n')
    const a = document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download='budget_expenses.csv'; a.click()
    toast('Exported')
  }

  const totalBudget   = budgets.reduce((s,b) => s+(b.amount||0), 0)
  const totalExpenses = expenses.reduce((s,e) => s+(e.amount||0), 0)
  const balance       = totalBudget - totalExpenses
  const isNegative    = balance < 0

  // Category breakdown
  const catBreakdown = {}
  expenses.forEach(e => { catBreakdown[e.category] = (catBreakdown[e.category]||0) + (e.amount||0) })

  return (
    <div className="max-w-2xl mx-auto">
      {!isConfigured && <ConfigBanner />}

      <div className="page-header flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Shop Budget</h1>
          <p className="page-sub">Track income & expenses</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="btn-secondary text-xs px-3 py-2" onClick={exportCSV}><Download size={13} /> CSV</button>
          <button className="btn-secondary text-xs px-3 py-2"
            style={{ color:'#10b981', borderColor:'rgba(16,185,129,0.3)' }}
            onClick={() => setModal('budget')}>
            <TrendingUp size={14} /> Add Budget
          </button>
          <button className="btn-primary text-xs px-3 py-2" onClick={() => setModal('expense')}>
            <TrendingDown size={14} /> Expense
          </button>
        </div>
      </div>

      {/* Balance card */}
      <div className="rounded-2xl p-5 mb-5"
        style={{
          background: isNegative ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)',
          border: `1px solid ${isNegative ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
        }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: isNegative ? '#f87171' : '#10b981' }}>
          Available Balance
        </p>
        <p className="mono font-bold text-3xl" style={{ color: isNegative ? '#f87171' : '#10b981' }}>
          {formatCurrency(balance)}
        </p>
        <div className="flex gap-6 mt-3">
          <div>
            <p className="text-xs" style={{ color:'var(--text-muted)' }}>Total Budget</p>
            <p className="mono font-semibold text-base" style={{ color:'#10b981' }}>+{formatCurrency(totalBudget)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color:'var(--text-muted)' }}>Total Expenses</p>
            <p className="mono font-semibold text-base" style={{ color:'#f87171' }}>-{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      {Object.keys(catBreakdown).length > 0 && (
        <div className="rounded-xl p-4 mb-4" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color:'var(--text-faint)' }}>
            Expense Breakdown
          </p>
          <div className="space-y-2">
            {Object.entries(catBreakdown).sort((a,b)=>b[1]-a[1]).map(([cat, amt]) => {
              const pct = totalExpenses > 0 ? (amt/totalExpenses)*100 : 0
              const col = CAT_COLORS[cat] || '#94a3b8'
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs w-20 shrink-0" style={{ color:'var(--text-muted)' }}>{cat}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background:'var(--surface2)' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width:`${Math.max(pct,2)}%`, background:col }} />
                  </div>
                  <span className="mono text-xs w-20 text-right shrink-0" style={{ color:col }}>
                    {formatCurrency(amt)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg mb-4 w-fit"
        style={{ background:'var(--surface)' }}>
        {[['overview','All'],['expenses','Expenses'],['budget','Budget']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className="px-4 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{ background:tab===k?'#f59e0b':'transparent', color:tab===k?'#000':'var(--text-muted)' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Unified transaction list */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i)=>(
          <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background:'var(--surface)' }} />
        ))}</div>
      ) : (
        <div className="space-y-2">
          {/* Budget entries */}
          {(tab === 'overview' || tab === 'budget') && budgets.map(b => (
            <div key={b.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background:'var(--surface)', border:'1px solid rgba(16,185,129,0.15)' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background:'rgba(16,185,129,0.1)' }}>
                <TrendingUp size={16} className="text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color:'var(--text)' }}>
                  Budget Added
                  {b.note && <span className="font-normal text-xs ml-2" style={{ color:'var(--text-muted)' }}>· {b.note}</span>}
                </p>
                <p className="text-xs" style={{ color:'var(--text-muted)' }}>{formatDate(b.date)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="mono font-bold text-sm text-emerald-400">+{formatCurrency(b.amount)}</span>
                <button onClick={() => handleDeleteBudget(b.id)} className="p-1.5 rounded-lg hover:bg-white/5"
                  style={{ color:'var(--text-faint)' }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}

          {/* Expense entries */}
          {(tab === 'overview' || tab === 'expenses') && expenses.map(ex => {
            const col = CAT_COLORS[ex.category] || '#94a3b8'
            return (
              <div key={ex.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{ background:`${col}15`, color:col }}>
                  {ex.category.slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color:'var(--text)' }}>
                    {ex.category}
                    {ex.note && <span className="font-normal text-xs ml-2" style={{ color:'var(--text-muted)' }}>· {ex.note}</span>}
                  </p>
                  <p className="text-xs" style={{ color:'var(--text-muted)' }}>
                    {formatDate(ex.date)}
                    {ex.employees?.name && <span> · {ex.employees.name}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="mono font-bold text-sm" style={{ color:'#f87171' }}>-{formatCurrency(ex.amount)}</span>
                  <button onClick={() => handleDeleteExpense(ex.id)} className="p-1.5 rounded-lg hover:bg-white/5"
                    style={{ color:'var(--text-faint)' }}><Trash2 size={13} /></button>
                </div>
              </div>
            )
          })}

          {(tab==='overview' ? [...budgets,...expenses] : tab==='budget' ? budgets : expenses).length === 0 && (
            <div className="text-center py-12">
              <Wallet size={32} className="mx-auto mb-3" style={{ color:'var(--text-faint)' }} />
              <p className="font-semibold" style={{ color:'var(--text)' }}>No records yet</p>
              <p className="text-sm mt-1" style={{ color:'var(--text-muted)' }}>
                {tab==='budget' ? 'Add a budget entry to get started' : 'Record your first expense'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add Budget Modal */}
      <Modal open={modal==='budget'} onClose={() => setModal(null)} title="Add Budget">
        <form onSubmit={handleAddBudget} className="p-5 space-y-4">
          <LF label="Amount (₹) *">
            <input className="input mono text-lg" type="number" min="1" placeholder="1000"
              value={bAmount} onChange={e => setBAmount(e.target.value)} autoFocus />
          </LF>
          <div className="grid grid-cols-2 gap-3">
            <LF label="Date">
              <input className="input" type="date" value={bDate} onChange={e => setBDate(e.target.value)} />
            </LF>
            <LF label="Note">
              <input className="input" placeholder="Optional…" value={bNote} onChange={e => setBNote(e.target.value)} />
            </LF>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-primary flex-1 py-3" disabled={bSaving}
              style={{ background:'#10b981' }}>
              <TrendingUp size={16} /> {bSaving?'Adding…':'Add Budget'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Add Expense Modal */}
      <Modal open={modal==='expense'} onClose={() => setModal(null)} title="Add Expense">
        <form onSubmit={handleAddExpense} className="p-5 space-y-4">
          <LF label="Amount (₹) *">
            <input className="input mono text-lg" type="number" min="1" placeholder="500"
              value={eAmount} onChange={e => setEAmount(e.target.value)} autoFocus />
          </LF>
          <div className="grid grid-cols-2 gap-3">
            <LF label="Category">
              <select className="input" value={eCat} onChange={e => setECat(e.target.value)}>
                {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </LF>
            <LF label="Employee">
              <select className="input" value={eEmp} onChange={e => setEEmp(e.target.value)}>
                <option value="">Admin / None</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </LF>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <LF label="Date">
              <input className="input" type="date" value={eDate} onChange={e => setEDate(e.target.value)} />
            </LF>
            <LF label="Note">
              <input className="input" placeholder="Optional…" value={eNote} onChange={e => setENote(e.target.value)} />
            </LF>
          </div>
          {/* Category color chips */}
          <div className="flex flex-wrap gap-1.5">
            {EXPENSE_CATS.map(c => (
              <button key={c} type="button" onClick={() => setECat(c)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: eCat===c ? `${CAT_COLORS[c]}25` : 'var(--surface2)',
                  color:      eCat===c ? CAT_COLORS[c] : 'var(--text-muted)',
                  border:     `1px solid ${eCat===c ? CAT_COLORS[c]+'50' : 'transparent'}`,
                }}>
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-primary flex-1 py-3" disabled={eSaving}>
              <TrendingDown size={16} /> {eSaving?'Saving…':'Add Expense'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
