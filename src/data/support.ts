export type SupportChannel = 'Order' | 'Prescription' | 'Consultation'
export type SupportPriority = 'Low' | 'Medium' | 'High'
export type SupportStatus = 'Open' | 'In Progress' | 'Resolved'

export interface SupportNote {
  time: string
  author: string
  message: string
}

export interface SupportTicket {
  id: string
  customer: string
  email: string
  channel: SupportChannel
  referenceId: string
  subject: string
  priority: SupportPriority
  status: SupportStatus
  assignedTo: string
  createdAt: string
  notes: SupportNote[]
}

const STORAGE_KEY = 'ava_support_tickets'

const defaultTickets: SupportTicket[] = [
  {
    id: 'SUP-1001',
    customer: 'Sarah M.',
    email: 'sarah.m@example.com',
    channel: 'Order',
    referenceId: 'ORD-001',
    subject: 'Courier delay after dispatch',
    priority: 'High',
    status: 'In Progress',
    assignedTo: 'Support Admin',
    createdAt: '2026-02-08 09:20 AM',
    notes: [
      { time: '2026-02-08 09:22 AM', author: 'Support Admin', message: 'Escalated to delivery team.' },
      { time: '2026-02-08 09:50 AM', author: 'System', message: 'Customer notified of revised ETA.' },
    ],
  },
  {
    id: 'SUP-1002',
    customer: 'Brian K.',
    email: 'brian.k@example.com',
    channel: 'Prescription',
    referenceId: 'RX-2040',
    subject: 'Clarification request not received',
    priority: 'Medium',
    status: 'Open',
    assignedTo: 'Unassigned',
    createdAt: '2026-02-08 10:14 AM',
    notes: [{ time: '2026-02-08 10:14 AM', author: 'System', message: 'Ticket created from prescription flow.' }],
  },
  {
    id: 'SUP-1003',
    customer: 'Aisha T.',
    email: 'aisha.t@example.com',
    channel: 'Consultation',
    referenceId: 'CONS-1203',
    subject: 'Unable to access consultation transcript',
    priority: 'Low',
    status: 'Resolved',
    assignedTo: 'Support Admin',
    createdAt: '2026-02-07 03:40 PM',
    notes: [
      { time: '2026-02-07 03:45 PM', author: 'Support Admin', message: 'Session cache cleared and access restored.' },
      { time: '2026-02-07 03:48 PM', author: 'Support Admin', message: 'Customer confirmed issue resolved.' },
    ],
  },
]

const safeLoad = <T,>(fallback: T) => {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
      return fallback
    }
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

export const loadSupportTickets = () => safeLoad(defaultTickets)

export const saveSupportTickets = (tickets: SupportTicket[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets))
}

export const appendTicketNote = (
  tickets: SupportTicket[],
  ticketId: string,
  note: SupportNote
) => {
  return tickets.map((ticket) =>
    ticket.id === ticketId ? { ...ticket, notes: [note, ...ticket.notes] } : ticket
  )
}
