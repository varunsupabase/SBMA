import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { resolveAuthState } from './lib/auth'
import { SessionContext } from './lib/session'

import RoleSelect      from './components/RoleSelect'
import PinSetup        from './components/PinSetup'
import PinLogin        from './components/PinLogin'
import EmployeeLogin   from './components/EmployeeLogin'
import Layout          from './components/Layout'
import EmployeeLayout  from './components/EmployeeLayout'

// Admin pages
import Dashboard   from './pages/Dashboard'
import Employees   from './pages/Employees'
import Attendance  from './pages/Attendance'
import Advances    from './pages/Advances'
import Salary      from './pages/Salary'
import WorkLogs    from './pages/WorkLogs'
import Performance from './pages/Performance'
import Contacts    from './pages/Contacts'
import Budget      from './pages/Budget'

// Employee pages
import MyAttendance from './pages/MyAttendance'
import MyAdvances   from './pages/MyAdvances'
import MyExpenses   from './pages/MyExpenses'
import Notes        from './pages/Notes'

import { ToastContainer } from './components/Toast'

const DARK_KEY = 'emp_mgr_dark'

/*
  authState values:
    'loading'          — checking localStorage / Supabase
    'setup'            — first ever launch, no admin PIN
    'role_select'      — choose Admin or Employee
    'admin_login'      — admin PIN numpad
    'employee_login'   — employee name + PIN
    'authed_admin'     — admin is in
    'authed_employee'  — employee is in
*/

export default function App() {
  const [authState, setAuthState] = useState('loading')
  const [session,   setSession]   = useState(null)
  const [darkMode,  setDarkMode]  = useState(() => {
    const s = localStorage.getItem(DARK_KEY)
    return s !== null ? s === 'true' : true
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem(DARK_KEY, darkMode)
  }, [darkMode])

  useEffect(() => {
    resolveAuthState().then(state => {
      // 'setup' → first launch, go straight to admin PIN setup
      // 'login' → PIN exists, show role selector
      setAuthState(state === 'setup' ? 'setup' : 'role_select')
    })
  }, [])

  function handleAdminSuccess() {
    setSession({ role: 'admin' })
    setAuthState('authed_admin')
  }

  function handleEmployeeSuccess(emp) {
    setSession({ role: 'employee', employee: emp })
    setAuthState('authed_employee')
  }

  function handleLogout() {
    setSession(null)
    setAuthState('role_select')
  }

  const toggleDark = () => setDarkMode(d => !d)

  /* ── Loading ──────────────────────────────────── */
  if (authState === 'loading') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3"
      style={{ background: 'var(--bg)' }}>
      <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Loading…</p>
    </div>
  )

  /* ── First-time admin PIN setup ───────────────── */
  if (authState === 'setup') return (
    <SessionContext.Provider value={null}>
      <PinSetup onComplete={() => setAuthState('role_select')} />
      <ToastContainer />
    </SessionContext.Provider>
  )

  /* ── Role selector ────────────────────────────── */
  if (authState === 'role_select') return (
    <SessionContext.Provider value={null}>
      <RoleSelect onChoose={role => {
        setAuthState(role === 'admin' ? 'admin_login' : 'employee_login')
      }} />
      <ToastContainer />
    </SessionContext.Provider>
  )

  /* ── Admin login ──────────────────────────────── */
  if (authState === 'admin_login') return (
    <SessionContext.Provider value={null}>
      <PinLogin
        onSuccess={handleAdminSuccess}
        onBack={() => setAuthState('role_select')}
      />
      <ToastContainer />
    </SessionContext.Provider>
  )

  /* ── Employee login ───────────────────────────── */
  if (authState === 'employee_login') return (
    <SessionContext.Provider value={null}>
      <EmployeeLogin
        onSuccess={handleEmployeeSuccess}
        onBack={() => setAuthState('role_select')}
      />
      <ToastContainer />
    </SessionContext.Provider>
  )

  /* ── Admin app ────────────────────────────────── */
  if (authState === 'authed_admin') return (
    <SessionContext.Provider value={session}>
      <BrowserRouter>
        <Layout darkMode={darkMode} onToggleDark={toggleDark} onLogout={handleLogout}>
          <Routes>
            <Route path="/"            element={<Dashboard />} />
            <Route path="/employees"   element={<Employees />} />
            <Route path="/attendance"  element={<Attendance />} />
            <Route path="/advances"    element={<Advances />} />
            <Route path="/salary"      element={<Salary />} />
            <Route path="/work-logs"   element={<WorkLogs />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/contacts"    element={<Contacts />} />
            <Route path="/budget"      element={<Budget />} />
            <Route path="/notes"       element={<Notes />} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      <ToastContainer />
    </SessionContext.Provider>
  )

  /* ── Employee app ─────────────────────────────── */
  if (authState === 'authed_employee') return (
    <SessionContext.Provider value={session}>
      <BrowserRouter>
        <EmployeeLayout darkMode={darkMode} onToggleDark={toggleDark} onLogout={handleLogout}>
          <Routes>
            <Route path="/"               element={<Navigate to="/my-attendance" replace />} />
            <Route path="/my-attendance"  element={<MyAttendance />} />
            <Route path="/my-advances"    element={<MyAdvances />} />
            <Route path="/my-expenses"    element={<MyExpenses />} />
            <Route path="/notes"          element={<Notes />} />
            <Route path="*"              element={<Navigate to="/my-attendance" replace />} />
          </Routes>
        </EmployeeLayout>
      </BrowserRouter>
      <ToastContainer />
    </SessionContext.Provider>
  )

  return null
}
