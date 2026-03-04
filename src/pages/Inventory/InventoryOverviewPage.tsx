import PageHeader from '../../components/PageHeader/PageHeader'

function InventoryOverviewPage() {
  const items = [
    { name: 'Vitamin C 1000mg', branch: 'Nairobi CBD', stock: 18, status: 'In stock' },
    { name: 'Baby Diapers Pack', branch: 'Westlands', stock: 6, status: 'Low stock' },
    { name: 'Insulin Pen', branch: 'Central Warehouse', stock: 0, status: 'Out of stock' },
  ]

  return (
    <div>
      <PageHeader
        title="Inventory overview"
        subtitle="Monitor branch and warehouse stock levels in real time."
        badge="Inventory"
      />
      <section className="page">
        <div className="container">
          <table className="table">
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
              {items.map((item) => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>{item.branch}</td>
                  <td>{item.stock}</td>
                  <td>
                    <span className={`status-pill ${item.status === 'In stock' ? 'status-pill--success' : item.status === 'Low stock' ? 'status-pill--warning' : 'status-pill--danger'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td><button className="btn btn--outline btn--sm">Adjust</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default InventoryOverviewPage
