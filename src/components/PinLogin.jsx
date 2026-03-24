import { useState, useCallback } from 'react'
import { verifyPin } from '../lib/auth'
import { Lock, Delete } from 'lucide-react'

const MAX = 6

export default function PinLogin({ onSuccess }) {
  const [digits, setDigits] = useState([])
  const [shake, setShake] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const pushDigit = useCallback(async (d) => {
    if (checking) return
    const next = [...digits, d]
    setDigits(next)
    setError('')

    if (next.length >= MAX || next.length >= 4) {
      // try verify when enough digits entered (auto-check at 4+)
      if (next.length === 4 || next.length === MAX) {
        setChecking(true)
        const pin = next.join('')
        const ok = await verifyPin(pin)
        if (ok) {
          onSuccess()
        } else if (next.length === MAX) {
          // Only fail if max reached
          setShake(true)
          setError('Incorrect PIN')
          setDigits([])
          setChecking(false)
          setTimeout(() => setShake(false), 500)
        } else {
          setChecking(false)
        }
      }
    }
  }, [digits, checking, onSuccess])

  // Actually we want to verify only when user presses all digits
  // Let's simplify: verify on each press after 4 digits
  const pressDigit = useCallback(async (d) => {
    if (checking) return
    const next = [...digits, d]
    if (next.length > MAX) return
    setDigits(next)
    setError('')

    if (next.length >= 4) {
      setChecking(true)
      const pin = next.join('')
      const ok = await verifyPin(pin)
      if (ok) {
        onSuccess()
        return
      }
      // wrong - shake and reset if >= 4
      if (next.length === MAX || next.length >= 4) {
        // wait a tiny bit then shake
        setTimeout(() => {
          setShake(true)
          setError('Incorrect PIN')
          setDigits([])
          setChecking(false)
          setTimeout(() => setShake(false), 500)
        }, 80)
      } else {
        setChecking(false)
      }
    }
  }, [digits, checking, onSuccess])

  const backspace = () => {
    if (checking) return
    setDigits(d => d.slice(0, -1))
    setError('')
  }

  const KEYS = [1,2,3,4,5,6,7,8,9,'',0,'⌫']

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-xs animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)'
            }}>
            <Lock size={22} className="text-amber-500" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            Admin Access
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Enter your PIN to continue
          </p>
        </div>

        {/* Dots */}
        <div className={`flex justify-center gap-3 mb-8 ${shake ? 'animate-shake' : ''}`}>
          {Array.from({ length: Math.max(4, digits.length) }).map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full transition-all duration-150"
              style={{
                background: i < digits.length
                  ? '#f59e0b'
                  : 'var(--border)',
                transform: i < digits.length ? 'scale(1.15)' : 'scale(1)',
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
              <button
                key={i}
                onClick={() => isBack ? backspace() : pressDigit(String(k))}
                disabled={checking}
                className="h-14 rounded-xl text-lg font-semibold font-mono transition-all active:scale-95"
                style={{
                  background: isBack
                    ? 'transparent'
                    : 'var(--surface)',
                  border: isBack
                    ? 'none'
                    : '1px solid var(--border)',
                  color: isBack ? 'var(--text-muted)' : 'var(--text)',
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
