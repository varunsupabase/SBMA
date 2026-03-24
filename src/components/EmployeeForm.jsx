import { useState } from 'react'
import { addEmployee, updateEmployee } from '../lib/db'
import { toast } from './Toast'
import { todayStr } from '../lib/utils'

const ROLES = [
  'Manager', 'Supervisor', 'Cashier', 'Sales Staff',
  'Driver', 'Helper', 'Security', 'Cleaner', 'Cook', 'Other'
]

export default function EmployeeForm({ employee, onSaved, onCancel }) {
  const isEdit = !!employee?.id
  const [form, setForm] = useState({
    name: employee?.name || '',
    role: employee?.role || '',
    phone: employee?.phone || '',
    salary: employee?.salary || '',
    joining_date: employee?.joining_date || todayStr(),
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.role) e.role = 'Role is required'
    if (!form.salary || isNaN(form.salary) || Number(form.salary) < 0)
      e.salary = 'Valid salary required'
    return e
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    try {
      const payload = {
        ...form,
        salary: Number(form.salary),
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

  const Field = ({ label, error, children }) => (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
        style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <Field label="Full Name" error={errors.name}>
        <input
          className="input"
          placeholder="e.g. Rahul Kumar"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          autoFocus
        />
      </Field>

      <Field label="Role" error={errors.role}>
        <select
          className="input"
          value={form.role}
          onChange={e => set('role', e.target.value)}
        >
          <option value="">Select role…</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone" error={errors.phone}>
          <input
            className="input"
            type="tel"
            placeholder="9XXXXXXXXX"
            value={form.phone}
            onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
          />
        </Field>

        <Field label="Monthly Salary (₹)" error={errors.salary}>
          <input
            className="input mono"
            type="number"
            min="0"
            placeholder="15000"
            value={form.salary}
            onChange={e => set('salary', e.target.value)}
          />
        </Field>
      </div>

      <Field label="Joining Date">
        <input
          className="input"
          type="date"
          value={form.joining_date}
          onChange={e => set('joining_date', e.target.value)}
        />
      </Field>

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Update Employee' : 'Add Employee'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
