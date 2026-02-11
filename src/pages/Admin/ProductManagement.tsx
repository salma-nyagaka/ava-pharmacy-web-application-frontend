import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import { logAdminAction } from '../../data/adminAudit'
import {
  adminParacetamol,
  adminIbuprofen,
  productVitaminC,
  productPainRelief,
} from '../../assets/images/remote'
import './ProductManagement.css'

interface Product {
  id: number
  name: string
  categoryId: string
  price: number
  stock: number
  status: 'active' | 'inactive'
  image: string
  requiresPrescription: boolean
  discountPercent?: number
}

interface Category {
  id: string
  name: string
  parentId?: string
}

const PAGE_SIZE = 6
const STORAGE_PRODUCTS_KEY = 'ava_admin_products'
const STORAGE_CATEGORIES_KEY = 'ava_admin_categories'

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-health', name: 'Health & Wellness' },
  { id: 'cat-beauty', name: 'Beauty & Skincare' },
  { id: 'cat-baby', name: 'Mother & Baby Care' },
  { id: 'cat-self', name: 'Self-Care & Lifestyle' },
]

const baseProducts: Product[] = [
  { id: 1, name: 'Paracetamol 500mg', categoryId: 'cat-health', price: 250, stock: 150, status: 'active', image: adminParacetamol, requiresPrescription: false },
  { id: 2, name: 'Ibuprofen 400mg', categoryId: 'cat-health', price: 350, stock: 80, status: 'active', image: adminIbuprofen, requiresPrescription: false },
  { id: 3, name: 'Vitamin C 1000mg', categoryId: 'cat-health', price: 800, stock: 200, status: 'active', image: productVitaminC, requiresPrescription: false },
  { id: 4, name: 'Amoxicillin 250mg', categoryId: 'cat-health', price: 1200, stock: 5, status: 'active', image: productPainRelief, requiresPrescription: true },
  { id: 5, name: 'Multivitamin Daily', categoryId: 'cat-self', price: 1500, stock: 0, status: 'inactive', image: productVitaminC, requiresPrescription: false },
  { id: 6, name: 'Aspirin 75mg', categoryId: 'cat-health', price: 300, stock: 180, status: 'active', image: productPainRelief, requiresPrescription: false },
  { id: 7, name: 'Skincare Moisturizer', categoryId: 'cat-beauty', price: 1800, stock: 60, status: 'active', image: adminParacetamol, requiresPrescription: false },
  { id: 8, name: 'Baby Diapers (Large)', categoryId: 'cat-baby', price: 1200, stock: 45, status: 'active', image: adminIbuprofen, requiresPrescription: false },
]

const hydrateProducts = () => {
  if (typeof window === 'undefined') {
    return baseProducts
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_PRODUCTS_KEY)
    if (!raw) return baseProducts
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : baseProducts
  } catch {
    return baseProducts
  }
}

const hydrateCategories = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_CATEGORIES
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_CATEGORIES_KEY)
    if (!raw) return DEFAULT_CATEGORIES
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : DEFAULT_CATEGORIES
  } catch {
    return DEFAULT_CATEGORIES
  }
}

