import { Building2, User } from 'lucide-react'

export default function RoleSelect({ onChoose }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-xs animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: '#f59e0b' }}
          >
            <Building2 size={28} className="text-black" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            EMP Manager
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Who are you?
          </p>
        </div>

        <div className="space-y-3">
          {/* Admin */}
          <button
            onClick={() => onChoose('admin')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(245,158,11,0.12)' }}
            >
              <Building2 size={22} className="text-amber-500" />
            </div>
            <div>
              <p className="font-bold text-base" style={{ color: 'var(--text)' }}>
                Admin
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Full access to all features
              </p>
            </div>
            <span className="ml-auto text-lg" style={{ color: 'var(--text-faint)' }}>→</span>
          </button>

          {/* Employee */}
          <button
            onClick={() => onChoose('employee')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(56,189,248,0.12)' }}
            >
              <User size={22} style={{ color: '#38bdf8' }} />
            </div>
            <div>
              <p className="font-bold text-base" style={{ color: 'var(--text)' }}>
                Employee
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Log expenses · View my attendance
              </p>
            </div>
            <span className="ml-auto text-lg" style={{ color: 'var(--text-faint)' }}>→</span>
          </button>
        </div>
      </div>
    </div>
  )
}
