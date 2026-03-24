import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Trophy, TrendingUp,
  Package, Users, BarChart2, RefreshCw, IndianRupee, Flame
} from 'lucide-react'
import { getEmployees, getMonthlyWorkStats } from '../lib/db'
import { formatCurrency, MONTHS } from '../lib/utils'
import { isConfigured } from '../lib/supabase'
import ConfigBanner from '../components/ConfigBanner'

/* ─── Medal colours ─────────────────────────────── */
const MEDAL = ['#f59e0b', '#94a3b8', '#b45309']
const RANK_LABEL = ['🥇', '🥈', '🥉']

/* ─── Mini bar chart ─────────────────────────────── */
function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.max(4, (value / max) * 100) : 4
  return (
    <div className="h-2 rounded-full overflow-hidden flex-1"
      style={{ background: 'var(--surface2)' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

/* ─── Stat card ─────────────────────────────────── */
function KpiCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="rounded-xl p-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{ background: `${accent}15` }}>
          <Icon size={14} style={{ color: accent }} />
        </div>
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
      </div>
      <p className="mono font-bold text-xl leading-none" style={{ color: 'var(--text)' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>{sub}</p>}
    </div>
  )
}

/* ─── Daily trend sparkline ─────────────────────── */
function Sparkline({ points, color = '#a78bfa' }) {
  if (!points.length) return null
  const max = Math.max(...points, 1)
  const W = 120, H = 32, pad = 2

  const pts = points.map((v, i) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * (W - pad * 2)
    const y = H - pad - ((v / max) * (H - pad * 2))
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((v, i) => {
        const x = pad + (i / Math.max(points.length - 1, 1)) * (W - pad * 2)
        const y = H - pad - ((v / max) * (H - pad * 2))
        return <circle key={i} cx={x} cy={y} r="2" fill={color} />
      })}
    </svg>
  )
}

/* ─── Main page ─────────────────────────────────── */
export default function Performance() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const [employees, setEmployees] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [emps, wlogs] = await Promise.all([
        getEmployees(),
        getMonthlyWorkStats(year, month),
      ])
      setEmployees(emps)
      setLogs(wlogs)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { load() }, [load])

  /* ─── Derived stats ─────────────────────────── */

  // Per-employee aggregates
  const empStats = employees.map(emp => {
    const empLogs = logs.filter(l => l.employee_id === emp.id)
    const totalOrders = empLogs.reduce((s, l) => s + (l.orders_delivered || 0), 0)
    const totalValue  = empLogs.reduce((s, l) => s + (l.order_value || 0), 0)
    const daysLogged  = empLogs.length
    const avgPerDay   = daysLogged > 0 ? (totalOrders / daysLogged).toFixed(1) : 0

    // Day-by-day array (sorted)
    const sortedDays = [...empLogs].sort((a, b) => a.date.localeCompare(b.date))
    const trend = sortedDays.map(l => l.orders_delivered || 0)

    return { ...emp, totalOrders, totalValue, daysLogged, avgPerDay, trend }
  })

  // Sorted leaderboard
  const leaderboard = [...empStats].sort((a, b) => b.totalOrders - a.totalOrders)
  const maxOrders   = leaderboard[0]?.totalOrders || 0

  // KPI totals
  const grandTotal  = empStats.reduce((s, e) => s + e.totalOrders, 0)
  const grandValue  = empStats.reduce((s, e) => s + e.totalValue, 0)
  const activeLogs  = empStats.filter(e => e.totalOrders > 0).length
  const avgPerEmp   = activeLogs > 0 ? (grandTotal / activeLogs).toFixed(1) : 0

  // Today's leaderboard from current month logs filtered by today
  const today = new Date().toISOString().slice(0, 10)
  const todayLogs   = logs.filter(l => l.date === today)
  const todayTotal  = todayLogs.reduce((s, l) => s + (l.orders_delivered || 0), 0)

  // Daily totals for the trend chart (all employees, by date)
  const dateMap = {}
  logs.forEach(l => {
    dateMap[l.date] = (dateMap[l.date] || 0) + (l.orders_delivered || 0)
  })
  const sortedDates  = Object.keys(dateMap).sort()
  const dailyTrend   = sortedDates.map(d => dateMap[d])

  // Best single day
  const bestDayDate  = sortedDates.reduce((best, d) => dateMap[d] > (dateMap[best] || 0) ? d : best, sortedDates[0])
  const bestDayCount = bestDayDate ? dateMap[bestDayDate] : 0

  return (
    <div className="max-w-2xl mx-auto">
      {!isConfigured && <ConfigBanner />}

      {/* Header */}
      <div className="page-header flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Performance</h1>
          <p className="page-sub">Orders & efficiency analytics</p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-between mb-5">
        <button className="btn-secondary p-2" onClick={prevMonth}><ChevronLeft size={16} /></button>
        <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
          {MONTHS[month - 1]} {year}
        </span>
        <button className="btn-secondary p-2" onClick={nextMonth}><ChevronRight size={16} /></button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl animate-pulse"
              style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : (
        <div className="space-y-5">

          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              icon={Package}
              label="Total Orders"
              value={grandTotal}
              sub={`${MONTHS[month-1]} ${year}`}
              accent="#a78bfa"
            />
            <KpiCard
              icon={IndianRupee}
              label="Total Value"
              value={formatCurrency(grandValue)}
              sub="Combined order value"
              accent="#34d399"
            />
            <KpiCard
              icon={Users}
              label="Avg / Employee"
              value={avgPerEmp}
              sub={`orders (${activeLogs} active)`}
              accent="#38bdf8"
            />
            <KpiCard
              icon={Flame}
              label="Best Day"
              value={bestDayCount}
              sub={bestDayDate ? new Date(bestDayDate).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : '—'}
              accent="#fb923c"
            />
          </div>

          {/* Today snapshot */}
          {todayTotal > 0 && (
            <div className="rounded-xl p-4"
              style={{
                background: 'rgba(167,139,250,0.05)',
                border: '1px solid rgba(167,139,250,0.2)',
              }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: '#a78bfa' }}>
                Today's Snapshot
              </p>
              <div className="flex items-center gap-4 mb-3">
                <div>
                  <p className="mono font-bold text-2xl" style={{ color: '#a78bfa' }}>{todayTotal}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>orders today</p>
                </div>
                <div className="flex-1" />
                {todayLogs.slice(0,3).map(l => (
                  <div key={l.employee_id} className="text-center">
                    <p className="mono font-bold text-sm" style={{ color: 'var(--text)' }}>
                      {l.orders_delivered}
                    </p>
                    <p className="text-xs truncate max-w-[60px]" style={{ color: 'var(--text-muted)' }}>
                      {l.employees?.name?.split(' ')[0]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly trend sparkline */}
          {dailyTrend.length > 1 && (
            <div className="rounded-xl p-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--text-faint)' }}>
                  Daily Trend
                </p>
                <p className="text-xs mono" style={{ color: 'var(--text-muted)' }}>
                  {dailyTrend.length} days logged
                </p>
              </div>
              <div className="flex items-end gap-1">
                {dailyTrend.map((v, i) => {
                  const h = Math.max(4, (v / Math.max(...dailyTrend)) * 48)
                  const isToday = sortedDates[i] === today
                  return (
                    <div
                      key={i}
                      title={`${sortedDates[i]}: ${v} orders`}
                      className="flex-1 rounded-t-sm transition-all duration-300"
                      style={{
                        height: `${h}px`,
                        background: isToday ? '#f59e0b' : 'rgba(167,139,250,0.5)',
                        minWidth: 4,
                      }}
                    />
                  )
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  {sortedDates[0] ? new Date(sortedDates[0]).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : ''}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  {sortedDates[sortedDates.length-1] ? new Date(sortedDates[sortedDates.length-1]).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : ''}
                </span>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'var(--text-faint)' }}>
              🏆 Leaderboard — {MONTHS[month-1]}
            </p>

            {leaderboard.every(e => e.totalOrders === 0) ? (
              <div className="text-center py-10 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <Package size={28} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  No work logs for this month
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
                  Add logs in the Work Logs page
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((emp, idx) => {
                  const medal = MEDAL[idx]
                  const rankEmoji = RANK_LABEL[idx]
                  const isTop = idx === 0 && emp.totalOrders > 0

                  return (
                    <div
                      key={emp.id}
                      className="rounded-xl px-4 py-3 transition-all"
                      style={{
                        background: isTop
                          ? 'rgba(245,158,11,0.06)'
                          : 'var(--surface)',
                        border: `1px solid ${isTop ? 'rgba(245,158,11,0.2)' : 'var(--border)'}`,
                        opacity: emp.totalOrders === 0 ? 0.45 : 1,
                      }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {/* Rank */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
                          style={{
                            background: emp.totalOrders > 0 ? `${medal}18` : 'var(--surface2)',
                            color: emp.totalOrders > 0 ? medal : 'var(--text-faint)',
                          }}
                        >
                          {emp.totalOrders > 0 ? (idx < 3 ? rankEmoji : `#${idx+1}`) : idx + 1}
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                            {emp.name}
                            {isTop && (
                              <span className="ml-2 text-xs font-normal text-amber-500">Top Performer</span>
                            )}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {emp.role || '—'} · {emp.daysLogged}d logged · avg {emp.avgPerDay}/day
                          </p>
                        </div>

                        {/* Score */}
                        <div className="text-right shrink-0">
                          <p className="mono font-bold text-base"
                            style={{ color: emp.totalOrders > 0 ? medal : 'var(--text-faint)' }}>
                            {emp.totalOrders}
                          </p>
                          {emp.totalValue > 0 && (
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {formatCurrency(emp.totalValue)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="flex items-center gap-2">
                        <MiniBar
                          value={emp.totalOrders}
                          max={maxOrders}
                          color={emp.totalOrders > 0 ? medal : 'var(--text-faint)'}
                        />
                        <span className="text-xs mono shrink-0"
                          style={{ color: 'var(--text-faint)', minWidth: 28, textAlign: 'right' }}>
                          {maxOrders > 0 ? Math.round((emp.totalOrders / maxOrders) * 100) : 0}%
                        </span>
                      </div>

                      {/* Mini sparkline for top 3 */}
                      {emp.trend.length > 1 && idx < 3 && emp.totalOrders > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Trend</span>
                          <Sparkline points={emp.trend} color={medal} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Per-employee breakdown table */}
          {grandTotal > 0 && (
            <div className="rounded-xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--text-faint)' }}>
                  Detailed Breakdown
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Employee', 'Orders', 'Value', 'Days', 'Avg/Day'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-semibold"
                          style={{ color: 'var(--text-faint)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map(emp => (
                      <tr key={emp.id}
                        style={{ borderBottom: '1px solid var(--border)', opacity: emp.totalOrders ? 1 : 0.4 }}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>
                              {emp.name[0]}
                            </div>
                            <span className="font-medium truncate max-w-[90px]"
                              style={{ color: 'var(--text)' }}>
                              {emp.name.split(' ')[0]}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 mono font-bold" style={{ color: '#a78bfa' }}>
                          {emp.totalOrders}
                        </td>
                        <td className="px-4 py-2.5 mono text-xs" style={{ color: '#34d399' }}>
                          {emp.totalValue > 0 ? formatCurrency(emp.totalValue) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {emp.daysLogged}
                        </td>
                        <td className="px-4 py-2.5 mono text-xs" style={{ color: 'var(--text-muted)' }}>
                          {emp.avgPerDay}
                        </td>
                      </tr>
                    ))}
                    {/* Total row */}
                    <tr style={{ background: 'var(--surface2)' }}>
                      <td className="px-4 py-2.5 text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                        TOTAL
                      </td>
                      <td className="px-4 py-2.5 mono font-bold text-amber-500">{grandTotal}</td>
                      <td className="px-4 py-2.5 mono font-bold text-emerald-400 text-xs">
                        {grandValue > 0 ? formatCurrency(grandValue) : '—'}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
