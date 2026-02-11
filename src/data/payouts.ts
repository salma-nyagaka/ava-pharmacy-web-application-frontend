export type PayoutRole = 'Doctor' | 'Pediatrician' | 'Pharmacist' | 'Lab Partner'
export type PayoutMethod = 'Bank Transfer' | 'M-Pesa' | 'Cheque' | 'Cash'
export type PayoutStatus = 'Pending' | 'Paid' | 'Failed'

export interface AdminPayout {
  id: string
  recipientId?: string
  recipientName: string
  role: PayoutRole
  period: string
  amount: number
  method: PayoutMethod
  reference: string
  status: PayoutStatus
  requestedAt: string
  paidAt?: string
  notes?: string
}

const STORAGE_KEY = 'ava_admin_payouts'

const defaultPayouts: AdminPayout[] = [
  {
    id: 'PAY-1001',
    recipientId: 'DOC-001',
    recipientName: 'Dr. Sarah Johnson',
    role: 'Doctor',
    period: 'Jan 2026',
    amount: 68000,
    method: 'Bank Transfer',
    reference: 'TRX-847311',
    status: 'Paid',
    requestedAt: '2026-02-01',
    paidAt: '2026-02-03',
    notes: 'Monthly consultation payout.',
  },
  {
    id: 'PAY-1002',
    recipientId: 'PED-002',
    recipientName: 'Dr. Amina Hassan',
    role: 'Pediatrician',
    period: 'Jan 2026',
    amount: 39600,
    method: 'M-Pesa',
    reference: 'MP-220183',
    status: 'Paid',
    requestedAt: '2026-02-01',
    paidAt: '2026-02-03',
  },
  {
    id: 'PAY-1003',
    recipientName: 'Ava Central Lab',
    role: 'Lab Partner',
    period: 'Jan 2026',
    amount: 240000,
    method: 'Bank Transfer',
    reference: 'TRX-112904',
    status: 'Pending',
    requestedAt: '2026-02-04',
    notes: 'Diagnostics revenue share payout.',
  },
]

export const loadAdminPayouts = (): AdminPayout[] => {
  if (typeof window === 'undefined') return defaultPayouts

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPayouts))
      return defaultPayouts
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : defaultPayouts
  } catch {
    return defaultPayouts
  }
}

export const saveAdminPayouts = (payouts: AdminPayout[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payouts))
}
