export type SupportChannel = 'Order' | 'Prescription' | 'Consultation' | 'General'
export type SupportPriority = 'Low' | 'Medium' | 'High'
export type SupportStatus = 'Open' | 'In Progress' | 'Resolved'

export interface SupportNote {
  isInternal?: boolean
  time: string
  author: string
  message: string
}

export interface SupportTicket {
  backendId: number
  id: string
  customer: string
  email: string
  channel: SupportChannel
  referenceId: string
  subject: string
  priority: SupportPriority
  status: SupportStatus
  assignedTo: string
  assignedToId: number | null
  createdAt: string
  notes: SupportNote[]
}
