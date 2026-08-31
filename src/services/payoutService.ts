import { apiClient } from '../lib/apiClient'
import type { AdminPayout, PayoutMethod, PayoutRole, PayoutStatus } from '../data/payouts'
import type { PayoutRule } from '../data/payoutRules'

const ROLE_TO_API: Record<PayoutRole, string> = {
  Doctor: 'doctor', Pediatrician: 'pediatrician', 'Lab Technician': 'lab_technician',
  'Lab Partner': 'lab_partner', Pharmacist: 'pharmacist',
}
const ROLE_FROM_API: Record<string, PayoutRole> = Object.fromEntries(Object.entries(ROLE_TO_API).map(([key, value]) => [value, key])) as Record<string, PayoutRole>
const METHOD_TO_API: Record<PayoutMethod, string> = {
  'Bank Transfer': 'bank_transfer', 'M-Pesa': 'mpesa', Card: 'bank_transfer', Cheque: 'cheque', Cash: 'cash',
}
const METHOD_FROM_API: Record<string, PayoutMethod> = { bank_transfer: 'Bank Transfer', mpesa: 'M-Pesa', cheque: 'Cheque', cash: 'Cash' }
const STATUS_FROM_API: Record<string, PayoutStatus> = {
  draft: 'Draft', pending: 'Pending', approved: 'Approved', processing: 'Processing', paid: 'Paid',
  failed: 'Failed', on_hold: 'On hold', reversed: 'Reversed', cancelled: 'Cancelled',
}

function root<T>(value: unknown): T {
  const record = value as { data?: T }
  return (record?.data ?? value) as T
}

function list<T>(value: unknown): T[] {
  const payload = root<unknown>(value)
  if (Array.isArray(payload)) return payload as T[]
  return ((payload as { results?: T[] })?.results ?? [])
}

function mapPayout(raw: Record<string, unknown>): AdminPayout {
  const reconciliation = String(raw.reconciliation_status) as 'unmatched' | 'matched' | 'exception'
  return {
    backendId: Number(raw.id),
    id: String(raw.reference ?? ''),
    recipientId: raw.recipient == null ? undefined : String(raw.recipient),
    recipientName: String(raw.recipient_name ?? ''),
    role: ROLE_FROM_API[String(raw.role)] ?? 'Doctor',
    period: String(raw.period ?? ''),
    amount: Number(raw.amount ?? 0),
    grossAmount: Number(raw.gross_amount ?? raw.amount ?? 0),
    commissionAmount: Number(raw.commission_amount ?? 0),
    withholdingAmount: Number(raw.withholding_amount ?? 0),
    deductionAmount: Number(raw.deduction_amount ?? 0),
    method: METHOD_FROM_API[String(raw.method)] ?? 'M-Pesa',
    reference: String(raw.payment_reference ?? ''),
    providerTransactionId: String(raw.provider_transaction_id ?? ''),
    status: STATUS_FROM_API[String(raw.status)] ?? 'Pending',
    requestedAt: String(raw.requested_at ?? ''),
    paidAt: raw.paid_at ? String(raw.paid_at) : undefined,
    notes: String(raw.notes ?? ''),
    source: 'Manual',
    taskType: raw.source_type ? String(raw.source_type).replace(/_/g, ' ') as AdminPayout['taskType'] : undefined,
    taskId: String(raw.source_reference ?? ''),
    reconciliationStatus: ({ unmatched: 'Unmatched', matched: 'Matched', exception: 'Exception' } as const)[reconciliation] ?? 'Unmatched',
    retryCount: Number(raw.retry_count ?? 0),
  }
}

export const payoutService = {
  async list(): Promise<AdminPayout[]> {
    const response = await apiClient.get('/admin/payouts/', { params: { page_size: 500, ordering: '-requested_at' } })
    return list<Record<string, unknown>>(response.data).map(mapPayout)
  },
  async create(payload: { recipient?: number; recipientName: string; role: PayoutRole; period: string; amount: number; method: PayoutMethod; notes?: string; sourceReference?: string }): Promise<AdminPayout> {
    const response = await apiClient.post('/admin/payouts/', {
      recipient: payload.recipient,
      recipient_name: payload.recipientName,
      role: ROLE_TO_API[payload.role],
      period: payload.period,
      source_type: 'manual_adjustment',
      source_reference: payload.sourceReference || '',
      idempotency_key: payload.sourceReference ? `manual:${payload.sourceReference}` : null,
      gross_amount: payload.amount,
      commission_amount: 0,
      withholding_amount: 0,
      deduction_amount: 0,
      currency: 'KES',
      method: METHOD_TO_API[payload.method],
      notes: payload.notes || '',
    })
    return mapPayout(root<Record<string, unknown>>(response.data))
  },
  async action(id: number, action: string, extras: Record<string, unknown> = {}): Promise<AdminPayout> {
    const response = await apiClient.post(`/admin/payouts/${id}/actions/`, { action, ...extras })
    return mapPayout(root<Record<string, unknown>>(response.data))
  },
  async listRules(): Promise<PayoutRule[]> {
    const response = await apiClient.get('/admin/payout-rules/')
    return list<Record<string, unknown>>(response.data).map((raw) => ({
      backendId: Number(raw.id), role: ROLE_FROM_API[String(raw.role)], amount: Number(raw.amount), currency: 'KSh', active: Boolean(raw.is_active),
    }))
  },
  async saveRule(rule: PayoutRule): Promise<PayoutRule> {
    const body = { role: ROLE_TO_API[rule.role], amount: rule.amount, currency: 'KSh', is_active: rule.active }
    const response = rule.backendId
      ? await apiClient.patch(`/admin/payout-rules/${rule.backendId}/`, body)
      : await apiClient.post('/admin/payout-rules/', body)
    const raw = root<Record<string, unknown>>(response.data)
    return { backendId: Number(raw.id), role: ROLE_FROM_API[String(raw.role)], amount: Number(raw.amount), currency: 'KSh', active: Boolean(raw.is_active) }
  },
}
