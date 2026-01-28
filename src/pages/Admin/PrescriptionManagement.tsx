import './AdminShared.css'

function PrescriptionManagement() {
  const prescriptions = [
    { id: 'RX-2041', patient: 'Sarah M.', pharmacist: 'Grace N.', status: 'Approved' },
    { id: 'RX-2040', patient: 'Brian K.', pharmacist: 'John K.', status: 'Pending' },
    { id: 'RX-2038', patient: 'Aisha T.', pharmacist: 'Grace N.', status: 'Clarification' },
  ]

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Prescription Management</h1>
        <button className="btn btn--primary btn--sm">Assign pharmacist</button>
      </div>

      <div className="admin-page__filters">
        <input type="text" placeholder="Search prescriptions" />
        <select>
          <option>All statuses</option>
          <option>Approved</option>
          <option>Pending</option>
          <option>Clarification</option>
        </select>
      </div>

      <div className="admin-page__table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Patient</th>
              <th>Pharmacist</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {prescriptions.map((rx) => (
              <tr key={rx.id}>
                <td>{rx.id}</td>
                <td>{rx.patient}</td>
                <td>{rx.pharmacist}</td>
                <td>
                  <span className={`admin-status ${rx.status === 'Approved' ? 'admin-status--success' : rx.status === 'Pending' ? 'admin-status--warning' : 'admin-status--danger'}`}>
                    {rx.status}
                  </span>
                </td>
                <td><button className="btn btn--outline btn--sm">View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PrescriptionManagement
