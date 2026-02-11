import { useEffect, useState } from 'react'
import './PrescriptionUploadPage.css'
import {
  PrescriptionRecord,
} from '../../data/prescriptions'
import { cartService } from '../../services/cartService'
import { prescriptionService } from '../../services/prescriptionService'

function PrescriptionUploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [patientName, setPatientName] = useState('Ava Customer')
  const [doctorName, setDoctorName] = useState('')
  const [uploadNotes, setUploadNotes] = useState('')
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([])
  const [activePrescription, setActivePrescription] = useState<PrescriptionRecord | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [cartMessage, setCartMessage] = useState('')

  useEffect(() => {
    void prescriptionService.list().then((response) => setPrescriptions(response.data))
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles((prev) => {
        const incoming = Array.from(e.target.files ?? [])
        const merged = [...prev]
        incoming.forEach((file) => {
          const exists = merged.some((item) => item.name === file.name && item.size === file.size)
          if (!exists) {
            merged.push(file)
          }
        })
        return merged
      })
      setUploadError('')
    }
  }

  const removeSelectedFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleUploadPrescriptions = () => {
    if (uploadedFiles.length === 0) {
      setUploadError('Please select at least one prescription file.')
      return
    }
    void prescriptionService.upload({
      patient: patientName.trim(),
      doctor: doctorName.trim(),
      notes: uploadNotes.trim(),
      files: uploadedFiles.map((file) => file.name),
    }).then((response) => {
      setPrescriptions(response.data)
      setUploadedFiles([])
      setDoctorName('')
      setUploadNotes('')
      setUploadError('')
    })
  }

  const getStatusClass = (status: string) => {
    if (status === 'Approved') return 'prescription-status--verified'
    if (status === 'Pending') return 'prescription-status--pending-review'
    return 'prescription-status--clarification'
  }

  const addPrescriptionItemsToCart = (prescription: PrescriptionRecord) => {
    const validItems = prescription.items.filter((item) => item.qty > 0 && item.name !== 'Pending pharmacist review')
    if (prescription.status !== 'Approved' || validItems.length === 0) {
      setCartMessage('Only approved prescriptions with verified items can be added to cart.')
      return
    }

    validItems.forEach((item, index) => {
      void cartService.add(
        {
          id: Number(`${prescription.id.replace('RX-', '')}${index + 1}`),
          name: item.name,
          brand: 'Prescription item',
          price: 350,
          prescriptionId: prescription.id,
          stockSource: 'warehouse',
        },
        item.qty
      )
    })
    setCartMessage(`Added ${validItems.length} prescription item(s) from ${prescription.id} to cart.`)
  }

  return (
    <div className="prescription-upload">
      <div className="container">
        <h1>Prescription Management</h1>

        {/* Upload Section */}
        <div className="upload-section">
          <h2>Upload New Prescription</h2>
          <div className="upload-area">
            <div className="upload-icon">📄</div>
            <h3>Drag and drop or click to upload</h3>
            <p>Supported formats: PDF, JPG, PNG (Max 5MB)</p>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              onChange={handleFileSelect}
              className="file-input"
            />
            <button className="btn btn--primary">Choose Files</button>
          </div>

          <div className="upload-meta-grid">
            <div className="upload-meta-field">
              <label htmlFor="rx-patient">Patient name</label>
              <input
                id="rx-patient"
                type="text"
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
              />
            </div>
            <div className="upload-meta-field">
              <label htmlFor="rx-doctor">Doctor name (optional)</label>
              <input
                id="rx-doctor"
                type="text"
                placeholder="Dr. Jane Doe"
                value={doctorName}
                onChange={(event) => setDoctorName(event.target.value)}
              />
            </div>
          </div>

          <div className="upload-meta-field">
            <label htmlFor="rx-notes">Notes (optional)</label>
            <input
              id="rx-notes"
              type="text"
              placeholder="Any details to help pharmacist review"
              value={uploadNotes}
              onChange={(event) => setUploadNotes(event.target.value)}
            />
          </div>

          {uploadedFiles.length > 0 && (
            <div className="uploaded-files">
              <h4>Selected Files:</h4>
              {uploadedFiles.map((file, index) => (
                <div key={index} className="file-item">
                  <span>{file.name}</span>
                  <button onClick={() => removeSelectedFile(index)}>
                    Remove
                  </button>
                </div>
              ))}
              <button className="btn btn--primary btn--lg" onClick={handleUploadPrescriptions}>
                Upload Prescriptions
              </button>
            </div>
          )}
          {uploadError && <p className="upload-error">{uploadError}</p>}

          <div className="upload-info">
            <h4>Important Information:</h4>
            <ul>
              <li>Prescriptions must be clear and readable</li>
              <li>Include doctor's name and signature</li>
              <li>Valid prescriptions are typically reviewed within 24 hours</li>
              <li>You'll be notified once verification is complete</li>
            </ul>
          </div>
        </div>

        {/* Previous Prescriptions */}
        <div className="prescriptions-list">
          <h2>Your Prescriptions</h2>
          <div className="prescription-cards">
            {prescriptions.map((prescription) => (
              <div key={prescription.id} className="prescription-card">
                <div className="prescription-card__icon">📋</div>
                <div className="prescription-card__content">
                  <h3>{prescription.id}</h3>
                  <p className="prescription-card__doctor">Prescribed by: {prescription.doctor}</p>
                  <p className="prescription-card__date">Uploaded: {prescription.submitted}</p>
                  <p className="prescription-card__date">Dispatch: {prescription.dispatchStatus}</p>
                  <span className={`prescription-status ${getStatusClass(prescription.status)}`}>
                    {prescription.status}
                  </span>
                </div>
                <div className="prescription-card__actions">
                  <button className="btn btn--outline btn--sm" onClick={() => setActivePrescription(prescription)}>
                    View
                  </button>
                  {prescription.status === 'Approved' && (
                    <button className="btn btn--primary btn--sm" onClick={() => addPrescriptionItemsToCart(prescription)}>
                      Add meds to cart
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {cartMessage && <p className="upload-error">{cartMessage}</p>}
        </div>
      </div>

      {activePrescription && (
        <div className="modal-overlay" onClick={() => setActivePrescription(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>{activePrescription.id}</h2>
              <button className="modal__close" onClick={() => setActivePrescription(null)}>×</button>
            </div>
            <div className="modal__content">
              <p className="prescription-card__date"><strong>Patient:</strong> {activePrescription.patient}</p>
              <p className="prescription-card__date"><strong>Doctor:</strong> {activePrescription.doctor}</p>
              <p className="prescription-card__date"><strong>Status:</strong> {activePrescription.status}</p>
              <p className="prescription-card__date"><strong>Dispatch:</strong> {activePrescription.dispatchStatus}</p>
              <p className="prescription-card__date"><strong>Files:</strong> {activePrescription.files.join(', ')}</p>
              <p className="prescription-card__date"><strong>Notes:</strong> {activePrescription.notes}</p>
            </div>
            <div className="modal__footer">
              {activePrescription.status === 'Approved' && (
                <button className="btn btn--primary btn--sm" onClick={() => addPrescriptionItemsToCart(activePrescription)}>
                  Add meds to cart
                </button>
              )}
              <button className="btn btn--outline btn--sm" onClick={() => setActivePrescription(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PrescriptionUploadPage
