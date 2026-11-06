import { useAdminRecordStats } from '../../hooks/useAdminRecordStats'
import { formatStatus } from '../../utils/formatStatus'
import Dialog from '../../components/Dialog/Dialog'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { logAdminAction } from '../../data/adminAudit'
import { SupportPriority, SupportStatus, SupportTicket } from '../../data/support'
import { supportService } from '../../services/supportService'
import { adminUserService } from '../../services/adminUserService'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/admin/SupportManagement.css'

const PAGE_SIZE = 6

const priorityOrder: Record<SupportPriority, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
}

function SupportManagement() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | SupportStatus>('all')
  const [selectedPriority, setSelectedPriority] = useState<'all' | SupportPriority>('all')
  const [quickFilter, setQuickFilter] = useState<'all' | 'unassigned' | 'high'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null)
  const [isInternal, setIsInternal] = useState(true)
  const [noteBusy, setNoteBusy] = useState(false)
  const [internalNote, setInternalNote] = useState('')
  const [assigneeOptions, setAssigneeOptions] = useState<Array<{ id: number; name: string }>>([])
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    void Promise.all([supportService.list(), adminUserService.listUsers()])
      .then(([response, users]) => {
        setTickets(response.data)
        setAssigneeOptions(users
          .filter((user) => user.role === 'admin' && user.is_active !== false && user.status !== 'suspended')
          .map((user) => ({ id: user.id, name: user.full_name || user.name || user.email })))
      })
      .catch(() => setLoadError('Unable to load support tickets. Please try again.'))
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedStatus, selectedPriority, quickFilter])

  useEffect(() => {
    if (!activeTicket) return
    const updated = tickets.find((ticket) => ticket.id === activeTicket.id)
    setActiveTicket(updated ?? null)
  }, [tickets, activeTicket])

  const filteredTickets = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    const filtered = tickets.filter((ticket) => {
      const matchesQuickFilter =
        quickFilter === 'all' ||
        (quickFilter === 'unassigned' && ticket.assignedTo === 'Unassigned') ||
        (quickFilter === 'high' && ticket.priority === 'High')
      const matchesStatus = selectedStatus === 'all' || ticket.status === selectedStatus
      const matchesPriority = selectedPriority === 'all' || ticket.priority === selectedPriority
      if (!query) return matchesQuickFilter && matchesStatus && matchesPriority
      const matchesQuery = [ticket.id, ticket.customer, ticket.email, ticket.subject, ticket.referenceId]
        .some((value) => value.toLowerCase().includes(query))
      return matchesQuickFilter && matchesStatus && matchesPriority && matchesQuery
    })
    return filtered.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      return b.id.localeCompare(a.id)
    })
  }, [tickets, searchTerm, selectedStatus, selectedPriority, quickFilter])

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedTickets = filteredTickets.slice(startIndex, startIndex + PAGE_SIZE)

  const { count: databaseCount } = useAdminRecordStats('support', 'all', tickets)


  const quickCounts = { all: databaseCount('total'), unassigned: databaseCount('unassigned'), high: databaseCount('highPriority') }

  const hasFilters =
    searchTerm.trim().length > 0 || selectedStatus !== 'all' || selectedPriority !== 'all' || quickFilter !== 'all'

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedStatus('all')
    setSelectedPriority('all')
    setQuickFilter('all')
  }

  const applyQuickFilter = (filter: 'all' | 'unassigned' | 'high') => {
    setQuickFilter(filter)
    setSearchTerm('')
    setSelectedStatus('all')
    setSelectedPriority('all')
  }

  const updateTicket = (ticketId: string, updates: Partial<SupportTicket>, detail: string) => {
    const ticket = tickets.find((item) => item.id === ticketId)
    if (!ticket) return
    void supportService.update(ticket.backendId, updates)
      .then((response) => {setTickets(response.data);logAdminAction({action:'Update support ticket',entity:'Support',entityId:ticketId,detail})})
      .catch(() => setLoadError('Unable to update the support ticket.'))
  }

  const addInternalNote = () => {
    if (!activeTicket || !internalNote.trim()) return
    const message = internalNote.trim()
    const note = {
      time: new Date().toLocaleString(),
      author: 'Admin User',
      message, isInternal,
    }
    setNoteBusy(true)
    void supportService.appendNote(activeTicket.backendId, note)
      .then((response) => {setTickets(response.data);setInternalNote('');logAdminAction({action:'Add support note',entity:'Support',entityId:activeTicket.id,detail:isInternal?'Internal staff note added':'Public reply added'})})
      .catch(() => setLoadError('Unable to add the support note.'))
      .finally(() => setNoteBusy(false))
  }

  return (
    <div className="category-management admin-page support-management">
      <div className="category-management__header">
        <div className="cm-title-group">
          <h1>Support & Escalations</h1>
          <p className="cm-title-sub">Prioritize tickets, assign owners, and keep resolution on track.</p>
        </div>
        <div className="category-management__actions">
          <button className="btn btn--outline btn--sm" type="button" onClick={()=>{const escape=(v:string)=>'"'+(/^[=+@-]/.test(v)?"'":'')+v.replace(/"/g,'""')+'"';const csv=[['Reference','Subject','Status','Priority'],...tickets.map(t=>[t.id,t.subject,t.status,t.priority])].map(row=>row.map(escape).join(',')).join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const link=document.createElement('a');link.href=url;link.download='support-tickets.csv';link.click();URL.revokeObjectURL(url)}}>Export</button>
          <Link className="btn btn--outline btn--sm" to="/admin/settings">Support settings</Link>
        </div>
      </div>
      {loadError && <div className="admin-alert admin-alert--error" role="alert">{loadError}</div>}

      <div className="cm-kpi-grid">
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Open tickets</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--amber">{databaseCount('open')}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">In progress</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--blue">{databaseCount('inProgress')}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Unassigned</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--purple">{databaseCount('unassigned')}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">High priority</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--red">{databaseCount('highPriority')}</strong>
          </div>
        </div>
      </div>

      <div className="support-filters">
        <div className="support-filters__quick">
          <button
            className={`support-pill ${quickFilter === 'all' ? 'support-pill--active' : ''}`}
            type="button"
            onClick={() => applyQuickFilter('all')}
          >
            All tickets
            <span className="support-pill__count">{quickCounts.all}</span>
          </button>
          <button
            className={`support-pill ${quickFilter === 'unassigned' ? 'support-pill--active' : ''}`}
            type="button"
            onClick={() => applyQuickFilter('unassigned')}
          >
            Unassigned
            <span className="support-pill__count">{quickCounts.unassigned}</span>
          </button>
          <button
            className={`support-pill ${quickFilter === 'high' ? 'support-pill--active' : ''}`}
            type="button"
            onClick={() => applyQuickFilter('high')}
          >
            High priority
            <span className="support-pill__count">{quickCounts.high}</span>
          </button>
        </div>
        <div className="admin-page__filters">
        <input aria-label="Search by ticket ID, customer, issue, reference"
          type="text"
          placeholder="Search by ticket ID, customer, issue, reference..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select aria-label="Filter by status" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as 'all' | SupportStatus)}>
          <option value="all">All statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
        <select aria-label="Filter by support priority" value={selectedPriority} onChange={(event) => setSelectedPriority(event.target.value as 'all' | SupportPriority)}>
          <option value="all">All priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        {hasFilters && (
          <button className="pm-clear-filter" type="button" onClick={clearFilters}>✕ Clear filters</button>
        )}
        </div>
      </div>

      <div className="cm-panel">
        <div className="cm-table-wrap">
        <table className="cm-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Customer</th>
              <th>Reference</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Assigned</th>
              <th>Last activity</th>
              <th className="cm-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedTickets.map((ticket) => (
              <tr key={ticket.id} className={ticket.priority === 'High' ? 'support-row support-row--high' : 'support-row'}>
                <td>
                  <div className="support-ticket-id">{ticket.id}</div>
                  <div className="support-ticket-subject">{ticket.subject}</div>
                </td>
                <td>
                  <div>{ticket.customer}</div>
                  <div className="support-ticket-subject">{ticket.email}</div>
                </td>
                <td>
                  <div className="support-reference">
                    <span className="support-reference__channel">{ticket.channel}</span>
                    {ticket.channel === 'Order' && (
                      <Link to={`/admin/orders/${ticket.referenceId}`}>{ticket.referenceId}</Link>
                    )}
                    {ticket.channel !== 'Order' && <span>{ticket.referenceId}</span>}
                  </div>
                </td>
                <td>
                  <span className={`support-priority support-priority--${ticket.priority.toLowerCase()}`}>
                    {ticket.priority}
                  </span>
                </td>
                <td>
                  <span className={`admin-status ${ticket.status === 'Resolved' ? 'admin-status--success' : ticket.status === 'Open' ? 'admin-status--warning' : 'admin-status--info'}`}>
                    {formatStatus(ticket.status)}
                  </span>
                </td>
                <td>{ticket.assignedTo}</td>
                <td className="support-activity">
                  {ticket.notes?.[ticket.notes.length-1]?.time ?? ticket.createdAt}
                </td>
                <td>
                  <div className="cm-row-actions">
                    <button className="cm-row-btn cm-row-btn--edit" type="button" onClick={() => setActiveTicket(ticket)}>
                      View
                    </button>
                    {ticket.status !== 'In Progress' && (
                      <button className="cm-row-btn cm-row-btn--edit" type="button" onClick={() => updateTicket(ticket.id, { status: 'In Progress' }, 'Moved to In Progress')}>
                        Start
                      </button>
                    )}
                    {ticket.status !== 'Resolved' && (
                      <button className="cm-row-btn cm-row-btn--edit" type="button" onClick={() => updateTicket(ticket.id, { status: 'Resolved' }, 'Marked as Resolved')}>
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
      </div>

      {filteredTickets.length > 0 && (
        <div className="support-pagination">
          <span className="support-pagination__info">
            Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredTickets.length)} of {filteredTickets.length}
          </span>
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
          <Dialog busy={noteBusy} onClose={() => setActiveTicket(null)} className="support-modal" onClick={(event) => event.stopPropagation()}>
            <div className="support-modal__header">
              <h2>{activeTicket.id}</h2>
              <button aria-label="Close dialog" className="support-modal__close" type="button" onClick={() => setActiveTicket(null)}>×</button>
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
                    value={activeTicket.assignedToId ?? ''}
                    onChange={(event) => {
                      const assignedToId = event.target.value ? Number(event.target.value) : null
                      const assignedTo = assigneeOptions.find((option) => option.id === assignedToId)?.name ?? 'Unassigned'
                      updateTicket(activeTicket.id, { assignedTo, assignedToId }, `Assigned to ${assignedTo}`)
                    }}
                  >
                    <option value="">Unassigned</option>
                    {assigneeOptions.map((assignee) => (
                      <option key={assignee.id} value={assignee.id}>{assignee.name}</option>
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
                <h3>Conversation history</h3>{activeTicket.notes.map((note,index)=><article key={index}><strong>{note.author} · {note.isInternal ? 'Internal note' : 'Public reply'}</strong><small> · {note.time}</small><p>{note.message}</p></article>)}
                <label>Reply visibility<select aria-label="Reply visibility" value={isInternal ? 'internal' : 'public'} onChange={e=>setIsInternal(e.target.value==='internal')}><option value="internal">Internal note — staff only</option><option value="public">Public reply — customer can see</option></select></label>
                <label htmlFor="support-note">{isInternal ? 'Internal note' : 'Public reply'}</label>
                <textarea
                  id="support-note"
                  rows={3}
                  value={internalNote}
                  onChange={(event) => setInternalNote(event.target.value)}
                  placeholder="Add handling notes or next steps."
                />
                <button className="btn btn--outline btn--sm support-note-btn" type="button" disabled={noteBusy || !internalNote.trim()} onClick={addInternalNote}>
                  Add note
                </button>
              </div>

            </div>
            <div className="support-modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setActiveTicket(null)}>
                Close
              </button>
            </div>
          </Dialog>
        </div>
      )}
    </div>
  )
}

export default SupportManagement
