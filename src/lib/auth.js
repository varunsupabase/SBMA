import { supabase, isConfigured } from './supabase'

const PIN_KEY   = 'emp_mgr_pin_v1'
const SALT      = 'emp_mgr_2024_salt'
const CONFIG_ID = 'admin_pin'

/* ─── Hashing ───────────────────────────────────────── */

async function hashPin(pin) {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin + SALT)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/* ─── Supabase helpers ───────────────────────────────── */

async function savePinToSupabase(hash) {
  if (!isConfigured) return
  try {
    await supabase.from('app_config').upsert(
      { key: CONFIG_ID, value: hash },
      { onConflict: 'key' }
    )
  } catch {
    // silently fail — localStorage is source of truth when offline
  }
}

async function fetchPinFromSupabase() {
  if (!isConfigured) return null
  try {
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', CONFIG_ID)
      .single()
    return data?.value || null
  } catch {
    return null
  }
}

/* ─── Public API ─────────────────────────────────────── */

/**
 * Async — checks localStorage first (instant), then Supabase (new device / cleared storage).
 * Returns 'setup' | 'login' to tell App which screen to render.
 */
export async function resolveAuthState() {
  const local = localStorage.getItem(PIN_KEY)
  if (local) return 'login'

  const remote = await fetchPinFromSupabase()
  if (remote) {
    localStorage.setItem(PIN_KEY, remote)   // cache locally for fast future logins
    return 'login'
  }

  return 'setup'
}

export async function setupPin(pin) {
  const hash = await hashPin(pin)
  localStorage.setItem(PIN_KEY, hash)
  await savePinToSupabase(hash)
}

export async function verifyPin(pin) {
  let stored = localStorage.getItem(PIN_KEY)

  // localStorage may have been cleared (private browsing, new browser, etc.)
  if (!stored) {
    stored = await fetchPinFromSupabase()
    if (stored) localStorage.setItem(PIN_KEY, stored)
  }

  if (!stored) return false
  const hash = await hashPin(pin)
  return hash === stored
}

export async function changePin(oldPin, newPin) {
  const valid = await verifyPin(oldPin)
  if (!valid) throw new Error('Current PIN is incorrect')
  await setupPin(newPin)
}

export function clearPin() {
  localStorage.removeItem(PIN_KEY)
}
