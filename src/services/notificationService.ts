import { apiClient } from '../lib/apiClient'
export type Notice = { id: number; type: string; title: string; message: string; data: Record<string, unknown>; is_read: boolean; created_at: string }
export type Delivery = { id: number; channel: string; subject: string; provider: string; status: string; error_message: string; created_at: string; metadata: { attempts?: Array<{ number: number; status: string }> } }
export type Preferences = Record<'email_enabled' | 'sms_enabled' | 'push_enabled' | 'marketing_enabled' | 'order_updates_email' | 'order_updates_sms', boolean>
export function unwrap<T>(value: unknown): T { return ((value as { data?: T })?.data ?? value) as T }
export function rows<T>(value: unknown): T[] { const data=unwrap<T[] | { results?: T[] }>(value); return Array.isArray(data) ? data : data.results || [] }
export const notificationService = {
  async list(page=1, search='') { const response=await apiClient.get('/notifications/', {params:{page,search}});const payload=unwrap<{next?:string}>(response.data);return {items:rows<Notice>(response.data),next:Boolean(response.data?.meta?.next || payload.next)} },
  async count() { return unwrap<{unread_count: number}>((await apiClient.get('/notifications/unread/')).data).unread_count },
  async read(id: number) { await apiClient.post(`/notifications/${id}/read/`) },
  async readAll() { await apiClient.post('/notifications/mark-all-read/') },
  async preferences() { return unwrap<Preferences>((await apiClient.get('/notifications/preferences/')).data) },
  async save(preferences: Preferences) { return unwrap<Preferences>((await apiClient.patch('/notifications/preferences/', preferences)).data) },
  async deliveries(page=1) { const response=await apiClient.get('/notifications/deliveries/',{params:{page}});const payload=unwrap<{next?:string}>(response.data);return {items:rows<Delivery>(response.data),next:Boolean(response.data?.meta?.next || payload.next)} },
  async retry(id: number) { return unwrap<Delivery>((await apiClient.post(`/notifications/deliveries/${id}/retry/`)).data) },
}
export function noticeLink(notice: Notice): string | null {
  const value=String(notice.data.url || '')
  if (/^\/support\/tickets\/(\d+)/.test(value)) return value.replace(/^\/support\/tickets\/(\d+).*$/, '/account/support?ticket=$1')
  if (/^\/lab\/requests\/(\d+)/.test(value)) return value.replace(/^\/lab\/requests\/(\d+).*$/, '/account/lab-tests?request=$1')
  if (/^\/(doctor|pediatrician)\/consultations\/(\d+)/.test(value)) return value.replace(/^\/(doctor|pediatrician)\/consultations\/(\d+).*$/, '/$1/dashboard?consultation=$2')
  if (/^\/consultations\/(\d+)/.test(value)) return value.replace(/^\/consultations\/(\d+).*$/, '/account/consultations?consultation=$1')
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : null
}
