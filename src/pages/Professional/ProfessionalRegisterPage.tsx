import { useState } from 'react'
import { loadDoctorProfiles, saveDoctorProfiles } from '../../data/telemedicine'
import type { DoctorProfile } from '../../data/telemedicine'
import './ProfessionalRegisterPage.css'

type ProfType = 'Doctor' | 'Pediatrician'

const DOCTOR_SPECIALTIES = [
  'General Medicine',
  'Family Medicine',
  'Internal Medicine',
  'Cardiology',
  'Dermatology',
  'Gynaecology & Obstetrics',
  'Orthopaedics',
  'ENT (Ear, Nose & Throat)',
  'Neurology',
  'Oncology',
  'Psychiatry & Mental Health',
  'Ophthalmology',
  'Gastroenterology',
  'Nephrology',
  'Endocrinology',
  'Pulmonology',
  'Urology',
  'Rheumatology',
  'General Surgery',
  'Anaesthesiology',
]

const PEDIATRICIAN_SPECIALTIES = [
  'General Paediatrics',
  'Neonatology',
  'Paediatric Cardiology',
  'Paediatric Neurology',
  'Paediatric Oncology',
  'Paediatric Surgery',
  'Paediatric Pulmonology',
  'Paediatric Gastroenterology',
  'Paediatric Endocrinology',
  'Paediatric Nephrology',
  'Developmental Paediatrics',
  'Paediatric Emergency Medicine',
  'Paediatric Infectious Disease',
]

const DOCTOR_DOCS = [
  'Medical licence (KMB-issued)',
  'National ID / Passport',
  'Professional indemnity insurance',
  'Certificate of good standing',
  'Clinic / hospital affiliation letter',
]

const PEDIATRICIAN_DOCS = [
  'Paediatric specialist certificate',
  'National ID / Passport',
  'Professional indemnity insurance',
  'Certificate of good standing',
  'Hospital / NICU affiliation letter',
]

const LANGUAGES = ['English', 'Swahili', 'Kikuyu', 'Luo', 'Somali', 'Kamba', 'Giriama', 'French', 'Arabic']

const blank = () => ({
  name: '',
  email: '',
  phone: '',
  license: '',
  specialty: '',
  facility: '',
  experience: '',
  availability: '',
  fee: '',
  bio: '',
  languages: ['English', 'Swahili'] as string[],
  docChecklist: [] as string[],
  agreedToTerms: false,
})

