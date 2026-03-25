import { useState, useEffect, useRef } from 'react'
import {
  Plus, Pencil, Trash2, Save, X,
  StickyNote, Shield, User
} from 'lucide-react'
import { getNotes, addNote, updateNote, deleteNote } from '../lib/db'
import { useSession, useIsAdmin } from '../lib/session'
import { formatDate } from '../lib/utils'
import { toast } from '../components/Toast'

/* ─── Colour palette for note cards ──────────────────── */
const CARD_COLORS = [
  { bg: 'rgba(245,158,11,0.07)',  border: 'rgba(245,158,11,0.2)',  dot: '#f59e0b' },
  { bg: 'rgba(167,139,250,0.07)', border: 'rgba(167,139,250,0.2)', dot: '#a78bfa' },
  { bg: 'rgba(56,189,248,0.07)',  border: 'rgba(56,189,248,0.2)',  dot: '#38bdf8' },
  { bg: 'rgba(52,211,153,0.07)',  border: 'rgba(52,211,153,0.2)',  dot: '#34d399' },
  { bg: 'rgba(251,146,60,0.07)',  border: 'rgba(251,146,60,0.2)',  dot: '#fb923c' },
]
function noteColor(id) {
  // Deterministic colour from note id
  const idx = id ? id.charCodeAt(0) % CARD_COLORS.length : 0
  return CARD_COLORS[idx]
}

/* ─── Who wrote this note label ─────────────────────── */
function AuthorChip({ note }) {
  const isAdmin = !note.created_by_employee_id
  return (
    <div className="flex items-center gap-1 text-xs font-medium"
      style={{ color: isAdmin ? '#f59e0b' : '#38bdf8' }}>
      {isAdmin
        ? <><Shield size={11} /> Admin</>
        : <><User size={11} /> {note.employees?.name || 'Staff'}</>
      }
    </div>
  )
}

/* ─── Single note card ───────────────────────────────── */
function NoteCard({ note, canEdit, canDelete, onUpdated, onDeleted }) {
  const [editing, setEditing]   = useState(false)
  const [content, setContent]   = useState(note.content)
  const [saving,  setSaving]    = useState(false)
  const textRef = useRef(null)
  const col = noteColor(note.id)

  function startEdit() {
    setContent(note.content)
    setEditing(true)
    setTimeout(() => textRef.current?.focus(), 50)
  }

  function cancelEdit() {
    setEditing(false)
    setContent(note.content)
  }

  async function handleSave() {
    if (!content.trim()) { toast('Note cannot be empty', 'error'); return }
    setSaving(true)
    try {
      const updated = await updateNote(note.id, content.trim())
      toast('Note updated')
      setEditing(false)
      onUpdated(updated)
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!confirm('Delete this note?')) return
    try {
      await deleteNote(note.id)
      toast('Note deleted')
      onDeleted(note.id)
    } catch (e) { toast(e.message, 'error') }
  }

  // Ctrl+Enter / Cmd+Enter to save
  function onKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSave()
    if (e.key === 'Escape') cancelEdit()
  }

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3 transition-all"
      style={{ background: col.bg, border: `1px solid ${col.border}` }}>

      {/* Header: author + date + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ background: col.dot }} />
          <AuthorChip note={note} />
          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
            · {formatDate(note.updated_at || note.created_at)}
            {note.updated_at && note.updated_at !== note.created_at && ' (edited)'}
          </span>
        </div>

        {/* Action buttons — only shown when permitted */}
        {!editing && (
          <div className="flex gap-1 shrink-0">
            {canEdit && (
              <button onClick={startEdit}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: 'var(--text-muted)' }} title="Edit">
                <Pencil size={13} />
              </button>
            )}
            {canDelete && (
              <button onClick={handleDelete}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: '#f87171' }} title="Delete">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {editing ? (
        <div className="space-y-2">
          <textarea
            ref={textRef}
            className="w-full text-sm rounded-xl px-3 py-2.5 resize-none outline-none"
            style={{
              background: 'var(--bg)',
              border: '1px solid rgba(245,158,11,0.4)',
              color: 'var(--text)',
              fontFamily: 'inherit',
              minHeight: 80,
            }}
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write your note…"
          />
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="btn-primary text-xs px-3 py-1.5 flex-1">
              <Save size={13} /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={cancelEdit} className="btn-secondary text-xs px-3 py-1.5">
              <X size={13} /> Cancel
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            Ctrl+Enter to save · Esc to cancel
          </p>
        </div>
      ) : (
        <p className="text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: 'var(--text)' }}>
          {note.content}
        </p>
      )}
    </div>
  )
}

