import { useState } from 'react'
import { addEmployee, updateEmployee } from '../lib/db'
import { toast } from './Toast'
import { todayStr } from '../lib/utils'

/* ── Defined OUTSIDE component to prevent remount on every render ── */
function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
        style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      {children}
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

  const [name,        setName]        = useState(employee?.name         || '')
  const [role,        setRole]        = useState(
    // If the stored role is not in presets, it's a custom one
    PRESET_ROLES.includes(employee?.role) ? employee?.role : (employee?.role ? '__custom__' : '')
  )
  const [customRole,  setCustomRole]  = useState(
    PRESET_ROLES.includes(employee?.role) || !employee?.role ? '' : (employee?.role || '')
  )
  const [phone,       setPhone]       = useState(employee?.phone        || '')
  const [salary,      setSalary]      = useState(employee?.salary?.toString() || '')
  const [joiningDate, setJoiningDate] = useState(employee?.joining_date || todayStr())
  const [saving,      setSaving]      = useState(false)
  const [errors,      setErrors]      = useState({})

  function clearErr(k) { setErrors(prev => ({ ...prev, [k]: '' })) }

  function validate() {
    const e = {}
    if (!name.trim()) e.name = 'Name is required'
    const finalRole = role === '__custom__' ? customRole.trim() : role
    if (!finalRole) e.role = 'Role is required'
    if (!salary || isNaN(salary) || Number(salary) < 0) e.salary = 'Valid salary required'
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
      if (isEdit) {
        await updateEmployee(employee.id, payload)
        toast('Employee updated')
      } else {
        await addEmployee(payload)
        toast('Employee added')
      }
      onSaved()
    } catch (err) {
      toast(err.message || 'Failed to save employee', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <Field label="Full Name" error={errors.name}>
        <input
          className="input"
          placeholder="e.g. Rahul Kumar"
          value={name}
          onChange={e => { setName(e.target.value); clearErr('name') }}
          autoFocus
        />
      </Field>

      <Field label="Role" error={errors.role}>
        <select
          className="input"
          value={role}
          onChange={e => { setRole(e.target.value); clearErr('role') }}
        >
          <option value="">Select role…</option>
          {PRESET_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          <option value="__custom__">Custom role…</option>
        </select>
        {role === '__custom__' && (
          <input
            className="input mt-2"
            placeholder="Type custom role…"
            value={customRole}
            onChange={e => { setCustomRole(e.target.value); clearErr('role') }}
            autoFocus
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone">
          <input
            className="input"
            type="tel"
            placeholder="9XXXXXXXXX"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          />
        </Field>
        <Field label="Monthly Salary (₹)" error={errors.salary}>
          <input
            className="input mono"
            type="number"
            min="0"
            placeholder="15000"
            value={salary}
            onChange={e => { setSalary(e.target.value); clearErr('salary') }}
          />
        </Field>
      </div>

      <Field label="Joining Date">
        <input
          className="input"
          type="date"
          value={joiningDate}
          onChange={e => setJoiningDate(e.target.value)}
        />
      </Field>

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Update Employee' : 'Add Employee'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
