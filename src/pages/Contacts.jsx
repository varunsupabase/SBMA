import { useState, useEffect, useRef } from 'react'
import {
  Plus, Search, Phone, Mail, MapPin, Trash2, Pencil,
  Download, Upload, MessageCircle, X, Save, Users,
  Truck, ShoppingCart, ChevronDown, ChevronUp
} from 'lucide-react'
import { getContacts, addContact, updateContact, deleteContact, bulkInsertContacts } from '../lib/db'
import { toast } from '../components/Toast'
import Modal from '../components/Modal'
import { isConfigured } from '../lib/supabase'
import ConfigBanner from '../components/ConfigBanner'

const TYPES = [
  { key: 'customer',  label: 'Customers',  icon: ShoppingCart, color: '#38bdf8' },
  { key: 'supplier',  label: 'Suppliers',  icon: Users,        color: '#a78bfa' },
  { key: 'transport', label: 'Transport',  icon: Truck,        color: '#fb923c' },
  { key: 'other',     label: 'Other',      icon: Users,        color: '#94a3b8' },
]

/* ── Field component outside to prevent focus loss ── */
function LabelField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
        style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

function ContactForm({ contact, onSaved, onCancel }) {
  const isEdit = !!contact?.id
  const [name,  setName]  = useState(contact?.name  || '')
  const [type,  setType]  = useState(contact?.type  || 'customer')
  const [city,  setCity]  = useState(contact?.city  || '')
  const [phone, setPhone] = useState(contact?.phone || '')
  const [email, setEmail] = useState(contact?.email || '')
  const [notes, setNotes] = useState(contact?.notes || '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { toast('Name required', 'error'); return }
    if (!phone.trim()) { toast('Phone required', 'error'); return }
    setSaving(true)
    try {
      const payload = { name: name.trim(), type, city: city.trim(), phone: phone.trim(), email: email.trim(), notes: notes.trim() }
      if (isEdit) { await updateContact(contact.id, payload); toast('Contact updated') }
      else { await addContact(payload); toast('Contact added') }
      onSaved()
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <LabelField label="Name *">
        <input className="input" placeholder="Full name / Company" value={name}
          onChange={e => setName(e.target.value)} autoFocus />
      </LabelField>
      <div className="grid grid-cols-2 gap-3">
        <LabelField label="Type">
          <select className="input" value={type} onChange={e => setType(e.target.value)}>
            {TYPES.map(t => <option key={t.key} value={t.key}>{t.label.slice(0,-1)}</option>)}
          </select>
        </LabelField>
        <LabelField label="City">
          <input className="input" placeholder="Hyderabad" value={city} onChange={e => setCity(e.target.value)} />
        </LabelField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <LabelField label="Phone *">
          <input className="input mono" placeholder="9XXXXXXXXX" value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))} />
        </LabelField>
        <LabelField label="Email">
          <input className="input" type="email" placeholder="a@b.com" value={email} onChange={e => setEmail(e.target.value)} />
        </LabelField>
      </div>
      <LabelField label="Notes">
        <input className="input" placeholder="Any notes…" value={notes} onChange={e => setNotes(e.target.value)} />
      </LabelField>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Update Contact' : 'Add Contact'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

/* ── CSV parse helper ── */
function parseContactsCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  // Try to detect header
  const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g,''))
  const idxOf  = (names) => names.reduce((f, n) => f >= 0 ? f : header.indexOf(n), -1)
  const iName  = idxOf(['name'])
  const iType  = idxOf(['type'])
  const iCity  = idxOf(['city'])
  const iPhone = idxOf(['phone','mobile','contact'])
  const iEmail = idxOf(['email','e-mail'])
  const iNotes = idxOf(['notes','note','remarks'])

  const contacts = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g,''))
    const name  = iName  >= 0 ? cols[iName]  : ''
    const phone = iPhone >= 0 ? cols[iPhone] : ''
    if (!name || !phone) continue
    const rawType = (iType >= 0 ? cols[iType] : '').toLowerCase()
    const type = ['customer','supplier','transport'].find(t => rawType.includes(t.slice(0,5))) || 'other'
    contacts.push({
      name,
      type,
      city:  iCity  >= 0 ? cols[iCity]  : '',
      phone: phone.replace(/\D/g,'').slice(0,10),
      email: iEmail >= 0 ? cols[iEmail] : '',
      notes: iNotes >= 0 ? cols[iNotes] : '',
    })
  }
  return contacts
}

function exportContactsCSV(contacts) {
  const rows = [['Name','Type','City','Phone','Email','Notes'],
    ...contacts.map(c => [c.name, c.type, c.city||'', c.phone, c.email||'', c.notes||''])
  ]
  const csv  = rows.map(r => r.join(',')).join('\n')
  const a    = document.createElement('a')
  a.href     = URL.createObjectURL(new Blob([csv], { type:'text/csv' }))
  a.download = 'contacts.csv'
  a.click()
}

