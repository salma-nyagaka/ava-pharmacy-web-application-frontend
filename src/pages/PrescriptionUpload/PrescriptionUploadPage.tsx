import { useState } from 'react'
import './PrescriptionUploadPage.css'

function PrescriptionUploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const prescriptions = [
    {
      id: 1,
      name: 'Prescription_Jan_2026.pdf',
      uploadDate: 'Jan 20, 2026',
      status: 'Verified',
      doctor: 'Dr. Sarah Johnson',
    },
    {
      id: 2,
      name: 'Prescription_Dec_2025.pdf',
      uploadDate: 'Dec 15, 2025',
      status: 'Pending Review',
      doctor: 'Dr. Michael Chen',
    },
  ]

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(Array.from(e.target.files))
    }
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

          {uploadedFiles.length > 0 && (
            <div className="uploaded-files">
              <h4>Selected Files:</h4>
              {uploadedFiles.map((file, index) => (
                <div key={index} className="file-item">
                  <span>{file.name}</span>
                  <button onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== index))}>
                    Remove
                  </button>
                </div>
              ))}
              <button className="btn btn--primary btn--lg">Upload Prescriptions</button>
            </div>
          )}

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
                  <h3>{prescription.name}</h3>
                  <p className="prescription-card__doctor">Prescribed by: {prescription.doctor}</p>
                  <p className="prescription-card__date">Uploaded: {prescription.uploadDate}</p>
                  <span className={`prescription-status prescription-status--${prescription.status.toLowerCase().replace(' ', '-')}`}>
                    {prescription.status}
                  </span>
                </div>
                <div className="prescription-card__actions">
                  <button className="btn btn--outline btn--sm">View</button>
                  <button className="btn btn--outline btn--sm">Download</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrescriptionUploadPage
