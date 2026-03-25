import { useState } from 'react'
import { setupPin } from '../lib/auth'
import { Shield, Eye, EyeOff, CloudOff, CheckCircle } from 'lucide-react'
import { isConfigured } from '../lib/supabase'

export default function PinSetup({ onComplete }) {
  const [pin,     setPin]     = useState('')
  const [confirm, setConfirm] = useState('')
  const [show,    setShow]    = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (pin.length < 4)    { setError('PIN must be at least 4 digits'); return }
    if (pin !== confirm)   { setError('PINs do not match'); return }
    setLoading(true)
    try {
      await setupPin(pin)
      onComplete()
    } catch (err) {
      // Show the REAL error so user knows if Supabase save failed
      setError(err.message || 'Failed to set PIN. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-xs animate-slide-up">

        {/* Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Shield size={24} className="text-amber-500" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Set Admin PIN</h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Create a PIN to protect this app
          </p>
        </div>

        {/* Supabase status hint */}
        {isConfigured ? (
          <div className="flex items-center gap-2 text-xs mb-5 px-3 py-2.5 rounded-lg"
            style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
            <CheckCircle size={13} />
            PIN will be saved to Supabase — works across all devices
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs mb-5 px-3 py-2.5 rounded-lg"
            style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
            <CloudOff size={13} />
            Supabase not configured — PIN saved locally only
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block"
              style={{ color: 'var(--text-muted)' }}>New PIN</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="4–8 digits"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                className="input pr-10"
                required
                autoFocus
              />
              <button type="button" onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}>
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block"
              style={{ color: 'var(--text-muted)' }}>Confirm PIN</label>
            <input
              type={show ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Re-enter PIN"
              value={confirm}
              onChange={e => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className="input"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 font-medium px-1">
              ⚠ {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full py-3 text-sm mt-2"
            disabled={loading || pin.length < 4 || confirm.length < 4}>
            {loading ? 'Saving PIN…' : 'Set PIN & Enter App →'}
          </button>
        </form>
      </div>
    </div>
  )
}
