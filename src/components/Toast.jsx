import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

let _toastFn = null
export function toast(msg, type = 'success') {
  if (_toastFn) _toastFn({ msg, type, id: Date.now() })
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    _toastFn = (t) => {
      setToasts(prev => [...prev, t])
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 3500)
    }
    return () => { _toastFn = null }
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-slide-up"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            minWidth: '220px',
          }}
        >
          {t.type === 'success' && <CheckCircle size={16} className="text-emerald-400 shrink-0" />}
          {t.type === 'error'   && <XCircle size={16} className="text-red-400 shrink-0" />}
          {t.type === 'info'    && <Info size={16} className="text-amber-400 shrink-0" />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}
