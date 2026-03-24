import { useState, useEffect } from 'react'
import { verifyPin, getPinLength } from '../lib/auth'
import { Lock, Delete } from 'lucide-react'

const KEYS = [1,2,3,4,5,6,7,8,9,'',0,'⌫']

export default function PinLogin({ onSuccess }) {
  const [pinLen]   = useState(() => getPinLength())   // stable, read once
  const [digits, setDigits] = useState([])
  const [shake, setShake]   = useState(false)
  const [error, setError]   = useState('')
  const [busy, setBusy]     = useState(false)

  // Auto-verify when enough digits collected
  useEffect(() => {
    if (digits.length !== pinLen || busy) return
    setBusy(true)
    verifyPin(digits.join('')).then(ok => {
      if (ok) {
        onSuccess()
      } else {
        setShake(true)
        setError('Incorrect PIN')
        setTimeout(() => { setDigits([]); setShake(false); setBusy(false) }, 600)
      }
    })
  }, [digits, pinLen, busy, onSuccess])

  function press(d) {
    if (busy || digits.length >= pinLen) return
    setError('')
    setDigits(prev => [...prev, d])
  }

  function backspace() {
    if (busy) return
    setError('')
    setDigits(prev => prev.slice(0, -1))
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-xs animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Lock size={22} className="text-amber-500" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Admin Access</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Enter your {pinLen}-digit PIN</p>
        </div>

        {/* Dots — exact pinLen dots */}
        <div className={`flex justify-center gap-3 mb-8 ${shake ? 'animate-shake' : ''}`}>
          {Array.from({ length: pinLen }).map((_, i) => (
            <div key={i} className="w-3 h-3 rounded-full transition-all duration-150"
              style={{
                background: i < digits.length ? '#f59e0b' : 'var(--border)',
                transform: i < digits.length ? 'scale(1.2)' : 'scale(1)',
              }} />
          ))}
        </div>

        {error && <p className="text-center text-sm text-red-400 font-medium mb-4">{error}</p>}

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
                }}>
                {isBack ? <Delete size={18} className="mx-auto" /> : k}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