/* ─── Add note form ──────────────────────────────────── */
function AddNoteForm({ onAdded, createdByEmployeeId }) {
  const [content, setContent] = useState('')
  const [open,    setOpen]    = useState(false)
  const [saving,  setSaving]  = useState(false)
  const textRef = useRef(null)

  function toggle() {
    setOpen(o => !o)
    if (!open) setTimeout(() => textRef.current?.focus(), 50)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!content.trim()) { toast('Note cannot be empty', 'error'); return }
    setSaving(true)
    try {
      const note = await addNote({
        content: content.trim(),
        created_by_employee_id: createdByEmployeeId || null,
      })
      toast('Note added')
      setContent('')
      setOpen(false)
      onAdded(note)
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  function onKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleAdd(e)
    if (e.key === 'Escape') { setOpen(false); setContent('') }
  }

  if (!open) {
    return (
      <button onClick={toggle}
        className="w-full flex items-center gap-2 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all"
        style={{
          background: 'var(--surface)',
          border: '1px dashed var(--border)',
          color: 'var(--text-muted)',
        }}>
        <Plus size={16} />
        Write a note…
      </button>
    )
  }

  return (
    <div className="rounded-2xl p-4 space-y-3"
      style={{ background: 'var(--surface)', border: '1px solid rgba(245,158,11,0.3)' }}>
      <textarea
        ref={textRef}
        className="w-full text-sm rounded-xl px-3 py-2.5 resize-none outline-none"
        style={{
          background: 'var(--bg)',
          border: '1px solid rgba(245,158,11,0.3)',
          color: 'var(--text)',
          fontFamily: 'inherit',
          minHeight: 100,
        }}
        value={content}
        onChange={e => setContent(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Write your note here…"
      />
      <div className="flex gap-2">
        <button onClick={handleAdd} disabled={saving}
          className="btn-primary flex-1 py-2.5 text-sm">
          <Save size={14} /> {saving ? 'Saving…' : 'Add Note'}
        </button>
        <button onClick={() => { setOpen(false); setContent('') }}
          className="btn-secondary px-4 py-2.5 text-sm">
          <X size={14} />
        </button>
      </div>
      <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
        Ctrl+Enter to save
      </p>
    </div>
  )
}

/* ─── Main Notes page ────────────────────────────────── */
export default function Notes() {
  const session  = useSession()
  const isAdmin  = useIsAdmin()
  const [notes,   setNotes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')  // 'all' | 'admin' | 'staff'

  // employee id of logged-in user (null if admin)
  const myEmployeeId = session?.role === 'employee' ? session.employee?.id : null

  useEffect(() => {
    getNotes()
      .then(setNotes)
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  function handleAdded(note) {
    setNotes(prev => [note, ...prev])
  }

  function handleUpdated(updated) {
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n))
  }

  function handleDeleted(id) {
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  // Filter notes
  const filtered = notes.filter(n => {
    if (filter === 'admin') return !n.created_by_employee_id
    if (filter === 'staff') return  !!n.created_by_employee_id
    return true
  })

  // Permission check per note
  function canEditNote(note) {
    if (isAdmin) return true   // admin can edit everything
    // employee can only edit their own notes
    return note.created_by_employee_id === myEmployeeId
  }
  function canDeleteNote(note) {
    if (isAdmin) return true
    return note.created_by_employee_id === myEmployeeId
  }

  const adminCount = notes.filter(n => !n.created_by_employee_id).length
  const staffCount = notes.filter(n =>  !!n.created_by_employee_id).length

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Notes</h1>
        <p className="page-sub">{notes.length} notes · {isAdmin ? 'Admin view' : 'Staff view'}</p>
      </div>

      {/* Add note */}
      <div className="mb-5">
        <AddNoteForm
          onAdded={handleAdded}
          createdByEmployeeId={myEmployeeId}
        />
      </div>

      {/* Filter tabs */}
      {notes.length > 0 && (
        <div className="flex gap-1 p-1 rounded-xl mb-5 w-fit"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {[
            { key: 'all',   label: `All (${notes.length})` },
            { key: 'admin', label: `Admin (${adminCount})` },
            { key: 'staff', label: `Staff (${staffCount})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: filter === key ? '#f59e0b' : 'transparent',
                color:      filter === key ? '#000' : 'var(--text-muted)',
              }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Notes */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
        ))}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <StickyNote size={30} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="font-semibold" style={{ color: 'var(--text)' }}>No notes yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Tap "Write a note" above to add one
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              canEdit={canEditNote(note)}
              canDelete={canDeleteNote(note)}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      {/* Access legend */}
      <div className="mt-6 px-4 py-3 rounded-xl text-xs space-y-1"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Permissions</p>
        <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <Shield size={12} className="text-amber-500" /> Admin — can read, edit and delete all notes
        </div>
        <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <User size={12} style={{ color: '#38bdf8' }} /> Staff — can read all notes, edit/delete only their own
        </div>
      </div>
    </div>
  )
}
