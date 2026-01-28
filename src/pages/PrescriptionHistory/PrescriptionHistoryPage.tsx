import PageHeader from '../../components/PageHeader/PageHeader'

function PrescriptionHistoryPage() {
  const prescriptions = [
    {
      id: 'RX-2041',
      doctor: 'Dr. Sarah Johnson',
      date: 'Jan 20, 2026',
      status: 'Approved',
    },
    {
      id: 'RX-2038',
      doctor: 'Dr. Michael Chen',
      date: 'Jan 14, 2026',
      status: 'Pending',
    },
    {
      id: 'RX-2031',
      doctor: 'Dr. Emily Davis',
      date: 'Dec 29, 2025',
      status: 'Clarification required',
    },
  ]

  return (
    <div>
      <PageHeader
        title="Prescription history"
        subtitle="Track approvals, re-uploads, and pharmacist feedback for your prescriptions."
        badge="Prescriptions"
      />
      <section className="page">
        <div className="container">
          <table className="table">
            <thead>
              <tr>
                <th>Prescription ID</th>
                <th>Doctor</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((rx) => (
                <tr key={rx.id}>
                  <td>{rx.id}</td>
                  <td>{rx.doctor}</td>
                  <td>{rx.date}</td>
                  <td>
                    <span className={
                      `status-pill ${rx.status === 'Approved' ? 'status-pill--success' : rx.status === 'Pending' ? 'status-pill--warning' : 'status-pill--danger'}`
                    }>
                      {rx.status}
                    </span>
                  </td>
                  <td><button className="btn btn--outline btn--sm">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default PrescriptionHistoryPage
