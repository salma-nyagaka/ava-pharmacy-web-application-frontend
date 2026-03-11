import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import {
  adminProductService,
  ApiHealthConcern,
  ApiProductSubcategory,
  ApiProduct,
  ProductCreatePayload,
} from '../../services/adminProductService'
import './ProductManagement.css'
import './CategoryManagement.css'

const PAGE_SIZE = 6

function generateSku(name: string): string {
  const base = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 12)
  const suffix = Date.now().toString(36).toUpperCase().slice(-4)
  return `${base}-${suffix}`
}

function generateSlug(name: string): string {
  return name.trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function ProductManagement() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [subcategories, setSubcategories] = useState<ApiProductSubcategory[]>([])
  const [allConcerns, setAllConcerns] = useState<ApiHealthConcern[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubcat, setSelectedSubcat] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ApiProduct | null>(null)

  const [productName, setProductName] = useState('')
  const [productSlug, setProductSlug] = useState('')
  const [productSku, setProductSku] = useState('')
  const [productStrength, setProductStrength] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productOriginalPrice, setProductOriginalPrice] = useState('')
  const [productStock, setProductStock] = useState('')
  const [productSubcategoryId, setProductSubcategoryId] = useState<number | ''>('')
  const [productHealthConcernIds, setProductHealthConcernIds] = useState<number[]>([])
  const [productStatus, setProductStatus] = useState<'active' | 'inactive'>('active')
  const [productRequiresRx, setProductRequiresRx] = useState(false)
  const [productDescription, setProductDescription] = useState('')
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ApiProduct | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [prods, subs, concerns] = await Promise.all([
        adminProductService.listProducts(),
        adminProductService.listProductSubcategories(),
        adminProductService.listHealthConcerns(),
      ])
      setProducts(prods)
      setSubcategories(subs)
      setAllConcerns(concerns)
    } catch {
      setError('Failed to load products.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setProductName('')
    setProductSlug('')
    setProductSku('')
    setProductStrength('')
    setProductPrice('')
    setProductOriginalPrice('')
    setProductStock('')
    setProductSubcategoryId('')
    setProductHealthConcernIds([])
    setProductStatus('active')
    setProductRequiresRx(false)
    setProductDescription('')
    setEditingProduct(null)
    setFormError('')
  }

  const openAddModal = () => {
    resetForm()
    setShowAddModal(true)
  }

  const openEditModal = (product: ApiProduct) => {
    setProductName(product.name)
    setProductSlug(product.slug ?? generateSlug(product.name))
    setProductSku(product.sku)
    setProductStrength(product.strength ?? '')
    setProductPrice(product.price)
    setProductOriginalPrice(product.original_price ?? '')
    setProductStock(String(product.stock_quantity))
    setProductSubcategoryId(product.subcategory_id ?? '')
    setProductHealthConcernIds(product.health_concerns?.map((c) => c.id) ?? [])
    setProductStatus(product.is_active ? 'active' : 'inactive')
    setProductRequiresRx(product.requires_prescription)
    setProductDescription(product.description ?? '')
    setEditingProduct(product)
    setFormError('')
    setShowAddModal(true)
  }

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault()
    if (!productName.trim()) { setFormError('Product name is required.'); return }
    if (!productPrice) { setFormError('Price is required.'); return }

    const sku = productSku.trim() || generateSku(productName)
    const slug = productSlug.trim() || generateSlug(productName)
    const payload: ProductCreatePayload = {
      name: productName.trim(),
      slug,
      sku,
      strength: productStrength.trim() || undefined,
      price: Number(productPrice),
      original_price: productOriginalPrice ? Number(productOriginalPrice) : undefined,
      stock_quantity: Number(productStock) || 0,
      subcategory_id: productSubcategoryId !== '' ? Number(productSubcategoryId) : null,
      health_concern_ids: productHealthConcernIds,
      is_active: productStatus === 'active',
      requires_prescription: productRequiresRx,
      description: productDescription,
    }

    setSaving(true)
    setFormError('')
    try {
      if (editingProduct) {
        const updated = await adminProductService.updateProduct(editingProduct.id, payload)
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? updated : p)))
      } else {
        const created = await adminProductService.createProduct(payload)
        setProducts((prev) => [created, ...prev])
      }
      setShowAddModal(false)
    } catch (err: unknown) {
      type ApiErr = { response?: { data?: { error?: { message?: string; details?: { errors?: { details?: Record<string, string[]> } } } } } }
      const apiErr = (err as ApiErr)?.response?.data?.error
      const fieldErrors = apiErr?.details?.errors?.details
      if (fieldErrors && typeof fieldErrors === 'object') {
        const msgs = Object.entries(fieldErrors)
          .map(([field, errs]) => `${field}: ${(errs as string[]).join(', ')}`)
          .join(' · ')
        setFormError(msgs)
      } else {
        setFormError(apiErr?.message ?? 'Failed to save product.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleToggleProduct = async (product: ApiProduct) => {
    try {
      const updated = await adminProductService.updateProduct(product.id, { is_active: !product.is_active })
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)))
    } catch {
      // silent
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError('')
    try {
      await adminProductService.deleteProduct(deleteTarget.id)
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: unknown) {
      type ApiErr = { response?: { data?: { error?: { message?: string } } } }
      setDeleteError((err as ApiErr)?.response?.data?.error?.message ?? 'Failed to delete. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleBack = () => {
    if (window.history.length > 1) { navigate(-1); return }
    navigate('/admin')
  }

  useEffect(() => { setCurrentPage(1) }, [searchTerm, selectedSubcat])

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCat = selectedSubcat === 'all' || String(p.subcategory_id) === selectedSubcat
    return matchSearch && matchCat
  })

  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedProducts = filteredProducts.slice(startIndex, startIndex + PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))

  const getSubcategoryLabel = (subcategoryId: number | null) => {
    if (!subcategoryId) return 'Uncategorized'
    const sub = subcategories.find((s) => s.id === subcategoryId)
    if (!sub) return 'Uncategorized'
    return `${sub.category_name} / ${sub.name}`
  }

  return (
    <div className="product-management">
      <div className="product-management__header">
        <div className="product-management__title">
          <button className="pm-back-btn" type="button" onClick={handleBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
            Back
          </button>
          <h1>Products</h1>
          <span className="pm-count">{filteredProducts.length} items</span>
        </div>
        <div className="product-management__actions">
          <button className="btn btn--primary btn--sm" onClick={openAddModal}>+ Add Product</button>
          <Link className="btn btn--ghost btn--sm" to="/admin/categories">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" />
            </svg>
            Categories
          </Link>
        </div>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      <div className="product-management__filters">
        <div className="search-box">
          <svg className="search-box__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={selectedSubcat} onChange={(e) => setSelectedSubcat(e.target.value)}>
          <option value="all">All Subcategories</option>
          {subcategories.map((s) => (
            <option key={s.id} value={String(s.id)}>{s.category_name} / {s.name}</option>
          ))}
        </select>
      </div>

      <div className="product-management__table">
        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading products…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Subcategory</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Prescription</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pagedProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="product-info">
                      <ImageWithFallback src={product.image ?? ''} alt={product.name} />
                      <div>
                        <span className="product-info__name">{product.name}</span>
                        <span className="product-info__concerns">{product.sku}</span>
                      </div>
                    </div>
                  </td>
                  <td className="td--muted">{getSubcategoryLabel(product.subcategory_id)}</td>
                  <td>KSh {Number(product.price).toLocaleString()}</td>
                  <td>
                    <span className={`stock ${product.stock_quantity < 20 ? 'stock--low' : ''}`}>{product.stock_quantity}</span>
                  </td>
                  <td className="td--muted">{product.requires_prescription ? <span className="rx-badge">Required</span> : '-'}</td>
                  <td>
                    <span className={`status status--${product.is_active ? 'active' : 'inactive'}`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" title="Edit" onClick={() => openEditModal(product)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <Link className="btn-icon" title="View inventory" to={`/admin/inventory?product=${product.id}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                      </Link>
                      <button
                        className={`btn-icon ${product.is_active ? 'btn-icon--pause' : 'btn-icon--play'}`}
                        title={product.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggleProduct(product)}
                      >
                        {product.is_active
                          ? <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                          : <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        }
                      </button>
                      <button
                        className="btn-icon btn-icon--danger"
                        title="Delete product"
                        onClick={() => { setDeleteTarget(product); setDeleteError('') }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                          <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pagedProducts.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No products found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="pagination">
        <button className="pagination__button" type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
        <div className="pagination__pages">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button key={page} className={`pagination__page ${page === currentPage ? 'pagination__page--active' : ''}`} type="button" onClick={() => setCurrentPage(page)}>{page}</button>
          ))}
        </div>
        <button className="pagination__button" type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal modal--product" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div className="modal__header-info">
                <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                <span className="modal__header-sub">All fields marked * are required</span>
              </div>
              <button className="modal__close" onClick={() => setShowAddModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {formError && (
              <div className="form-alert form-alert--error">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} noValidate>
              <div className="modal__body">

                <div className="pf-section">
                  <div className="pf-section__label">Basic Info</div>
                  <div className="pf-row">
                    <div className="pf-field">
                      <label className="pf-label">Product Name <span className="pf-req">*</span></label>
                      <input
                        className="pf-input"
                        type="text"
                        placeholder="e.g. Panadol Extra"
                        value={productName}
                        onChange={(e) => {
                          setProductName(e.target.value)
                          setProductSlug(generateSlug(e.target.value))
                        }}
                      />
                    </div>
                    <div className="pf-field pf-field--sm">
                      <label className="pf-label">Strength <span className="pf-optional">optional</span></label>
                      <input
                        className="pf-input"
                        type="text"
                        placeholder="e.g. 500mg"
                        value={productStrength}
                        onChange={(e) => setProductStrength(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="pf-row">
                    <div className="pf-field">
                      <label className="pf-label">Subcategory</label>
                      <select className="pf-input" value={productSubcategoryId} onChange={(e) => setProductSubcategoryId(e.target.value !== '' ? Number(e.target.value) : '')}>
                        <option value="">No subcategory</option>
                        {subcategories.map((s) => (
                          <option key={s.id} value={s.id}>{s.category_name} / {s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="pf-field pf-field--sm">
                      <label className="pf-label">Status</label>
                      <select className="pf-input" value={productStatus} onChange={(e) => setProductStatus(e.target.value as 'active' | 'inactive')}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  {allConcerns.length > 0 && (
                    <div className="pf-field">
                      <label className="pf-label">Health Concerns <span className="pf-optional">optional</span></label>
                      <div className="pf-concern-grid">
                        {allConcerns.filter((c) => c.is_active).map((c) => {
                          const checked = productHealthConcernIds.includes(c.id)
                          return (
                            <label key={c.id} className={`pf-concern-chip${checked ? ' pf-concern-chip--selected' : ''}`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setProductHealthConcernIds((prev) =>
                                    checked ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                                  )
                                }
                              />
                              {c.icon && <span>{c.icon}</span>}
                              {c.name}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  <div className="pf-field">
                    <label className="pf-label">Description <span className="pf-optional">optional</span></label>
                    <textarea
                      className="pf-input pf-textarea"
                      rows={2}
                      placeholder="Brief description shown on the product page"
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pf-section">
                  <div className="pf-section__label">Pricing</div>
                  <div className="pf-row">
                    <div className="pf-field">
                      <label className="pf-label">Selling Price <span className="pf-req">*</span></label>
                      <div className="pf-prefix-wrap">
                        <span className="pf-prefix">KSh</span>
                        <input className="pf-input pf-input--prefixed" type="number" min="0" step="0.01" placeholder="0.00" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} />
                      </div>
                    </div>
                    <div className="pf-field">
                      <label className="pf-label">Compare-at Price <span className="pf-optional">optional</span></label>
                      <div className="pf-prefix-wrap">
                        <span className="pf-prefix">KSh</span>
                        <input className="pf-input pf-input--prefixed" type="number" min="0" step="0.01" placeholder="0.00" value={productOriginalPrice} onChange={(e) => setProductOriginalPrice(e.target.value)} />
                      </div>
                      <span className="pf-hint">Shown as strikethrough when higher than selling price</span>
                    </div>
                  </div>
                </div>

                <div className="pf-section">
                  <div className="pf-section__label">Inventory</div>
                  <div className="pf-field pf-field--half">
                    <label className="pf-label">Stock Quantity</label>
                    <input className="pf-input" type="number" min="0" placeholder="0" value={productStock} onChange={(e) => setProductStock(e.target.value)} />
                  </div>
                  <div className="pf-toggle-row" onClick={() => setProductRequiresRx(!productRequiresRx)}>
                    <div className="pf-toggle-row__text">
                      <span className="pf-toggle-row__title">Prescription Required</span>
                      <span className="pf-toggle-row__sub">
                        {productRequiresRx ? 'Customer must present a valid prescription to purchase' : 'Available over the counter without a prescription'}
                      </span>
                    </div>
                    <label className="rx-toggle" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={productRequiresRx} onChange={(e) => setProductRequiresRx(e.target.checked)} />
                      <span className={`rx-toggle__track${productRequiresRx ? ' rx-toggle__track--on' : ''}`}>
                        <span className="rx-toggle__thumb" style={{ transform: productRequiresRx ? 'translateX(20px)' : 'translateX(0)' }} />
                      </span>
                    </label>
                  </div>
                </div>

              </div>

              <div className="modal__footer">
                <button type="button" className="btn btn--secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? (
                    <><span className="btn-spinner" />Saving…</>
                  ) : editingProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteTarget && (
        <div className="cm-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="cm-modal cm-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal__header cm-modal__header--danger">
              <h2>Delete Product</h2>
              <button
                type="button"
                className="cm-modal__close"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="cm-delete-body">
              <div className="cm-delete-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <p>Delete <strong>"{deleteTarget.name}"</strong>? This action cannot be undone.</p>
              <p className="cm-delete-warning">SKU: {deleteTarget.sku}</p>
              {deleteError && (
                <p className="cm-form__error" style={{ marginTop: '0.75rem', justifyContent: 'center' }}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                  {deleteError}
                </p>
              )}
            </div>
            <div className="cm-modal__actions">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductManagement
