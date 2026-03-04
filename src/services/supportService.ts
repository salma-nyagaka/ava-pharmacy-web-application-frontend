import { appendTicketNote, loadSupportTickets, saveSupportTickets, SupportNote, SupportStatus, SupportTicket } from '../data/support'
import { toApiResult } from './mockApi'

export const supportService = {
  list: async () => toApiResult(loadSupportTickets()),
  saveAll: async (tickets: SupportTicket[]) => {
    saveSupportTickets(tickets)
    return toApiResult(tickets)
  },
  update: async (ticketId: string, updates: Partial<SupportTicket>) => {
    const current = loadSupportTickets()
    const updated = current.map((ticket: SupportTicket) => (
      ticket.id === ticketId ? { ...ticket, ...updates } : ticket
    ))
    saveSupportTickets(updated)
    return toApiResult(updated)
  },
  setStatus: async (ticketId: string, status: SupportStatus) => {
    const current = loadSupportTickets()
    const updated = current.map((ticket: SupportTicket) => (
      ticket.id === ticketId ? { ...ticket, status } : ticket
    ))
    saveSupportTickets(updated)
    return toApiResult(updated)
  },
  appendNote: async (ticketId: string, note: SupportNote) => {
    const current = loadSupportTickets()
    const updated = appendTicketNote(current, ticketId, note)
    saveSupportTickets(updated)
    return toApiResult(updated)
  },
}
