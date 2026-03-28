import { apiClient } from '../lib/apiClient'

export interface AccountProfile {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone: string
  date_of_birth: string | null
  role: string
  status: string
  address: string
  total_orders: number
  date_joined: string
  updated_at: string
}

export interface AccountProfilePayload {
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
  date_of_birth?: string | null
  address?: string
}

export interface PasswordChangePayload {
  old_password: string
  new_password: string
  new_password_confirm: string
}

export interface NotificationPreferences {
  email_enabled: boolean
  sms_enabled: boolean
  push_enabled: boolean
  marketing_enabled: boolean
  order_updates_email: boolean
  order_updates_sms: boolean
  created_at: string
  updated_at: string
}

export interface PaymentMethod {
  id: number
  brand: string
  last4: string
  expiry_month: number
  expiry_year: number
  cardholder_name: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface PaymentMethodPayload {
  brand: string
  last4: string
  expiry_month: number
  expiry_year: number
  cardholder_name: string
  is_default?: boolean
}

function unwrap<T>(res: { data?: { data?: T } & T }): T {
  const root = res.data as ({ data?: T } & T) | undefined
  return (root?.data ?? root) as T
}

function unwrapList<T>(res: { data?: { data?: T[] } | T[] }): T[] {
  const root = res.data
  if (Array.isArray(root)) return root
  return root?.data ?? []
}

export async function fetchAccountProfile(): Promise<AccountProfile> {
  const res = await apiClient.get('/account/profile/')
  return unwrap<AccountProfile>(res)
}

export async function updateAccountProfile(payload: AccountProfilePayload): Promise<AccountProfile> {
  const res = await apiClient.patch('/account/profile/', payload)
  return unwrap<AccountProfile>(res)
}

export async function changeAccountPassword(payload: PasswordChangePayload): Promise<{ detail: string }> {
  const res = await apiClient.post('/account/change-password/', payload)
  return unwrap<{ detail: string }>(res)
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await apiClient.get('/notifications/preferences/')
  return unwrap<NotificationPreferences>(res)
}

export async function updateNotificationPreferences(
  payload: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const res = await apiClient.patch('/notifications/preferences/', payload)
  return unwrap<NotificationPreferences>(res)
}

export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const res = await apiClient.get('/auth/me/payment-methods/')
  return unwrapList<PaymentMethod>(res)
}

export async function createPaymentMethod(payload: PaymentMethodPayload): Promise<PaymentMethod> {
  const res = await apiClient.post('/auth/me/payment-methods/', payload)
  return unwrap<PaymentMethod>(res)
}

export async function updatePaymentMethod(
  id: number,
  payload: Partial<PaymentMethodPayload & { is_default: boolean }>,
): Promise<PaymentMethod> {
  const res = await apiClient.patch(`/auth/me/payment-methods/${id}/`, payload)
  return unwrap<PaymentMethod>(res)
}

export async function deletePaymentMethod(id: number): Promise<void> {
  await apiClient.delete(`/auth/me/payment-methods/${id}/`)
}
