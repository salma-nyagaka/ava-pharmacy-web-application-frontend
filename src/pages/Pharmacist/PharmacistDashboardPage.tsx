import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PrescriptionClarificationMessage, PrescriptionRecord, PrescriptionStatus } from '../../data/prescriptions'
import { prescriptionService, type PharmacistCatalogVariant } from '../../services/prescriptionService'
import { listAdminOrders, type AdminOrder, updateAdminOrder } from '../../services/adminOrderService'
import ProfessionalPortalShell from '../../components/ProfessionalPortalShell/ProfessionalPortalShell'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/admin/PrescriptionManagement.css'
import '../../styles/portals/PharmacistDashboardPage.css'
import '../../styles/portals/PharmacistDashboardRedesign.css'

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
  const submittedAt = since ? new Date(since).getTime() : Number.NaN
  if (!Number.isFinite(submittedAt)) return null

  const elapsedMs = Math.max(0, Date.now() - submittedAt)
  const totalMins = Math.floor(elapsedMs / 60000)
  const hours = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  const isOverdue = hours >= 2
  return (
    <span className={`pharm-age ${isOverdue ? 'pharm-age--overdue' : ''}`}>
      {totalMins < 1 ? 'just now' : `${hours > 0 ? `${hours}h ${mins}m` : `${mins}m`} ago`}
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

function formatSubmittedDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(value?: string | null) {
  const amount = Number(value ?? 0)
  return `KSh ${Number.isFinite(amount) ? amount.toLocaleString() : '0'}`
}

function formatThreadTime(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function timestampValue(value?: string | null) {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function sortOrdersByCreatedDesc(orders: AdminOrder[]) {
  return [...orders].sort((left, right) =>
    timestampValue(right.created_at || right.placed_at || right.updated_at) -
    timestampValue(left.created_at || left.placed_at || left.updated_at),
  )
}

function prescriptionSubmittedValue(rx: PrescriptionRecord) {
  return timestampValue(rx.submittedAt || rx.submitted)
}

function buildClarificationThread(rx: PrescriptionRecord): PrescriptionClarificationMessage[] {
  const messages = [...rx.clarificationMessages]
  const hasPharmacyMessage = messages.some((entry) => entry.senderRole === 'pharmacist' || entry.senderRole === 'admin' || entry.senderRole === 'system')
  if (hasPharmacyMessage) return messages

  const auditGuidance = rx.audit.find((entry) => entry.action.toLowerCase().includes('clarification requested'))
  if (auditGuidance) {
    const [, senderPart = '', messagePart = ''] = auditGuidance.action.match(/^Clarification requested by ([^:]+):?\s*(.*)$/i) || []
    messages.unshift({
      id: -1,
      senderRole: 'pharmacist',
      senderName: senderPart || rx.pharmacist,
      senderDisplay: senderPart || rx.pharmacist || 'Pharmacist',
      message: messagePart || auditGuidance.action,
      createdAt: auditGuidance.time,
    })
  } else if (rx.clarificationMessage) {
    messages.unshift({
      id: -1,
      senderRole: 'pharmacist',
      senderName: rx.pharmacist,
      senderDisplay: rx.pharmacist || 'Pharmacist',
      message: rx.clarificationMessage,
      createdAt: rx.submittedAt || rx.submitted,
    })
  }

  return messages
}

function orderCustomerName(order: AdminOrder) {
  return `${order.shipping_first_name ?? ''} ${order.shipping_last_name ?? ''}`.trim()
    || order.customer_name
    || 'Walk-in customer'
}

function orderCustomerEmail(order: AdminOrder) {
  return order.shipping_email || order.customer_email || 'Email not provided'
}

function orderCustomerPhone(order: AdminOrder) {
  return order.shipping_phone || order.customer_phone || 'Phone not provided'
}

function formatOrderItemsPreview(order: AdminOrder) {
  const names = order.items.map((item) => item.product_name).filter(Boolean)
  if (names.length === 0) return 'No item details available'
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]}, ${names[1]}`
  return `${names[0]}, ${names[1]} +${names.length - 2} more`
}

function orderPrescriptionReferences(order: AdminOrder) {
  return Array.from(new Set(order.items.map((item) => item.prescription_id).filter(Boolean) as string[]))
}

function formatOrderPrescriptionReferences(order: AdminOrder) {
  const references = orderPrescriptionReferences(order)
  if (references.length === 0) return ''
  if (references.length === 1) return references[0]
  return `${references[0]} +${references.length - 1} more`
}

function formatOrderLineItems(order: AdminOrder) {
  if (order.items.length === 0) return 'No item details available'
  return order.items
    .slice(0, 3)
    .map((item) => {
      const unitText = Number(item.quantity) > 1 ? ` @ ${formatCurrency(item.unit_price)}` : ''
      return `${item.quantity}x ${item.product_name} - ${formatCurrency(item.subtotal)}${unitText}`
    })
    .join(' · ')
}

function nextOrderStatus(order: AdminOrder) {
  if (order.status === 'pending' || order.status === 'paid') return 'processing'
  if (order.status === 'processing') return 'shipped'
  if (order.status === 'shipped') return 'delivered'
  return null
}

function unpaidPrescriptionItems(rx: PrescriptionRecord) {
  return rx.items.filter((item) => !item.isPaidFor)
}

function formatPrescriptionItemsPreview(rx: PrescriptionRecord) {
  const items = unpaidPrescriptionItems(rx)
  if (items.length === 0) return 'No unpaid item details available'
  return items
    .slice(0, 3)
    .map((item) => `${item.qty}x ${item.name}`)
    .join(' · ')
}

type WorkspaceView = 'prescriptions' | 'orders'

function PharmacistDashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
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
  const [manualItems, setManualItems] = useState<Array<{ variant: PharmacistCatalogVariant; qty: number }>>([])
  const [productSearch, setProductSearch] = useState('')
  const [variantSuggestions, setVariantSuggestions] = useState<PharmacistCatalogVariant[]>([])
  const [variantSearchLoading, setVariantSearchLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showCatalogPicker, setShowCatalogPicker] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectionTemplate, setRejectionTemplate] = useState('')
  const [rejectionCustom, setRejectionCustom] = useState('')
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState('')
  const [activeOrder, setActiveOrder] = useState<AdminOrder | null>(null)
  const [orderSaving, setOrderSaving] = useState(false)
  const [statusConfirm, setStatusConfirm] = useState<{ order: AdminOrder; nextStatus: string } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const latestPrescriptionRef = useRef<string | null>(null)

  const refreshPrescriptions = useCallback(async () => {
    const response = await prescriptionService.list()
    const latestId = response.data[0]?.id ?? null
    if (latestPrescriptionRef.current && latestId && latestPrescriptionRef.current !== latestId) {
      setCurrentPage(1)
    }
    latestPrescriptionRef.current = latestId
    setPrescriptions(response.data)
  }, [])

  const refreshOrders = useCallback(async (background = false) => {
    if (!background) {
      setOrdersLoading(true)
    }
    setOrdersError('')
    try {
      const latestOrders = await listAdminOrders({ ordering: '-created_at' })
      setOrders(sortOrdersByCreatedDesc(latestOrders))
    } catch {
      setOrdersError('Unable to load staff order updates right now.')
    } finally {
      if (!background) {
        setOrdersLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void refreshPrescriptions()
  }, [refreshPrescriptions])

  useEffect(() => {
    if (activeWorkspace !== 'prescriptions') return undefined
    const timer = window.setInterval(() => {
      void refreshPrescriptions().catch(() => undefined)
    }, 10000)
    return () => window.clearInterval(timer)
  }, [activeWorkspace, refreshPrescriptions])

  useEffect(() => {
    if (!activeRx) return undefined
    const timer = window.setInterval(() => {
      void refreshPrescriptions().catch(() => undefined)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [activeRx?.id, refreshPrescriptions])

  useEffect(() => {
    void refreshOrders()
  }, [refreshOrders])

  useEffect(() => {
    if (activeWorkspace !== 'orders') return undefined
    void refreshPrescriptions().catch(() => undefined)
    const timer = window.setInterval(() => {
      void refreshOrders(true)
      void refreshPrescriptions().catch(() => undefined)
    }, 10000)
    return () => window.clearInterval(timer)
  }, [activeWorkspace, refreshOrders, refreshPrescriptions])

  useEffect(() => {
    if (!activeOrder) return undefined
    const timer = window.setInterval(() => {
      void refreshOrders(true)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [activeOrder?.id, refreshOrders])

  useEffect(() => { setCurrentPage(1) }, [searchTerm, selectedStatus])
  useEffect(() => { setOrderCurrentPage(1) }, [orderSearchTerm, selectedOrderStatus, selectedOrderPaymentStatus])

  useEffect(() => {
    if (!activeRx) return
    const updated = prescriptions.find((p) => p.id === activeRx.id)
    setActiveRx(updated ?? null)
  }, [prescriptions]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeOrder) return
    const updated = orders.find((order) => order.id === activeOrder.id)
    setActiveOrder(updated ?? null)
  }, [orders]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeRx) { return }
    setShowClarificationInput(false)
    setClarificationNote('')
    setCartAddedMsg(null)
    setManualItems([])
    setProductSearch('')
    setShowDropdown(false)
    setShowCatalogPicker(false)
    setShowRejectInput(false)
    setRejectionTemplate('')
    setRejectionCustom('')
    const initial: Record<string, boolean> = {}
    activeRx.items.forEach((item) => { initial[item.name] = Boolean(item.variantId) })
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

  useEffect(() => {
    if (!showDropdown) {
      setVariantSearchLoading(false)
      return
    }
    const q = productSearch.trim()
    let cancelled = false
    setVariantSearchLoading(true)
    const timer = window.setTimeout(() => {
      void prescriptionService.searchCatalogVariants(q, 500)
        .then((items) => {
          if (!cancelled) {
            const selectedIds = new Set(manualItems.map((item) => item.variant.id))
            setVariantSuggestions(items.filter((item) => !selectedIds.has(item.id)))
          }
        })
        .catch(() => {
          if (!cancelled) setVariantSuggestions([])
        })
        .finally(() => {
          if (!cancelled) setVariantSearchLoading(false)
        })
    }, 220)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [productSearch, manualItems, showDropdown])

  const addManualItem = (variant: PharmacistCatalogVariant) => {
    setManualItems((prev) => [...prev, { variant, qty: 1 }])
    setProductSearch('')
    setVariantSuggestions([])
    setShowDropdown(false)
    setShowCatalogPicker(false)
  }

  const removeManualItem = (variantId: number) =>
    setManualItems((prev) => prev.filter((m) => m.variant.id !== variantId))

  const updateManualQty = (variantId: number, qty: number) =>
    setManualItems((prev) => prev.map((m) => {
      if (m.variant.id !== variantId) return m
      const maxQty = Math.max(1, m.variant.available_quantity || 1)
      return { ...m, qty: Math.min(maxQty, Math.max(1, qty)) }
    }))

  const handleApprove = async () => {
    if (!activeRx) return
    const toAdd = activeRx.items.filter((item) => itemSelections[item.name] && item.variantId)
    const reviewItems = [
      ...toAdd.map((item) => ({
        name: item.name,
        product_id: item.productId ?? null,
        variant_id: item.variantId ?? null,
        dose: item.dose,
        frequency: item.frequency,
        quantity: item.qty,
      })),
      ...manualItems.map(({ variant, qty }) => ({
        name: variant.display_name,
        product_id: variant.product_id,
        variant_id: variant.id,
        dose: '',
        frequency: '',
        quantity: qty,
      })),
    ]
    if (reviewItems.length === 0) {
      setCartAddedMsg('Select at least one catalog variant before approving this prescription.')
      setTimeout(() => setCartAddedMsg(null), 6000)
      return
    }
    if (activeRx.backendId) {
      const response = await prescriptionService.pharmacistReview(activeRx.backendId, {
        action: 'approve',
        notes: `Approved by ${actor}`,
        items: reviewItems,
      })
      setPrescriptions(response.data)
    } else {
      await updateRx(activeRx.id, { status: 'Approved', pharmacist: actor, items: reviewItems.map((item) => ({
        name: item.name,
        productId: item.product_id,
        variantId: item.variant_id,
        dose: item.dose || '-',
        frequency: item.frequency || '-',
        qty: item.quantity,
      })) }, `Approved by ${actor}`)
    }
    const totalAdded = reviewItems.length
    const skipped = activeRx.items.length - toAdd.length
    const msg = totalAdded > 0
      ? `Prescription approved with ${totalAdded} mapped item${totalAdded !== 1 ? 's' : ''}${skipped > 0 ? ` · ${skipped} out-of-stock item${skipped !== 1 ? 's' : ''} skipped` : ''}.`
      : 'Prescription approved.'
    setCartAddedMsg(msg)
    setTimeout(() => setCartAddedMsg(null), 6000)
  }

  const handleClarification = async (note: string) => {
    if (!activeRx) return
    const trimmed = note.trim()
    if (activeRx.backendId) {
      const response = await prescriptionService.pharmacistReview(activeRx.backendId, {
        action: 'request_clarification',
        notes: trimmed,
      })
      setPrescriptions(response.data)
    } else {
      await updateRx(activeRx.id, { status: 'Clarification', dispatchStatus: 'Not started', pharmacist: actor }, `Clarification requested by ${actor}${trimmed ? ': ' + trimmed : ''}`)
    }
    setShowClarificationInput(false)
    setClarificationNote('')
  }

  const handleReject = () => {
    if (!activeRx) return
    const reason = rejectionTemplate === 'Other' ? rejectionCustom : rejectionTemplate
    void updateRx(activeRx.id, { status: 'Rejected', dispatchStatus: 'Not started', pharmacist: actor }, `Rejected by ${actor}${reason ? ': ' + reason : ''}`)
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
    return sortOrdersByCreatedDesc(orders).filter((order) => {
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

  const approvedPrescriptionsAwaitingCheckout = useMemo(() => {
    if (selectedOrderStatus !== 'all' && selectedOrderStatus !== 'pending') return []
    if (selectedOrderPaymentStatus !== 'all' && selectedOrderPaymentStatus !== 'pending') return []

    const query = orderSearchTerm.trim().toLowerCase()
    return prescriptions
      .filter((rx) => rx.status === 'Approved' && rx.dispatchStatus === 'Not started' && unpaidPrescriptionItems(rx).length > 0)
      .filter((rx) => {
        if (!query) return true
        return [
          rx.id,
          rx.patient,
          rx.doctor,
          rx.pharmacist,
          formatPrescriptionItemsPreview(rx),
        ].join(' ').toLowerCase().includes(query)
      })
      .sort((left, right) => prescriptionSubmittedValue(right) - prescriptionSubmittedValue(left))
  }, [orderSearchTerm, prescriptions, selectedOrderPaymentStatus, selectedOrderStatus])

  const ORDER_PAGE_SIZE = 8
  const totalOrderPages = Math.max(1, Math.ceil(filteredOrderRecords.length / ORDER_PAGE_SIZE))
  const pagedOrderRecords = filteredOrderRecords.slice((orderCurrentPage - 1) * ORDER_PAGE_SIZE, orderCurrentPage * ORDER_PAGE_SIZE)
  const orderFollowUpCount = orders.length + approvedPrescriptionsAwaitingCheckout.length

  const openOrderModal = (order: AdminOrder) => {
    setActiveOrder(order)
    setOrdersError('')
  }

  const promptOrderStatusUpdate = (order: AdminOrder, nextStatus: string) => {
    setStatusConfirm({ order, nextStatus })
  }

  const syncOrder = (updated: AdminOrder) => {
    setOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)))
    setActiveOrder((prev) => (prev?.id === updated.id ? updated : prev))
  }

  const handleOrderUpdate = async (status: string) => {
    if (!activeOrder) return
    promptOrderStatusUpdate(activeOrder, status)
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
      badge: orderFollowUpCount,
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
      accentColor="#0EA5E9"
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
      onLogout={async () => {
        await logout()
        navigate('/login', { replace: true })
      }}
      roleLabel="Pharmacist"
      sidebarHeaderContent={(
        <div className="portal-shell__meta-card">
          <span className="portal-shell__meta-label">Workspace</span>
          <p className="portal-shell__meta-value">{activeWorkspace === 'prescriptions' ? 'Prescription operations' : 'Order follow-up'}</p>
          <p className="portal-shell__meta-value">
            {activeWorkspace === 'prescriptions'
              ? `${stats.pending} awaiting action`
              : `${orders.length} orders${approvedPrescriptionsAwaitingCheckout.length ? ` · ${approvedPrescriptionsAwaitingCheckout.length} awaiting checkout` : ''}`}
          </p>
        </div>
      )}
      userMeta={activeWorkspace === 'prescriptions' ? 'Prescription Operations' : 'Order Follow-up'}
      userName={user?.name || 'Pharmacist'}
    >
      <div className="admin-page pharm-portal">
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
                            <span className={`pharm-source-badge pharm-source-badge--${rx.source === 'e_prescription' ? 'e-prescription' : 'upload'}`}>
                              {rx.source === 'e_prescription' ? 'E-prescription' : 'Uploaded'}
                            </span>
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
                            <span>{formatSubmittedDateTime(rx.submittedAt || rx.submitted)}</span>
                            {rx.status === 'Pending' && <TimeElapsed since={rx.submittedAt || rx.submitted} />}
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
              <p className="px-subtitle">Display every order by latest creation time, plus approved prescriptions waiting for customer checkout.</p>
            </div>
          </div>

          <div className="cm-kpi-grid">
            <div className="cm-kpi-card" onClick={() => setSelectedOrderStatus('all')} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
              <div className="cm-kpi-card__icon cm-kpi-card__icon--blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>
              </div>
              <div className="cm-kpi-card__body">
                <span className="cm-kpi-card__label">All follow-ups</span>
                <strong className="cm-kpi-card__value">{orderFollowUpCount}</strong>
              </div>
            </div>
            <div className="cm-kpi-card" onClick={() => setSelectedOrderStatus('pending')} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
              <div className="cm-kpi-card__icon cm-kpi-card__icon--amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div className="cm-kpi-card__body">
                <span className="cm-kpi-card__label">Pending</span>
                <strong className="cm-kpi-card__value cm-kpi-card__value--amber">
                  {(orderStatusCounts.pending ?? 0) + approvedPrescriptionsAwaitingCheckout.length}
                </strong>
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
            {approvedPrescriptionsAwaitingCheckout.length > 0 && (
              <section className="pharm-table-panel pharm-table-panel--awaiting-checkout">
                <div className="pharm-table-panel__header">
                  <div>
                    <h2>Approved prescriptions awaiting checkout</h2>
                    <p>These prescriptions passed pharmacist review and are waiting for the customer to complete checkout and payment.</p>
                  </div>
                  <span className="pharm-table-panel__badge">{approvedPrescriptionsAwaitingCheckout.length} records</span>
                </div>
                <div className="cm-table-wrap">
                  <table className="cm-table pharm-table pharm-table--orders">
                    <thead>
                      <tr>
                        <th>Prescription</th>
                        <th>Patient</th>
                        <th>Items</th>
                        <th>Status</th>
                        <th>Submitted</th>
                        <th className="cm-th-actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedPrescriptionsAwaitingCheckout.map((rx) => {
                        const unpaidItems = unpaidPrescriptionItems(rx)
                        return (
                          <tr key={`awaiting-${rx.id}`}>
                            <td>
                              <div className="pharm-cell-stack">
                                <strong className="pharm-table__primary">{rx.id}</strong>
                                <span className="pharm-cell-muted">{rx.source === 'e_prescription' ? 'E-prescription' : 'Uploaded prescription'}</span>
                                <span className="pharm-cell-muted">
                                  {unpaidItems.length} item{unpaidItems.length === 1 ? '' : 's'} awaiting checkout
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className="pharm-cell-stack">
                                <strong className="pharm-table__primary">{rx.patient}</strong>
                                <span className="pharm-cell-muted">Doctor: {rx.doctor || 'Not provided'}</span>
                                <span className="pharm-cell-muted">{rx.pharmacist === 'Unassigned' ? 'Approved by pharmacy' : `Approved by ${rx.pharmacist}`}</span>
                              </div>
                            </td>
                            <td>
                              <div className="pharm-cell-stack pharm-cell-stack--items">
                                <span>{formatPrescriptionItemsPreview(rx)}</span>
                                {unpaidItems.length > 3 && <span className="pharm-cell-muted">+{unpaidItems.length - 3} more line{unpaidItems.length - 3 === 1 ? '' : 's'}</span>}
                              </div>
                            </td>
                            <td>
                              <span className="admin-status admin-status--warning">Awaiting checkout</span>
                            </td>
                            <td>
                              <div className="pharm-cell-stack">
                                <span>{formatSubmittedDateTime(rx.submittedAt || rx.submitted)}</span>
                                <TimeElapsed since={rx.submittedAt || rx.submitted} />
                              </div>
                            </td>
                            <td>
                              <div className="cm-row-actions pharm-row-actions">
                                <button className="cm-row-btn cm-row-btn--edit" type="button" onClick={() => setActiveRx(rx)}>
                                  View prescription
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="pharm-table-panel pharm-table-panel--orders">
              <div className="pharm-table-panel__header">
                <div>
                  <h2>All orders</h2>
                  <p>Review all orders by latest creation time, narrow by backend status or payment state, and confirm each next status.</p>
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
                        <th>Items</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Payment status</th>
                        <th>Updated</th>
                        <th className="cm-th-actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedOrderRecords.map((order) => {
                        const upcomingStatus = nextOrderStatus(order)
                        const prescriptionReference = formatOrderPrescriptionReferences(order)
                        return (
                          <tr key={order.id}>
                            <td>
                              <div className="pharm-cell-stack">
                                <strong className="pharm-table__primary">{order.order_number}</strong>
                                {prescriptionReference && (
                                  <span className="pharm-cell-muted">Rx {prescriptionReference}</span>
                                )}
                                <span className="pharm-cell-muted">
                                  {order.items.length} item{order.items.length === 1 ? '' : 's'}
                                </span>
                                <span className="pharm-order-items-preview">{formatOrderItemsPreview(order)}</span>
                              </div>
                            </td>
                            <td>
                              <div className="pharm-cell-stack">
                                <strong className="pharm-table__primary">{orderCustomerName(order)}</strong>
                                <span className="pharm-cell-muted">{orderCustomerEmail(order)}</span>
                                <span className="pharm-cell-muted">{orderCustomerPhone(order)}</span>
                              </div>
                            </td>
                            <td>
                              <div className="pharm-cell-stack pharm-cell-stack--items">
                                <span>{formatOrderLineItems(order)}</span>
                                {order.items.length > 3 && <span className="pharm-cell-muted">+{order.items.length - 3} more line{order.items.length - 3 === 1 ? '' : 's'}</span>}
                              </div>
                            </td>
                            <td><strong className="pharm-table__primary">{formatCurrency(order.total)}</strong></td>
                            <td><span className={`admin-status status--${order.status}`}>{ORDER_STATUS_LABELS[order.status] ?? order.status}</span></td>
                            <td>
                              <div className="pharm-cell-stack">
                                <span className={`admin-status status--${order.payment_status}`}>{order.payment_status.replace(/_/g, ' ')}</span>
                                <span className="pharm-cell-muted">{order.payment_method.replace(/_/g, ' ')}</span>
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
                <span className="px-modal__submitted">Submitted {formatSubmittedDateTime(activeRx.submittedAt || activeRx.submitted)}</span>
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
                    <p className="px-item-picker-hint">Only catalog-matched variants can be approved. For handwritten or unmatched lines, select the exact variant below.</p>
                    <div className="px-items-list">
                      {activeRx.items.map((item) => {
                        const hasCatalogVariant = Boolean(item.variantId)
                        return (
                        <label key={item.name} className={`px-item px-item--selectable${!itemSelections[item.name] ? ' px-item--oos' : ''}${!hasCatalogVariant ? ' px-item--unmatched' : ''}`}>
                          <input
                            type="checkbox"
                            className="px-item__check"
                            checked={itemSelections[item.name] ?? true}
                            disabled={!hasCatalogVariant}
                            onChange={(e) => setItemSelections((prev) => ({ ...prev, [item.name]: e.target.checked }))}
                          />
                          <div className="px-item__info">
                            <p className="px-item__name">{item.name}</p>
                            <p className="px-item__meta">{item.dose} · {item.frequency}</p>
                            {hasCatalogVariant ? (
                              <p className="px-item__variant">
                                Patient requested catalog item · {item.variantName || 'Selected variant'}{item.variantSku ? ` · SKU ${item.variantSku}` : ''}
                              </p>
                            ) : (
                              <p className="px-item__variant px-item__variant--unmatched">
                                Select exact catalog variant below
                              </p>
                            )}
                          </div>
                          <div className="px-item__right">
                            <span className="px-item__qty">Qty {item.qty}</span>
                            {!itemSelections[item.name] && <span className="px-item__oos-tag">Out of stock</span>}
                          </div>
                        </label>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="px-modal__section">
                  <button
                    className="px-catalog-toggle"
                    type="button"
                    onClick={() => {
                      setShowCatalogPicker((open) => {
                        const next = !open
                        if (!next) {
                          setProductSearch('')
                          setVariantSuggestions([])
                          setShowDropdown(false)
                        }
                        return next
                      })
                    }}
                    aria-expanded={showCatalogPicker}
                  >
                    <span>
                      <span className="px-section-label">Add medications from catalog</span>
                      <span className="px-item-picker-hint">List and select from Ava Pharmacy variants only.</span>
                    </span>
                    <span className={`px-catalog-toggle__chevron ${showCatalogPicker ? 'px-catalog-toggle__chevron--open' : ''}`}>⌄</span>
                  </button>

                  {showCatalogPicker && (
                    <div className="px-catalog-picker">
                      <p className="px-catalog-picker__note">Showing active catalog variants. Search by medicine, variant, SKU, brand, or strength to narrow the list.</p>
                      <div className="px-med-search" ref={dropdownRef}>
                        <div className="px-med-search__wrap">
                          <svg className="px-med-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                          <input
                            type="text"
                            className="px-med-search__input"
                            placeholder="Search medicine, variant, SKU, or brand…"
                            value={productSearch}
                            onChange={(e) => { setProductSearch(e.target.value); setShowDropdown(true) }}
                            onFocus={() => setShowDropdown(true)}
                            autoFocus
                          />
                          {(productSearch || showDropdown) && (
                            <button
                              className="px-med-search__clear"
                              type="button"
                              onClick={() => { setProductSearch(''); setVariantSuggestions([]); setShowDropdown(false) }}
                              aria-label="Close catalog search"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        {showDropdown && (variantSearchLoading || variantSuggestions.length > 0 || productSearch.trim().length > 0) && (
                          <div className="px-med-dropdown">
                            {variantSearchLoading && (
                              <div className="px-med-dropdown--empty">Loading catalog variants…</div>
                            )}
                            {!variantSearchLoading && variantSuggestions.length > 0 && (
                              <div className="px-med-dropdown__summary">
                                {variantSuggestions.length} variant{variantSuggestions.length === 1 ? '' : 's'} available
                              </div>
                            )}
                            {!variantSearchLoading && variantSuggestions.map((variant) => (
                              <button
                                key={variant.id}
                                className="px-med-dropdown__item"
                                type="button"
                                disabled={!variant.can_select}
                                onMouseDown={() => { if (variant.can_select) addManualItem(variant) }}
                              >
                                <span>
                                  <span className="px-med-dropdown__name">{variant.display_name}</span>
                                  <span className="px-med-dropdown__meta">
                                    {variant.brand_name || 'Ava Pharmacy'} · SKU {variant.sku || 'N/A'} · KSh {Number(variant.price || 0).toLocaleString()}
                                    {variant.requires_prescription ? ' · Prescription' : ' · Non-prescription'}
                                  </span>
                                </span>
                                <span className={`px-med-dropdown__stock ${variant.can_select ? '' : 'px-med-dropdown__stock--out'}`}>
                                  {variant.can_select ? `${variant.available_quantity} in stock` : 'Out of stock'}
                                </span>
                              </button>
                            ))}
                            {!variantSearchLoading && variantSuggestions.length === 0 && (
                              <div className="px-med-dropdown--empty">No matching catalog variants.</div>
                            )}
                          </div>
                        )}
                      </div>
                      <button className="btn btn--outline btn--sm px-catalog-picker__close" type="button" onClick={() => { setProductSearch(''); setVariantSuggestions([]); setShowDropdown(false); setShowCatalogPicker(false) }}>
                        Close catalog
                      </button>
                    </div>
                  )}
                  {manualItems.length > 0 && (
                    <div className="px-manual-items">
                      <p className="px-selected-variants-title">Selected catalog variants</p>
                      {manualItems.map(({ variant, qty }) => (
                        <div key={variant.id} className="px-manual-item">
                          <div className="px-item__info">
                            <p className="px-item__name">{variant.display_name}</p>
                            <p className="px-item__meta">{variant.brand_name || 'Ava Pharmacy'} · KSh {Number(variant.price || 0).toLocaleString()}</p>
                            <p className="px-item__variant">
                              {variant.variant_name || 'Selected variant'}{variant.sku ? ` · SKU ${variant.sku}` : ''}
                            </p>
                          </div>
                          <div className="px-manual-item__controls">
                            <label className="px-manual-item__qty-label">Qty</label>
                            <input
                              type="number"
                              className="px-manual-item__qty"
                              value={qty}
                              min={1}
                              max={variant.available_quantity || undefined}
                              onChange={(e) => updateManualQty(variant.id, parseInt(e.target.value) || 1)}
                            />
                            <button className="px-manual-item__remove" type="button" onClick={() => removeManualItem(variant.id)} aria-label="Remove">×</button>
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

                {buildClarificationThread(activeRx).length > 0 && (
                  <div className="px-modal__section pharm-thread-section">
                    <div className="pharm-thread-section__head">
                      <p className="px-section-label">Clarification messages</p>
                      <span>{buildClarificationThread(activeRx).length} message{buildClarificationThread(activeRx).length === 1 ? '' : 's'}</span>
                    </div>
                    <div className="pharm-thread">
                      {buildClarificationThread(activeRx).map((entry) => (
                        <article
                          key={`${activeRx.id}-${entry.id}-${entry.createdAt}`}
                          className={`pharm-thread__message ${entry.senderRole === 'patient' ? 'pharm-thread__message--patient' : 'pharm-thread__message--staff'}`}
                        >
                          <div className="pharm-thread__meta">
                            <strong>{entry.senderRole === 'patient' ? 'Customer' : (entry.senderDisplay || entry.senderName || 'Pharmacy team')}</strong>
                            <span>{formatThreadTime(entry.createdAt)}</span>
                          </div>
                          <p>{entry.message}</p>
                        </article>
                      ))}
                    </div>
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
                    <strong>{orderCustomerName(activeOrder)}</strong>
                    <p>{orderCustomerEmail(activeOrder)}</p>
                    <p>{orderCustomerPhone(activeOrder)}</p>
                  </div>
                  <div>
                    <span>Address</span>
                    <strong>{activeOrder.shipping_address}</strong>
                  </div>
                  <div>
                    <span>Payment</span>
                    <strong>{activeOrder.payment_method.replace(/_/g, ' ')} · {activeOrder.payment_status.replace(/_/g, ' ')}</strong>
                  </div>
                  {formatOrderPrescriptionReferences(activeOrder) && (
                    <div>
                      <span>Prescription</span>
                      <strong>{formatOrderPrescriptionReferences(activeOrder)}</strong>
                    </div>
                  )}
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
                          {item.prescription_id && <span>Rx: {item.prescription_id}</span>}
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

                <p className="pharm-order-actions__hint">
                  You are updating this order from {ORDER_STATUS_LABELS[statusConfirm.order.status] ?? statusConfirm.order.status} to {ORDER_STATUS_LABELS[statusConfirm.nextStatus] ?? statusConfirm.nextStatus}. Confirm only if that fulfilment step is complete.
                </p>
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
