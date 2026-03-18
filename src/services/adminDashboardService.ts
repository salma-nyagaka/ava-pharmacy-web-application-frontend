import { apiClient } from '../lib/apiClient'

export interface DailyRevenue {
  date: string
  revenue: number
  orders: number
}

export interface DailySummary {
  date: string
  orders: number
  revenue: number
  new_customers: number
}

export interface TopProduct {
  product_name: string
  product_sku: string
  quantity_sold: number
  revenue: number
}

export interface TopCustomer {
  id: number
  name: string
  email: string
  order_count: number
  total_spend: number
}

export interface CountyData {
  county: string
  count: number
  revenue: number
}

export interface StatusCount {
  status: string
  count: number
}

export interface PayoutByRole {
  role: string
  count: number
  total_amount: number
  pending_count: number
  pending_amount: number
}

export interface ActivityFeedItem {
  type: string
  message: string
  timestamp: string
  link: string | null
}

export interface FullReports {
  range_days: number
  total_orders: number
  draft_orders: number
  range_orders: number
  prev_range_orders: number
  total_revenue: number
  monthly_revenue: number
  range_revenue: number
  prev_range_revenue: number
  avg_order_value: number
  prev_avg_order_value: number
  total_customers: number
  new_customers_month: number
  new_customers_range: number
  returning_customers_range: number
  pending_orders: number
  today_orders: number
  refund_requests: number
  orders_by_status: StatusCount[]
  orders_by_payment: { payment_method: string; count: number }[]
  orders_by_shipping: { name: string; count: number }[]
  orders_by_county: CountyData[]
  top_products: TopProduct[]
  top_customers: TopCustomer[]
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
    by_role: PayoutByRole[]
  }
  support: {
    open: number
    in_progress: number
    closed_range: number
  }
}

export interface AdminDashboardData {
  users: {
    total: number
    active: number
    suspended: number
    by_role: { role: string; count: number }[]
    new_today: number
  }
  orders: {
    total: number
    pending: number
    today: number
    total_revenue: number
    monthly_revenue: number
    by_status: { status: string; count: number }[]
  }
  prescriptions: {
    total: number
    pending: number
    approved_today: number
  }
  lab: {
    total_requests: number
    pending: number
    results_ready: number
  }
  support: {
    open: number
    in_progress: number
    high_priority: number
  }
  consultations: {
    total: number
    waiting: number
    in_progress: number
    pending_doctor_verification: number
    pending_pediatrician_verification: number
  }
  daily_summary: DailySummary[]
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

export const adminDashboardService = {
  async getReports(range = 30): Promise<FullReports> {
    const res = await apiClient.get('/admin/reports/', { params: { range } })
    return unwrap<FullReports>(res)
  },

  async getDashboard(): Promise<AdminDashboardData> {
    const res = await apiClient.get('/admin/dashboard/')
    return unwrap<AdminDashboardData>(res)
  },

  async getActivityFeed(): Promise<ActivityFeedItem[]> {
    const res = await apiClient.get('/admin/activity-feed/')
    const d = res.data as { data?: ActivityFeedItem[] } | ActivityFeedItem[]
    if (Array.isArray(d)) return d
    return (d as { data?: ActivityFeedItem[] }).data ?? []
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
