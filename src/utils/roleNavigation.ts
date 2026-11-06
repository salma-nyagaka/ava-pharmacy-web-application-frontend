export const STAFF_DASHBOARDS: Readonly<Record<string, string>> = {
  admin: '/admin/dashboard',
  doctor: '/doctor/dashboard',
  pediatrician: '/pediatrician/dashboard',
  pharmacist: '/pharmacist/dashboard',
  lab_partner: '/lab/dashboard',
  lab_technician: '/labtech/dashboard',
  inventory_staff: '/inventory',
  ppb_inspector: '/account',
}

export function dashboardForRole(role?: string): string {
  return STAFF_DASHBOARDS[(role || '').toLowerCase()] || '/'
}
