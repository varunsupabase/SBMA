import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarCheck, Wallet,
  Banknote, X, Moon, Sun, Building2, ClipboardList,
  BarChart3, BookUser, PiggyBank, LogOut
} from 'lucide-react'

const GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/',            icon: LayoutDashboard, label: 'Dashboard' },
    ]
  },
  {
    label: 'Management',
    items: [
      { to: '/employees',   icon: Users,           label: 'Employees' },
      { to: '/attendance',  icon: CalendarCheck,   label: 'Attendance' },
      { to: '/advances',    icon: Wallet,          label: 'Advances' },
      { to: '/salary',      icon: Banknote,        label: 'Salary' },
    ]
  },
  {
    label: 'Performance',
    items: [
      { to: '/work-logs',   icon: ClipboardList,   label: 'Work Logs' },
      { to: '/performance', icon: BarChart3,        label: 'Performance' },
    ]
  },
  {
    label: 'Business',
    items: [
      { to: '/contacts',    icon: BookUser,         label: 'Contacts' },
      { to: '/budget',      icon: PiggyBank,        label: 'Shop Budget' },
    ]
  },
]

export default function Sidebar({ open, onClose, darkMode, onToggleDark, onLogout }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col w-64
          transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:flex
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background:'var(--surface)', borderRight:'1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-4"
          style={{ borderBottom:'1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:'#f59e0b' }}>
              <Building2 size={16} className="text-black" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none" style={{ color:'var(--text)' }}>EMP Manager</p>
              <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>Admin Panel</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-white/5"
            style={{ color:'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto space-y-4">
          {GROUPS.map(({ label, items }) => (
            <div key={label}>
              <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-1.5"
                style={{ color:'var(--text-faint)' }}>{label}</p>
              <ul className="space-y-0.5">
                {items.map(({ to, icon: Icon, label: lbl }) => (
                  <li key={to}>
                    <NavLink to={to} end={to==='/'} onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive?'':'hover:bg-white/5'}`}
                      style={({ isActive }) => ({
                        color: isActive ? '#f59e0b' : 'var(--text-muted)',
                        background: isActive ? 'rgba(245,158,11,0.08)' : undefined,
                      })}>
                      {({ isActive }) => (
                        <>
                          <Icon size={17} strokeWidth={isActive?2.2:1.8} />
                          <span className="flex-1">{lbl}</span>
                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 space-y-1" style={{ borderTop:'1px solid var(--border)' }}>
          <button onClick={onToggleDark}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-white/5"
            style={{ color:'var(--text-muted)' }}>
            {darkMode
              ? <><Sun size={17} strokeWidth={1.8} /><span>Light Mode</span></>
              : <><Moon size={17} strokeWidth={1.8} /><span>Dark Mode</span></>}
          </button>
          {onLogout && (
            <button onClick={onLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-white/5"
              style={{ color:'#f87171' }}>
              <LogOut size={17} strokeWidth={1.8} />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