function ProductManagement() {
  const navigate = useNavigate()
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [categories, setCategories] = useState<Category[]>(hydrateCategories())
  const [products, setProducts] = useState<Product[]>(hydrateProducts())
  const [productCategoryId, setProductCategoryId] = useState(categories[0]?.id ?? '')
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productStock, setProductStock] = useState('')
  const [productStatus, setProductStatus] = useState<'active' | 'inactive'>('active')
  const [productRequiresRx, setProductRequiresRx] = useState(false)
  const [productDiscount, setProductDiscount] = useState('')
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [categoryParentId, setCategoryParentId] = useState<string | undefined>(undefined)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(products))
  }, [products])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(categories))
  }, [categories])

  const getCategoryLabel = (categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId)
    if (!category) return 'Uncategorized'
    if (!category.parentId) return category.name
    const parent = categories.find((item) => item.id === category.parentId)
    return parent ? `${parent.name} / ${category.name}` : category.name
  }

  const resetProductForm = () => {
    setProductName('')
    setProductPrice('')
    setProductStock('')
    setProductStatus('active')
    setProductRequiresRx(false)
    setProductDiscount('')
    setProductCategoryId(categories[0]?.id ?? '')
    setEditingProductId(null)
  }

  const openAddModal = () => {
    resetProductForm()
    setShowAddModal(true)
  }

  const openEditModal = (product: Product) => {
    setProductName(product.name)
    setProductPrice(String(product.price))
    setProductStock(String(product.stock))
    setProductStatus(product.status)
    setProductRequiresRx(product.requiresPrescription)
    setProductDiscount(product.discountPercent ? String(product.discountPercent) : '')
    setProductCategoryId(product.categoryId)
    setEditingProductId(product.id)
    setShowAddModal(true)
  }

  const handleSaveProduct = (event: FormEvent) => {
    event.preventDefault()
    if (!productName.trim()) return

    const parsedPrice = Number(productPrice) || 0
    const parsedStock = Number(productStock) || 0
    const parsedDiscount = Number(productDiscount)
    const nextProduct: Product = {
      id: editingProductId ?? Date.now(),
      name: productName.trim(),
      categoryId: productCategoryId,
      price: parsedPrice,
      stock: parsedStock,
      status: productStatus,
      image: adminParacetamol,
      requiresPrescription: productRequiresRx,
      discountPercent: Number.isNaN(parsedDiscount) ? undefined : parsedDiscount,
    }

    setProducts((prev) => {
      if (editingProductId) {
        return prev.map((item) => (item.id === editingProductId ? nextProduct : item))
      }
      return [nextProduct, ...prev]
    })

    logAdminAction({
      action: editingProductId ? 'Edit product' : 'Add product',
      entity: 'Product',
      entityId: String(nextProduct.id),
      detail: `${nextProduct.name} · ${getCategoryLabel(nextProduct.categoryId)}`,
    })

    setShowAddModal(false)
  }

  const handleToggleProduct = (product: Product) => {
    const nextStatus = product.status === 'active' ? 'inactive' : 'active'
    setProducts((prev) =>
      prev.map((item) => (item.id === product.id ? { ...item, status: nextStatus } : item))
    )
    logAdminAction({
      action: 'Toggle product status',
      entity: 'Product',
      entityId: String(product.id),
      detail: `${product.name} set to ${nextStatus}`,
    })
  }

  const openCategoryModal = () => {
    setCategoryName('')
    setCategoryParentId(undefined)
    setEditingCategoryId(null)
    setShowCategoryModal(true)
  }

  const handleSaveCategory = () => {
    const trimmed = categoryName.trim()
    if (!trimmed) return
    if (editingCategoryId) {
      setCategories((prev) =>
        prev.map((category) =>
          category.id === editingCategoryId
            ? { ...category, name: trimmed, parentId: categoryParentId || undefined }
            : category
        )
      )
      logAdminAction({
        action: 'Edit category',
        entity: 'Category',
        entityId: editingCategoryId,
        detail: trimmed,
      })
    } else {
      const newCategory: Category = {
        id: `cat-${Date.now()}`,
        name: trimmed,
        parentId: categoryParentId || undefined,
      }
      setCategories((prev) => [...prev, newCategory])
      logAdminAction({
        action: 'Add category',
        entity: 'Category',
        entityId: newCategory.id,
        detail: trimmed,
      })
    }
    setCategoryName('')
    setCategoryParentId(undefined)
    setEditingCategoryId(null)
  }

  const handleEditCategory = (category: Category) => {
    setCategoryName(category.name)
    setCategoryParentId(category.parentId)
    setEditingCategoryId(category.id)
  }

  const handleDeleteCategory = (categoryId: string) => {
    setCategories((prev) => prev.filter((category) => category.id !== categoryId))
    logAdminAction({
      action: 'Delete category',
      entity: 'Category',
      entityId: categoryId,
    })
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/admin')
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory])

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory
    return matchesSearch && matchesCategory
  })

  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedProducts = filteredProducts.slice(startIndex, startIndex + PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))

  return (
    <div className="product-management">
      <div className="product-management__header">
        <div>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>
            Back
          </button>
          <h1>Product Management</h1>
        </div>
        <div className="product-management__actions">
          <button className="btn btn--outline btn--sm" type="button" onClick={openCategoryModal}>
            Manage Categories
          </button>
          <button className="btn btn--primary" onClick={openAddModal}>
          + Add New Product
          </button>
        </div>
      </div>

      <div className="product-management__filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          <option value="all">All Products</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{getCategoryLabel(category.id)}</option>
          ))}
        </select>
      </div>

      <div className="product-management__table">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Rx</th>
              <th>Discount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedProducts.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className="product-info">
                      <ImageWithFallback src={product.image} alt={product.name} />
                    <span>{product.name}</span>
                  </div>
                </td>
                <td>{getCategoryLabel(product.categoryId)}</td>
                <td>KSh {product.price.toLocaleString()}</td>
                <td>
                  <span className={`stock ${product.stock < 20 ? 'stock--low' : ''}`}>
                    {product.stock}
                  </span>
                </td>
                <td>{product.requiresPrescription ? 'Yes' : 'No'}</td>
                <td>{product.discountPercent ? `${product.discountPercent}%` : '—'}</td>
                <td>
                  <span className={`status status--${product.status}`}>
                    {product.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon" title="Edit" onClick={() => openEditModal(product)}>✏️</button>
                    <button
                      className="btn-icon"
                      title={product.status === 'active' ? 'Deactivate' : 'Activate'}
                      onClick={() => handleToggleProduct(product)}
                    >
                      {product.status === 'active' ? '⏸' : '▶️'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
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

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editingProductId ? 'Edit Product' : 'Add New Product'}</h2>
              <button className="modal__close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form className="modal__content" onSubmit={handleSaveProduct}>
              <div className="form-group">
                <label>Product Name</label>
                <input
                  type="text"
                  placeholder="Enter product name"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select value={productCategoryId} onChange={(e) => setProductCategoryId(e.target.value)}>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {getCategoryLabel(category.id)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Price (KSh)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Stock Quantity</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={productStock}
                    onChange={(e) => setProductStock(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={productStatus} onChange={(e) => setProductStatus(e.target.value as 'active' | 'inactive')}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Discount (%)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={productDiscount}
                    onChange={(e) => setProductDiscount(e.target.value)}
                  />
                </div>
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={productRequiresRx}
                      onChange={(e) => setProductRequiresRx(e.target.checked)}
                    />
                    Requires prescription
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={4} placeholder="Enter product description"></textarea>
              </div>
              <div className="form-group">
                <label>Product Image</label>
                <div className="file-upload">
                  <input type="file" accept="image/*" />
                  <p>Click to upload or drag and drop</p>
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary">
                  {editingProductId ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Manage Categories</h2>
              <button className="modal__close" onClick={() => setShowCategoryModal(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="category-list">
                {categories.map((category) => (
                  <div key={category.id} className="category-row">
                    <div>
                      <strong>{getCategoryLabel(category.id)}</strong>
                    </div>
                    <div className="category-actions">
                      <button className="btn-sm btn--outline" type="button" onClick={() => handleEditCategory(category)}>
                        Edit
                      </button>
                      <button className="btn-sm btn--danger" type="button" onClick={() => handleDeleteCategory(category.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label>{editingCategoryId ? 'Edit category name' : 'New category name'}</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Category name"
                />
              </div>
              <div className="form-group">
                <label>Parent category (optional)</label>
                <select
                  value={categoryParentId ?? ''}
                  onChange={(e) => setCategoryParentId(e.target.value || undefined)}
                >
                  <option value="">No parent</option>
                  {categories
                    .filter((category) => category.id !== editingCategoryId)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {getCategoryLabel(category.id)}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setShowCategoryModal(false)}>
                Close
              </button>
              <button className="btn btn--primary btn--sm" onClick={handleSaveCategory}>
                {editingCategoryId ? 'Save category' : 'Add category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductManagement
