import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X, CalendarCheck, TrendingDown, LogOut, Moon, Sun, User, Building2 } from 'lucide-react'
import { useSession } from '../lib/session'

const EMP_NAV = [
  { to: '/my-attendance', icon: CalendarCheck, label: 'My Attendance' },
  { to: '/my-expenses',   icon: TrendingDown,  label: 'My Expenses'  },
]

function EmployeeSidebar({ open, onClose, darkMode, onToggleDark, onLogout }) {
  const { employee } = useSession()

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
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
      >
        {/* Employee identity card */}
        <div className="px-4 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
                style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }}>
                {employee?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-sm leading-none" style={{ color: 'var(--text)' }}>
                  {employee?.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#38bdf8' }}>
                  {employee?.role || 'Employee'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-white/5"
              style={{ color: 'var(--text-muted)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3">
          <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-2"
            style={{ color: 'var(--text-faint)' }}>My Section</p>
          <ul className="space-y-0.5">
            {EMP_NAV.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink to={to} onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? '' : 'hover:bg-white/5'}`}
                  style={({ isActive }) => ({
                    color:      isActive ? '#38bdf8' : 'var(--text-muted)',
                    background: isActive ? 'rgba(56,189,248,0.08)' : undefined,
                  })}>
                  {({ isActive }) => (
                    <>
                      <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                      <span className="flex-1">{label}</span>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#38bdf8' }} />}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-3 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onToggleDark}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-white/5"
            style={{ color: 'var(--text-muted)' }}>
            {darkMode
              ? <><Sun size={17} strokeWidth={1.8} /><span>Light Mode</span></>
              : <><Moon size={17} strokeWidth={1.8} /><span>Dark Mode</span></>}
          </button>
          <button onClick={onLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-white/5"
            style={{ color: '#f87171' }}>
            <LogOut size={17} strokeWidth={1.8} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default function EmployeeLayout({ children, darkMode, onToggleDark, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { employee } = useSession()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <EmployeeSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        darkMode={darkMode}
        onToggleDark={onToggleDark}
        onLogout={onLogout}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg"
            style={{ background: 'var(--surface2)', color: 'var(--text)' }}>
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }}>
              {employee?.name?.[0]?.toUpperCase()}
            </div>
            <span className="font-bold text-sm truncate" style={{ color: 'var(--text)' }}>
              {employee?.name}
            </span>
          </div>
          <button onClick={onLogout}
            className="p-2 rounded-lg text-xs font-medium"
            style={{ color: '#f87171' }}>
            <LogOut size={16} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
