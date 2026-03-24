import { useState, useEffect } from 'react'
import {
  Plus, Download, ChevronDown, CheckCircle,
  IndianRupee, Search, AlertCircle
} from 'lucide-react'
import { getEmployees, getAdvances, addAdvance, markAdvanceRepaid } from '../lib/db'
import { formatCurrency, formatDate, todayStr } from '../lib/utils'
import { exportAdvances } from '../lib/export'
import { toast } from '../components/Toast'
import Modal from '../components/Modal'
import { isConfigured } from '../lib/supabase'
import ConfigBanner from '../components/ConfigBanner'

export default function Advances() {
  const [advances, setAdvances] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterEmp, setFilterEmp] = useState('all')
  const [filterStatus, setFilterStatus] = useState('pending')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ employee_id: '', amount: '', date: todayStr(), note: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [a, e] = await Promise.all([getAdvances(), getEmployees()])
      setAdvances(a)
      setEmployees(e)
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.employee_id) { toast('Select an employee', 'error'); return }
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) {
      toast('Enter a valid amount', 'error'); return
    }
    setSaving(true)
    try {
      await addAdvance({
        employee_id: form.employee_id,
        amount: Number(form.amount),
        date: form.date,
        note: form.note || null,
        is_repaid: false,
      })
      toast('Advance recorded')
      setModal(false)
      setForm({ employee_id: '', amount: '', date: todayStr(), note: '' })
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleRepaid(id, name, amount) {
    if (!confirm(`Mark ₹${amount} advance from ${name} as repaid?`)) return
    try {
      await markAdvanceRepaid(id)
      toast('Marked as repaid')
      load()
    } catch (err) { toast(err.message, 'error') }
  }

  // Filter
  const filtered = advances.filter(a => {
    if (filterEmp !== 'all' && a.employee_id !== filterEmp) return false
    if (filterStatus === 'pending' && a.is_repaid) return false
    if (filterStatus === 'repaid' && !a.is_repaid) return false
    return true
  })

  const totalPending = advances
    .filter(a => !a.is_repaid)
    .reduce((s, a) => s + (a.amount || 0), 0)

  // Group by employee
  const pendingByEmp = {}
  advances.filter(a => !a.is_repaid).forEach(a => {
    const n = a.employees?.name || a.employee_id
    pendingByEmp[n] = (pendingByEmp[n] || 0) + a.amount
  })

  return (
    <div className="max-w-2xl mx-auto">
      {!isConfigured && <ConfigBanner />}

      <div className="page-header flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Advances</h1>
          <p className="page-sub">{formatCurrency(totalPending)} pending total</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            className="btn-secondary text-xs px-3 py-2"
            onClick={() => { exportAdvances(advances); toast('Exported CSV') }}
          >
            <Download size={13} /> CSV
          </button>
          <button className="btn-primary text-xs px-3 py-2" onClick={() => setModal(true)}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Pending summary */}
      {Object.keys(pendingByEmp).length > 0 && (
        <div className="rounded-xl p-4 mb-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2.5"
            style={{ color: 'var(--text-faint)' }}>
            Pending by Employee
          </p>
          <div className="space-y-1.5">
            {Object.entries(pendingByEmp).map(([name, amt]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{name}</span>
                <span className="mono text-sm font-semibold text-amber-500">
                  {formatCurrency(amt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <select
          className="input flex-1"
          value={filterEmp}
          onChange={e => setFilterEmp(e.target.value)}
        >
          <option value="all">All Employees</option>
          {employees.map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <select
          className="input w-36"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="repaid">Repaid</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse"
              style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle size={32} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="font-semibold" style={{ color: 'var(--text)' }}>No advances found</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {filterStatus === 'pending' ? 'No pending advances' : 'Adjust filters to view records'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(adv => (
            <div
              key={adv.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                opacity: adv.is_repaid ? 0.6 : 1,
              }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                style={{
                  background: adv.is_repaid ? 'rgba(16,185,129,0.1)' : 'rgba(251,146,60,0.1)',
                  color: adv.is_repaid ? '#10b981' : '#fb923c',
                }}>
                {adv.employees?.name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {adv.employees?.name || '—'}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatDate(adv.date)}{adv.note ? ` · ${adv.note}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="mono font-bold text-sm"
                  style={{ color: adv.is_repaid ? '#10b981' : '#fb923c' }}>
                  {formatCurrency(adv.amount)}
                </p>
                {!adv.is_repaid ? (
                  <button
                    className="text-xs mt-0.5 text-emerald-400 hover:underline"
                    onClick={() => handleRepaid(adv.id, adv.employees?.name, adv.amount)}
                  >
                    Mark repaid
                  </button>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Repaid</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Advance Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Advance">
        <form onSubmit={handleAdd} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block"
              style={{ color: 'var(--text-muted)' }}>Employee</label>
            <select
              className="input"
              value={form.employee_id}
              onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
              required
            >
              <option value="">Select employee…</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block"
                style={{ color: 'var(--text-muted)' }}>Amount (₹)</label>
              <input
                className="input mono"
                type="number"
                min="1"
                placeholder="500"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block"
                style={{ color: 'var(--text-muted)' }}>Date</label>
              <input
                className="input"
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block"
              style={{ color: 'var(--text-muted)' }}>Note (optional)</label>
            <input
              className="input"
              placeholder="Reason for advance…"
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving…' : 'Add Advance'}
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
