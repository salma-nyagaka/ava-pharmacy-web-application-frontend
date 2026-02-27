import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import Layout from './components/Layout/Layout'
import HomePage from './pages/HomePage/HomePage'
import ProductListingPage from './pages/ProductListing/ProductListingPage'
import ProductDetailPage from './pages/ProductDetail/ProductDetailPage'
import CartPage from './pages/Cart/CartPage'
import CheckoutPage from './pages/Checkout/CheckoutPage'
import AccountPage from './pages/Account/AccountPage'
import AccountAddressesPage from './pages/Account/AccountAddressesPage'
import AccountPaymentPage from './pages/Account/AccountPaymentPage'
import AccountSettingsPage from './pages/Account/AccountSettingsPage'
import AccountEditPage from './pages/Account/AccountEditPage'
import OrderDetailPage from './pages/Account/OrderDetailPage'
import OrderHistoryPage from './pages/OrderHistory/OrderHistoryPage'
import PrescriptionUploadPage from './pages/PrescriptionUpload/PrescriptionUploadPage'
import DoctorConsultation from './pages/Consultation/DoctorConsultation'
import PediatricianConsultation from './pages/Consultation/PediatricianConsultation'
import AdminDashboard from './pages/Admin/AdminDashboard'
import ProductManagement from './pages/Admin/ProductManagement'
import UserManagement from './pages/Admin/UserManagement'
import UserDetailsPage from './pages/Admin/UserDetailsPage'
import UserCreatePage from './pages/Admin/UserCreatePage'
import OrderManagement from './pages/Admin/OrderManagement'
import OrderDetailsPage from './pages/Admin/OrderDetailsPage'
import Reports from './pages/Admin/Reports'
import DealsManagement from './pages/Admin/DealsManagement'
import PayoutManagement from './pages/Admin/PayoutManagement'
import LabTestManagement from './pages/Admin/LabTestManagement'
import LabRequestManagement from './pages/Admin/LabRequestManagement'
import LabPartnerManagement from './pages/Admin/LabPartnerManagement'
import LabTechPortal from './pages/LabTech/LabTechPortal'
import SupportManagement from './pages/Admin/SupportManagement'
import LoginPage from './pages/Auth/LoginPage'
import RegisterPage from './pages/Auth/RegisterPage'
import OrderTrackingPage from './pages/OrderTracking/OrderTrackingPage'
import OrderConfirmationPage from './pages/OrderConfirmation/OrderConfirmationPage'
import WishlistPage from './pages/Wishlist/WishlistPage'
import ReturnsPage from './pages/Returns/ReturnsPage'
import HelpPage from './pages/Help/HelpPage'
import OffersPage from './pages/Offers/OffersPage'
import StoreLocatorPage from './pages/StoreLocator/StoreLocatorPage'
import AboutPage from './pages/About/AboutPage'
import ContactPage from './pages/Contact/ContactPage'
import CareersPage from './pages/Careers/CareersPage'
import BlogPage from './pages/Blog/BlogPage'
import PrivacyPage from './pages/Legal/PrivacyPage'
import TermsPage from './pages/Legal/TermsPage'
import CookiesPage from './pages/Legal/CookiesPage'
import PrescriptionHistoryPage from './pages/PrescriptionHistory/PrescriptionHistoryPage'
import DoctorDashboardPage from './pages/Doctor/DoctorDashboardPage'
import PediatricianDashboardPage from './pages/Pediatrician/PediatricianDashboardPage'
import PharmacistDashboardPage from './pages/Pharmacist/PharmacistDashboardPage'
import PrescriptionReviewPage from './pages/Pharmacist/PrescriptionReviewPage'
import LabServicesPage from './pages/Lab/LabServicesPage'
import LabDashboardPage from './pages/Lab/LabDashboardPage'
import InventoryOverviewPage from './pages/Inventory/InventoryOverviewPage'
import InventoryManagement from './pages/Admin/InventoryManagement'
import PrescriptionManagement from './pages/Admin/PrescriptionManagement'
import DoctorManagement from './pages/Admin/DoctorManagement'
import Settings from './pages/Admin/Settings'
import ProfessionalRegisterPage from './pages/Professional/ProfessionalRegisterPage'
import BrandsPage from './pages/Brands/BrandsPage'
import ConditionsPage from './pages/Conditions/ConditionsPage'
import HealthServicesPage from './pages/HealthServices/HealthServicesPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductListingPage />} />
          <Route path="category/:category" element={<ProductListingPage />} />
          <Route path="product/:id" element={<ProductDetailPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="account" element={<AccountPage />} />
          <Route path="account/orders" element={<OrderHistoryPage />} />
          <Route path="account/orders/:id" element={<OrderDetailPage />} />
          <Route path="account/addresses" element={<AccountAddressesPage />} />
          <Route path="account/payment" element={<AccountPaymentPage />} />
          <Route path="account/settings" element={<AccountSettingsPage />} />
          <Route path="account/edit" element={<AccountEditPage />} />
          <Route path="account/prescriptions" element={<PrescriptionHistoryPage />} />
          <Route path="orders" element={<OrderHistoryPage />} />
          <Route path="prescriptions" element={<ProtectedRoute><PrescriptionUploadPage /></ProtectedRoute>} />
          <Route path="prescriptions/history" element={<PrescriptionHistoryPage />} />
          <Route path="consultation" element={<Navigate to="/doctor-consultation" replace />} />
          <Route path="doctor" element={<Navigate to="/doctor-consultation" replace />} />
          <Route path="doctor-consultation" element={<ProtectedRoute><DoctorConsultation /></ProtectedRoute>} />
          <Route path="pediatrician" element={<Navigate to="/pediatric-consultation" replace />} />
          <Route path="paedetrician" element={<Navigate to="/pediatric-consultation" replace />} />
          <Route path="pediatric-consultation" element={<ProtectedRoute><PediatricianConsultation /></ProtectedRoute>} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="order-confirmation" element={<OrderConfirmationPage />} />
          <Route path="track-order" element={<OrderTrackingPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="returns" element={<ReturnsPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="offers" element={<OffersPage />} />
          <Route path="store-locator" element={<StoreLocatorPage />} />
          <Route path="brands" element={<BrandsPage />} />
          <Route path="conditions" element={<ConditionsPage />} />
          <Route path="health-services" element={<HealthServicesPage />} />
          <Route path="brands/:brand" element={<BrandsPage />} />
          <Route path="conditions/:condition" element={<ConditionsPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="careers" element={<CareersPage />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="cookies" element={<CookiesPage />} />
          <Route path="professional/register" element={<ProfessionalRegisterPage />} />
          <Route path="doctor/register" element={<ProfessionalRegisterPage />} />
          <Route path="doctor/dashboard" element={<DoctorDashboardPage />} />
          <Route path="pediatrician/register" element={<ProfessionalRegisterPage />} />
          <Route path="pediatrician/dashboard" element={<PediatricianDashboardPage />} />
          <Route path="pharmacist" element={<PharmacistDashboardPage />} />
          <Route path="pharmacist/review/:id" element={<PrescriptionReviewPage />} />
          <Route path="lab-tests" element={<ProtectedRoute><LabServicesPage /></ProtectedRoute>} />
          <Route path="laboratory" element={<ProtectedRoute><LabServicesPage /></ProtectedRoute>} />
          <Route path="labaratory" element={<ProtectedRoute><LabServicesPage /></ProtectedRoute>} />
          <Route path="lab/dashboard" element={<LabDashboardPage />} />
          <Route path="laboratory/dashboard" element={<LabDashboardPage />} />
          <Route path="labaratory/dashboard" element={<LabDashboardPage />} />
          <Route path="inventory" element={<InventoryOverviewPage />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/products" element={<ProductManagement />} />
          <Route path="admin/users" element={<UserManagement />} />
          <Route path="admin/users/new" element={<UserCreatePage />} />
          <Route path="admin/users/:id" element={<UserDetailsPage />} />
          <Route path="admin/orders" element={<OrderManagement />} />
          <Route path="admin/orders/:id" element={<OrderDetailsPage />} />
          <Route path="admin/inventory" element={<InventoryManagement />} />
          <Route path="admin/prescriptions" element={<PrescriptionManagement />} />
          <Route path="admin/doctors" element={<DoctorManagement />} />
          <Route path="admin/reports" element={<Reports />} />
          <Route path="admin/deals" element={<DealsManagement />} />
          <Route path="admin/payouts" element={<PayoutManagement />} />
          <Route path="admin/lab-tests" element={<LabTestManagement />} />
          <Route path="admin/lab-requests" element={<LabRequestManagement />} />
          <Route path="admin/lab-partners" element={<LabPartnerManagement />} />
          <Route path="lab/tech" element={<LabTechPortal />} />
          <Route path="admin/support" element={<SupportManagement />} />
          <Route path="admin/settings" element={<Settings />} />
          <Route path="*" element={<div style={{padding: '4rem 0', textAlign: 'center'}}>
            <h1>Page Coming Soon</h1>
            <p>This page is under construction</p>
          </div>} />
        </Route>
      </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
