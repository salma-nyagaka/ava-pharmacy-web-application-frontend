import { apiClient } from '../lib/apiClient'
import type { SupportChannel, SupportNote, SupportPriority, SupportStatus, SupportTicket } from '../data/support'

type ApiSupportNote = { created_at: string; author_name: string; message: string; is_internal: boolean }
type ApiSupportTicket = {
  id: number
  reference: string
  customer_name: string
  customer_email: string
  channel: 'order' | 'prescription' | 'consultation' | 'other'
  reference_id: string
  subject: string
  priority: 'low' | 'medium' | 'high'
  status: 'open' | 'in_progress' | 'resolved'
  assigned_to: number | null
  assigned_to_name: string | null
  created_at: string
  notes: ApiSupportNote[]
}

const channelLabels: Record<ApiSupportTicket['channel'], SupportChannel> = {
  order: 'Order', prescription: 'Prescription', consultation: 'Consultation', other: 'General',
}
const priorityLabels: Record<ApiSupportTicket['priority'], SupportPriority> = {
  low: 'Low', medium: 'Medium', high: 'High',
}
const statusLabels: Record<ApiSupportTicket['status'], SupportStatus> = {
  open: 'Open', in_progress: 'In Progress', resolved: 'Resolved',
}
const priorityValues: Record<SupportPriority, ApiSupportTicket['priority']> = {
  Low: 'low', Medium: 'medium', High: 'high',
}
const statusValues: Record<SupportStatus, ApiSupportTicket['status']> = {
  Open: 'open', 'In Progress': 'in_progress', Resolved: 'resolved',
}

function unwrapCollection(payload: unknown): ApiSupportTicket[] {
  if (Array.isArray(payload)) return payload as ApiSupportTicket[]
  if (!payload || typeof payload !== 'object') return []
  const root = payload as { data?: unknown; results?: unknown }
  if (Array.isArray(root.results)) return root.results as ApiSupportTicket[]
  if (Array.isArray(root.data)) return root.data as ApiSupportTicket[]
  if (root.data && typeof root.data === 'object') {
    const nested = root.data as { results?: unknown }
    if (Array.isArray(nested.results)) return nested.results as ApiSupportTicket[]
  }
  return []
}

function mapTicket(ticket: ApiSupportTicket): SupportTicket {
  return {
    backendId: ticket.id,
    id: ticket.reference,
    customer: ticket.customer_name,
    email: ticket.customer_email,
    channel: channelLabels[ticket.channel] ?? 'General',
    referenceId: ticket.reference_id,
    subject: ticket.subject,
    priority: priorityLabels[ticket.priority] ?? 'Medium',
    status: statusLabels[ticket.status] ?? 'Open',
    assignedTo: ticket.assigned_to_name || 'Unassigned',
    assignedToId: ticket.assigned_to,
    createdAt: new Date(ticket.created_at).toLocaleString('en-KE'),
    notes: (ticket.notes ?? []).map((note) => ({
      time: new Date(note.created_at).toLocaleString('en-KE'),
      author: note.author_name || 'System',
      message: note.message,
      isInternal: note.is_internal,
    })),
  }
}

async function listTickets(): Promise<SupportTicket[]> {
  const tickets: ApiSupportTicket[] = []
  let page=1
  while(true){
    const response=await apiClient.get('/support/tickets/',{params:{page}})
    tickets.push(...unwrapCollection(response.data))
    const payload=response.data?.data ?? response.data
    if(!response.data?.meta?.next && !payload?.next) break
    page+=1
  }
  return tickets.map(mapTicket)
}

export const supportService = {
  async create(payload: { subject: string; channel: string; reference_id?: string }) {
    const response=await apiClient.post('/support/tickets/',payload)
    return mapTicket(((response.data as {data?: ApiSupportTicket}).data ?? response.data) as ApiSupportTicket)
  },
  async list() {
    return { data: await listTickets(), source: 'api' as const }
  },

  async update(ticketId: number, updates: Partial<SupportTicket>) {
    const payload: Record<string, unknown> = {}
    if (updates.status) payload.status = statusValues[updates.status]
    if (updates.priority) payload.priority = priorityValues[updates.priority]
    if ('assignedToId' in updates) payload.assigned_to = updates.assignedToId
    await apiClient.patch(`/support/tickets/${ticketId}/`, payload)
    return { data: await listTickets(), source: 'api' as const }
  },

  async appendNote(ticketId: number, note: Pick<SupportNote, 'message'> & { isInternal?: boolean }) {
    await apiClient.post(`/support/tickets/${ticketId}/notes/`, { message: note.message, is_internal: Boolean(note.isInternal) })
    return { data: await listTickets(), source: 'api' as const }
  },
}
