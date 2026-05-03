import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { CatalogProduct, productCatalog } from '../../data/products'
import { PrescriptionRecord, PrescriptionStatus } from '../../data/prescriptions'
import { prescriptionService } from '../../services/prescriptionService'
import { addAdminOrderNote, listAdminOrders, type AdminOrder, updateAdminOrder } from '../../services/adminOrderService'
import ProfessionalPortalShell from '../../components/ProfessionalPortalShell/ProfessionalPortalShell'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/admin/PrescriptionManagement.css'
import '../../styles/portals/PharmacistDashboardPage.css'

const statusClass = (status: PrescriptionStatus) =>
  status === 'Approved' ? 'admin-status--success'
  : status === 'Pending' ? 'admin-status--warning'
  : status === 'Clarification' ? 'admin-status--warning'
  : 'admin-status--danger'

const isImageFile = (f: string) =>
  f.startsWith('data:image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(f)

const isPdfFile = (f: string) =>
  f.startsWith('data:application/pdf') || /\.pdf$/i.test(f)

function TimeElapsed({ since }: { since: string | undefined }) {
  const hours = since ? Math.floor((Date.now() - new Date(since).getTime()) / 3600000) : 0
  const mins = since ? Math.floor((Date.now() - new Date(since).getTime()) / 60000) % 60 : 0
  const isOverdue = hours >= 2
  return (
    <span className={`pharm-age ${isOverdue ? 'pharm-age--overdue' : ''}`}>
      {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`} ago
    </span>
  )
}

const REJECTION_REASONS = [
  'Illegible prescription',
  'Controlled substance_ requires in-person verification',
  'Missing doctor information',
  'Expired prescription',
  'Incorrect dosage instructions',
  'Prescription not valid in this jurisdiction',
  'Other',
]

const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

const ORDER_ACTION_LABELS: Record<string, string> = {
  processing: 'Process',
  shipped: 'Dispatch',
  delivered: 'Deliver',
}

const ORDER_STATUS_FILTER_OPTIONS = [
  'draft',
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const

function formatOrderDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '—'
}

function formatCurrency(value?: string | null) {
  const amount = Number(value ?? 0)
  return `KSh ${Number.isFinite(amount) ? amount.toLocaleString() : '0'}`
}

function formatOrderItemsPreview(order: AdminOrder) {
  const names = order.items.map((item) => item.product_name).filter(Boolean)
  if (names.length === 0) return 'No item details available'
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]}, ${names[1]}`
  return `${names[0]}, ${names[1]} +${names.length - 2} more`
}

function buildOrderTrackingSteps(order: AdminOrder) {
  const flow = ['pending', 'processing', 'shipped', 'delivered']
  const currentIndex = flow.indexOf(order.status)
  return flow.map((status, index) => {
    const event = order.events.find((item) => item.event_type === `status_${status}`)
    return {
      status,
      label: ORDER_STATUS_LABELS[status] ?? status,
      isDone: currentIndex > index || order.status === 'delivered' && index === flow.length - 1,
      isCurrent: currentIndex === index && order.status !== 'delivered',
      at: event?.created_at ?? (index === 0 ? order.created_at : null),
    }
  })
}

function nextOrderStatus(order: AdminOrder) {
  if (order.status === 'pending' || order.status === 'paid') return 'processing'
  if (order.status === 'processing') return 'shipped'
  if (order.status === 'shipped') return 'delivered'
  return null
}

type WorkspaceView = 'prescriptions' | 'orders'

function PharmacistDashboardPage() {
  const { user, logout } = useAuth()
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([])
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceView>('prescriptions')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | PrescriptionStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [orderSearchTerm, setOrderSearchTerm] = useState('')
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<'all' | string>('all')
  const [selectedOrderPaymentStatus, setSelectedOrderPaymentStatus] = useState<'all' | string>('all')
  const [orderCurrentPage, setOrderCurrentPage] = useState(1)
  const [activeRx, setActiveRx] = useState<PrescriptionRecord | null>(null)
  const [showClarificationInput, setShowClarificationInput] = useState(false)
  const [clarificationNote, setClarificationNote] = useState('')
  const [cartAddedMsg, setCartAddedMsg] = useState<string | null>(null)
  const [itemSelections, setItemSelections] = useState<Record<string, boolean>>({})
  const [manualItems, setManualItems] = useState<Array<{ product: CatalogProduct; qty: number }>>([])
  const [productSearch, setProductSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectionTemplate, setRejectionTemplate] = useState('')
  const [rejectionCustom, setRejectionCustom] = useState('')
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState('')
  const [activeOrder, setActiveOrder] = useState<AdminOrder | null>(null)
  const [orderNote, setOrderNote] = useState('')
  const [orderSaving, setOrderSaving] = useState(false)
  const [statusConfirm, setStatusConfirm] = useState<{ order: AdminOrder; nextStatus: string } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void prescriptionService.list().then((r) => setPrescriptions(r.data))
  }, [])

  useEffect(() => {
    const loadOrders = async () => {
      setOrdersLoading(true)
      setOrdersError('')
      try {
        setOrders(await listAdminOrders({ ordering: '-created_at' }))
      } catch {
        setOrdersError('Unable to load staff order updates right now.')
      } finally {
        setOrdersLoading(false)
      }
    }

    void loadOrders()
  }, [])

  useEffect(() => { setCurrentPage(1) }, [searchTerm, selectedStatus])
  useEffect(() => { setOrderCurrentPage(1) }, [orderSearchTerm, selectedOrderStatus, selectedOrderPaymentStatus])

  useEffect(() => {
    if (!activeRx) return
    const updated = prescriptions.find((p) => p.id === activeRx.id)
    setActiveRx(updated ?? null)
  }, [prescriptions]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeRx) { return }
    setShowClarificationInput(false)
    setClarificationNote('')
    setCartAddedMsg(null)
    setManualItems([])
    setProductSearch('')
    setShowDropdown(false)
    setShowRejectInput(false)
    setRejectionTemplate('')
    setRejectionCustom('')
    const initial: Record<string, boolean> = {}
    activeRx.items.forEach((item) => { initial[item.name] = true })
    setItemSelections(initial)
  }, [activeRx?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    if (!activeRx) return
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.code === 'KeyA') { void handleApprove() }
      if (e.code === 'KeyR') { setShowRejectInput((p) => !p) }
      if (e.code === 'KeyC') { setShowClarificationInput((p) => !p) }
      if (e.code === 'Escape') { setActiveRx(null) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [activeRx]) // eslint-disable-line react-hooks/exhaustive-deps

  const actor = user?.name ?? 'Pharmacist'

  const updateRx = async (id: string, updates: Partial<PrescriptionRecord>, action: string) => {
    const r = await prescriptionService.update(id, updates, action)
    setPrescriptions(r.data)
  }

  const pharmacistReview = async (
    rx: PrescriptionRecord,
    payload: {
      action: 'approve' | 'reject' | 'request_clarification'
      notes?: string
      items?: PrescriptionRecord['items']
    },
  ) => {
    if (!rx.backendId) {
      const status = payload.action === 'approve'
        ? 'Approved'
        : payload.action === 'reject'
          ? 'Rejected'
          : 'Clarification'
      await updateRx(rx.id, {
        status,
        pharmacist: actor,
        dispatchStatus: status === 'Approved' ? rx.dispatchStatus : 'Not started',
        items: payload.items ?? rx.items,
      }, `${actor} reviewed prescription: ${payload.action}${payload.notes ? ` - ${payload.notes}` : ''}`)
      return
    }
    const response = await prescriptionService.pharmacistReview(rx.backendId, payload)
    setPrescriptions(response.data)
  }

  const productSuggestions = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    if (q.length < 2) return []
    return productCatalog
      .filter((p) => p.name.toLowerCase().includes(q) && !manualItems.some((m) => m.product.id === p.id))
      .slice(0, 6)
  }, [productSearch, manualItems])

  const addManualItem = (product: CatalogProduct) => {
    setManualItems((prev) => [...prev, { product, qty: 1 }])
    setProductSearch('')
    setShowDropdown(false)
  }

  const removeManualItem = (productId: number) =>
    setManualItems((prev) => prev.filter((m) => m.product.id !== productId))

  const updateManualQty = (productId: number, qty: number) =>
    setManualItems((prev) => prev.map((m) => m.product.id === productId ? { ...m, qty: Math.max(1, qty) } : m))

  const handleApprove = async () => {
    if (!activeRx) return
    const selectedItems = activeRx.items.filter((item) => itemSelections[item.name])
    const unmapped = selectedItems.filter((item) => !item.productId)
    if (unmapped.length > 0) {
      setCartAddedMsg(`Map every selected medication to a catalog product before approval. Missing: ${unmapped.map((item) => item.name).join(', ')}.`)
      return
    }
    const reviewItems = [
      ...selectedItems,
      ...manualItems.map(({ product, qty }) => ({
        name: product.name,
        productId: product.productId ?? product.id,
        productName: product.name,
        productSlug: product.slug,
        productImage: product.image,
        dose: '',
        frequency: '',
        qty,
      })),
    ]
    if (reviewItems.length === 0) {
      setCartAddedMsg('Select or add at least one medication before approving this prescription.')
      return
    }
    await pharmacistReview(activeRx, {
      action: 'approve',
      notes: `Approved by ${actor}`,
      items: reviewItems,
    })
    const skipped = activeRx.items.length - selectedItems.length
    const msg = `${reviewItems.length} medication${reviewItems.length !== 1 ? 's' : ''} approved for patient checkout${skipped > 0 ? ` · ${skipped} item${skipped !== 1 ? 's' : ''} skipped` : ''}.`
    setCartAddedMsg(msg)
    setTimeout(() => setCartAddedMsg(null), 6000)
  }

  const handleClarification = async (note: string) => {
    if (!activeRx) return
    await pharmacistReview(activeRx, {
      action: 'request_clarification',
      notes: note,
    })
    setShowClarificationInput(false)
    setClarificationNote('')
  }

  const handleReject = async () => {
    if (!activeRx) return
    const reason = rejectionTemplate === 'Other' ? rejectionCustom : rejectionTemplate
    await pharmacistReview(activeRx, {
      action: 'reject',
      notes: reason,
    })
    setShowRejectInput(false)
    setRejectionTemplate('')
    setRejectionCustom('')
  }

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return prescriptions.filter((rx) => {
      if (selectedStatus !== 'all' && rx.status !== selectedStatus) return false
      if (!q) return true
      return [rx.id, rx.patient, rx.doctor, rx.pharmacist].some((v) => v.toLowerCase().includes(q))
    })
  }, [prescriptions, searchTerm, selectedStatus])

  const PAGE_SIZE = 8
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const stats = useMemo(() => ({
    pending: prescriptions.filter((p) => p.status === 'Pending').length,
    approved: prescriptions.filter((p) => p.status === 'Approved').length,
    clarification: prescriptions.filter((p) => p.status === 'Clarification').length,
    rejected: prescriptions.filter((p) => p.status === 'Rejected').length,
  }), [prescriptions])

  const orderStatusCounts = useMemo(() => {
    return orders.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] ?? 0) + 1
      return acc
    }, {})
  }, [orders])

  const filteredOrderRecords = useMemo(() => {
    const query = orderSearchTerm.trim().toLowerCase()
    return orders.filter((order) => {
      if (selectedOrderStatus !== 'all' && order.status !== selectedOrderStatus) return false
      if (selectedOrderPaymentStatus !== 'all' && order.payment_status !== selectedOrderPaymentStatus) return false
      if (!query) return true
      const customerName = order.customer_name || `${order.shipping_first_name} ${order.shipping_last_name}`.trim()
      return [
        order.order_number,
        customerName,
        order.shipping_email,
        order.shipping_phone,
        order.shipping_city,
        order.shipping_county,
        order.payment_reference,
      ].join(' ').toLowerCase().includes(query)
    })
  }, [orders, orderSearchTerm, selectedOrderStatus, selectedOrderPaymentStatus])

  const ORDER_PAGE_SIZE = 8
  const totalOrderPages = Math.max(1, Math.ceil(filteredOrderRecords.length / ORDER_PAGE_SIZE))
  const pagedOrderRecords = filteredOrderRecords.slice((orderCurrentPage - 1) * ORDER_PAGE_SIZE, orderCurrentPage * ORDER_PAGE_SIZE)

  const openOrderModal = (order: AdminOrder) => {
    setActiveOrder(order)
    setOrderNote('')
    setOrdersError('')
  }

  const promptOrderStatusUpdate = (order: AdminOrder, nextStatus: string) => {
    setStatusConfirm({ order, nextStatus })
  }

  const syncOrder = (updated: AdminOrder) => {
    setOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)))
    setActiveOrder((prev) => (prev?.id === updated.id ? updated : prev))
  }

  const handleOrderUpdate = async (status?: string) => {
    if (!activeOrder) return
    if (status) {
      promptOrderStatusUpdate(activeOrder, status)
      return
    }
    setOrderSaving(true)
    setOrdersError('')
    try {
      let updated = activeOrder
      if (orderNote.trim()) {
        updated = await addAdminOrderNote(activeOrder.id, orderNote.trim())
      }
      syncOrder(updated)
      setOrderNote('')
    } catch {
      setOrdersError('Unable to update the order right now.')
    } finally {
      setOrderSaving(false)
    }
  }

  const confirmOrderStatusUpdate = async () => {
    if (!statusConfirm) return
    setOrderSaving(true)
    setOrdersError('')
    try {
      const updated = await updateAdminOrder(statusConfirm.order.id, { status: statusConfirm.nextStatus })
      syncOrder(updated)
      setStatusConfirm(null)
    } catch {
      setOrdersError('Unable to update the order right now.')
    } finally {
      setOrderSaving(false)
    }
  }

  const navigationItems = [
    {
      id: 'prescriptions',
      label: 'All Prescriptions',
      badge: prescriptions.length,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="14" y2="17" />
        </svg>
      ),
    },
    {
      id: 'orders',
      label: 'Order Follow-up',
      badge: orders.length,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="14" y2="17" />
        </svg>
      ),
    },
  ] as const

  return (
    <ProfessionalPortalShell
      accentColor="#be3455"
      activeItemId={activeWorkspace}
      navItems={navigationItems}
      onNavChange={(itemId) => {
        const nextView = itemId as WorkspaceView
        setActiveWorkspace(nextView)
        if (nextView === 'prescriptions') {
          setSelectedStatus('all')
          setCurrentPage(1)
        } else {
          setSelectedOrderStatus('all')
          setSelectedOrderPaymentStatus('all')
          setOrderCurrentPage(1)
        }
      }}
      onLogout={() => { void logout() }}
      roleLabel="Pharmacist"
      sidebarHeaderContent={(
        <div className="portal-shell__meta-card">
          <span className="portal-shell__meta-label">Workspace</span>
          <p className="portal-shell__meta-value">{activeWorkspace === 'prescriptions' ? 'Prescription operations' : 'Order follow-up'}</p>
          <p className="portal-shell__meta-value">{activeWorkspace === 'prescriptions' ? `${stats.pending} awaiting action` : `${orders.length} total orders`}</p>
        </div>
      )}
      userMeta={activeWorkspace === 'prescriptions' ? 'Prescription Operations' : 'Order Follow-up'}
      userName={user?.name || 'Pharmacist'}
    >
      <div className="admin-page">
      {/* Workspace */}
      {activeWorkspace === 'prescriptions' ? (
        <>
          <div className="admin-page__header">
            <div>
              <h1>All Prescriptions</h1>
              <p className="px-subtitle">Review every prescription from one table, then open the decision modal only when action is needed.</p>
            </div>
          </div>

          <div className="cm-kpi-grid">
            <div className="cm-kpi-card" onClick={() => setSelectedStatus('Pending')} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
              <div className="cm-kpi-card__icon cm-kpi-card__icon--amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
              </div>
              <div className="cm-kpi-card__body">
                <span className="cm-kpi-card__label">Pending</span>
                <strong className="cm-kpi-card__value cm-kpi-card__value--amber">{stats.pending}</strong>
              </div>
            </div>
            <div className="cm-kpi-card" onClick={() => setSelectedStatus('Approved')} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
              <div className="cm-kpi-card__icon cm-kpi-card__icon--green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div className="cm-kpi-card__body">
                <span className="cm-kpi-card__label">Approved</span>
                <strong className="cm-kpi-card__value cm-kpi-card__value--green">{stats.approved}</strong>
              </div>
            </div>
            <div className="cm-kpi-card" onClick={() => setSelectedStatus('Clarification')} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
              <div className="cm-kpi-card__icon cm-kpi-card__icon--blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div className="cm-kpi-card__body">
                <span className="cm-kpi-card__label">Clarification</span>
                <strong className="cm-kpi-card__value">{stats.clarification}</strong>
              </div>
            </div>
            <div className="cm-kpi-card" onClick={() => setSelectedStatus('Rejected')} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
              <div className="cm-kpi-card__icon cm-kpi-card__icon--red">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
              <div className="cm-kpi-card__body">
                <span className="cm-kpi-card__label">Rejected</span>
                <strong className="cm-kpi-card__value cm-kpi-card__value--red">{stats.rejected}</strong>
              </div>
            </div>
          </div>

          {stats.pending > 0 && (
            <div className="px-pending-banner">
              <span>⏳ <strong>{stats.pending}</strong> prescription{stats.pending > 1 ? 's' : ''} awaiting your review</span>
              <button className="px-pending-banner__btn" type="button" onClick={() => setSelectedStatus('Pending')}>
                Filter pending →
              </button>
            </div>
          )}

          <div className="admin-page__filters">
            <input
              type="text"
              placeholder="Search by ID, patient, doctor…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as 'all' | PrescriptionStatus)}>
              <option value="all">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Clarification">Clarification</option>
              <option value="Rejected">Rejected</option>
            </select>
            {selectedStatus !== 'all' && (
              <button className="px-clear-filter" type="button" onClick={() => setSelectedStatus('all')}>✕ Clear filter</button>
            )}
          </div>

          <div className="pharm-dashboard-layout">
            <section className="pharm-table-panel">
              <div className="pharm-table-panel__header">
                <div>
                  <h2>All prescriptions</h2>
                  <p>Use the table filters to move between pending, approved, clarification, and rejected records without changing pages.</p>
                </div>
                <span className="pharm-table-panel__badge">{filtered.length} records</span>
              </div>
              <div className="cm-table-wrap">
                <table className="cm-table pharm-table">
                  <thead>
                    <tr>
                      <th>Prescription</th>
                      <th>Patient</th>
                      <th>Status</th>
                      <th>Dispatch</th>
                      <th>Submitted</th>
                      <th className="cm-th-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((rx) => (
                      <tr key={rx.id} className={rx.status === 'Pending' ? 'px-row--pending' : ''}>
                        <td>
                          <div className="pharm-cell-stack">
                            <span className="px-rx-id">{rx.id}</span>
                            <span className="pharm-cell-muted">
                              {rx.items.length} item{rx.items.length === 1 ? '' : 's'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="pharm-cell-stack">
                            <p className="px-patient">{rx.patient}</p>
                            <p className="pharm-cell-muted">Doctor: {rx.doctor || 'Not provided'}</p>
                            <p className="pharm-cell-muted">
                              {rx.pharmacist === 'Unassigned' ? 'Unassigned' : `Handled by ${rx.pharmacist}`}
                            </p>
                          </div>
                        </td>
                        <td><span className={`admin-status ${statusClass(rx.status)}`}>{rx.status}</span></td>
                        <td><span className="admin-status admin-status--info">{rx.dispatchStatus}</span></td>
                        <td className="px-date">
                          <div className="pharm-cell-stack">
                            <span>{rx.submitted}</span>
                            {rx.status === 'Pending' && <TimeElapsed since={rx.submitted} />}
                          </div>
                        </td>
                        <td>
                          <div className="cm-row-actions pharm-row-actions">
                            <button className="cm-row-btn cm-row-btn--edit" type="button" onClick={() => setActiveRx(rx)}>Review</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={6} className="prescription-empty">No prescriptions match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {filtered.length > PAGE_SIZE && (
            <div className="prescription-pagination">
              <button className="pagination__button" type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
              <div className="pagination__pages">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button key={page} className={`pagination__page ${page === currentPage ? 'pagination__page--active' : ''}`} type="button" onClick={() => setCurrentPage(page)}>{page}</button>
                ))}
              </div>
              <button className="pagination__button" type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="admin-page__header">
            <div>
              <h1>Order Follow-up</h1>
              <p className="px-subtitle">Display every order, filter using backend statuses, and confirm each operational change before it updates the live order.</p>
            </div>
          </div>

          <div className="cm-kpi-grid">
            <div className="cm-kpi-card" onClick={() => setSelectedOrderStatus('all')} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
              <div className="cm-kpi-card__icon cm-kpi-card__icon--blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>
              </div>
              <div className="cm-kpi-card__body">
                <span className="cm-kpi-card__label">All orders</span>
                <strong className="cm-kpi-card__value">{orders.length}</strong>
              </div>
            </div>
            <div className="cm-kpi-card" onClick={() => setSelectedOrderStatus('pending')} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
              <div className="cm-kpi-card__icon cm-kpi-card__icon--amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div className="cm-kpi-card__body">
                <span className="cm-kpi-card__label">Pending</span>
                <strong className="cm-kpi-card__value cm-kpi-card__value--amber">{orderStatusCounts.pending ?? 0}</strong>
              </div>
            </div>
            <div className="cm-kpi-card" onClick={() => setSelectedOrderStatus('processing')} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
              <div className="cm-kpi-card__icon cm-kpi-card__icon--green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div className="cm-kpi-card__body">
                <span className="cm-kpi-card__label">Processing</span>
                <strong className="cm-kpi-card__value cm-kpi-card__value--green">{orderStatusCounts.processing ?? 0}</strong>
              </div>
            </div>
            <div className="cm-kpi-card" onClick={() => setSelectedOrderStatus('shipped')} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
              <div className="cm-kpi-card__icon cm-kpi-card__icon--purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M3 7h13v10H3z"/><path d="M16 10h3l2 3v4h-5z"/><circle cx="7.5" cy="18.5" r="1.5"/><circle cx="17.5" cy="18.5" r="1.5"/></svg>
              </div>
              <div className="cm-kpi-card__body">
                <span className="cm-kpi-card__label">Shipped</span>
                <strong className="cm-kpi-card__value cm-kpi-card__value--purple">{orderStatusCounts.shipped ?? 0}</strong>
              </div>
            </div>
          </div>

          <div className="admin-page__filters">
            <input
              type="text"
              placeholder="Search by order number, customer, phone, city, or payment reference…"
              value={orderSearchTerm}
              onChange={(e) => setOrderSearchTerm(e.target.value)}
            />
            <select value={selectedOrderStatus} onChange={(e) => setSelectedOrderStatus(e.target.value)}>
              <option value="all">All order statuses</option>
              {ORDER_STATUS_FILTER_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {ORDER_STATUS_LABELS[status] ?? status}
                </option>
              ))}
            </select>
            <select value={selectedOrderPaymentStatus} onChange={(e) => setSelectedOrderPaymentStatus(e.target.value)}>
              <option value="all">All payment states</option>
              <option value="pending">Pending</option>
              <option value="requires_action">Requires action</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
            {(selectedOrderStatus !== 'all' || selectedOrderPaymentStatus !== 'all' || orderSearchTerm) && (
              <button
                className="px-clear-filter"
                type="button"
                onClick={() => {
                  setOrderSearchTerm('')
                  setSelectedOrderStatus('all')
                  setSelectedOrderPaymentStatus('all')
                }}
              >
                ✕ Clear filters
              </button>
            )}
          </div>

          <div className="pharm-dashboard-layout">
            <section className="pharm-table-panel pharm-table-panel--orders">
              <div className="pharm-table-panel__header">
                <div>
                  <h2>All orders</h2>
                  <p>Review all orders, narrow by backend status or payment state, and use the action flow only after confirming the next status.</p>
                </div>
                <span className="pharm-table-panel__badge">{filteredOrderRecords.length} records</span>
              </div>

              {ordersLoading ? (
                <div className="pharm-order-state">Loading order updates…</div>
              ) : ordersError ? (
                <div className="pharm-order-state pharm-order-state--error">{ordersError}</div>
              ) : filteredOrderRecords.length === 0 ? (
                <div className="pharm-order-state">No orders match your follow-up filters right now.</div>
              ) : (
                <div className="cm-table-wrap">
                  <table className="cm-table pharm-table pharm-table--orders">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th>Updated</th>
                        <th className="cm-th-actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedOrderRecords.map((order) => {
                        const customerName = order.customer_name || `${order.shipping_first_name} ${order.shipping_last_name}`.trim()
                        const upcomingStatus = nextOrderStatus(order)
                        return (
                          <tr key={order.id}>
                            <td>
                              <div className="pharm-cell-stack">
                                <strong className="pharm-table__primary">{order.order_number}</strong>
                                <span className="pharm-cell-muted">
                                  {order.items.length} item{order.items.length === 1 ? '' : 's'} · {formatCurrency(order.total)}
                                </span>
                                <span className="pharm-order-items-preview">{formatOrderItemsPreview(order)}</span>
                              </div>
                            </td>
                            <td>
                              <div className="pharm-cell-stack">
                                <strong className="pharm-table__primary">{customerName || 'Walk-in customer'}</strong>
                                <span className="pharm-cell-muted">{order.shipping_city || order.shipping_county || 'Delivery details pending'}</span>
                              </div>
                            </td>
                            <td><span className={`admin-status status--${order.status}`}>{ORDER_STATUS_LABELS[order.status] ?? order.status}</span></td>
                            <td>
                              <div className="pharm-cell-stack">
                                <span className="pharm-cell-muted">{order.payment_method.replace(/_/g, ' ')}</span>
                                <span className="pharm-cell-muted">{order.payment_status.replace(/_/g, ' ')}</span>
                              </div>
                            </td>
                            <td>
                              <div className="pharm-cell-stack">
                                <span>{formatOrderDate(order.updated_at)}</span>
                                {upcomingStatus && <span className="pharm-cell-muted">Next: {ORDER_STATUS_LABELS[upcomingStatus]}</span>}
                              </div>
                            </td>
                            <td>
                              <div className="cm-row-actions pharm-row-actions">
                                {upcomingStatus && (
                                  <button
                                    className="cm-row-btn cm-row-btn--primary pharm-row-btn--next"
                                    type="button"
                                    disabled={orderSaving}
                                    onClick={() => promptOrderStatusUpdate(order, upcomingStatus)}
                                  >
                                    {ORDER_ACTION_LABELS[upcomingStatus]}
                                  </button>
                                )}
                                <button className="cm-row-btn cm-row-btn--edit" type="button" onClick={() => openOrderModal(order)}>
                                  View items
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {filteredOrderRecords.length > ORDER_PAGE_SIZE && (
            <div className="prescription-pagination">
              <button className="pagination__button" type="button" onClick={() => setOrderCurrentPage((p) => Math.max(1, p - 1))} disabled={orderCurrentPage === 1}>Prev</button>
              <div className="pagination__pages">
                {Array.from({ length: totalOrderPages }, (_, i) => i + 1).map((page) => (
                  <button key={page} className={`pagination__page ${page === orderCurrentPage ? 'pagination__page--active' : ''}`} type="button" onClick={() => setOrderCurrentPage(page)}>{page}</button>
                ))}
              </div>
              <button className="pagination__button" type="button" onClick={() => setOrderCurrentPage((p) => Math.min(totalOrderPages, p + 1))} disabled={orderCurrentPage === totalOrderPages}>Next</button>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {activeRx && (
        <div className="modal-overlay" onClick={() => setActiveRx(null)}>
          <div className="px-modal" onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className="px-modal__header">
              <div className="px-modal__header-left">
                <span className="px-modal__rx-id">{activeRx.id}</span>
                <span className={`admin-status ${statusClass(activeRx.status)}`}>{activeRx.status}</span>
                {activeRx.pharmacist !== 'Unassigned' && (
                  <span className="px-modal__assigned-pill">Handled by {activeRx.pharmacist}</span>
                )}
              </div>
              <div className="px-modal__header-right">
                <span className="px-modal__submitted">Submitted {activeRx.submitted}</span>
                <button className="modal__close" type="button" onClick={() => setActiveRx(null)}>×</button>
              </div>
            </div>

            {/* Two-panel body */}
            <div className="px-modal__body">

              {/* Left: prescription content */}
              <div className="px-modal__left">

                {/* Patient & doctor */}
                <div className="px-detail-row">
                  <div className="px-detail-cell">
                    <span className="px-info-label">Patient</span>
                    <span className="px-info-value">{activeRx.patient}</span>
                  </div>
                  <div className="px-detail-cell">
                    <span className="px-info-label">Prescribing doctor</span>
                    <span className="px-info-value">{activeRx.doctor || '—'}</span>
                  </div>
                </div>

                {/* Inline document viewer */}
                {activeRx.files.length > 0 && (
                  <div className="px-modal__section">
                    <p className="px-section-label">Prescription document{activeRx.files.length > 1 ? 's' : ''}</p>
                    <div className="px-doc-viewer">
                      {activeRx.files.map((f, i) =>
                        isImageFile(f) ? (
                          <div key={i} className="px-doc-viewer__frame">
                            <img src={f} alt={`Document ${i + 1}`} className="px-doc-viewer__img" />
                            <a href={f} download={`prescription-doc-${i + 1}`} className="px-doc-viewer__dl">↓ Download</a>
                          </div>
                        ) : isPdfFile(f) && f.startsWith('data:') ? (
                          <div key={i} className="px-doc-viewer__frame">
                            <iframe src={f} className="px-doc-viewer__pdf" title={`PDF ${i + 1}`} />
                            <a href={f} download={`prescription-doc-${i + 1}`} className="px-doc-viewer__dl">↓ Download PDF</a>
                          </div>
                        ) : (
                          <div key={i} className="px-doc-viewer__placeholder">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                            <span>{f.length > 50 ? `Document ${i + 1}` : f}</span>
                            <a href={f} download={`prescription-doc-${i + 1}`} className="px-doc-viewer__dl">↓ Download</a>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Item picker_ check items that are in stock */}
                {activeRx.items.length > 0 && (
                  <div className="px-modal__section">
                    <div className="px-item-picker-header">
                      <p className="px-section-label">Prescribed items</p>
                      <span className="px-item-picker-count">
                        {Object.values(itemSelections).filter(Boolean).length} / {activeRx.items.length} in stock
                      </span>
                    </div>
                    <p className="px-item-picker-hint">Uncheck items that are out of stock_ only checked items will be approved for patient checkout.</p>
                    <div className="px-items-list">
                      {activeRx.items.map((item) => (
                        <label key={item.name} className={`px-item px-item--selectable${!itemSelections[item.name] ? ' px-item--oos' : ''}`}>
                          <input
                            type="checkbox"
                            className="px-item__check"
                            checked={itemSelections[item.name] ?? true}
                            onChange={(e) => setItemSelections((prev) => ({ ...prev, [item.name]: e.target.checked }))}
                          />
                          <div className="px-item__info">
                            <p className="px-item__name">{item.name}</p>
                            <p className="px-item__meta">{item.dose} · {item.frequency}</p>
                          </div>
                          <div className="px-item__right">
                            <span className="px-item__qty">Qty {item.qty}</span>
                            {!itemSelections[item.name] && <span className="px-item__oos-tag">Out of stock</span>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual medication search */}
                <div className="px-modal__section">
                  <p className="px-section-label">Add medications from catalog</p>
                  <p className="px-item-picker-hint">For handwritten or unclear prescriptions, search and add medications directly.</p>
                  <div className="px-med-search" ref={dropdownRef}>
                    <div className="px-med-search__wrap">
                      <svg className="px-med-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      <input
                        type="text"
                        className="px-med-search__input"
                        placeholder="Search e.g. Paracetamol, Amoxicillin…"
                        value={productSearch}
                        onChange={(e) => { setProductSearch(e.target.value); setShowDropdown(true) }}
                        onFocus={() => setShowDropdown(true)}
                      />
                      {productSearch && (
                        <button className="px-med-search__clear" type="button" onClick={() => { setProductSearch(''); setShowDropdown(false) }}>×</button>
                      )}
                    </div>
                    {showDropdown && productSuggestions.length > 0 && (
                      <div className="px-med-dropdown">
                        {productSuggestions.map((p) => (
                          <button key={p.id} className="px-med-dropdown__item" type="button" onMouseDown={() => addManualItem(p)}>
                            <span className="px-med-dropdown__name">{p.name}</span>
                            <span className="px-med-dropdown__meta">{p.brand} · KSh {p.price.toLocaleString()}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {showDropdown && productSearch.trim().length >= 2 && productSuggestions.length === 0 && (
                      <div className="px-med-dropdown px-med-dropdown--empty">No matching products found.</div>
                    )}
                  </div>
                  {manualItems.length > 0 && (
                    <div className="px-manual-items">
                      {manualItems.map(({ product, qty }) => (
                        <div key={product.id} className="px-manual-item">
                          <div className="px-item__info">
                            <p className="px-item__name">{product.name}</p>
                            <p className="px-item__meta">{product.brand} · KSh {product.price.toLocaleString()}</p>
                          </div>
                          <div className="px-manual-item__controls">
                            <label className="px-manual-item__qty-label">Qty</label>
                            <input
                              type="number"
                              className="px-manual-item__qty"
                              value={qty}
                              min={1}
                              onChange={(e) => updateManualQty(product.id, parseInt(e.target.value) || 1)}
                            />
                            <button className="px-manual-item__remove" type="button" onClick={() => removeManualItem(product.id)} aria-label="Remove">×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                {activeRx.notes && (
                  <div className="px-modal__section">
                    <p className="px-section-label">Patient notes</p>
                    <p className="px-notes-text">{activeRx.notes}</p>
                  </div>
                )}

              </div>

              {/* Right: decision panel */}
              <div className="px-modal__right">
                {cartAddedMsg && (
                  <div className="px-cart-added-msg">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
                    {cartAddedMsg}
                  </div>
                )}
                <div className="px-workflow-section">
                  <p className="px-section-label">Decision</p>
                  <div className="pharm-action-bar">
                    <button
                      className={`px-decision-btn px-decision-btn--approve ${activeRx.status === 'Approved' ? 'px-decision-btn--active' : ''}`}
                      type="button"
                      onClick={handleApprove}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      <span>Approve</span>
                    </button>
                    <button
                      className={`px-decision-btn px-decision-btn--clarify ${activeRx.status === 'Clarification' ? 'px-decision-btn--active' : ''}`}
                      type="button"
                      onClick={() => setShowClarificationInput((p) => !p)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <span>Clarify</span>
                    </button>
                    <button
                      className={`px-decision-btn px-decision-btn--reject ${activeRx.status === 'Rejected' ? 'px-decision-btn--active' : ''}`}
                      type="button"
                      onClick={() => setShowRejectInput((p) => !p)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      <span>Reject</span>
                    </button>
                  </div>

                  {/* Rejection reason template picker */}
                  {showRejectInput && (
                    <div className="px-clarification-box">
                      <p className="px-section-label">Rejection reason</p>
                      <select
                        className="px-reject-select"
                        value={rejectionTemplate}
                        onChange={(e) => setRejectionTemplate(e.target.value)}
                        autoFocus
                      >
                        <option value="">Select a reason…</option>
                        {REJECTION_REASONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      {rejectionTemplate === 'Other' && (
                        <textarea
                          className="px-clarification-textarea"
                          placeholder="Describe the rejection reason…"
                          value={rejectionCustom}
                          onChange={(e) => setRejectionCustom(e.target.value)}
                          rows={3}
                          style={{ marginTop: '0.5rem' }}
                        />
                      )}
                      <div className="px-clarification-actions">
                        <button className="btn btn--outline btn--sm" type="button" onClick={() => { setShowRejectInput(false); setRejectionTemplate(''); setRejectionCustom('') }}>
                          Cancel
                        </button>
                        <button
                          className="btn btn--sm px-decision-btn--reject"
                          type="button"
                          onClick={handleReject}
                          disabled={!rejectionTemplate || (rejectionTemplate === 'Other' && !rejectionCustom.trim())}
                        >
                          Confirm rejection
                        </button>
                      </div>
                    </div>
                  )}

                  {showClarificationInput && (
                    <div className="px-clarification-box">
                      <textarea
                        className="px-clarification-textarea"
                        placeholder="Enter the clarification message for the patient…"
                        value={clarificationNote}
                        onChange={(e) => setClarificationNote(e.target.value)}
                        rows={3}
                        autoFocus
                      />
                      <div className="px-clarification-actions">
                        <button className="btn btn--outline btn--sm" type="button" onClick={() => { setShowClarificationInput(false); setClarificationNote('') }}>
                          Cancel
                        </button>
                        <button
                          className="btn btn--sm px-decision-btn--clarify-confirm"
                          type="button"
                          onClick={() => handleClarification(clarificationNote)}
                          disabled={!clarificationNote.trim()}
                        >
                          Send clarification
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setActiveRx(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {activeOrder && (
        <div className="modal-overlay" onClick={() => setActiveOrder(null)}>
          <div className="px-modal pharm-order-modal" onClick={(event) => event.stopPropagation()}>
            <div className="px-modal__header">
              <div className="px-modal__header-left">
                <span className="px-modal__rx-id">{activeOrder.order_number}</span>
                <span className={`admin-status status--${activeOrder.status}`}>{ORDER_STATUS_LABELS[activeOrder.status] ?? activeOrder.status}</span>
              </div>
              <div className="px-modal__header-right">
                <span className="px-modal__submitted">Updated {formatOrderDate(activeOrder.updated_at)}</span>
                <button className="modal__close" type="button" onClick={() => setActiveOrder(null)}>×</button>
              </div>
            </div>

            <div className="px-modal__body">
              <div className="px-modal__left">
                <div className="pharm-order-modal__summary">
                  <div>
                    <span>Customer</span>
                    <strong>{activeOrder.customer_name || `${activeOrder.shipping_first_name} ${activeOrder.shipping_last_name}`}</strong>
                  </div>
                  <div>
                    <span>Address</span>
                    <strong>{activeOrder.shipping_address}</strong>
                  </div>
                  <div>
                    <span>Payment</span>
                    <strong>{activeOrder.payment_method.replace(/_/g, ' ')} · {activeOrder.payment_status.replace(/_/g, ' ')}</strong>
                  </div>
                </div>

                <div className="pharm-pack-list">
                  <div className="pharm-pack-list__header">
                    <strong>Items to pack</strong>
                    <span>Use this list while picking and packing the order.</span>
                  </div>
                  <div className="pharm-pack-list__body">
                    {activeOrder.items.map((item) => (
                      <div key={item.id} className="pharm-pack-list__item">
                        <div className="pharm-pack-list__qty">{item.quantity}x</div>
                        <div className="pharm-pack-list__details">
                          <strong>{item.product_name}</strong>
                          <span>SKU: {item.product_sku || 'Not available'}</span>
                        </div>
                        <div className="pharm-pack-list__pricing">
                          <span>{formatCurrency(item.unit_price)} each</span>
                          <strong>{formatCurrency(item.subtotal)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="pharm-pack-list__hint">Verify the SKU and quantity for each line before moving the order to the next status.</p>
                </div>

                <div className="pharm-order-track">
                  {buildOrderTrackingSteps(activeOrder).map((step, index) => (
                    <div
                      key={step.status}
                      className={`pharm-order-track__step ${step.isDone ? 'pharm-order-track__step--done' : ''} ${step.isCurrent ? 'pharm-order-track__step--current' : ''}`}
                    >
                      <div className="pharm-order-track__dot">
                        {step.isDone ? '✓' : step.isCurrent ? '●' : index + 1}
                      </div>
                      <div>
                        <strong>{step.label}</strong>
                        <span>{formatOrderDate(step.at)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pharm-order-events">
                  {activeOrder.events.length === 0 ? (
                    <p className="pharm-order-events__empty">No order events recorded yet.</p>
                  ) : activeOrder.events.map((event) => (
                    <div key={event.id} className="pharm-order-events__item">
                      <div>
                        <strong>{event.event_type.replace(/_/g, ' ')}</strong>
                        <p>{event.message}</p>
                      </div>
                      <span>{formatOrderDate(event.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-modal__right">
                <div className="pharm-order-actions">
                  <p className="px-section-label">Order actions</p>
                  {nextOrderStatus(activeOrder) ? (
                    <button
                      className="btn btn--primary btn--sm"
                      type="button"
                      disabled={orderSaving}
                      onClick={() => void handleOrderUpdate(nextOrderStatus(activeOrder) as string)}
                    >
                      Mark {ORDER_ACTION_LABELS[nextOrderStatus(activeOrder) as string].toLowerCase()}
                    </button>
                  ) : (
                    <p className="pharm-order-actions__hint">No further operational status change is needed for this order.</p>
                  )}

                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label htmlFor="pharm-order-note">Order note</label>
                    <textarea
                      id="pharm-order-note"
                      rows={4}
                      value={orderNote}
                      onChange={(event) => setOrderNote(event.target.value)}
                      placeholder="Add a fulfilment or courier handoff note…"
                    />
                  </div>
                  <button
                    className="btn btn--outline btn--sm"
                    type="button"
                    disabled={orderSaving || !orderNote.trim()}
                    onClick={() => void handleOrderUpdate()}
                  >
                    Save note
                  </button>
                </div>
              </div>
            </div>

            <div className="px-modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setActiveOrder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {statusConfirm && (
        <div className="modal-overlay" onClick={() => !orderSaving && setStatusConfirm(null)}>
          <div className="px-modal pharm-order-modal" onClick={(event) => event.stopPropagation()}>
            <div className="px-modal__header">
              <div className="px-modal__header-left">
                <span className="px-modal__rx-id">{statusConfirm.order.order_number}</span>
                <span className={`admin-status status--${statusConfirm.order.status}`}>
                  {ORDER_STATUS_LABELS[statusConfirm.order.status] ?? statusConfirm.order.status}
                </span>
              </div>
              <div className="px-modal__header-right">
                <span className="px-modal__submitted">Confirm order status update</span>
                <button className="modal__close" type="button" disabled={orderSaving} onClick={() => setStatusConfirm(null)}>×</button>
              </div>
            </div>

            <div className="px-modal__body">
              <div className="px-modal__left">
                <div className="pharm-order-modal__summary">
                  <div>
                    <span>Current status</span>
                    <strong>{ORDER_STATUS_LABELS[statusConfirm.order.status] ?? statusConfirm.order.status}</strong>
                  </div>
                  <div>
                    <span>Next status</span>
                    <strong>{ORDER_STATUS_LABELS[statusConfirm.nextStatus] ?? statusConfirm.nextStatus}</strong>
                  </div>
                  <div>
                    <span>Customer</span>
                    <strong>{statusConfirm.order.customer_name || `${statusConfirm.order.shipping_first_name} ${statusConfirm.order.shipping_last_name}`}</strong>
                  </div>
                </div>

                <div className="pharm-order-events">
                  <div className="pharm-order-events__item">
                    <div>
                      <strong>Status transition confirmation</strong>
                      <p>
                        You are updating this order from {ORDER_STATUS_LABELS[statusConfirm.order.status] ?? statusConfirm.order.status} to {ORDER_STATUS_LABELS[statusConfirm.nextStatus] ?? statusConfirm.nextStatus}. Confirm only if that fulfilment step is complete.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-modal__right">
                <div className="pharm-order-actions">
                  <p className="px-section-label">Apply update</p>
                  <p className="pharm-order-actions__hint">This change updates the live backend order record and customer tracking timeline.</p>
                  <button
                    className="btn btn--primary btn--sm"
                    type="button"
                    disabled={orderSaving}
                    onClick={() => void confirmOrderStatusUpdate()}
                  >
                    Confirm update
                  </button>
                  <button
                    className="btn btn--outline btn--sm"
                    type="button"
                    disabled={orderSaving}
                    onClick={() => setStatusConfirm(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </ProfessionalPortalShell>
  )
}

export default PharmacistDashboardPage
