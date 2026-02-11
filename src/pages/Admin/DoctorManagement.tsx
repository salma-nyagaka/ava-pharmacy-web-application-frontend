import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminShared.css'
import './DoctorManagement.css'
import { logAdminAction } from '../../data/adminAudit'
import {
  DoctorProfile,
  loadDoctorProfiles,
  loadDoctorRules,
  saveDoctorProfiles,
  saveDoctorRules,
} from '../../data/telemedicine'

function DoctorManagement() {
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState<DoctorProfile[]>(() => loadDoctorProfiles())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSpecialty, setSelectedSpecialty] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [selectedPendingId, setSelectedPendingId] = useState<string | null>(null)
  const [manageDoctor, setManageDoctor] = useState<DoctorProfile | null>(null)
  const [manageStatus, setManageStatus] = useState('Active')
  const [manageCommission, setManageCommission] = useState(15)
  const [manageFee, setManageFee] = useState(1500)
  const [manageAvailability, setManageAvailability] = useState('')
  const [manageStatusNote, setManageStatusNote] = useState('')
  const [defaultCommission, setDefaultCommission] = useState(() => loadDoctorRules().defaultCommission)
  const [defaultConsultFee, setDefaultConsultFee] = useState(() => loadDoctorRules().defaultConsultFee)
  const [followUpDays, setFollowUpDays] = useState(() => loadDoctorRules().followUpDays)

  useEffect(() => {
    saveDoctorProfiles(doctors)
  }, [doctors])

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/admin')
  }

  const specialties = useMemo(() => {
    return Array.from(new Set(doctors.map((doctor) => doctor.specialty)))
  }, [doctors])

  const filteredDoctors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return doctors.filter((doctor) => {
      const matchesSpecialty = selectedSpecialty === 'all' || doctor.specialty === selectedSpecialty
      const matchesStatus = selectedStatus === 'all' || doctor.status === selectedStatus
      const matchesType = selectedType === 'all' || doctor.type === selectedType
      if (!query) {
        return matchesSpecialty && matchesStatus && matchesType
      }
      const matchesQuery = [
        doctor.name,
        doctor.email,
        doctor.phone,
        doctor.specialty,
        doctor.type,
      ].some((value) => value.toLowerCase().includes(query))
      return matchesSpecialty && matchesStatus && matchesType && matchesQuery
    })
  }, [doctors, searchTerm, selectedSpecialty, selectedStatus, selectedType])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedSpecialty, selectedStatus, selectedType])

  const PAGE_SIZE = 6
  const totalPages = Math.max(1, Math.ceil(filteredDoctors.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedDoctors = filteredDoctors.slice(startIndex, startIndex + PAGE_SIZE)

  const pendingDoctors = doctors.filter((doctor) => doctor.status === 'Pending')
  const selectedPendingDoctor = pendingDoctors.find((doctor) => doctor.id === selectedPendingId) ?? pendingDoctors[0]

  const openVerifyModal = () => {
    if (pendingDoctors.length > 0) {
      setSelectedPendingId(pendingDoctors[0].id)
    } else {
      setSelectedPendingId(null)
    }
    setShowVerifyModal(true)
  }

  const handleVerify = () => {
    if (!selectedPendingDoctor) return
    setDoctors((prev) =>
      prev.map((doctor) =>
        doctor.id === selectedPendingDoctor.id
          ? { ...doctor, status: 'Active', verifiedAt: new Date().toISOString().slice(0, 10) }
          : doctor
      )
    )
    logAdminAction({
      action: 'Verify doctor',
      entity: 'Doctor',
      entityId: String(selectedPendingDoctor.id),
      detail: `Verified ${selectedPendingDoctor.name}`,
    })
    setShowVerifyModal(false)
  }

  const openManageModal = (doctor: (typeof doctors)[number]) => {
    setManageDoctor(doctor)
    setManageStatus(doctor.status)
    setManageCommission(doctor.commission)
    setManageFee(doctor.consultFee)
    setManageAvailability(doctor.availability)
    setManageStatusNote(doctor.statusNote ?? '')
  }

  const handleManageSave = () => {
    if (!manageDoctor) return
    const updated = doctors.map((doctor) =>
      doctor.id === manageDoctor.id
        ? {
          ...doctor,
          status: manageStatus as DoctorProfile['status'],
          commission: manageCommission,
          consultFee: manageFee,
          availability: manageAvailability,
          statusNote: manageStatus === 'Suspended' ? manageStatusNote : '',
        }
        : doctor
    )
    setDoctors(updated)
    saveDoctorProfiles(updated)
    logAdminAction({
      action: 'Update doctor profile',
      entity: 'Doctor',
      entityId: String(manageDoctor.id),
      detail: `Status ${manageStatus}, commission ${manageCommission}%, fee KSh ${manageFee}`,
    })
    setManageDoctor(null)
  }

  const handleSaveRules = () => {
    saveDoctorRules({
      defaultConsultFee,
      defaultCommission,
      followUpDays,
    })
    logAdminAction({
      action: 'Update consultation rules',
      entity: 'Doctors',
      detail: `Default fee KSh ${defaultConsultFee}, commission ${defaultCommission}%, follow-up ${followUpDays} days`,
    })
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>
            Back
          </button>
          <h1>Doctors & Specialists</h1>
        </div>
        <button className="btn btn--primary btn--sm" type="button" onClick={openVerifyModal}>
          Verify new doctor
        </button>
      </div>

      <div className="admin-page__filters">
        <input
          type="text"
          placeholder="Search doctors"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
          <option value="all">All types</option>
          <option value="Doctor">Doctors</option>
          <option value="Pediatrician">Pediatricians</option>
        </select>
        <select value={selectedSpecialty} onChange={(event) => setSelectedSpecialty(event.target.value)}>
          <option value="all">All specialties</option>
          {specialties.map((specialty) => (
            <option key={specialty} value={specialty}>{specialty}</option>
          ))}
        </select>
        <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Suspended">Suspended</option>
        </select>
      </div>

      <div className="doctor-rules">
        <div className="form-card">
          <h2 className="card__title">Consultation rules</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Default consultation fee (KSh)</label>
              <input
                type="number"
                min={0}
                value={defaultConsultFee}
                onChange={(event) => setDefaultConsultFee(Number(event.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Default commission (%)</label>
              <input
                type="number"
                min={0}
                value={defaultCommission}
                onChange={(event) => setDefaultCommission(Number(event.target.value))}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Follow-up window (days)</label>
            <input
              type="number"
              min={1}
              value={followUpDays}
              onChange={(event) => setFollowUpDays(Number(event.target.value))}
            />
          </div>
          <button className="btn btn--primary btn--sm" type="button" onClick={handleSaveRules}>
            Save rules
          </button>
        </div>
      </div>

      <div className="admin-page__table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Specialty</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pagedDoctors.map((doctor) => (
              <tr key={doctor.name}>
                <td>{doctor.name}</td>
                <td>{doctor.type}</td>
                <td>{doctor.specialty}</td>
                <td>
                  <span className={`admin-status ${doctor.status === 'Active' ? 'admin-status--success' : doctor.status === 'Pending' ? 'admin-status--warning' : 'admin-status--danger'}`}>
                    {doctor.status}
                  </span>
                </td>
                <td>
                  <button className="btn btn--outline btn--sm" type="button" onClick={() => openManageModal(doctor)}>
                    Manage
                  </button>
                </td>
              </tr>
            ))}
            {filteredDoctors.length === 0 && (
              <tr>
                <td colSpan={5} className="doctor-empty">No doctors match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredDoctors.length > 0 && (
        <div className="doctor-pagination">
          <button
            className="pagination__button"
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <div className="pagination__pages">
            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1
              return (
                <button
                  key={page}
                  className={`pagination__page ${page === currentPage ? 'pagination__page--active' : ''}`}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              )
            })}
          </div>
          <button
            className="pagination__button"
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {showVerifyModal && (
        <div className="modal-overlay" onClick={() => setShowVerifyModal(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Verify doctor</h2>
              <button className="modal__close" onClick={() => setShowVerifyModal(false)}>×</button>
            </div>
            <div className="modal__content">
              {pendingDoctors.length === 0 ? (
                <p className="doctor-empty-message">No pending doctors to verify.</p>
              ) : (
                <>
                  <div className="form-group">
                    <label>Select pending doctor</label>
                    <select
                      value={selectedPendingDoctor?.id}
                      onChange={(event) => setSelectedPendingId(event.target.value)}
                    >
                      {pendingDoctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                      ))}
                    </select>
                  </div>
                  {selectedPendingDoctor && (
                    <div className="doctor-modal__details">
                      <div className="detail-row">
                        <span className="detail-label">Type</span>
                        <span className="detail-value">{selectedPendingDoctor.type}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Specialty</span>
                        <span className="detail-value">{selectedPendingDoctor.specialty}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">License</span>
                        <span className="detail-value">{selectedPendingDoctor.license}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Facility</span>
                        <span className="detail-value">{selectedPendingDoctor.facility}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Submitted</span>
                        <span className="detail-value">{selectedPendingDoctor.submitted}</span>
                      </div>
                      <div className="doctor-documents">
                        <span className="detail-label">Documents</span>
                        <div className="doctor-documents__list">
                          {selectedPendingDoctor.documents.map((doc) => (
                            <div key={doc.name} className="doctor-documents__item">
                              <span>{doc.name}</span>
                              <span className={`doc-status doc-status--${doc.status.toLowerCase()}`}>
                                {doc.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setShowVerifyModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn--primary btn--sm"
                onClick={handleVerify}
                disabled={!selectedPendingDoctor}
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {manageDoctor && (
        <div className="modal-overlay" onClick={() => setManageDoctor(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Manage doctor</h2>
              <button className="modal__close" onClick={() => setManageDoctor(null)}>×</button>
            </div>
            <div className="modal__content">
              <div className="doctor-modal__header">
                <p className="doctor-modal__name">{manageDoctor.name}</p>
                <p className="doctor-modal__subtitle">{manageDoctor.type} • {manageDoctor.specialty}</p>
              </div>
              <div className="doctor-modal__details">
                <div className="detail-row">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{manageDoctor.email}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">{manageDoctor.phone}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">License</span>
                  <span className="detail-value">{manageDoctor.license}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Availability</span>
                  <span className="detail-value">{manageDoctor.availability}</span>
                </div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={manageStatus} onChange={(event) => setManageStatus(event.target.value)}>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
              {manageStatus === 'Suspended' && (
                <div className="form-group">
                  <label>Suspension reason</label>
                  <textarea
                    rows={3}
                    placeholder="Add reason for suspension"
                    value={manageStatusNote}
                    onChange={(event) => setManageStatusNote(event.target.value)}
                  />
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>Commission (%)</label>
                  <input
                    type="number"
                    min={0}
                    value={manageCommission}
                    onChange={(event) => setManageCommission(Number(event.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>Consultation fee (KSh)</label>
                  <input
                    type="number"
                    min={0}
                    value={manageFee}
                    onChange={(event) => setManageFee(Number(event.target.value))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Availability schedule</label>
                <input
                  type="text"
                  value={manageAvailability}
                  onChange={(event) => setManageAvailability(event.target.value)}
                />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setManageDoctor(null)}>
                Cancel
              </button>
              <button className="btn btn--primary btn--sm" onClick={handleManageSave}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DoctorManagement
