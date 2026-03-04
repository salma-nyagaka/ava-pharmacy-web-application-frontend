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
  joinedDate: string
  totalOrders: number
  lastOrderDate?: string
  address: string
  notes: string[]
  pharmacistPermissions?: PharmacistPermission[]
}

const STORAGE_KEY = 'ava_admin_users'

const defaultUsers: AdminUser[] = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+254 712 345 678',
    role: 'customer',
    status: 'active',
    joinedDate: '2024-01-15',
    totalOrders: 12,
    lastOrderDate: '2026-01-18',
    address: 'Westlands, Nairobi',
    notes: ['Prefers M-Pesa payments.'],
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+254 723 456 789',
    role: 'customer',
    status: 'active',
    joinedDate: '2024-02-20',
    totalOrders: 8,
    lastOrderDate: '2026-01-12',
    address: 'Kilimani, Nairobi',
    notes: ['Repeat customer for skincare items.'],
  },
  {
    id: 3,
    name: 'Admin User',
    email: 'admin@avapharmacy.co.ke',
    phone: '+254 734 567 890',
    role: 'admin',
    status: 'active',
    joinedDate: '2023-12-01',
    totalOrders: 0,
    address: 'Head Office',
    notes: ['Full admin access.'],
  },
  {
    id: 4,
    name: 'Dr. Sarah Johnson',
    email: 'dr.sarah@avapharmacy.co.ke',
    phone: '+254 745 678 901',
    role: 'doctor',
    status: 'active',
    joinedDate: '2024-03-10',
    totalOrders: 0,
    address: 'Nairobi CBD',
    notes: ['Consulting physician.'],
  },
  {
    id: 5,
    name: 'Dr. Mercy Otieno',
    email: 'dr.mercy@avapharmacy.co.ke',
    phone: '+254 756 789 012',
    role: 'pediatrician',
    status: 'active',
    joinedDate: '2024-01-05',
    totalOrders: 0,
    address: 'Parklands, Nairobi',
    notes: ['Pediatric consultations.'],
  },
  {
    id: 6,
    name: 'Grace Njeri',
    email: 'grace.pharm@avapharmacy.co.ke',
    phone: '+254 767 890 123',
    role: 'pharmacist',
    status: 'active',
    joinedDate: '2024-04-01',
    totalOrders: 0,
    address: 'Upper Hill, Nairobi',
    notes: ['Dispensing and review team lead.'],
    pharmacistPermissions: ['prescription_review', 'dispense_orders', 'inventory_add'],
  },
  {
    id: 7,
    name: 'Samuel Kiptoo',
    email: 'samuel.lab@avapharmacy.co.ke',
    phone: '+254 778 901 234',
    role: 'lab_technician',
    status: 'active',
    joinedDate: '2024-02-14',
    totalOrders: 0,
    address: 'Karen, Nairobi',
    notes: ['Lab processing desk.'],
  },
  {
    id: 8,
    name: 'Support Admin',
    email: 'support@avapharmacy.co.ke',
    phone: '+254 789 012 345',
    role: 'admin',
    status: 'active',
    joinedDate: '2024-01-01',
    totalOrders: 0,
    address: 'Head Office',
    notes: ['Support escalation contact.'],
  },
  {
    id: 9,
    name: 'Liam Otieno',
    email: 'liam@example.com',
    phone: '+254 701 111 222',
    role: 'customer',
    status: 'active',
    joinedDate: '2024-05-21',
    totalOrders: 4,
    lastOrderDate: '2026-01-25',
    address: 'Langata, Nairobi',
    notes: ['Prefers SMS updates.'],
  },
  {
    id: 10,
    name: 'Grace Wanjiku',
    email: 'grace@example.com',
    phone: '+254 702 333 444',
    role: 'customer',
    status: 'active',
    joinedDate: '2024-06-02',
    totalOrders: 5,
    lastOrderDate: '2026-01-10',
    address: 'Runda, Nairobi',
    notes: ['Allergy to penicillin noted.'],
  },
]

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

const getFallbackUsers = () => {
  return defaultUsers
}

export const loadAdminUsers = () => {
  if (typeof window === 'undefined') {
    return getFallbackUsers()
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const fallback = getFallbackUsers()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
      return fallback
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as AdminUser[] : getFallbackUsers()
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