export default function Contacts() {
  const [contacts, setContacts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('all')
  const [search, setSearch]       = useState('')
  const [modal, setModal]         = useState(null)   // null | 'add' | contact obj
  const [expandedId, setExpanded] = useState(null)
  const fileRef = useRef()

  async function load(type = null) {
    setLoading(true)
    try { setContacts(await getContacts(type === 'all' ? null : type)) }
    catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load(tab === 'all' ? null : tab) }, [tab])

  async function handleDelete(c) {
    if (!confirm(`Delete "${c.name}"?`)) return
    try { await deleteContact(c.id); toast('Deleted'); load(tab === 'all' ? null : tab) }
    catch (err) { toast(err.message, 'error') }
  }

  async function handleImportCSV(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const text = await file.text()
    const parsed = parseContactsCSV(text)
    if (!parsed.length) { toast('No valid contacts found in CSV', 'error'); return }
    try {
      await bulkInsertContacts(parsed)
      toast(`Imported ${parsed.length} contacts`)
      load(tab === 'all' ? null : tab)
    } catch (err) { toast(err.message, 'error') }
  }

  const filtered = contacts.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.city||'').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone||'').includes(search)
  )

  const typeMeta = (type) => TYPES.find(t => t.key === type) || TYPES[3]

  return (
    <div className="max-w-2xl mx-auto">
      {!isConfigured && <ConfigBanner />}

      <div className="page-header flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Contacts</h1>
          <p className="page-sub">{contacts.length} contacts</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="btn-secondary text-xs px-3 py-2" onClick={() => exportContactsCSV(contacts)}>
            <Download size={13} /> CSV
          </button>
          <button className="btn-secondary text-xs px-3 py-2" onClick={() => fileRef.current?.click()}>
            <Upload size={13} /> Import
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImportCSV} />
          <button className="btn-primary text-xs px-3 py-2" onClick={() => setModal('add')}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-4 overflow-x-auto"
        style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
        {[{ key:'all', label:'All', color:'var(--text)' }, ...TYPES].map(t => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
            style={{
              background: tab === t.key ? (t.color || '#f59e0b') : 'transparent',
              color:      tab === t.key ? (t.key === 'all' ? '#000' : '#000') : 'var(--text-muted)',
            }}>
            {t.label || 'All'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text-faint)' }} />
        <input className="input pl-8" placeholder="Search name, city, phone…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* CSV template hint */}
      <div className="text-xs mb-4 px-1" style={{ color:'var(--text-faint)' }}>
        Import CSV format: <span className="mono">name,type,city,phone,email,notes</span>
        &nbsp;· Type values: customer / supplier / transport
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i)=>(
          <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background:'var(--surface)' }} />
        ))}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14">
          <p className="text-3xl mb-3">📋</p>
          <p className="font-semibold" style={{ color:'var(--text)' }}>No contacts found</p>
          <p className="text-sm mt-1" style={{ color:'var(--text-muted)' }}>
            {search ? 'Try a different search' : 'Add or import contacts to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const meta = typeMeta(c.type)
            const isEx = expandedId === c.id
            return (
              <div key={c.id} className="rounded-xl overflow-hidden"
                style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  onClick={() => setExpanded(isEx ? null : c.id)}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
                    style={{ background:`${meta.color}15`, color:meta.color }}>
                    {c.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color:'var(--text)' }}>{c.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-medium" style={{ color:meta.color }}>{c.type}</span>
                      {c.city && <span className="text-xs" style={{ color:'var(--text-muted)' }}>· {c.city}</span>}
                    </div>
                  </div>
                  {/* Quick action buttons always visible */}
                  <div className="flex gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <a href={`tel:${c.phone}`}
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all active:scale-95"
                      style={{ background:'rgba(16,185,129,0.1)', color:'#10b981' }}
                      title="Call">
                      <Phone size={15} />
                    </a>
                    <a href={`https://wa.me/91${c.phone}`} target="_blank" rel="noopener noreferrer"
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all active:scale-95"
                      style={{ background:'rgba(37,211,102,0.1)', color:'#25d366' }}
                      title="WhatsApp">
                      <MessageCircle size={15} />
                    </a>
                  </div>
                  <ChevronDown size={14} className={`shrink-0 ml-1 transition-transform ${isEx?'rotate-180':''}`}
                    style={{ color:'var(--text-faint)' }} />
                </button>

                {isEx && (
                  <div className="px-4 pb-4 pt-3 space-y-3 animate-fade-in" style={{ borderTop:'1px solid var(--border)' }}>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {c.phone && (
                        <div className="flex items-center gap-1.5" style={{ color:'var(--text-muted)' }}>
                          <Phone size={12} /> <span className="mono">{c.phone}</span>
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1.5 truncate" style={{ color:'var(--text-muted)' }}>
                          <Mail size={12} /> <span className="truncate">{c.email}</span>
                        </div>
                      )}
                      {c.city && (
                        <div className="flex items-center gap-1.5" style={{ color:'var(--text-muted)' }}>
                          <MapPin size={12} /> {c.city}
                        </div>
                      )}
                    </div>
                    {c.notes && (
                      <p className="text-xs px-0.5" style={{ color:'var(--text-muted)' }}>📝 {c.notes}</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button className="btn-secondary flex-1 text-xs py-2" onClick={() => setModal(c)}>
                        <Pencil size={13} /> Edit
                      </button>
                      <button className="btn-danger flex-1 text-xs py-2" onClick={() => handleDelete(c)}>
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                    {/* WhatsApp + Call in expanded too */}
                    <div className="grid grid-cols-2 gap-2">
                      <a href={`tel:${c.phone}`}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-98"
                        style={{ background:'rgba(16,185,129,0.1)', color:'#10b981', border:'1px solid rgba(16,185,129,0.2)' }}>
                        <Phone size={15} /> Call
                      </a>
                      <a href={`https://wa.me/91${c.phone}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-98"
                        style={{ background:'rgba(37,211,102,0.1)', color:'#25d366', border:'1px solid rgba(37,211,102,0.2)' }}>
                        <MessageCircle size={15} /> WhatsApp
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add Contact' : 'Edit Contact'}>
        {modal && (
          <ContactForm
            contact={modal === 'add' ? null : modal}
            onSaved={() => { setModal(null); load(tab === 'all' ? null : tab) }}
            onCancel={() => setModal(null)}
          />
        )}
      </Modal>
    </div>
  )
}
