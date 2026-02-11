export interface AdminAuditEntry {
  id: string
  timestamp: string
  action: string
  entity: string
  entityId?: string
  detail?: string
}

const STORAGE_KEY = 'ava_admin_audit'

export const loadAuditLog = (): AdminAuditEntry[] => {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const saveAuditLog = (entries: AdminAuditEntry[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export const logAdminAction = (entry: Omit<AdminAuditEntry, 'id' | 'timestamp'>) => {
  const payload: AdminAuditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  }

  const current = loadAuditLog()
  const next = [payload, ...current].slice(0, 200)
  saveAuditLog(next)
}

export const clearAuditLog = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}
