import { Link } from 'react-router-dom'
import './AccountPage.css'

function AccountPage() {
  const user = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+254 700 000 000',
    avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=E81750&color=fff&size=128',
  }

  const recentOrders = [
    { id: 'ORD-001', date: 'Jan 20, 2026', total: 7000, status: 'Delivered' },
    { id: 'ORD-002', date: 'Jan 15, 2026', total: 3200, status: 'In Transit' },
    { id: 'ORD-003', date: 'Jan 10, 2026', total: 1500, status: 'Processing' },
  ]

  const menuItems = [
    { icon: '📦', title: 'Orders', description: 'Track and manage your orders', link: '/account/orders' },
    { icon: '📍', title: 'Addresses', description: 'Manage delivery addresses', link: '/account/addresses' },
    { icon: '💳', title: 'Payment Methods', description: 'Saved payment options', link: '/account/payment' },
    { icon: '💊', title: 'Prescriptions', description: 'Upload and manage prescriptions', link: '/prescriptions' },
    { icon: '💬', title: 'Consultations', description: 'Chat with a doctor', link: '/consultation' },
    { icon: '⚙️', title: 'Settings', description: 'Account preferences', link: '/account/settings' },
  ]

  const formatPrice = (price: number) => `KSh ${price.toLocaleString()}`

  return (
    <div className="account-page">
      <div className="container">
        <h1 className="account-page__title">My Account</h1>

        <div className="account-page__layout">
          {/* Profile Card */}
          <div className="profile-card">
            <img src={user.avatar} alt={user.name} className="profile-card__avatar" />
            <h2 className="profile-card__name">{user.name}</h2>
            <p className="profile-card__email">{user.email}</p>
            <p className="profile-card__phone">{user.phone}</p>
            <Link to="/account/edit" className="btn btn--outline btn--sm">
              Edit Profile
            </Link>
          </div>

          {/* Main Content */}
          <div className="account-main">
            {/* Quick Actions */}
            <div className="quick-actions">
              {menuItems.map((item) => (
                <Link key={item.title} to={item.link} className="quick-action">
                  <span className="quick-action__icon">{item.icon}</span>
                  <div>
                    <h3 className="quick-action__title">{item.title}</h3>
                    <p className="quick-action__description">{item.description}</p>
                  </div>
                  <svg className="quick-action__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              ))}
            </div>

            {/* Recent Orders */}
            <div className="recent-orders-section">
              <div className="section-header">
                <h2>Recent Orders</h2>
                <Link to="/account/orders" className="view-all-link">View All</Link>
              </div>
              <div className="recent-orders">
                {recentOrders.map((order) => (
                  <div key={order.id} className="order-card">
                    <div className="order-card__header">
                      <span className="order-card__id">{order.id}</span>
                      <span className={`order-card__status order-card__status--${order.status.toLowerCase().replace(' ', '-')}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="order-card__date">{order.date}</p>
                    <div className="order-card__footer">
                      <span className="order-card__total">{formatPrice(order.total)}</span>
                      <Link to={`/account/orders/${order.id}`} className="order-card__link">
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountPage
