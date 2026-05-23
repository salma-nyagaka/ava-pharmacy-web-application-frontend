import { apiClient } from '../lib/apiClient'

export interface AccountNotification {
  id: number
  type: string
  type_display?: string
  title: string
  message: string
  data?: {
    url?: string
    reference?: string
    status?: string
    [key: string]: unknown
  }
  is_read: boolean
  created_at: string
}

function unwrapList<T>(res: { data?: { data?: T[]; results?: T[] } | T[] }): T[] {
  const root = res.data
  if (Array.isArray(root)) return root
  return root?.data ?? root?.results ?? []
}

function unwrapUnreadCount(res: { data?: { data?: { unread_count?: number }; unread_count?: number } }): number {
  const root = res.data
  return Number(root?.data?.unread_count ?? root?.unread_count ?? 0)
}

export async function fetchNotifications(): Promise<AccountNotification[]> {
  const res = await apiClient.get('/notifications/')
  return unwrapList<AccountNotification>(res)
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const res = await apiClient.get('/notifications/unread/')
  return unwrapUnreadCount(res)
}

export async function markNotificationRead(id: number): Promise<void> {
  await apiClient.post(`/notifications/${id}/read/`)
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('/notifications/mark-all-read/')
}
