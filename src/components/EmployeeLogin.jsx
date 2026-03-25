import { useState, useEffect } from 'react'
import { ChevronLeft, User, Delete, AlertCircle } from 'lucide-react'
import { getEmployeesForLogin } from '../lib/db'
import { verifyEmployeePin } from '../lib/auth'

const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫']
const PIN_LEN = 4

export default function EmployeeLogin({ onSuccess, onBack }) {
  const [step, setStep]         = useState('pick')   // 'pick' | 'pin'
  const [employees, setEmployees] = useState([])
  const [selected, setSelected] = useState(null)
  const [digits, setDigits]     = useState([])
  const [shake, setShake]       = useState(false)
  const [error, setError]       = useState('')
  const [busy, setBusy]         = useState(false)
  const [loadErr, setLoadErr]   = useState('')

  useEffect(() => {
    getEmployeesForLogin()
      .then(data => {
        // Only show employees who have a PIN set
        setEmployees(data.filter(e => !!e.employee_pin))
      })
      .catch(e => setLoadErr(e.message))
  }, [])

  /* ── step: pick employee ────────────────────────── */
  function pickEmployee(emp) {
    setSelected(emp)
    setDigits([])
    setError('')
    setStep('pin')
  }

  /* ── step: enter PIN ────────────────────────────── */
  useEffect(() => {
    if (step !== 'pin' || digits.length !== PIN_LEN || busy) return
    setBusy(true)
    verifyEmployeePin(selected, digits.join('')).then(ok => {
      if (ok) {
        onSuccess(selected)
      } else {
        setShake(true)
        setError('Wrong PIN')
        setTimeout(() => {
          setDigits([])
          setShake(false)
          setBusy(false)
        }, 600)
      }
    })
  }, [digits, step, busy, selected, onSuccess])

  function press(d) {
    if (busy || digits.length >= PIN_LEN) return
    setError('')
    setDigits(prev => [...prev, d])
  }

  function backspace() {
    if (busy) return
    setError('')
    setDigits(prev => prev.slice(0, -1))
  }

  /* ── Pick employee screen ───────────────────────── */
  if (step === 'pick') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-xs animate-slide-up">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={onBack}
              className="p-2 rounded-xl transition-colors hover:bg-white/5"
              style={{ color: 'var(--text-muted)' }}>
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                Who are you?
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Select your name to continue
              </p>
            </div>
          </div>

          {loadErr && (
            <div className="flex items-center gap-2 text-xs mb-4 p-3 rounded-xl"
              style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>
              <AlertCircle size={14} />
              {loadErr}
            </div>
          )}

          {employees.length === 0 && !loadErr ? (
            <div className="text-center py-10 rounded-2xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <User size={28} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                No employee access set up yet
              </p>
              <p className="text-xs mt-1.5 px-4" style={{ color: 'var(--text-muted)' }}>
                Ask your admin to set a PIN for your account in the Employees section.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {employees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => pickEmployee(emp)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all active:scale-[0.98]"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
                    style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}
                  >
                    {emp.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
                      {emp.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {emp.role || '—'}
                    </p>
                  </div>
                  <span style={{ color: 'var(--text-faint)' }}>→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── PIN entry screen ───────────────────────────── */
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-xs animate-slide-up">
        {/* Back + name */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => { setStep('pick'); setDigits([]); setError('') }}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}
            >
              {selected?.name[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-base leading-none" style={{ color: 'var(--text)' }}>
                {selected?.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Enter your 4-digit PIN
              </p>
            </div>
          </div>
        </div>

        {/* Dots */}
        <div className={`flex justify-center gap-4 mb-8 ${shake ? 'animate-shake' : ''}`}>
          {Array.from({ length: PIN_LEN }).map((_, i) => (
            <div key={i}
              className="w-3.5 h-3.5 rounded-full transition-all duration-150"
              style={{
                background: i < digits.length ? '#38bdf8' : 'var(--border)',
                transform: i < digits.length ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-red-400 font-medium mb-4">{error}</p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((k, i) => {
            if (k === '') return <div key={i} />
            const isBack = k === '⌫'
            return (
              <button key={i} disabled={busy}
                onClick={() => isBack ? backspace() : press(String(k))}
                className="h-14 rounded-xl text-lg font-semibold font-mono transition-all active:scale-95"
                style={{
                  background: isBack ? 'transparent' : 'var(--surface)',
                  border:     isBack ? 'none' : '1px solid var(--border)',
                  color:      isBack ? 'var(--text-muted)' : 'var(--text)',
                }}
              >
                {isBack ? <Delete size={18} className="mx-auto" /> : k}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
