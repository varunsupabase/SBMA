import { useState } from 'react'
import { addEmployee, updateEmployee } from '../lib/db'
import { setEmployeePin } from '../lib/auth'
import { toast } from './Toast'
import { todayStr } from '../lib/utils'
import { Eye, EyeOff, Smartphone } from 'lucide-react'

/* ── Outside component — prevents focus loss on re-render ── */
function Field({ label, error, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
        style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      {children}
      {hint  && <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>{hint}</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

const PRESET_ROLES = [
  'Driver', 'Delivery Boy', 'Collection Agent',
  'Billing Staff', 'Helper', 'Manager',
  'Supervisor', 'Cashier', 'Security', 'Cook', 'Other'
]

export default function EmployeeForm({ employee, onSaved, onCancel }) {
  const isEdit = !!employee?.id

  const [name,        setName]        = useState(employee?.name || '')
  const [role,        setRole]        = useState(
    PRESET_ROLES.includes(employee?.role) ? employee?.role : (employee?.role ? '__custom__' : '')
  )
  const [customRole,  setCustomRole]  = useState(
    PRESET_ROLES.includes(employee?.role) || !employee?.role ? '' : (employee?.role || '')
  )
  const [phone,       setPhone]       = useState(employee?.phone || '')
  const [salary,      setSalary]      = useState(employee?.salary?.toString() || '')
  const [joiningDate, setJoiningDate] = useState(employee?.joining_date || todayStr())

  // Employee PIN (for app access)
  const [empPin,      setEmpPin]      = useState('')
  const [showPin,     setShowPin]     = useState(false)
  const [pinEnabled,  setPinEnabled]  = useState(false)  // toggle to set/change PIN

  const [saving,  setSaving]  = useState(false)
  const [errors,  setErrors]  = useState({})

  function clearErr(k) { setErrors(prev => ({ ...prev, [k]: '' })) }

  function validate() {
    const e = {}
    if (!name.trim()) e.name = 'Name is required'
    const finalRole = role === '__custom__' ? customRole.trim() : role
    if (!finalRole) e.role = 'Role is required'
    if (!salary || isNaN(salary) || Number(salary) < 0) e.salary = 'Valid salary required'
    if (pinEnabled && empPin && empPin.length < 4) e.pin = 'PIN must be at least 4 digits'
    return e
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const finalRole = role === '__custom__' ? customRole.trim() : role

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        role: finalRole,
        phone: phone.trim(),
        salary: Number(salary),
        joining_date: joiningDate,
        is_active: true,
      }

      let savedId = employee?.id

      if (isEdit) {
        await updateEmployee(employee.id, payload)
        toast('Employee updated')
      } else {
        const created = await addEmployee(payload)
        savedId = created.id
        toast('Employee added')
      }

      // Set employee PIN if admin filled it in
      if (pinEnabled && empPin && empPin.length >= 4) {
        await setEmployeePin(savedId, empPin)
        toast(`App PIN set for ${name.trim()}`, 'info')
      }

      onSaved()
    } catch (err) {
      toast(err.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <Field label="Full Name" error={errors.name}>
        <input className="input" placeholder="e.g. Rahul Kumar"
          value={name} onChange={e => { setName(e.target.value); clearErr('name') }} autoFocus />
      </Field>

      <Field label="Role" error={errors.role}>
        <select className="input" value={role}
          onChange={e => { setRole(e.target.value); clearErr('role') }}>
          <option value="">Select role…</option>
          {PRESET_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          <option value="__custom__">Custom role…</option>
        </select>
        {role === '__custom__' && (
          <input className="input mt-2" placeholder="Type custom role…"
            value={customRole} onChange={e => { setCustomRole(e.target.value); clearErr('role') }} />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone">
          <input className="input" type="tel" placeholder="9XXXXXXXXX"
            value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
        </Field>
        <Field label="Monthly Salary (₹)" error={errors.salary}>
          <input className="input mono" type="number" min="0" placeholder="15000"
            value={salary} onChange={e => { setSalary(e.target.value); clearErr('salary') }} />
        </Field>
      </div>

      <Field label="Joining Date">
        <input className="input" type="date" value={joiningDate}
          onChange={e => setJoiningDate(e.target.value)} />
      </Field>

      {/* ── Employee App Access PIN ────────────────── */}
      <div className="rounded-xl p-4 space-y-3"
        style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone size={15} style={{ color: '#38bdf8' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              App Access PIN
            </p>
          </div>
          <button type="button"
            onClick={() => { setPinEnabled(p => !p); setEmpPin('') }}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all"
            style={{
              background: pinEnabled ? 'rgba(56,189,248,0.1)' : 'var(--surface)',
              color:      pinEnabled ? '#38bdf8' : 'var(--text-muted)',
              border:     `1px solid ${pinEnabled ? 'rgba(56,189,248,0.2)' : 'var(--border)'}`,
            }}>
            {pinEnabled ? 'Cancel' : isEdit ? 'Change PIN' : 'Set PIN'}
          </button>
        </div>

        {!pinEnabled && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {employee?.employee_pin
              ? '✓ PIN is set — employee can log in to the app'
              : 'No PIN set — employee cannot log in to the app yet'}
          </p>
        )}

        {pinEnabled && (
          <Field label="New 4-digit PIN" error={errors.pin}
            hint="Employee will use this to log in from any device">
            <div className="relative">
              <input
                className="input mono pr-10"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g. 1234"
                value={empPin}
                onChange={e => { setEmpPin(e.target.value.replace(/\D/g,'').slice(0,8)); clearErr('pin') }}
              />
              <button type="button" onClick={() => setShowPin(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}>
                {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Update Employee' : 'Add Employee'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
