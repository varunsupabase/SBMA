import { supabase, isConfigured } from './supabase'

const PIN_KEY    = 'emp_mgr_pin_v1'
const PIN_LEN    = 'emp_mgr_pin_len'
const SALT       = 'emp_mgr_2024_salt'
const CONFIG_PIN = 'admin_pin'
const CONFIG_LEN = 'admin_pin_len'

/* ─── Hashing ─────────────────────────────────────── */
async function hashPin(pin) {
  const data = new TextEncoder().encode(pin + SALT)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

/* ─── Supabase sync ───────────────────────────────── */
async function sbSet(key, value) {
  if (!isConfigured) return
  try { await supabase.from('app_config').upsert({ key, value }, { onConflict: 'key' }) } catch {}
}
async function sbGet(key) {
  if (!isConfigured) return null
  try {
    const { data } = await supabase.from('app_config').select('value').eq('key', key).single()
    return data?.value ?? null
  } catch { return null }
}

/* ─── Public API ──────────────────────────────────── */

/** Called on app boot. Returns 'setup' | 'login' */
export async function resolveAuthState() {
  const local = localStorage.getItem(PIN_KEY)
  if (local) return 'login'
  // Try syncing from Supabase (new device / cleared storage)
  const remote = await sbGet(CONFIG_PIN)
  if (remote) {
    localStorage.setItem(PIN_KEY, remote)
    const remoteLen = await sbGet(CONFIG_LEN)
    if (remoteLen) localStorage.setItem(PIN_LEN, remoteLen)
    return 'login'
  }
  return 'setup'
}

/** Returns the number of digits in the stored PIN (for login screen dots) */
export function getPinLength() {
  return parseInt(localStorage.getItem(PIN_LEN) || '4', 10)
}

export async function setupPin(pin) {
  const hash = await hashPin(pin)
  localStorage.setItem(PIN_KEY, hash)
  localStorage.setItem(PIN_LEN, String(pin.length))
  await sbSet(CONFIG_PIN, hash)
  await sbSet(CONFIG_LEN, String(pin.length))
}

export async function verifyPin(pin) {
  let stored = localStorage.getItem(PIN_KEY)
  if (!stored) {
    stored = await sbGet(CONFIG_PIN)
    if (stored) {
      localStorage.setItem(PIN_KEY, stored)
      const len = await sbGet(CONFIG_LEN)
      if (len) localStorage.setItem(PIN_LEN, len)
    }
  }
  if (!stored) return false
  return (await hashPin(pin)) === stored
}

export async function changePin(oldPin, newPin) {
  if (!(await verifyPin(oldPin))) throw new Error('Current PIN is incorrect')
  await setupPin(newPin)
}

export function clearPin() {
  localStorage.removeItem(PIN_KEY)
  localStorage.removeItem(PIN_LEN)
}
