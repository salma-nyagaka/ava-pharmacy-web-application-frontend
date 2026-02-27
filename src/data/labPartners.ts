export type LabPartnerStatus = 'Pending' | 'Verified' | 'Suspended'

export interface LabTechnician {
  id: string
  name: string
  email: string
  phone: string
  status: 'Active' | 'Inactive'
}

export interface LabPartner {
  id: string
  name: string
  email: string
  phone: string
  location: string
  payoutMethod: 'M-Pesa' | 'Bank Transfer'
  payoutAccount: string
  status: LabPartnerStatus
  submittedAt: string
  verifiedAt?: string
  notes?: string
  techs: LabTechnician[]
}

const STORAGE_KEY = 'ava_lab_partners'

const defaultLabPartners: LabPartner[] = [
  {
    id: 'LAB-P-001',
    name: 'Ava Central Lab',
    email: 'central@avalabs.co.ke',
    phone: '+254 700 555 110',
    location: 'Mombasa Road, Nairobi',
    payoutMethod: 'Bank Transfer',
    payoutAccount: 'NCB-001-112233',
    status: 'Verified',
    submittedAt: '2026-01-10',
    verifiedAt: '2026-01-12',
    notes: 'Primary diagnostics partner.',
    techs: [
      { id: 'LAB-T-001', name: 'Samuel Kiptoo', email: 'samuel@avalabs.co.ke', phone: '+254 700 111 222', status: 'Active' },
      { id: 'LAB-T-002', name: 'Grace Njeri', email: 'grace@avalabs.co.ke', phone: '+254 700 111 333', status: 'Active' },
    ],
  },
  {
    id: 'LAB-P-002',
    name: 'Wellness Diagnostics',
    email: 'hello@wellnessdx.co.ke',
    phone: '+254 722 555 220',
    location: 'Westlands, Nairobi',
    payoutMethod: 'M-Pesa',
    payoutAccount: '+254722555220',
    status: 'Pending',
    submittedAt: '2026-02-05',
    notes: 'Awaiting compliance documents.',
    techs: [
      { id: 'LAB-T-003', name: 'Brian Otieno', email: 'brian@wellnessdx.co.ke', phone: '+254 722 111 444', status: 'Active' },
    ],
  },
]

const safeLoad = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(fallback))
      return fallback
    }
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

export const loadLabPartners = () => safeLoad(STORAGE_KEY, defaultLabPartners)

export const saveLabPartners = (partners: LabPartner[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(partners))
}

export const nextLabPartnerId = (partners: LabPartner[]) => {
  const maxId = partners.reduce((max, partner) => {
    const value = Number.parseInt(partner.id.replace('LAB-P-', ''), 10)
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 0)
  return `LAB-P-${String(maxId + 1).padStart(3, '0')}`
}

export const nextLabTechId = (partners: LabPartner[]) => {
  const allTechs = partners.flatMap((partner) => partner.techs)
  const maxId = allTechs.reduce((max, tech) => {
    const value = Number.parseInt(tech.id.replace('LAB-T-', ''), 10)
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 0)
  return `LAB-T-${String(maxId + 1).padStart(3, '0')}`
}
