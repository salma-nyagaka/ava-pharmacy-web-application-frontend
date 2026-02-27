export type PayoutRuleRole = 'Doctor' | 'Pediatrician' | 'Lab Technician' | 'Lab Partner' | 'Pharmacist'

export interface PayoutRule {
  role: PayoutRuleRole
  amount: number
  currency: 'KSh'
  active: boolean
}

const STORAGE_KEY = 'ava_payout_rules'

const defaultRules: PayoutRule[] = [
  { role: 'Doctor', amount: 1500, currency: 'KSh', active: true },
  { role: 'Pediatrician', amount: 1800, currency: 'KSh', active: true },
  { role: 'Lab Technician', amount: 700, currency: 'KSh', active: true },
  { role: 'Lab Partner', amount: 1200, currency: 'KSh', active: true },
  { role: 'Pharmacist', amount: 900, currency: 'KSh', active: true },
]

export const loadPayoutRules = (): PayoutRule[] => {
  if (typeof window === 'undefined') return defaultRules
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultRules))
      return defaultRules
    }
    const parsed = JSON.parse(raw)
    const stored = Array.isArray(parsed) ? parsed : defaultRules
    const normalized: PayoutRule[] = stored
      .filter((rule) => rule && typeof rule.role === 'string')
      .map((rule) => ({
        role: rule.role,
        amount: typeof rule.amount === 'number' ? rule.amount : 0,
        currency: rule.currency === 'KSh' ? 'KSh' : 'KSh',
        active: typeof rule.active === 'boolean' ? rule.active : true,
      }))
    const merged = [...normalized]
    defaultRules.forEach((rule) => {
      if (!merged.some((item) => item.role === rule.role)) {
        merged.push(rule)
      }
    })
    return merged
  } catch {
    return defaultRules
  }
}

export const savePayoutRules = (rules: PayoutRule[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
}
