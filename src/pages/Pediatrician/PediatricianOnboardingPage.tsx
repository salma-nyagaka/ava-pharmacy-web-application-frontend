import { useState } from 'react'
import PageHeader from '../../components/PageHeader/PageHeader'
import { DoctorProfile, loadDoctorProfiles, saveDoctorProfiles } from '../../data/telemedicine'

function PediatricianOnboardingPage() {
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
      id: `PED-${Math.floor(1000 + Math.random() * 9000)}`,
      name: formState.name,
      type: 'Pediatrician',
      specialty: formState.specialty,
      status: 'Pending',
      email: formState.email || 'pending@avahealth.co.ke',
      phone: formState.phone || '+254 700 000 000',
      license: formState.license,
      facility: formState.facility || 'Pediatric Practice',
      submitted: new Date().toISOString().slice(0, 10),
      commission: 14,
      consultFee: 1800,
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
        title="Pediatrician verification"
        subtitle="Provide pediatric specialization credentials to serve child consultations."
        badge="Pediatric Services"
      />
      <section className="page">
        <div className="container">
          <div className="split-layout">
            <div className="form-card">
              <h2 className="card__title">Specialist onboarding</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="ped-name">Full name</label>
                    <input
                      id="ped-name"
                      type="text"
                      placeholder="Dr. Mercy Otieno"
                      value={formState.name}
                      onChange={(event) => handleChange('name', event.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="ped-license">License number</label>
                    <input
                      id="ped-license"
                      type="text"
                      placeholder="PED-456789"
                      value={formState.license}
                      onChange={(event) => handleChange('license', event.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="ped-specialty">Pediatric specialization</label>
                  <select
                    id="ped-specialty"
                    value={formState.specialty}
                    onChange={(event) => handleChange('specialty', event.target.value)}
                    required
                  >
                    <option value="">Select specialization</option>
                    <option>Neonatal care</option>
                    <option>General pediatrics</option>
                    <option>Pediatric allergy</option>
                    <option>Pediatric cardiology</option>
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="ped-email">Email</label>
                    <input
                      id="ped-email"
                      type="email"
                      placeholder="doctor@example.com"
                      value={formState.email}
                      onChange={(event) => handleChange('email', event.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="ped-phone">Phone</label>
                    <input
                      id="ped-phone"
                      type="tel"
                      placeholder="+254 700 000 000"
                      value={formState.phone}
                      onChange={(event) => handleChange('phone', event.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="ped-facility">Facility</label>
                    <input
                      id="ped-facility"
                      type="text"
                      placeholder="Clinic or hospital"
                      value={formState.facility}
                      onChange={(event) => handleChange('facility', event.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="ped-availability">Availability</label>
                    <input
                      id="ped-availability"
                      type="text"
                      placeholder="Mon - Fri, 9:00 AM - 3:00 PM"
                      value={formState.availability}
                      onChange={(event) => handleChange('availability', event.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="ped-docs">Upload credentials</label>
                  <input
                    id="ped-docs"
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
                <button className="btn btn--primary">Submit for review</button>
                {submitted && (
                  <p className="card__meta" style={{ marginTop: '0.75rem' }}>
                    Submission received. We will verify your pediatric credentials shortly.
                  </p>
                )}
              </form>
            </div>
            <div className="card card--soft">
              <h3 className="card__title">Required documents</h3>
              <ul className="card__list">
                <li>✅ Pediatric specialization certificate</li>
                <li>✅ Active medical license</li>
                <li>✅ Guardian consent policy acknowledgment</li>
                <li>✅ Availability schedule</li>
              </ul>
              <p className="card__meta" style={{ marginTop: '1rem' }}>
                Pediatric specialists are labeled and prioritized in search.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PediatricianOnboardingPage
