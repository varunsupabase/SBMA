import { useState, useEffect } from 'react'
import {
  UserPlus, Search, Edit2, ToggleLeft, ToggleRight,
  Download, Phone, IndianRupee, ChevronDown
} from 'lucide-react'
import { getEmployees, toggleEmployeeActive } from '../lib/db'
import { formatCurrency, formatDate } from '../lib/utils'
import { exportEmployees } from '../lib/export'
import { toast } from '../components/Toast'
import Modal from '../components/Modal'
import EmployeeForm from '../components/EmployeeForm'
import { isConfigured } from '../lib/supabase'
import ConfigBanner from '../components/ConfigBanner'

export default function Employees() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [modal, setModal] = useState(null) // null | 'add' | employee obj
  const [expandedId, setExpandedId] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const data = await getEmployees(showInactive)
      setEmployees(data)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [showInactive])

  async function handleToggle(emp) {
    try {
      await toggleEmployeeActive(emp.id, !emp.is_active)
      toast(`${emp.name} ${emp.is_active ? 'deactivated' : 'activated'}`)
      load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.role || '').toLowerCase().includes(search.toLowerCase())
  )

  const roleColors = {
    Manager: '#818cf8',
    Supervisor: '#38bdf8',
    Cashier: '#fb923c',
    Driver: '#10b981',
    Helper: '#f59e0b',
    Security: '#f87171',
    default: '#94a3b8',
  }

  return (
    <div className="max-w-2xl mx-auto">
      {!isConfigured && <ConfigBanner />}

      {/* Header */}
      <div className="page-header flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-sub">{employees.filter(e => e.is_active).length} active employees</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="btn-secondary text-xs px-3 py-2"
            onClick={() => exportEmployees(employees)}
          >
            <Download size={13} />
            CSV
          </button>
          <button className="btn-primary text-xs px-3 py-2" onClick={() => setModal('add')}>
            <UserPlus size={14} />
            Add
          </button>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-faint)' }} />
          <input
            className="input pl-8"
            placeholder="Search by name or role…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowInactive(s => !s)}
          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all shrink-0`}
          style={{
            background: showInactive ? 'rgba(148,163,184,0.1)' : 'transparent',
            color: 'var(--text-muted)',
            borderColor: 'var(--border)',
          }}
        >
          {showInactive ? 'Hide Inactive' : 'Show All'}
        </button>
      </div>

      {/* Employee list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse"
              style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-semibold" style={{ color: 'var(--text)' }}>No employees found</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {search ? 'Try a different search' : 'Add your first employee to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(emp => {
            const isExpanded = expandedId === emp.id
            const color = roleColors[emp.role] || roleColors.default
            return (
              <div
                key={emp.id}
                className="rounded-xl overflow-hidden transition-all"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  opacity: emp.is_active ? 1 : 0.55,
                }}
              >
                {/* Row */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : emp.id)}
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
                    style={{ background: `${color}15`, color }}
                  >
                    {emp.name[0].toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
                        {emp.name}
                      </span>
                      {!emp.is_active && (
                        <span className="chip-inactive text-xs px-1.5 py-0.5 rounded-md font-medium shrink-0">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs" style={{ color }}>{emp.role || '—'}</span>
                      <span className="text-xs mono" style={{ color: 'var(--text-muted)' }}>
                        {formatCurrency(emp.salary)}/mo
                      </span>
                    </div>
                  </div>

                  <ChevronDown
                    size={15}
                    className={`shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--text-faint)' }}
                  />
                </button>

                {/* Expanded */}
                {isExpanded && (
                  <div
                    className="px-4 pb-4 pt-0 space-y-3 animate-fade-in"
                    style={{ borderTop: '1px solid var(--border)' }}
                  >
                    <div className="grid grid-cols-2 gap-2 pt-3">
                      {emp.phone && (
                        <a
                          href={`tel:${emp.phone}`}
                          className="flex items-center gap-2 text-xs font-medium"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <Phone size={13} /> {emp.phone}
                        </a>
                      )}
                      <span className="flex items-center gap-1 text-xs"
                        style={{ color: 'var(--text-muted)' }}>
                        Joined: {formatDate(emp.joining_date)}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        className="btn-secondary flex-1 text-xs py-2"
                        onClick={() => setModal(emp)}
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                      <button
                        className={`flex-1 text-xs py-2 rounded-lg border font-medium transition-all flex items-center justify-center gap-1.5`}
                        style={{
                          color: emp.is_active ? '#f87171' : '#10b981',
                          borderColor: emp.is_active ? 'rgba(248,113,113,0.3)' : 'rgba(16,185,129,0.3)',
                          background: 'transparent',
                        }}
                        onClick={() => handleToggle(emp)}
                      >
                        {emp.is_active
                          ? <><ToggleLeft size={13} /> Deactivate</>
                          : <><ToggleRight size={13} /> Activate</>
                        }
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add Employee' : 'Edit Employee'}
      >
        {modal && (
          <EmployeeForm
            employee={modal === 'add' ? null : modal}
            onSaved={() => { setModal(null); load() }}
            onCancel={() => setModal(null)}
          />
        )}
      </Modal>
    </div>
  )
}
