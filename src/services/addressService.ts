import { apiClient } from '../lib/apiClient'

export interface SavedAddress {
  id: number
  label: string
  street: string
  city: string
  county: string
  is_default: boolean
  created_at: string
}

export interface AddressPayload {
  label: string
  street: string
  city: string
  county: string
  is_default?: boolean
}

function normalizeAddress(value: unknown): SavedAddress {
  const payload = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
  return {
    id: Number(payload.id ?? 0),
    label: typeof payload.label === 'string' ? payload.label.trim() : '',
    street: typeof payload.street === 'string' ? payload.street.trim() : '',
    city: typeof payload.city === 'string' ? payload.city.trim() : '',
    county: typeof payload.county === 'string' ? payload.county.trim() : '',
    is_default: Boolean(payload.is_default),
    created_at: typeof payload.created_at === 'string' ? payload.created_at : '',
  }
}

export async function fetchSavedAddresses(): Promise<SavedAddress[]> {
  const res = await apiClient.get('/auth/me/addresses/')
  const rows = res.data?.data ?? res.data ?? []
  return Array.isArray(rows) ? rows.map(normalizeAddress) : []
}

export async function createSavedAddress(payload: AddressPayload): Promise<SavedAddress> {
  const res = await apiClient.post('/auth/me/addresses/', payload)
  return normalizeAddress(res.data?.data ?? res.data)
}

export async function updateSavedAddress(id: number, payload: AddressPayload): Promise<SavedAddress> {
  const res = await apiClient.put(`/auth/me/addresses/${id}/`, payload)
  return normalizeAddress(res.data?.data ?? res.data)
}

export async function deleteSavedAddress(id: number): Promise<void> {
  await apiClient.delete(`/auth/me/addresses/${id}/`)
}
