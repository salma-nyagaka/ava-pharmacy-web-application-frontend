import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { logAdminAction } from '../../data/adminAudit'
import { SupportPriority, SupportStatus, SupportTicket } from '../../data/support'
import { supportService } from '../../services/supportService'
import { loadAdminUsers } from './adminUsers'
import './AdminShared.css'
import './SupportManagement.css'

const PAGE_SIZE = 6

const priorityOrder: Record<SupportPriority, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
}

function SupportManagement() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | SupportStatus>('all')
  const [selectedPriority, setSelectedPriority] = useState<'all' | SupportPriority>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null)
  const [internalNote, setInternalNote] = useState('')

  const assigneeOptions = useMemo(() => {
    return loadAdminUsers()
      .filter((user) => user.status === 'active' && user.role === 'admin')
      .map((user) => user.name)
  }, [])

  useEffect(() => {
    void supportService.list().then((response) => setTickets(response.data))
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedStatus, selectedPriority])

  useEffect(() => {
    if (!activeTicket) return
    const updated = tickets.find((ticket) => ticket.id === activeTicket.id)
    setActiveTicket(updated ?? null)
  }, [tickets, activeTicket])

  const filteredTickets = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    const filtered = tickets.filter((ticket) => {
      const matchesStatus = selectedStatus === 'all' || ticket.status === selectedStatus
      const matchesPriority = selectedPriority === 'all' || ticket.priority === selectedPriority
      if (!query) return matchesStatus && matchesPriority
      const matchesQuery = [ticket.id, ticket.customer, ticket.email, ticket.subject, ticket.referenceId]
        .some((value) => value.toLowerCase().includes(query))
      return matchesStatus && matchesPriority && matchesQuery
    })
    return filtered.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      return b.id.localeCompare(a.id)
    })
  }, [tickets, searchTerm, selectedStatus, selectedPriority])

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedTickets = filteredTickets.slice(startIndex, startIndex + PAGE_SIZE)

  const stats = useMemo(() => {
    return {
      open: tickets.filter((ticket) => ticket.status === 'Open').length,
      inProgress: tickets.filter((ticket) => ticket.status === 'In Progress').length,
      highPriority: tickets.filter((ticket) => ticket.priority === 'High').length,
    }
  }, [tickets])

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/admin')
  }

  const updateTicket = (ticketId: string, updates: Partial<SupportTicket>, detail: string) => {
    void supportService.update(ticketId, updates).then((response) => setTickets(response.data))
    logAdminAction({
      action: 'Update support ticket',
      entity: 'Support',
      entityId: ticketId,
      detail,
    })
  }

  const addInternalNote = () => {
    if (!activeTicket || !internalNote.trim()) return
    const message = internalNote.trim()
    const note = {
      time: new Date().toLocaleString(),
      author: 'Admin User',
      message,
    }
    void supportService.appendNote(activeTicket.id, note).then((response) => setTickets(response.data))
    setInternalNote('')
    logAdminAction({
      action: 'Add support note',
      entity: 'Support',
      entityId: activeTicket.id,
      detail: message,
    })
  }

  return (
    <div className="admin-page support-management">
      <div className="admin-page__header">
        <div className="admin-page__title">
          <button className="pm-back-btn" type="button" onClick={handleBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back
          </button>
          <h1>Support & Escalations</h1>
        </div>
      </div>

      <div className="support-stats">
        <div className="support-stat">
          <span className="support-stat__label">Open tickets</span>
          <span className="support-stat__value">{stats.open}</span>
        </div>
        <div className="support-stat">
          <span className="support-stat__label">In progress</span>
          <span className="support-stat__value">{stats.inProgress}</span>
        </div>
        <div className="support-stat">
          <span className="support-stat__label">High priority</span>
          <span className="support-stat__value">{stats.highPriority}</span>
        </div>
      </div>

      <div className="admin-page__filters">
        <input
          type="text"
          placeholder="Search by ticket ID, customer, issue, reference..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as 'all' | SupportStatus)}>
          <option value="all">All statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
        <select value={selectedPriority} onChange={(event) => setSelectedPriority(event.target.value as 'all' | SupportPriority)}>
          <option value="all">All priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      <div className="admin-page__table">
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Customer</th>
              <th>Channel</th>
              <th>Reference</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Assigned</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pagedTickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>
                  <div className="support-ticket-id">{ticket.id}</div>
                  <div className="support-ticket-subject">{ticket.subject}</div>
                </td>
                <td>
                  <div>{ticket.customer}</div>
                  <div className="support-ticket-subject">{ticket.email}</div>
                </td>
                <td>{ticket.channel}</td>
                <td>
                  {ticket.channel === 'Order' && (
                    <Link to={`/admin/orders/${ticket.referenceId}`}>{ticket.referenceId}</Link>
                  )}
                  {ticket.channel !== 'Order' && <span>{ticket.referenceId}</span>}
                </td>
                <td>
                  <span className={`support-priority support-priority--${ticket.priority.toLowerCase()}`}>
                    {ticket.priority}
                  </span>
                </td>
                <td>
                  <span className={`admin-status ${ticket.status === 'Resolved' ? 'admin-status--success' : ticket.status === 'Open' ? 'admin-status--warning' : 'admin-status--info'}`}>
                    {ticket.status}
                  </span>
                </td>
                <td>{ticket.assignedTo}</td>
                <td>
                  <div className="support-actions">
                    <button className="btn-sm btn--outline" type="button" onClick={() => setActiveTicket(ticket)}>
                      View
                    </button>
                    {ticket.status !== 'In Progress' && (
                      <button className="btn-sm btn--outline" type="button" onClick={() => updateTicket(ticket.id, { status: 'In Progress' }, 'Moved to In Progress')}>
                        Start
                      </button>
                    )}
                    {ticket.status !== 'Resolved' && (
                      <button className="btn-sm btn--primary" type="button" onClick={() => updateTicket(ticket.id, { status: 'Resolved' }, 'Marked as Resolved')}>
                        Resolve
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {pagedTickets.length === 0 && (
              <tr>
                <td colSpan={8} className="support-empty">No tickets match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredTickets.length > 0 && (
        <div className="support-pagination">
          <button
            className="pagination__button"
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <div className="pagination__pages">
            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1
              return (
                <button
                  key={page}
                  className={`pagination__page ${page === currentPage ? 'pagination__page--active' : ''}`}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              )
            })}
          </div>
          <button
            className="pagination__button"
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {activeTicket && (
        <div className="support-modal-overlay" onClick={() => setActiveTicket(null)}>
          <div className="support-modal" onClick={(event) => event.stopPropagation()}>
            <div className="support-modal__header">
              <h2>{activeTicket.id}</h2>
              <button className="support-modal__close" type="button" onClick={() => setActiveTicket(null)}>×</button>
            </div>
            <div className="support-modal__content">
              <div className="support-modal__summary">
                <div>
                  <p className="support-modal__label">Subject</p>
                  <p>{activeTicket.subject}</p>
                </div>
                <div>
                  <p className="support-modal__label">Customer</p>
                  <p>{activeTicket.customer}</p>
                </div>
                <div>
                  <p className="support-modal__label">Reference</p>
                  <p>{activeTicket.referenceId}</p>
                </div>
                <div>
                  <p className="support-modal__label">Created</p>
                  <p>{activeTicket.createdAt}</p>
                </div>
              </div>

              <div className="support-modal__row">
                <div className="support-modal__group">
                  <label htmlFor="support-assignee">Assign to</label>
                  <select
                    id="support-assignee"
                    value={activeTicket.assignedTo}
                    onChange={(event) =>
                      updateTicket(activeTicket.id, { assignedTo: event.target.value }, `Assigned to ${event.target.value}`)
                    }
                  >
                    <option value="Unassigned">Unassigned</option>
                    {assigneeOptions.map((assignee) => (
                      <option key={assignee} value={assignee}>{assignee}</option>
                    ))}
                  </select>
                </div>
                <div className="support-modal__group">
                  <label htmlFor="support-status">Status</label>
                  <select
                    id="support-status"
                    value={activeTicket.status}
                    onChange={(event) =>
                      updateTicket(
                        activeTicket.id,
                        { status: event.target.value as SupportStatus },
                        `Status changed to ${event.target.value}`
                      )
                    }
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div className="support-modal__group">
                <label htmlFor="support-note">Internal note</label>
                <textarea
                  id="support-note"
                  rows={3}
                  value={internalNote}
                  onChange={(event) => setInternalNote(event.target.value)}
                  placeholder="Add handling notes or next steps."
                />
                <button className="btn btn--outline btn--sm support-note-btn" type="button" onClick={addInternalNote}>
                  Add note
                </button>
              </div>

              <div className="support-modal__audit">
                <p className="support-modal__label">Timeline</p>
                <ul>
                  {activeTicket.notes.map((entry, index) => (
                    <li key={`${entry.time}-${index}`}>
                      <strong>{entry.time}</strong> · {entry.author}: {entry.message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="support-modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setActiveTicket(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SupportManagement
