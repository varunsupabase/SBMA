import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Users, CheckCircle, XCircle, Clock,
  TrendingUp, AlertCircle, RefreshCw, ArrowRight, Package
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getDashboardStats } from '../lib/db'
import { formatCurrency } from '../lib/utils'
import { isConfigured } from '../lib/supabase'
import ConfigBanner from '../components/ConfigBanner'

function StatCard({ icon: Icon, label, value, sub, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl p-4 text-left w-full transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{
            background: `${accent}15`,
            border: `1px solid ${accent}25`,
          }}
        >
          <Icon size={17} style={{ color: accent }} />
        </div>
        {onClick && <ArrowRight size={14} style={{ color: 'var(--text-faint)' }} />}
      </div>
      <p className="text-xl font-bold mono leading-none mb-1" style={{ color: 'var(--text)' }}>
        {value}
      </p>
      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {sub && (
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>{sub}</p>
      )}
    </button>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const today = new Date()

  async function load() {
    setLoading(true)
    try {
      const s = await getDashboardStats()
      setStats(s)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const unmarked = stats
    ? stats.totalEmployees - stats.totalMarked
    : 0

  return (
    <div className="max-w-2xl mx-auto">
      {!isConfigured && <ConfigBanner />}

      {/* Header */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">{format(today, 'EEEE, d MMMM yyyy')}</p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: 'var(--text-muted)' }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl animate-pulse"
              style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Attendance section */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2.5"
              style={{ color: 'var(--text-faint)' }}>
              Today's Attendance
            </p>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={CheckCircle}
                label="Present"
                value={stats?.present ?? '—'}
                sub={`of ${stats?.totalEmployees} employees`}
                accent="#10b981"
                onClick={() => navigate('/attendance')}
              />
              <StatCard
                icon={XCircle}
                label="Absent"
                value={stats?.absent ?? '—'}
                accent="#f87171"
                onClick={() => navigate('/attendance')}
              />
              <StatCard
                icon={Clock}
                label="Half Day"
                value={stats?.halfDay ?? '—'}
                accent="#f59e0b"
                onClick={() => navigate('/attendance')}
              />
              <StatCard
                icon={AlertCircle}
                label="Not Marked"
                value={unmarked < 0 ? 0 : unmarked}
                accent="#94a3b8"
                onClick={() => navigate('/attendance')}
              />
            </div>
          </div>

          {/* Financial section */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2.5"
              style={{ color: 'var(--text-faint)' }}>
              This Month
            </p>
            <div className="grid grid-cols-1 gap-3">
              <StatCard
                icon={TrendingUp}
                label="Salary Payable"
                value={formatCurrency(stats?.monthlySalary)}
                sub="Unpaid salary records this month"
                accent="#818cf8"
                onClick={() => navigate('/salary')}
              />
              <StatCard
                icon={AlertCircle}
                label="Total Pending Advances"
                value={formatCurrency(stats?.totalAdvances)}
                sub="All unrepaid advances"
                accent="#fb923c"
                onClick={() => navigate('/advances')}
              />
              <StatCard
                icon={Users}
                label="Active Employees"
                value={stats?.totalEmployees ?? '—'}
                accent="#38bdf8"
                onClick={() => navigate('/employees')}
              />
            </div>
          </div>

          {/* Orders section */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2.5"
              style={{ color: 'var(--text-faint)' }}>
              Today's Work
            </p>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={Package}
                label="Orders Delivered"
                value={stats?.todayOrders ?? '—'}
                sub="Today total"
                accent="#a78bfa"
                onClick={() => navigate('/work-logs')}
              />
              <StatCard
                icon={TrendingUp}
                label="Order Value"
                value={stats?.todayValue ? formatCurrency(stats.todayValue) : '₹—'}
                sub="Today revenue"
                accent="#34d399"
                onClick={() => navigate('/work-logs')}
              />
            </div>
          </div>

          {/* Quick actions */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2.5"
              style={{ color: 'var(--text-faint)' }}>
              Quick Actions
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Mark Attendance', path: '/attendance',  color: '#10b981' },
                { label: 'Add Advance',     path: '/advances',    color: '#fb923c' },
                { label: 'Log Orders',      path: '/work-logs',   color: '#a78bfa' },
                { label: 'Leaderboard',     path: '/performance', color: '#34d399' },
                { label: 'View Salary',     path: '/salary',      color: '#818cf8' },
                { label: 'Add Employee',    path: '/employees',   color: '#38bdf8' },
              ].map(({ label, path, color }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="py-3 px-4 rounded-xl text-sm font-semibold text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    background: `${color}10`,
                    border: `1px solid ${color}20`,
                    color,
                  }}
                >
                  {label} →
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
