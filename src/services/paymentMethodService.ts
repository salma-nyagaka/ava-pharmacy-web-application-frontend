import { apiClient } from '../lib/apiClient'

export interface SavedPaymentMethod {
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

export interface SavedPaymentMethodPayload {
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

export async function fetchSavedPaymentMethods(): Promise<SavedPaymentMethod[]> {
  const res = await apiClient.get('/auth/me/payment-methods/')
  return unwrapList<SavedPaymentMethod>(res)
}

export async function createSavedPaymentMethod(
  payload: SavedPaymentMethodPayload,
): Promise<SavedPaymentMethod> {
  const res = await apiClient.post('/auth/me/payment-methods/', payload)
  return unwrap<SavedPaymentMethod>(res)
}

export async function updateSavedPaymentMethod(
  id: number,
  payload: Partial<SavedPaymentMethodPayload>,
): Promise<SavedPaymentMethod> {
  const res = await apiClient.patch(`/auth/me/payment-methods/${id}/`, payload)
  return unwrap<SavedPaymentMethod>(res)
}

export async function deleteSavedPaymentMethod(id: number): Promise<void> {
  await apiClient.delete(`/auth/me/payment-methods/${id}/`)
}
