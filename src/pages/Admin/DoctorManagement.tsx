import './AdminShared.css'

function DoctorManagement() {
  const doctors = [
    { name: 'Dr. Sarah Johnson', specialty: 'General', status: 'Active' },
    { name: 'Dr. Michael Chen', specialty: 'Cardiology', status: 'Pending' },
    { name: 'Dr. Mercy Otieno', specialty: 'Pediatrics', status: 'Suspended' },
  ]

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Doctors & Specialists</h1>
        <button className="btn btn--primary btn--sm">Verify new doctor</button>
      </div>

      <div className="admin-page__filters">
        <input type="text" placeholder="Search doctors" />
        <select>
          <option>All specialties</option>
          <option>General</option>
          <option>Cardiology</option>
          <option>Pediatrics</option>
        </select>
        <select>
          <option>All statuses</option>
          <option>Active</option>
          <option>Pending</option>
          <option>Suspended</option>
        </select>
      </div>

      <div className="admin-page__table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Specialty</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((doctor) => (
              <tr key={doctor.name}>
                <td>{doctor.name}</td>
                <td>{doctor.specialty}</td>
                <td>
                  <span className={`admin-status ${doctor.status === 'Active' ? 'admin-status--success' : doctor.status === 'Pending' ? 'admin-status--warning' : 'admin-status--danger'}`}>
                    {doctor.status}
                  </span>
                </td>
                <td><button className="btn btn--outline btn--sm">Manage</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DoctorManagement