function ProfessionalRegisterPage() {
  const [type, setType] = useState<ProfType | null>(null)
  const [form, setForm] = useState(blank())
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const specialties = type === 'Doctor' ? DOCTOR_SPECIALTIES : PEDIATRICIAN_SPECIALTIES
  const requiredDocs = type === 'Doctor' ? DOCTOR_DOCS : PEDIATRICIAN_DOCS

  const set = (field: keyof ReturnType<typeof blank>, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const toggleLanguage = (lang: string) =>
    set('languages', form.languages.includes(lang)
      ? form.languages.filter((l) => l !== lang)
      : [...form.languages, lang]
    )

  const toggleDoc = (doc: string) =>
    set('docChecklist', form.docChecklist.includes(doc)
      ? form.docChecklist.filter((d) => d !== doc)
      : [...form.docChecklist, doc]
    )

  const validate = () => {
    const e: Record<string, string> = {}
    if (!type) e.type = 'Please select your professional type.'
    if (!form.name.trim()) e.name = 'Full name is required.'
    if (!form.email.trim()) e.email = 'Email is required.'
    if (!form.license.trim()) e.license = 'License number is required.'
    if (!form.specialty) e.specialty = 'Please select a specialty.'
    if (!form.agreedToTerms) e.terms = 'You must agree to the terms.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !type) return
    const existing = loadDoctorProfiles()
    const newProfile: DoctorProfile = {
      id: `${type === 'Doctor' ? 'DOC' : 'PED'}-${Math.floor(1000 + Math.random() * 9000)}`,
      name: form.name.trim(),
      type,
      specialty: form.specialty,
      status: 'Pending',
      email: form.email.trim(),
      phone: form.phone.trim() || '+254 700 000 000',
      license: form.license.trim(),
      facility: form.facility.trim() || 'Independent Practice',
      submitted: new Date().toISOString().slice(0, 10),
      commission: 15,
      consultFee: parseInt(form.fee) || (type === 'Doctor' ? 1500 : 1200),
      rating: 0,
      availability: form.availability.trim() || 'To be confirmed',
      languages: form.languages.length > 0 ? form.languages : ['English'],
      documents: [
        ...form.docChecklist.map((name) => ({ name, status: 'Submitted' as const })),
        ...uploadedDocs.map((name) => ({ name, status: 'Submitted' as const })),
      ],
    }
    saveDoctorProfiles([newProfile, ...existing])
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (submitted) {
    return (
      <div className="pr-page">
        <div className="pr-success">
          <div className="pr-success__icon">✓</div>
          <h1 className="pr-success__title">Application submitted!</h1>
          <p className="pr-success__sub">
            Thank you, <strong>{form.name}</strong>. Your {type?.toLowerCase()} application is now under review.
          </p>
          <div className="pr-success__timeline">
            {[
              { step: '1', label: 'Application received', done: true },
              { step: '2', label: 'Document review', note: '24–48 hours', done: false },
              { step: '3', label: 'Background & credentials check', done: false },
              { step: '4', label: 'Onboarding call scheduled', done: false },
              { step: '5', label: 'Go live on AVA Health', done: false },
            ].map(({ step, label, note, done }) => (
              <div key={step} className={`pr-timeline-step ${done ? 'pr-timeline-step--done' : ''}`}>
                <div className="pr-timeline-step__dot">{done ? '✓' : step}</div>
                <div>
                  <span className="pr-timeline-step__label">{label}</span>
                  {note && <span className="pr-timeline-step__note">{note}</span>}
                </div>
              </div>
            ))}
          </div>
          <p className="pr-success__contact">
            Questions? Email us at <a href="mailto:professionals@avahealth.co.ke">professionals@avahealth.co.ke</a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="pr-page">
      {/* Hero */}
      <div className="pr-hero">
        <div className="pr-hero__content">
          <p className="pr-hero__eyebrow">Join AVA Health</p>
          <h1 className="pr-hero__title">Register as a Medical Professional</h1>
          <p className="pr-hero__sub">
            Reach thousands of patients across Kenya through our telemedicine platform. Flexible hours, secure consultations, and same-day payouts.
          </p>
          <div className="pr-hero__stats">
            <div className="pr-hero__stat"><strong>12,000+</strong> patients served</div>
            <div className="pr-hero__stat"><strong>48hr</strong> average approval</div>
            <div className="pr-hero__stat"><strong>85%</strong> payout rate</div>
          </div>
        </div>
      </div>

      <div className="pr-body">
        <form className="pr-form" onSubmit={handleSubmit} noValidate>

          {/* Step 1 — Type */}
          <div className="pr-section">
            <p className="pr-section__label">Step 1 — Select your role</p>
            <div className="pr-type-cards">
              <button
                type="button"
                className={`pr-type-card ${type === 'Doctor' ? 'pr-type-card--selected' : ''}`}
                onClick={() => { setType('Doctor'); set('specialty', '') }}
              >
                <span className="pr-type-card__icon">🩺</span>
                <span className="pr-type-card__title">Doctor</span>
                <span className="pr-type-card__desc">General practitioners and specialists across all medical fields</span>
              </button>
              <button
                type="button"
                className={`pr-type-card ${type === 'Pediatrician' ? 'pr-type-card--selected' : ''}`}
                onClick={() => { setType('Pediatrician'); set('specialty', '') }}
              >
                <span className="pr-type-card__icon">👶</span>
                <span className="pr-type-card__title">Pediatrician</span>
                <span className="pr-type-card__desc">Specialists dedicated to infant, child, and adolescent health</span>
              </button>
            </div>
            {errors.type && <p className="pr-field-error">{errors.type}</p>}
          </div>

          {type && (
            <>
              {/* Step 2 — Personal */}
              <div className="pr-section">
                <p className="pr-section__label">Step 2 — Personal information</p>
                <div className="pr-form-row">
                  <div className="pr-form-group">
                    <label>Full name <span className="pr-required">Required</span></label>
                    <input
                      type="text"
                      placeholder={type === 'Doctor' ? 'Dr. Jane Mwangi' : 'Dr. Amina Osei'}
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      className={errors.name ? 'pr-input--error' : ''}
                    />
                    {errors.name && <p className="pr-field-error">{errors.name}</p>}
                  </div>
                  <div className="pr-form-group">
                    <label>Email address <span className="pr-required">Required</span></label>
                    <input
                      type="email"
                      placeholder="doctor@example.com"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      className={errors.email ? 'pr-input--error' : ''}
                    />
                    {errors.email && <p className="pr-field-error">{errors.email}</p>}
                  </div>
                </div>
                <div className="pr-form-row">
                  <div className="pr-form-group">
                    <label>Phone number</label>
                    <input
                      type="tel"
                      placeholder="+254 700 000 000"
                      value={form.phone}
                      onChange={(e) => set('phone', e.target.value)}
                    />
                  </div>
                  <div className="pr-form-group">
                    <label>Years of experience</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      placeholder="5"
                      value={form.experience}
                      onChange={(e) => set('experience', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Step 3 — Professional */}
              <div className="pr-section">
                <p className="pr-section__label">Step 3 — Professional credentials</p>
                <div className="pr-form-row">
                  <div className="pr-form-group">
                    <label>License number <span className="pr-required">Required</span></label>
                    <input
                      type="text"
                      placeholder="KMB-XXXXX"
                      value={form.license}
                      onChange={(e) => set('license', e.target.value)}
                      className={errors.license ? 'pr-input--error' : ''}
                    />
                    {errors.license && <p className="pr-field-error">{errors.license}</p>}
                  </div>
                  <div className="pr-form-group">
                    <label>Specialty <span className="pr-required">Required</span></label>
                    <select
                      value={form.specialty}
                      onChange={(e) => set('specialty', e.target.value)}
                      className={errors.specialty ? 'pr-input--error' : ''}
                    >
                      <option value="">Select specialty</option>
                      {specialties.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {errors.specialty && <p className="pr-field-error">{errors.specialty}</p>}
                  </div>
                </div>
                <div className="pr-form-row">
                  <div className="pr-form-group">
                    <label>Affiliated facility</label>
                    <input
                      type="text"
                      placeholder="Nairobi Hospital / Independent Practice"
                      value={form.facility}
                      onChange={(e) => set('facility', e.target.value)}
                    />
                  </div>
                  <div className="pr-form-group">
                    <label>Availability hours</label>
                    <input
                      type="text"
                      placeholder="Mon–Fri, 9am–5pm"
                      value={form.availability}
                      onChange={(e) => set('availability', e.target.value)}
                    />
                  </div>
                </div>
                <div className="pr-form-group">
                  <label>Languages spoken</label>
                  <div className="pr-lang-pills">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        className={`pr-lang-pill ${form.languages.includes(lang) ? 'pr-lang-pill--active' : ''}`}
                        onClick={() => toggleLanguage(lang)}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pr-form-group">
                  <label>About yourself <span className="pr-optional">Optional</span></label>
                  <textarea
                    rows={3}
                    placeholder={`Brief professional bio — your experience, approach to ${type === 'Doctor' ? 'patient care' : 'paediatric care'}, and what patients can expect.`}
                    value={form.bio}
                    onChange={(e) => set('bio', e.target.value)}
                  />
                </div>
              </div>

              {/* Step 4 — Terms */}
              <div className="pr-section">
                <p className="pr-section__label">Step 4 — Consultation terms</p>
                <div className="pr-form-row">
                  <div className="pr-form-group">
                    <label>Consultation fee (KSh)</label>
                    <div className="pr-fee-wrap">
                      <span className="pr-fee-prefix">KSh</span>
                      <input
                        type="number"
                        min="0"
                        placeholder={type === 'Doctor' ? '1500' : '1200'}
                        value={form.fee}
                        onChange={(e) => set('fee', e.target.value)}
                        className="pr-fee-input"
                      />
                    </div>
                    <p className="pr-hint">Typical range: KSh 1,000 – 5,000 per consultation</p>
                  </div>
                  <div className="pr-form-group">
                    <label>Platform commission</label>
                    <div className="pr-commission-badge">15% per consultation</div>
                    <p className="pr-hint">AVA Health retains 15% to cover platform, payment processing, and support costs.</p>
                  </div>
                </div>
              </div>

              {/* Step 5 — Documents */}
              <div className="pr-section">
                <p className="pr-section__label">Step 5 — Supporting documents</p>
                <p className="pr-section__sub">Check off the documents you are including with this application:</p>
                <div className="pr-doc-checklist">
                  {requiredDocs.map((doc) => (
                    <label key={doc} className="pr-doc-check">
                      <input
                        type="checkbox"
                        checked={form.docChecklist.includes(doc)}
                        onChange={() => toggleDoc(doc)}
                      />
                      <span>{doc}</span>
                    </label>
                  ))}
                </div>
                <div className="pr-form-group" style={{ marginTop: '1rem' }}>
                  <label>Upload files</label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []).map((f) => f.name)
                      setUploadedDocs((prev) => Array.from(new Set([...prev, ...files])))
                      e.currentTarget.value = ''
                    }}
                  />
                  {uploadedDocs.length > 0 && (
                    <div className="pr-uploaded-list">
                      {uploadedDocs.map((name) => (
                        <div key={name} className="pr-uploaded-item">
                          <span>📄 {name}</span>
                          <button type="button" onClick={() => setUploadedDocs((prev) => prev.filter((n) => n !== name))}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="pr-hint">Accepted: PDF, JPG, PNG. Max 10 MB per file.</p>
                </div>
              </div>

              {/* Step 6 — Agreement */}
              <div className="pr-section">
                <p className="pr-section__label">Step 6 — Agreement</p>
                <label className="pr-agree-check">
                  <input
                    type="checkbox"
                    checked={form.agreedToTerms}
                    onChange={(e) => set('agreedToTerms', e.target.checked)}
                  />
                  <span>
                    I confirm that all information provided is accurate, and I agree to AVA Health's{' '}
                    <a href="/terms" target="_blank">Terms of Service</a> and{' '}
                    <a href="/privacy" target="_blank">Privacy Policy</a>.
                  </span>
                </label>
                {errors.terms && <p className="pr-field-error">{errors.terms}</p>}
                <button type="submit" className="pr-submit-btn">
                  Submit application
                </button>
              </div>
            </>
          )}
        </form>

        {/* Right sidebar */}
        <aside className="pr-sidebar">
          <div className="pr-sidebar__card">
            <p className="pr-sidebar__title">What happens next?</p>
            <ol className="pr-sidebar__steps">
              <li>We receive and log your application</li>
              <li>Our team reviews your documents (24–48 hrs)</li>
              <li>Background and credentials check</li>
              <li>We schedule an onboarding call</li>
              <li>Your profile goes live on AVA Health</li>
            </ol>
          </div>

          <div className="pr-sidebar__card">
            <p className="pr-sidebar__title">Why join AVA Health?</p>
            <ul className="pr-sidebar__list">
              <li>✓ Flexible consultation hours</li>
              <li>✓ Secure, encrypted video & chat</li>
              <li>✓ Same-day M-Pesa payouts</li>
              <li>✓ Dedicated professional support</li>
              <li>✓ Growing patient community</li>
              <li>✓ Electronic prescription tools</li>
            </ul>
          </div>

          <div className="pr-sidebar__card pr-sidebar__card--contact">
            <p className="pr-sidebar__title">Need help?</p>
            <p className="pr-sidebar__contact-text">Our onboarding team is available Mon–Fri, 8am–6pm.</p>
            <a href="mailto:professionals@avahealth.co.ke" className="pr-sidebar__email">
              professionals@avahealth.co.ke
            </a>
            <a href="tel:+254700000000" className="pr-sidebar__phone">+254 700 000 000</a>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default ProfessionalRegisterPage
