import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarCheck, Wallet,
  Banknote, X, Moon, Sun, Building2, ClipboardList, BarChart3
} from 'lucide-react'

const NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard',   group: 'Overview' },
  { to: '/employees',   icon: Users,           label: 'Employees',   group: 'Management' },
  { to: '/attendance',  icon: CalendarCheck,   label: 'Attendance',  group: 'Management' },
  { to: '/advances',    icon: Wallet,          label: 'Advances',    group: 'Management' },
  { to: '/salary',      icon: Banknote,        label: 'Salary',      group: 'Management' },
  { to: '/work-logs',   icon: ClipboardList,   label: 'Work Logs',   group: 'Performance' },
  { to: '/performance', icon: BarChart3,        label: 'Performance', group: 'Performance' },
]

const GROUPS = ['Overview', 'Management', 'Performance']

export default function Sidebar({ open, onClose, darkMode, onToggleDark }) {
  const location = useLocation()

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 flex flex-col
          w-64 transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:flex
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: '#f59e0b' }}>
              <Building2 size={16} className="text-black" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none" style={{ color: 'var(--text)' }}>
                EMP Manager
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Admin Panel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {GROUPS.map(group => {
            const items = NAV.filter(n => n.group === group)
            return (
              <div key={group} className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-1.5"
                  style={{ color: 'var(--text-faint)' }}>
                  {group}
                </p>
                <ul className="space-y-0.5">
                  {items.map(({ to, icon: Icon, label }) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        end={to === '/'}
                        onClick={onClose}
                        className={({ isActive }) => `
                          flex items-center gap-3 px-3 py-2.5 rounded-lg
                          text-sm font-medium transition-all
                          ${isActive ? '' : 'hover:bg-white/5'}
                        `}
                        style={({ isActive }) => ({
                          color: isActive ? '#f59e0b' : 'var(--text-muted)',
                          background: isActive ? 'rgba(245,158,11,0.08)' : undefined,
                        })}
                      >
                        {({ isActive }) => (
                          <>
                            <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                            <span className="flex-1">{label}</span>
                            {isActive && (
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onToggleDark}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
              text-sm font-medium transition-all hover:bg-white/5"
            style={{ color: 'var(--text-muted)' }}
          >
            {darkMode
              ? <><Sun size={17} strokeWidth={1.8} /><span>Light Mode</span></>
              : <><Moon size={17} strokeWidth={1.8} /><span>Dark Mode</span></>
            }
          </button>
        </div>
      </aside>
    </>
  )
}
