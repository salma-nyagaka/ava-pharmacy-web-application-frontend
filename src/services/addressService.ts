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

export async function fetchSavedAddresses(): Promise<SavedAddress[]> {
  const res = await apiClient.get('/auth/me/addresses/')
  return res.data?.data ?? res.data ?? []
}

export async function createSavedAddress(payload: AddressPayload): Promise<SavedAddress> {
  const res = await apiClient.post('/auth/me/addresses/', payload)
  return res.data?.data ?? res.data
}

export async function updateSavedAddress(id: number, payload: AddressPayload): Promise<SavedAddress> {
  const res = await apiClient.put(`/auth/me/addresses/${id}/`, payload)
  return res.data?.data ?? res.data
}

export async function deleteSavedAddress(id: number): Promise<void> {
  await apiClient.delete(`/auth/me/addresses/${id}/`)
}
