import { AlertTriangle, ExternalLink } from 'lucide-react'

export default function ConfigBanner() {
  return (
    <div
      className="rounded-xl p-4 flex gap-3 items-start mb-6"
      style={{
        background: 'rgba(245,158,11,0.07)',
        border: '1px solid rgba(245,158,11,0.25)',
      }}
    >
      <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-semibold text-amber-500 mb-0.5">Supabase not configured</p>
        <p style={{ color: 'var(--text-muted)' }}>
          Create a <code className="mono text-xs px-1 py-0.5 rounded"
            style={{ background: 'var(--surface2)' }}>.env</code> file with{' '}
          <code className="mono text-xs px-1 py-0.5 rounded"
            style={{ background: 'var(--surface2)' }}>VITE_SUPABASE_URL</code> and{' '}
          <code className="mono text-xs px-1 py-0.5 rounded"
            style={{ background: 'var(--surface2)' }}>VITE_SUPABASE_ANON_KEY</code>.
          {' '}See the README for setup instructions.
        </p>
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-xs text-amber-500 hover:underline"
        >
          Open Supabase Dashboard <ExternalLink size={11} />
        </a>
      </div>
    </div>
  )
}
