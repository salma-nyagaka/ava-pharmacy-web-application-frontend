import { useState } from 'react'
import './ProductManagement.css'

interface Product {
  id: number
  name: string
  category: string
  price: number
  stock: number
  status: 'active' | 'inactive'
  image: string
}

function ProductManagement() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const products: Product[] = [
    { id: 1, name: 'Paracetamol 500mg', category: 'Pain Relief', price: 250, stock: 150, status: 'active', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=100' },
    { id: 2, name: 'Ibuprofen 400mg', category: 'Pain Relief', price: 350, stock: 80, status: 'active', image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=100' },
    { id: 3, name: 'Vitamin C 1000mg', category: 'Supplements', price: 800, stock: 200, status: 'active', image: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=100' },
    { id: 4, name: 'Amoxicillin 250mg', category: 'Antibiotics', price: 1200, stock: 5, status: 'active', image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=100' },
    { id: 5, name: 'Cetrizine 10mg', category: 'Allergy', price: 450, stock: 120, status: 'active', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=100' },
    { id: 6, name: 'Omeprazole 20mg', category: 'Digestive', price: 600, stock: 90, status: 'active', image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=100' },
    { id: 7, name: 'Multivitamin Daily', category: 'Supplements', price: 1500, stock: 0, status: 'inactive', image: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=100' },
    { id: 8, name: 'Aspirin 75mg', category: 'Pain Relief', price: 300, stock: 180, status: 'active', image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=100' },
  ]

  return (
    <div className="product-management">
      <div className="product-management__header">
        <h1>Product Management</h1>
        <button className="btn btn--primary" onClick={() => setShowAddModal(true)}>
          + Add New Product
        </button>
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
          <option value="all">All Categories</option>
          <option value="pain-relief">Pain Relief</option>
          <option value="supplements">Supplements</option>
          <option value="antibiotics">Antibiotics</option>
          <option value="allergy">Allergy</option>
          <option value="digestive">Digestive</option>
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
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className="product-info">
                    <img src={product.image} alt={product.name} />
                    <span>{product.name}</span>
                  </div>
                </td>
                <td>{product.category}</td>
                <td>KSh {product.price.toLocaleString()}</td>
                <td>
                  <span className={`stock ${product.stock < 20 ? 'stock--low' : ''}`}>
                    {product.stock}
                  </span>
                </td>
                <td>
                  <span className={`status status--${product.status}`}>
                    {product.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon" title="Edit">✏️</button>
                    <button className="btn-icon" title="Delete">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Add New Product</h2>
              <button className="modal__close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form className="modal__content">
              <div className="form-group">
                <label>Product Name</label>
                <input type="text" placeholder="Enter product name" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select>
                    <option>Pain Relief</option>
                    <option>Supplements</option>
                    <option>Antibiotics</option>
                    <option>Allergy</option>
                    <option>Digestive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Price (KSh)</label>
                  <input type="number" placeholder="0" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Stock Quantity</label>
                  <input type="number" placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
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
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductManagement
