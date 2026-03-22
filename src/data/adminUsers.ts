export type AdminUserRole =
  | 'customer'
  | 'admin'
  | 'pharmacist'
  | 'doctor'
  | 'pediatrician'
  | 'lab_technician'
  | 'inventory_staff'

export type PharmacistPermission =
  | 'prescription_review'
  | 'dispense_orders'
  | 'inventory_add'

export interface AdminUser {
  id: number
  name: string
  email: string
  phone: string
  role: AdminUserRole
  status: 'active' | 'suspended'
  accountActivated?: boolean
  joinedDate: string
  totalOrders: number
  lastOrderDate?: string
  address: string
  notes: string[]
  pharmacistPermissions?: PharmacistPermission[]
}

const STORAGE_KEY = 'ava_admin_users'

const looksLikeLegacySeed = (users: AdminUser[]) => {
  const emails = new Set(users.map((user) => user.email))
  return emails.has('grace.pharm@avapharmacy.co.ke') && emails.has('john@example.com')
}

export const adminRoleOptions: Array<{ value: AdminUserRole; label: string }> = [
  { value: 'customer', label: 'Customer' },
  { value: 'admin', label: 'Admin' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'pediatrician', label: 'Pediatrician' },
  { value: 'lab_technician', label: 'Lab Technician' },
  { value: 'inventory_staff', label: 'Inventory/Store Staff' },
]

export const pharmacistPermissionOptions: Array<{ value: PharmacistPermission; label: string }> = [
  { value: 'prescription_review', label: 'Prescription review' },
  { value: 'dispense_orders', label: 'Dispense orders' },
  { value: 'inventory_add', label: 'Add inventory records' },
]

export const formatAdminRole = (role: AdminUserRole) => {
  const option = adminRoleOptions.find((item) => item.value === role)
  return option?.label ?? role
}

export const formatPharmacistPermission = (permission: PharmacistPermission) => {
  const option = pharmacistPermissionOptions.find((item) => item.value === permission)
  return option?.label ?? permission
}

const getFallbackUsers = (): AdminUser[] => []

export const loadAdminUsers = () => {
  if (typeof window === 'undefined') {
    return getFallbackUsers()
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return getFallbackUsers()
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return getFallbackUsers()
    const users = parsed as AdminUser[]
    if (looksLikeLegacySeed(users)) {
      window.localStorage.removeItem(STORAGE_KEY)
      return getFallbackUsers()
    }
    return users
  } catch {
    return getFallbackUsers()
  }
}

export const saveAdminUsers = (users: AdminUser[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
}

export const nextAdminUserId = (users: AdminUser[]) => {
  return users.reduce((max, user) => Math.max(max, user.id), 0) + 1
}

export const pharmacistHasPermission = (
  user: AdminUser | null | undefined,
  permission: PharmacistPermission
) => {
  return user?.role === 'pharmacist' && (user.pharmacistPermissions ?? []).includes(permission)
}

export const canAddInventoryRecords = (user: AdminUser | null | undefined) => {
  if (!user) return false
  return user.role === 'admin' || pharmacistHasPermission(user, 'inventory_add')
}

export const canUpdateInventory = (user: AdminUser | null | undefined) => {
  return user?.role === 'admin'
}
