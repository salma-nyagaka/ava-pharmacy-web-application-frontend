import { useState } from 'react'
import PageHeader from '../../components/PageHeader/PageHeader'
import { DoctorProfile, loadDoctorProfiles, saveDoctorProfiles } from '../../data/telemedicine'

function DoctorOnboardingPage() {
  const [formState, setFormState] = useState({
    name: '',
    license: '',
    specialty: '',
    email: '',
    phone: '',
    facility: '',
    availability: '',
  })
  const [documents, setDocuments] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleChange = (field: keyof typeof formState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleRemoveDocument = (name: string) => {
    setDocuments((prev) => prev.filter((doc) => doc !== name))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formState.name || !formState.license || !formState.specialty) return
    if (documents.length === 0) {
      setUploadError('Please upload at least one document.')
      return
    }
    setUploadError('')
    const existing = loadDoctorProfiles()
    const newDoctor: DoctorProfile = {
      id: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
      name: formState.name,
      type: 'Doctor',
      specialty: formState.specialty,
      status: 'Pending',
      email: formState.email || 'pending@avahealth.co.ke',
      phone: formState.phone || '+254 700 000 000',
      license: formState.license,
      facility: formState.facility || 'Independent Practice',
      submitted: new Date().toISOString().slice(0, 10),
      commission: 15,
      consultFee: 1500,
      rating: 0,
      availability: formState.availability || 'To be scheduled',
      languages: ['English', 'Swahili'],
      documents: documents.map((name) => ({ name, status: 'Submitted' as const })),
    }
    saveDoctorProfiles([newDoctor, ...existing])
    setSubmitted(true)
  }

  return (
    <div>
      <PageHeader
        title="Doctor registration"
        subtitle="Submit your credentials to join Ava Pharmacy telemedicine services."
        badge="Doctor Portal"
      />
      <section className="page">
        <div className="container">
          <div className="split-layout">
            <div className="form-card">
              <h2 className="card__title">Professional details</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="doc-name">Full name</label>
                    <input
                      id="doc-name"
                      type="text"
                      placeholder="Dr. Jane Doe"
                      value={formState.name}
                      onChange={(event) => handleChange('name', event.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="doc-license">License number</label>
                    <input
                      id="doc-license"
                      type="text"
                      placeholder="MED-123456"
                      value={formState.license}
                      onChange={(event) => handleChange('license', event.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="doc-specialty">Specialty</label>
                  <select
                    id="doc-specialty"
                    value={formState.specialty}
                    onChange={(event) => handleChange('specialty', event.target.value)}
                    required
                  >
                    <option value="">Select specialty</option>
                    <option>General Medicine</option>
                    <option>Cardiology</option>
                    <option>Dermatology</option>
                    <option>Family Medicine</option>
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="doc-email">Email</label>
                    <input
                      id="doc-email"
                      type="email"
                      placeholder="doctor@example.com"
                      value={formState.email}
                      onChange={(event) => handleChange('email', event.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="doc-phone">Phone</label>
                    <input
                      id="doc-phone"
                      type="tel"
                      placeholder="+254 700 000 000"
                      value={formState.phone}
                      onChange={(event) => handleChange('phone', event.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="doc-facility">Facility</label>
                    <input
                      id="doc-facility"
                      type="text"
                      placeholder="Clinic or hospital"
                      value={formState.facility}
                      onChange={(event) => handleChange('facility', event.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="doc-availability">Availability</label>
                    <input
                      id="doc-availability"
                      type="text"
                      placeholder="Mon - Fri, 9:00 AM - 5:00 PM"
                      value={formState.availability}
                      onChange={(event) => handleChange('availability', event.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="doc-docs">Upload credentials</label>
                  <input
                    id="doc-docs"
                    type="file"
                    multiple
                    required
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? [])
                      const selectedFileNames = files.map((file) => file.name)
                      setDocuments((prev) => Array.from(new Set([...prev, ...selectedFileNames])))
                      setUploadError('')
                      event.currentTarget.value = ''
                    }}
                  />
                  {documents.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <p className="card__meta" style={{ marginBottom: '0.4rem' }}>
                        {documents.length} document{documents.length > 1 ? 's' : ''} selected
                      </p>
                      <div style={{ display: 'grid', gap: '0.35rem' }}>
                        {documents.map((name) => (
                          <div
                            key={name}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '0.75rem',
                            }}
                          >
                            <span className="card__meta">{name}</span>
                            <button
                              type="button"
                              className="btn btn--outline btn--sm"
                              onClick={() => handleRemoveDocument(name)}
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {uploadError && (
                    <p className="card__meta" style={{ marginTop: '0.5rem', color: '#dc2626' }}>
                      {uploadError}
                    </p>
                  )}
                </div>
                <button className="btn btn--primary">Submit for verification</button>
                {submitted && (
                  <p className="card__meta" style={{ marginTop: '0.75rem' }}>
                    Registration submitted. You will receive an email once verification is complete.
                  </p>
                )}
              </form>
            </div>
            <div className="card card--soft">
              <h3 className="card__title">Verification checklist</h3>
              <ul className="card__list">
                <li>✅ Medical license and national ID</li>
                <li>✅ Professional indemnity cover</li>
                <li>✅ Clinic or hospital affiliation</li>
                <li>✅ Telemedicine availability hours</li>
              </ul>
              <p className="card__meta" style={{ marginTop: '1rem' }}>
                Average approval time: 24-48 hours.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default DoctorOnboardingPage
