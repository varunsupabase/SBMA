import { useState, useEffect, useCallback } from 'react'
import { format, getDaysInMonth } from 'date-fns'
import {
  ChevronLeft, ChevronRight, Copy, Download,
  CheckCircle, XCircle, Clock, Calendar
} from 'lucide-react'
import {
  getEmployees, getAttendanceForDate, upsertAttendance,
  duplicateAttendance, getMonthlyAttendance
} from '../lib/db'
import { todayStr, yesterdayStr, MONTHS } from '../lib/utils'
import { exportAttendance } from '../lib/export'
import { toast } from '../components/Toast'
import { isConfigured } from '../lib/supabase'
import ConfigBanner from '../components/ConfigBanner'

const STATUSES = [
  { value: 'present',  label: 'P',  full: 'Present',  chip: 'chip-present' },
  { value: 'absent',   label: 'A',  full: 'Absent',   chip: 'chip-absent' },
  { value: 'half_day', label: 'H',  full: 'Half Day', chip: 'chip-half' },
]

export default function Attendance() {
  const [tab, setTab] = useState('daily')  // 'daily' | 'monthly'
  const today = todayStr()
  const [selectedDate, setSelectedDate] = useState(today)
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState({})   // { empId: status }
  const [monthData, setMonthData] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})           // { empId: bool }

  // Load employees once
  useEffect(() => {
    getEmployees().then(setEmployees).catch(e => toast(e.message, 'error'))
  }, [])

  // Load daily attendance
  const loadDaily = useCallback(async () => {
    setLoading(true)
    try {
      const recs = await getAttendanceForDate(selectedDate)
      const map = {}
      recs.forEach(r => { map[r.employee_id] = r.status })
      setAttendance(map)
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }, [selectedDate])

  // Load monthly attendance
  const loadMonthly = useCallback(async () => {
    setLoading(true)
    try {
      const recs = await getMonthlyAttendance(year, month)
      setMonthData(recs)
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }, [year, month])

  useEffect(() => {
    if (tab === 'daily') loadDaily()
    else loadMonthly()
  }, [tab, loadDaily, loadMonthly])

  async function markAttendance(empId, status) {
    setSaving(s => ({ ...s, [empId]: true }))
    try {
      await upsertAttendance(empId, selectedDate, status)
      setAttendance(a => ({ ...a, [empId]: status }))
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(s => ({ ...s, [empId]: false }))
    }
  }

  async function handleDuplicate() {
    const yesterday = yesterdayStr()
    try {
      const count = await duplicateAttendance(yesterday, selectedDate)
      if (count === 0) {
        toast('No attendance found for yesterday', 'info')
      } else {
        toast(`Copied ${count} records from yesterday`)
        loadDaily()
      }
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  function handleExport() {
    const attendanceMap = {}
    employees.forEach(emp => {
      attendanceMap[emp.id] = monthData.filter(r => r.employee_id === emp.id)
    })
    exportAttendance(employees, attendanceMap, month, year)
    toast('Exported attendance CSV')
  }

  function shiftDate(days) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(format(d, 'yyyy-MM-dd'))
  }

  // Monthly grid helpers
  const daysInMonth = getDaysInMonth(new Date(year, month - 1))
  function empMonthStats(empId) {
    const recs = monthData.filter(r => r.employee_id === empId)
    return {
      present: recs.filter(r => r.status === 'present').length,
      half: recs.filter(r => r.status === 'half_day').length,
      absent: recs.filter(r => r.status === 'absent').length,
    }
  }
  function dayStatus(empId, day) {
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return monthData.find(r => r.employee_id === empId && r.date === dateStr)?.status
  }

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const totalPresent = Object.values(attendance).filter(v => v === 'present').length
  const totalAbsent  = Object.values(attendance).filter(v => v === 'absent').length
  const totalHalf    = Object.values(attendance).filter(v => v === 'half_day').length

  return (
    <div className="max-w-3xl mx-auto">
      {!isConfigured && <ConfigBanner />}

      {/* Header */}
      <div className="page-header flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-sub">Track daily & monthly attendance</p>
        </div>
        <button
          className="btn-secondary text-xs px-3 py-2"
          onClick={handleExport}
        >
          <Download size={13} /> CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg mb-5 w-fit"
        style={{ background: 'var(--surface)' }}>
        {['daily','monthly'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all"
            style={{
              background: tab === t ? '#f59e0b' : 'transparent',
              color: tab === t ? '#000' : 'var(--text-muted)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* DAILY TAB */}
      {tab === 'daily' && (
        <>
          {/* Date selector */}
          <div className="flex items-center gap-2 mb-4">
            <button className="btn-secondary p-2" onClick={() => shiftDate(-1)}>
              <ChevronLeft size={16} />
            </button>
            <div className="flex-1">
              <input
                type="date"
                value={selectedDate}
                max={today}
                onChange={e => setSelectedDate(e.target.value)}
                className="input text-center font-semibold"
              />
            </div>
            <button
              className="btn-secondary p-2"
              onClick={() => shiftDate(1)}
              disabled={selectedDate >= today}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Stats + Duplicate */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-3">
              <span className="chip-present text-xs px-2 py-1 rounded-md font-semibold">
                ✓ {totalPresent}
              </span>
              <span className="chip-absent text-xs px-2 py-1 rounded-md font-semibold">
                ✗ {totalAbsent}
              </span>
              <span className="chip-half text-xs px-2 py-1 rounded-md font-semibold">
                ½ {totalHalf}
              </span>
            </div>
            <button
              className="btn-secondary text-xs px-3 py-1.5"
              onClick={handleDuplicate}
            >
              <Copy size={13} /> Yesterday
            </button>
          </div>

          {/* Employee attendance list */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl animate-pulse"
                  style={{ background: 'var(--surface)' }} />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-12">
              <p style={{ color: 'var(--text-muted)' }}>No active employees. Add employees first.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {employees.map(emp => {
                const current = attendance[emp.id]
                const isSaving = saving[emp.id]
                return (
                  <div
                    key={emp.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                      text-xs font-bold text-amber-500"
                      style={{ background: 'rgba(245,158,11,0.1)' }}>
                      {emp.name[0]}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                        {emp.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{emp.role || '—'}</p>
                    </div>

                    {/* Status buttons */}
                    <div className="flex gap-1">
                      {STATUSES.map(st => (
                        <button
                          key={st.value}
                          disabled={isSaving}
                          onClick={() => markAttendance(emp.id, st.value)}
                          title={st.full}
                          className={`
                            w-9 h-9 rounded-lg text-xs font-bold transition-all
                            ${current === st.value ? st.chip : ''}
                          `}
                          style={current === st.value ? {} : {
                            background: 'var(--surface2)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {isSaving && current !== st.value ? '·' : st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* MONTHLY TAB */}
      {tab === 'monthly' && (
        <>
          {/* Month selector */}
          <div className="flex items-center justify-between mb-4">
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

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl animate-pulse"
                  style={{ background: 'var(--surface)' }} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {employees.map(emp => {
                const stats = empMonthStats(emp.id)
                return (
                  <div key={emp.id} className="rounded-xl overflow-hidden"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-amber-500"
                        style={{ background: 'rgba(245,158,11,0.1)' }}>
                        {emp.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                          {emp.name}
                        </p>
                      </div>
                      <div className="flex gap-2 text-xs font-semibold">
                        <span className="chip-present px-2 py-0.5 rounded-md">P:{stats.present}</span>
                        <span className="chip-half px-2 py-0.5 rounded-md">H:{stats.half}</span>
                        <span className="chip-absent px-2 py-0.5 rounded-md">A:{stats.absent}</span>
                      </div>
                    </div>

                    {/* Day grid */}
                    <div className="px-4 pb-3 flex flex-wrap gap-1">
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const st = dayStatus(emp.id, day)
                        return (
                          <div
                            key={day}
                            title={`Day ${day}: ${st || 'not marked'}`}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold"
                            style={{
                              background: st === 'present'  ? 'rgba(16,185,129,0.2)'
                                        : st === 'absent'   ? 'rgba(239,68,68,0.2)'
                                        : st === 'half_day' ? 'rgba(245,158,11,0.2)'
                                        : 'var(--surface2)',
                              color: st === 'present'  ? '#10b981'
                                   : st === 'absent'   ? '#f87171'
                                   : st === 'half_day' ? '#f59e0b'
                                   : 'var(--text-faint)',
                            }}
                          >
                            {day}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
