import StoresManagement from './StoresManagement'
import '../../styles/admin/ProductStockRecords.css'
import ProductStockRecords from './ProductStockRecords'
import { useSearchParams, Navigate, useLocation } from 'react-router-dom'
import ProductManagement from './ProductManagement'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/admin/ProductsStockWorkspace.css'

export function LegacyProductsStockRedirect({ stock = false }: { stock?: boolean }) {
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  if (stock) {
    query.set('view', 'stock')
    if (query.has('product')) query.set('edit_stock', '1')
  }
  return <Navigate to={`/admin/products-stock?${query.toString()}`} replace />
}

export default function ProductsStockWorkspace() {
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'stores' ? 'stores' : ['stock', 'history'].includes(params.get('view') || '') ? 'stock' : 'catalog'
  const switchView = (next: string) => {
    const query = new URLSearchParams(params)
    query.delete('edit_stock')
    query.delete('new_stock')
    if (next === 'catalog') {
      query.delete('view')
      query.delete('product')
    } else {
      if (next === 'stores') query.delete('product')
      query.set('view', next)
    }
    setParams(query)
  }
  return <div className="category-management ps-workspace">
    <header className="category-management__header"><div><h1>Products &amp; Stock</h1><p className="cm-title-sub">Create products in Items, then manage their stock across stores and batches. See who added stock and review changes on the same page.</p></div></header>
    <nav className="ps-tabs" aria-label="Products and stock views">{[['catalog', 'Items'], ['stock', 'Manage stock'], ['stores', 'Stores']].map(([key, label]) => <button key={key} aria-pressed={view === key} onClick={() => switchView(key)}>{label}</button>)}</nav>
    <div className="ps-content">{view === 'catalog' ? <ProductManagement embedded /> : view === 'stores' ? <StoresManagement /> : <ProductStockRecords productId={params.get('product') ? Number(params.get('product')) : undefined} />}</div>
  </div>
}
