import { apiClient } from '../lib/apiClient'

export interface FAQ {
  id: number
  category: string
  question: string
  answer: string
  is_published: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type FAQPayload = Pick<FAQ, 'category' | 'question' | 'answer' | 'is_published' | 'sort_order'>

function unwrapList(value: unknown): FAQ[] {
  if (Array.isArray(value)) return value as FAQ[]
  if (!value || typeof value !== 'object') return []
  const payload = value as { data?: unknown; results?: unknown }
  if (Array.isArray(payload.data)) return payload.data as FAQ[]
  if (Array.isArray(payload.results)) return payload.results as FAQ[]
  if (payload.data && typeof payload.data === 'object') {
    const nested = payload.data as { results?: unknown }
    if (Array.isArray(nested.results)) return nested.results as FAQ[]
  }
  return []
}

function unwrapItem(value: unknown): FAQ {
  const payload = value as { data?: FAQ }
  return payload?.data ?? (value as FAQ)
}

export const faqService = {
  async listPublished(category?: string): Promise<FAQ[]> {
    const response = await apiClient.get('/faqs/', { params: category ? { category } : undefined })
    return unwrapList(response.data)
  },

  async listAdmin(): Promise<FAQ[]> {
    const response = await apiClient.get('/admin/faqs/', { params: { page_size: '500' } })
    return unwrapList(response.data)
  },

  async create(payload: FAQPayload): Promise<FAQ> {
    const response = await apiClient.post('/admin/faqs/', payload)
    return unwrapItem(response.data)
  },

  async update(id: number, payload: FAQPayload): Promise<FAQ> {
    const response = await apiClient.put(`/admin/faqs/${id}/`, payload)
    return unwrapItem(response.data)
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/admin/faqs/${id}/`)
  },
}
