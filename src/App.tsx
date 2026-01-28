import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import HomePage from './pages/HomePage/HomePage'
import ProductListingPage from './pages/ProductListing/ProductListingPage'
import ProductDetailPage from './pages/ProductDetail/ProductDetailPage'
import CartPage from './pages/Cart/CartPage'
import CheckoutPage from './pages/Checkout/CheckoutPage'
import AccountPage from './pages/Account/AccountPage'
import OrderHistoryPage from './pages/OrderHistory/OrderHistoryPage'
import PrescriptionUploadPage from './pages/PrescriptionUpload/PrescriptionUploadPage'
import ConsultationPage from './pages/Consultation/ConsultationPage'
import AdminDashboard from './pages/Admin/AdminDashboard'
import ProductManagement from './pages/Admin/ProductManagement'
import UserManagement from './pages/Admin/UserManagement'
import OrderManagement from './pages/Admin/OrderManagement'
import Reports from './pages/Admin/Reports'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductListingPage />} />
          <Route path="category/:category" element={<ProductListingPage />} />
          <Route path="product/:id" element={<ProductDetailPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="account/orders" element={<OrderHistoryPage />} />
          <Route path="prescriptions" element={<PrescriptionUploadPage />} />
          <Route path="consultation" element={<ConsultationPage />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/products" element={<ProductManagement />} />
          <Route path="admin/users" element={<UserManagement />} />
          <Route path="admin/orders" element={<OrderManagement />} />
          <Route path="admin/reports" element={<Reports />} />
          <Route path="*" element={<div style={{padding: '4rem 0', textAlign: 'center'}}>
            <h1>Page Coming Soon</h1>
            <p>This page is under construction</p>
          </div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
