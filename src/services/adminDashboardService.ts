import { apiClient } from '../lib/apiClient'

export interface DailyRevenue {
  date: string
  revenue: number
  orders: number
}

export interface TopProduct {
  product_name: string
  product_sku: string
  quantity_sold: number
  revenue: number
}

export interface StatusCount {
  status: string
  count: number
}

export interface FullReports {
  range_days: number
  total_orders: number
  draft_orders: number
  total_revenue: number
  monthly_revenue: number
  range_revenue: number
  total_customers: number
  new_customers_month: number
  pending_orders: number
  today_orders: number
  refund_requests: number
  orders_by_status: StatusCount[]
  orders_by_payment: { payment_method: string; count: number }[]
  top_products: TopProduct[]
  low_stock_products: number
  out_of_stock_products: number
  daily_revenue: DailyRevenue[]
  prescriptions: {
    by_status: StatusCount[]
    total: number
    pending: number
    approved: number
    clarification: number
    rejected: number
  }
  lab: {
    by_status: StatusCount[]
    total: number
    awaiting: number
    processing: number
    results_ready: number
    completed: number
  }
  consultations: {
    total: number
    waiting: number
    in_progress: number
    completed: number
    completed_range: number
  }
  payouts: {
    pending_count: number
    pending_amount: number
    paid_month_amount: number
    paid_month_count: number
    failed_count: number
  }
  support: {
    open: number
    in_progress: number
  }
}

export interface ApiInvoiceItem {
  id: number
  product_name: string
  product_sku: string
  quantity: number
  unit_price: string
  discount_total: string
  subtotal: string
}

export interface ApiInvoice {
  id: number
  order_number: string
  status: string
  payment_method: string
  payment_status: string
  payment_reference: string
  payment_intent_status: string | null
  customer_name: string
  customer_email: string
  customer_phone: string
  coupon_code: string | null
  delivery_method: string
  delivery_notes: string
  shipping_first_name: string
  shipping_last_name: string
  shipping_email: string
  shipping_phone: string
  shipping_street: string
  shipping_city: string
  shipping_county: string
  shipping_address: Record<string, string>
  subtotal: string
  discount_total: string
  shipping_fee: string
  total: string
  items: ApiInvoiceItem[]
  placed_at: string | null
  created_at: string
  updated_at: string
}

function unwrap<T>(res: { data: { data?: T } | T }): T {
  const d = res.data as { data?: T }
  return d.data !== undefined ? d.data : (res.data as T)
}

function unwrapList<T>(res: { data: unknown }): T[] {
  const d = res.data as { data?: unknown; results?: unknown }
  const inner = d.data !== undefined ? d.data : res.data
  if (Array.isArray(inner)) return inner as T[]
  const paged = inner as { results?: T[] }
  if (paged && Array.isArray(paged.results)) return paged.results
  return []
}

export const adminDashboardService = {
  async getReports(range = 30): Promise<FullReports> {
    const res = await apiClient.get('/admin/reports/', { params: { range } })
    return unwrap<FullReports>(res)
  },

  async listInvoices(params?: Record<string, string>): Promise<{ results: ApiInvoice[]; count: number }> {
    const res = await apiClient.get('/admin/invoices/', { params })
    const d = res.data as { data?: unknown; results?: unknown; count?: number }
    const inner = d.data !== undefined ? d.data : res.data
    if (Array.isArray(inner)) return { results: inner as ApiInvoice[], count: (inner as ApiInvoice[]).length }
    const paged = inner as { results?: ApiInvoice[]; count?: number }
    return { results: paged.results ?? [], count: paged.count ?? 0 }
  },

  async getInvoice(id: number): Promise<ApiInvoice> {
    const res = await apiClient.get(`/admin/invoices/${id}/`)
    return unwrap<ApiInvoice>(res)
  },

  getDownloadUrl(type: 'orders' | 'revenue' | 'products', range: number): string {
    const base = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '')
    return `${base}/admin/reports/download/?type=${type}&range=${range}`
  },

  async downloadReport(type: 'orders' | 'revenue' | 'products', range: number): Promise<void> {
    const res = await apiClient.get('/admin/reports/download/', {
      params: { type, range },
      responseType: 'blob',
    })
    const blob = new Blob([res.data as BlobPart], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `avapharmacy_${type}_last${range}d.csv`
    a.click()
    URL.revokeObjectURL(url)
  },
}
