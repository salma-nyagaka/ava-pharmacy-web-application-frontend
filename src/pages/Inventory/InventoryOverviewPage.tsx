import { useEffect, useState } from 'react'
import PageHeader from '../../components/PageHeader/PageHeader'
import {
  FailedOrderPush,
  InventoryItem,
  fetchFailedOrderPushes,
  fetchInventoryItems,
  fetchLastSyncTime,
  retryOrderPush,
  triggerInventorySync,
} from '../../services/inventoryService'
import '../../styles/pages/InventoryOverviewPage.css'

type Tab = 'stock' | 'failed_pushes'

function statusPill(item: InventoryItem) {
  if (item.status === 'in_stock') return <span className="status-pill status-pill--success">In stock</span>
  if (item.status === 'low_stock') return <span className="status-pill status-pill--warning">Low stock</span>
  return <span className="status-pill status-pill--danger">Out of stock</span>
}

function InventoryOverviewPage() {
  const [tab, setTab] = useState<Tab>('stock')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [failedPushes, setFailedPushes] = useState<FailedOrderPush[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [retryingId, setRetryingId] = useState<number | null>(null)

  const loadItems = () => {
    setLoading(true)
    void fetchInventoryItems({
      search: search || undefined,
      location: locationFilter || undefined,
      low_stock: lowStockOnly || undefined,
    }).then((res) => {
      setItems(res.data)
    }).finally(() => setLoading(false))
  }

  const loadFailedPushes = () => {
    void fetchFailedOrderPushes().then(setFailedPushes)
  }

  useEffect(() => {
    void fetchLastSyncTime().then(setLastSynced)
    loadItems()
  }, [])

  useEffect(() => {
    if (tab === 'failed_pushes') loadFailedPushes()
  }, [tab])

  const handleSync = () => {
    setSyncing(true)
    setSyncMsg('')
    void triggerInventorySync().then((res) => {
      setSyncMsg(`Synced successfully — ${res.updated_count} items updated`)
      setLastSynced(res.synced_at)
      loadItems()
    }).catch(() => {
      setSyncMsg('Sync failed. Please try again.')
    }).finally(() => setSyncing(false))
  }

  const handleRetry = (pushId: number) => {
    setRetryingId(pushId)
    void retryOrderPush(pushId).then(() => {
      loadFailedPushes()
    }).catch(() => {
      // leave in list, user can retry again
    }).finally(() => setRetryingId(null))
  }

  const uniqueLocations = Array.from(new Set(items.map((i) => i.location))).filter(Boolean)

  return (
    <div>
      <PageHeader
        title="Inventory overview"
        subtitle="Monitor branch and warehouse stock levels in real time."
        badge="Inventory"
      />
      <section className="page">
        <div className="container">

          {/* Sync bar */}
          <div className="inv-sync-bar">
            <div className="inv-sync-bar__meta">
              {lastSynced && (
                <span className="inv-sync-bar__last">
                  Last synced: {new Date(lastSynced).toLocaleString('en-KE')}
                </span>
              )}
              {syncMsg && (
                <span className={`inv-sync-bar__msg ${syncMsg.includes('fail') ? 'inv-sync-bar__msg--error' : 'inv-sync-bar__msg--ok'}`}>
                  {syncMsg}
                </span>
              )}
            </div>
            <button
              className="btn btn--primary btn--sm"
              type="button"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? 'Syncing…' : 'Sync Now'}
            </button>
          </div>

          {/* Tabs */}
          <div className="inv-tabs">
            <button
              className={`inv-tab ${tab === 'stock' ? 'inv-tab--active' : ''}`}
              type="button"
              onClick={() => setTab('stock')}
            >
              Stock levels
            </button>
            <button
              className={`inv-tab ${tab === 'failed_pushes' ? 'inv-tab--active' : ''}`}
              type="button"
              onClick={() => setTab('failed_pushes')}
            >
              Failed order pushes
              {failedPushes.length > 0 && (
                <span className="inv-tab__badge">{failedPushes.length}</span>
              )}
            </button>
          </div>

          {tab === 'stock' && (
            <>
              {/* Filters */}
              <div className="inv-filters">
                <input
                  type="search"
                  placeholder="Search product…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadItems()}
                  className="inv-filters__search"
                />
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="inv-filters__select"
                >
                  <option value="">All locations</option>
                  {uniqueLocations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                <label className="inv-filters__checkbox">
                  <input
                    type="checkbox"
                    checked={lowStockOnly}
                    onChange={(e) => setLowStockOnly(e.target.checked)}
                  />
                  Low stock only
                </label>
                <button className="btn btn--outline btn--sm" type="button" onClick={loadItems}>
                  Apply
                </button>
              </div>

              {loading ? (
                <p className="inv-loading">Loading inventory…</p>
              ) : items.length === 0 ? (
                <p className="inv-empty">No inventory items found.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Location</th>
                      <th>Stock</th>
                      <th>Threshold</th>
                      <th>Status</th>
                      <th>Last synced</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.product_name}</td>
                        <td><code>{item.sku}</code></td>
                        <td>{item.location}</td>
                        <td>{item.quantity_on_hand}</td>
                        <td>{item.low_stock_threshold}</td>
                        <td>{statusPill(item)}</td>
                        <td>
                          {item.last_synced_at
                            ? new Date(item.last_synced_at).toLocaleString('en-KE')
                            : '—'}
                        </td>
                        <td>
                          <button className="btn btn--outline btn--sm" type="button">Adjust</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {tab === 'failed_pushes' && (
            failedPushes.length === 0 ? (
              <p className="inv-empty">No failed order pushes.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Attempts</th>
                    <th>Last error</th>
                    <th>Last tried</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {failedPushes.map((push) => (
                    <tr key={push.id}>
                      <td><strong>{push.order_number}</strong></td>
                      <td>{push.attempts}</td>
                      <td className="inv-error-cell">{push.last_error || '—'}</td>
                      <td>{new Date(push.last_tried_at).toLocaleString('en-KE')}</td>
                      <td>
                        <button
                          className="btn btn--primary btn--sm"
                          type="button"
                          disabled={retryingId === push.id}
                          onClick={() => handleRetry(push.id)}
                        >
                          {retryingId === push.id ? 'Retrying…' : 'Retry'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

        </div>
      </section>
    </div>
  )
}

export default InventoryOverviewPage
