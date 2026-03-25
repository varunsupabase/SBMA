import { createContext, useContext } from 'react'

/**
 * session shape:
 *   { role: 'admin' }
 *   { role: 'employee', employee: { id, name, role, ... } }
 */
export const SessionContext = createContext(null)

export function useSession() {
  return useContext(SessionContext)
}

export function useIsAdmin() {
  const s = useContext(SessionContext)
  return s?.role === 'admin'
}
