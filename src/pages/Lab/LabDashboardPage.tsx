import PageHeader from '../../components/PageHeader/PageHeader'

function LabDashboardPage() {
  const requests = [
    { id: 'LAB-1001', patient: 'Sarah M.', test: 'CBC', status: 'Processing' },
    { id: 'LAB-1002', patient: 'Brian K.', test: 'HbA1c', status: 'Awaiting sample' },
    { id: 'LAB-1003', patient: 'Aisha T.', test: 'Malaria RDT', status: 'Completed' },
  ]

  return (
    <div>
      <PageHeader
        title="Lab technician dashboard"
        subtitle="Manage lab requests, upload results, and update status."
        badge="Lab Operations"
      />
      <section className="page">
        <div className="container">
          <div className="portal-stats">
            <div className="portal-stat">
              <p className="portal-stat__label">Pending samples</p>
              <p className="portal-stat__value">6</p>
            </div>
            <div className="portal-stat">
              <p className="portal-stat__label">Processing</p>
              <p className="portal-stat__value">4</p>
            </div>
            <div className="portal-stat">
              <p className="portal-stat__label">Completed today</p>
              <p className="portal-stat__value">9</p>
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Patient</th>
                <th>Test</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td>{req.id}</td>
                  <td>{req.patient}</td>
                  <td>{req.test}</td>
                  <td>
                    <span className={`status-pill ${req.status === 'Completed' ? 'status-pill--success' : req.status === 'Processing' ? 'status-pill--info' : 'status-pill--warning'}`}>
                      {req.status}
                    </span>
                  </td>
                  <td><button className="btn btn--outline btn--sm">Upload results</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default LabDashboardPage
