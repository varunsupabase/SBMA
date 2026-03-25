import { supabase, isConfigured } from './supabase'

const LS_HASH    = 'emp_mgr_pin_v1'
const LS_LEN     = 'emp_mgr_pin_len'
const SALT       = 'emp_mgr_2024_salt'
const CONFIG_KEY = 'admin_pin_config'   // single row stores both hash + length

/* ─── Hashing ─────────────────────────────────────── */
async function hashPin(pin) {
  const data = new TextEncoder().encode(pin + SALT)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/* ─── Supabase helpers ────────────────────────────────
   Store BOTH hash + length as a single JSON value
   so one DB call fetches everything.
   Errors are thrown — not swallowed — so the caller
   knows when a save or fetch actually failed.
──────────────────────────────────────────────────── */

async function saveToSupabase(hash, len) {
  if (!isConfigured) return
  const value = JSON.stringify({ hash, len })
  const { error } = await supabase
    .from('app_config')
    .upsert({ key: CONFIG_KEY, value }, { onConflict: 'key' })
  if (error) throw new Error(`Supabase save failed: ${error.message}`)
}

async function fetchFromSupabase() {
  if (!isConfigured) return null
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', CONFIG_KEY)
    .maybeSingle()              // returns null (not error) when row doesn't exist
  if (error) throw new Error(`Supabase fetch failed: ${error.message}`)
  if (!data?.value) return null
  try {
    return JSON.parse(data.value)   // { hash, len }
  } catch {
    return null
  }
}

/* ─── Public API ──────────────────────────────────── */

/**
 * Called on app boot.
 * 1. Check localStorage (instant — no network)
 * 2. If empty, fetch from Supabase (new device / cleared storage)
 * Returns: 'setup' | 'login'
 */
export async function resolveAuthState() {
  // Fast path — already cached locally
  const localHash = localStorage.getItem(LS_HASH)
  if (localHash) return 'login'

  // Slow path — try Supabase (new device, cleared browser, etc.)
  try {
    const remote = await fetchFromSupabase()
    if (remote?.hash) {
      // Cache locally for fast future logins
      localStorage.setItem(LS_HASH, remote.hash)
      localStorage.setItem(LS_LEN,  String(remote.len ?? 4))
      return 'login'
    }
  } catch (err) {
    // Supabase unreachable — if no local PIN, must set up
    console.warn('Could not reach Supabase during auth check:', err.message)
  }

  return 'setup'
}

/**
 * How many digits the current PIN has.
 * Read synchronously from localStorage after resolveAuthState() has run.
 */
export function getPinLength() {
  return parseInt(localStorage.getItem(LS_LEN) || '4', 10)
}

/**
 * First-time PIN setup.
 * Saves to localStorage AND Supabase.
 * Throws if Supabase save fails (so the UI can show an error).
 */
export async function setupPin(pin) {
  const hash = await hashPin(pin)

  // Save locally first — always works offline
  localStorage.setItem(LS_HASH, hash)
  localStorage.setItem(LS_LEN,  String(pin.length))

  // Save to Supabase — throws on failure
  await saveToSupabase(hash, pin.length)
}

/**
 * Verify a PIN attempt.
 * Uses localStorage if available; falls back to Supabase.
 */
export async function verifyPin(pin) {
  let hash = localStorage.getItem(LS_HASH)

  // Re-sync from Supabase if localStorage was cleared
  if (!hash) {
    try {
      const remote = await fetchFromSupabase()
      if (remote?.hash) {
        localStorage.setItem(LS_HASH, remote.hash)
        localStorage.setItem(LS_LEN,  String(remote.len ?? 4))
        hash = remote.hash
      }
    } catch (err) {
      console.warn('Could not reach Supabase during PIN verify:', err.message)
    }
  }

  if (!hash) return false
  return (await hashPin(pin)) === hash
}

export async function changePin(oldPin, newPin) {
  if (!(await verifyPin(oldPin))) throw new Error('Current PIN is incorrect')
  await setupPin(newPin)
}

export function clearPin() {
  localStorage.removeItem(LS_HASH)
  localStorage.removeItem(LS_LEN)
}
