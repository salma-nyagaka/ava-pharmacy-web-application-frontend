import './AdminShared.css'

function InventoryManagement() {
  const inventory = [
    { name: 'Vitamin C 1000mg', branch: 'Nairobi CBD', stock: 18, status: 'Healthy' },
    { name: 'Hand Sanitizer', branch: 'Westlands', stock: 6, status: 'Low' },
    { name: 'Insulin Pen', branch: 'Central Warehouse', stock: 0, status: 'Out' },
  ]

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Inventory Management</h1>
        <button className="btn btn--primary btn--sm">Sync POS</button>
      </div>

      <div className="admin-page__filters">
        <input type="text" placeholder="Search products" />
        <select>
          <option>All locations</option>
          <option>Nairobi CBD</option>
          <option>Westlands</option>
          <option>Central Warehouse</option>
        </select>
        <select>
          <option>All statuses</option>
          <option>Healthy</option>
          <option>Low</option>
          <option>Out</option>
        </select>
      </div>

      <div className="admin-page__table">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Location</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => (
              <tr key={item.name}>
                <td>{item.name}</td>
                <td>{item.branch}</td>
                <td>{item.stock}</td>
                <td>
                  <span className={`admin-status ${item.status === 'Healthy' ? 'admin-status--success' : item.status === 'Low' ? 'admin-status--warning' : 'admin-status--danger'}`}>
                    {item.status}
                  </span>
                </td>
                <td><button className="btn btn--outline btn--sm">Adjust</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default InventoryManagement
