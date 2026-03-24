import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { resolveAuthState } from './lib/auth'
import PinSetup from './components/PinSetup'
import PinLogin from './components/PinLogin'
import Layout from './components/Layout'
import Dashboard  from './pages/Dashboard'
import Employees  from './pages/Employees'
import Attendance from './pages/Attendance'
import Advances   from './pages/Advances'
import Salary     from './pages/Salary'
import WorkLogs   from './pages/WorkLogs'
import Performance from './pages/Performance'
import Contacts   from './pages/Contacts'
import Budget     from './pages/Budget'
import { ToastContainer } from './components/Toast'

const DARK_KEY = 'emp_mgr_dark'

export default function App() {
  const [authState, setAuthState] = useState('loading')
  const [darkMode,  setDarkMode]  = useState(() => {
    const s = localStorage.getItem(DARK_KEY)
    return s !== null ? s === 'true' : true
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem(DARK_KEY, darkMode)
  }, [darkMode])

  useEffect(() => {
    resolveAuthState().then(setAuthState)
  }, [])

  if (authState === 'loading') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background:'var(--bg)' }}>
      <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      <p className="text-xs" style={{ color:'var(--text-faint)' }}>Loading…</p>
    </div>
  )

  if (authState === 'setup') return (
    <><PinSetup onComplete={() => setAuthState('authed')} /><ToastContainer /></>
  )

  if (authState === 'login') return (
    <><PinLogin onSuccess={() => setAuthState('authed')} /><ToastContainer /></>
  )

  return (
    <BrowserRouter>
      <Layout darkMode={darkMode} onToggleDark={() => setDarkMode(d=>!d)}>
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
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <ToastContainer />
    </BrowserRouter>
  )
}
