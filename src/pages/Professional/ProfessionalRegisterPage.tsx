import { useMemo, useState } from 'react'
import { loadDoctorProfiles, saveDoctorProfiles } from '../../data/telemedicine'
import type { DoctorProfile } from '../../data/telemedicine'
import {
  LabPartner,
  LabTechnician,
  loadLabPartners,
  nextLabPartnerId,
  nextLabTechId,
  saveLabPartners,
} from '../../data/labPartners'
import './ProfessionalRegisterPage.css'

type ProfType = 'Doctor' | 'Pediatrician' | 'Lab Partner' | 'Lab Technician'

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

const LAB_PARTNER_DOCS = [
  'Lab facility licence',
  'Accreditation certificate',
  'Company registration',
  'Professional indemnity insurance',
  'Quality assurance policy',
]

const LAB_TECH_DOCS = [
  'Lab technician licence',
  'National ID / Passport',
  'Professional indemnity insurance',
  'Certificate of good standing',
]

const LAB_TECH_SPECIALTIES = [
  'Phlebotomy',
  'Clinical Chemistry',
  'Haematology',
  'Microbiology',
  'Pathology',
  'Radiology',
]

const LANGUAGES = ['English', 'Swahili', 'Kikuyu', 'Luo', 'Somali', 'Kamba', 'Giriama', 'French', 'Arabic']
const CONSULT_MODES = ['Video', 'Chat', 'Phone']
const PAYOUT_METHODS = ['M-Pesa', 'Bank Transfer'] as const

const blank = () => ({
  name: '',
  email: '',
  phone: '',
  license: '',
  licenseBoard: '',
  licenseCountry: 'Kenya',
  licenseExpiry: '',
  idNumber: '',
  specialty: '',
  facility: '',
  labName: '',
  labLocation: '',
  labAccreditation: '',
  labPartnerId: '',
  experience: '',
  availability: '',
  fee: '',
  county: '',
  address: '',
  bio: '',
  languages: ['English', 'Swahili'] as string[],
  consultModes: ['Video', 'Chat', 'Phone'] as string[],
  payoutMethod: 'M-Pesa' as (typeof PAYOUT_METHODS)[number],
  payoutAccount: '',
  ref1Name: '',
  ref1Email: '',
  ref1Phone: '',
  ref2Name: '',
  ref2Email: '',
  ref2Phone: '',
  backgroundConsent: false,
  complianceDeclaration: false,
  docChecklist: [] as string[],
  agreedToTerms: false,
})

function ProfessionalRegisterPage() {
  const [type, setType] = useState<ProfType | null>(null)
  const [form, setForm] = useState(blank())
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([])
  const [cvUploads, setCvUploads] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const specialties = type === 'Doctor'
    ? DOCTOR_SPECIALTIES
    : type === 'Pediatrician'
      ? PEDIATRICIAN_SPECIALTIES
      : LAB_TECH_SPECIALTIES

  const requiredDocs = type === 'Doctor'
    ? DOCTOR_DOCS
    : type === 'Pediatrician'
      ? PEDIATRICIAN_DOCS
      : type === 'Lab Partner'
        ? LAB_PARTNER_DOCS
        : LAB_TECH_DOCS

  const labPartners = useMemo(() => loadLabPartners(), [])

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

  const toggleConsultMode = (mode: string) =>
    set('consultModes', form.consultModes.includes(mode)
      ? form.consultModes.filter((m) => m !== mode)
      : [...form.consultModes, mode]
    )

  const validate = () => {
    const e: Record<string, string> = {}
    if (!type) e.type = 'Please select your professional type.'
    if (!form.name.trim()) e.name = type === 'Lab Partner' ? 'Primary contact name is required.' : 'Full name is required.'
    if (!form.email.trim()) e.email = 'Email is required.'
    if (!form.phone.trim()) e.phone = 'Phone number is required.'
    if (type === 'Lab Partner') {
      if (!form.labName.trim()) e.labName = 'Lab name is required.'
      if (!form.labLocation.trim()) e.labLocation = 'Lab location is required.'
      if (!form.labAccreditation.trim()) e.labAccreditation = 'Accreditation number is required.'
      if (!form.license.trim()) e.license = 'Facility license number is required.'
      if (!form.payoutAccount.trim()) e.payoutAccount = 'Payout account is required.'
    } else {
      if (!form.license.trim()) e.license = 'License number is required.'
      if (!form.licenseBoard.trim()) e.licenseBoard = 'Licensing board is required.'
      if (!form.licenseExpiry.trim()) e.licenseExpiry = 'License expiry date is required.'
      if (!form.idNumber.trim()) e.idNumber = 'ID / Passport number is required.'
      if (type === 'Lab Technician') {
        if (!form.labPartnerId) e.labPartnerId = 'Select a lab partner.'
        if (!form.specialty) e.specialty = 'Select a lab specialty.'
      } else {
        if (!form.specialty) e.specialty = 'Please select a specialty.'
      }
      if (!form.payoutAccount.trim()) e.payoutAccount = 'Payout account is required.'
    }
    if (!form.backgroundConsent) e.backgroundConsent = 'Background check consent is required.'
    if (!form.complianceDeclaration) e.complianceDeclaration = 'Declaration is required.'
    if (!form.agreedToTerms) e.terms = 'You must agree to the terms.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !type) return
    const submittedAt = new Date().toISOString().slice(0, 10)
    const documentNames = Array.from(new Set([
      ...form.docChecklist,
      ...uploadedDocs,
      ...cvUploads,
    ]))

    if (type === 'Lab Partner') {
      const partners = loadLabPartners()
      const id = nextLabPartnerId(partners)
      const partner: LabPartner = {
        id,
        name: form.labName.trim(),
        contactName: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        location: form.labLocation.trim(),
        accreditation: form.labAccreditation.trim(),
        licenseNumber: form.license.trim(),
        county: form.county.trim() || undefined,
        address: form.address.trim() || undefined,
        payoutMethod: form.payoutMethod,
        payoutAccount: form.payoutAccount.trim(),
        status: 'Pending',
        submittedAt,
        notes: form.bio.trim() || undefined,
        documents: documentNames,
        techs: [],
      }
      saveLabPartners([partner, ...partners])
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (type === 'Lab Technician') {
      const partners = loadLabPartners()
      const partnerIndex = partners.findIndex((partner) => partner.id === form.labPartnerId)
      if (partnerIndex === -1) {
        setErrors((prev) => ({ ...prev, labPartnerId: 'Select a valid lab partner.' }))
        return
      }
      const tech: LabTechnician = {
        id: nextLabTechId(partners),
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        status: 'Active',
        specialty: form.specialty,
        licenseNumber: form.license.trim(),
        licenseExpiry: form.licenseExpiry.trim(),
        idNumber: form.idNumber.trim(),
        documents: documentNames,
      }
      const updated = partners.map((partner, index) =>
        index === partnerIndex ? { ...partner, techs: [tech, ...partner.techs] } : partner
      )
      saveLabPartners(updated)
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const existing = loadDoctorProfiles()
    const newProfile: DoctorProfile = {
      id: `${type === 'Doctor' ? 'DOC' : 'PED'}-${Math.floor(1000 + Math.random() * 9000)}`,
      name: form.name.trim(),
      type,
      specialty: form.specialty,
      status: 'Pending',
      email: form.email.trim(),
      phone: form.phone.trim(),
      license: form.license.trim(),
      licenseBoard: form.licenseBoard.trim(),
      licenseCountry: form.licenseCountry.trim(),
      licenseExpiry: form.licenseExpiry.trim(),
      idNumber: form.idNumber.trim(),
      facility: form.facility.trim() || 'Independent Practice',
      county: form.county.trim() || undefined,
      address: form.address.trim() || undefined,
      submitted: submittedAt,
      commission: 15,
      consultFee: parseInt(form.fee) || (type === 'Doctor' ? 1500 : 1200),
      rating: 0,
      availability: form.availability.trim() || 'To be confirmed',
      languages: form.languages.length > 0 ? form.languages : ['English'],
      consultModes: form.consultModes,
      payoutMethod: form.payoutMethod,
      payoutAccount: form.payoutAccount.trim(),
      backgroundConsent: form.backgroundConsent,
      complianceDeclaration: form.complianceDeclaration,
      referees: [
        { name: form.ref1Name.trim(), email: form.ref1Email.trim(), phone: form.ref1Phone.trim() },
        { name: form.ref2Name.trim(), email: form.ref2Email.trim(), phone: form.ref2Phone.trim() },
      ].filter((ref) => ref.name || ref.email || ref.phone),
      cvFiles: cvUploads,
      documents: documentNames.map((name) => ({ name, status: 'Submitted' as const })),
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
            Reach thousands of patients across Kenya through AVA Health. Flexible hours, secure consultations, lab partnerships, and same-day payouts.
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

          {/* Step 1 - Type */}
          <div className="pr-section">
            <p className="pr-section__label">Step 1 - Select your role</p>
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
              <button
                type="button"
                className={`pr-type-card ${type === 'Lab Partner' ? 'pr-type-card--selected' : ''}`}
                onClick={() => { setType('Lab Partner'); set('specialty', ''); set('labPartnerId', '') }}
              >
                <span className="pr-type-card__icon">🧪</span>
                <span className="pr-type-card__title">Lab Partner</span>
                <span className="pr-type-card__desc">Diagnostic labs providing sample collection and results delivery</span>
              </button>
              <button
                type="button"
                className={`pr-type-card ${type === 'Lab Technician' ? 'pr-type-card--selected' : ''}`}
                onClick={() => { setType('Lab Technician'); set('specialty', '') }}
              >
                <span className="pr-type-card__icon">🔬</span>
                <span className="pr-type-card__title">Lab Technician</span>
                <span className="pr-type-card__desc">Certified technicians supporting lab sample collection and analysis</span>
              </button>
            </div>
            {errors.type && <p className="pr-field-error">{errors.type}</p>}
          </div>

          {type && (
            <>
              {/* Step 2 - Personal */}
              <div className="pr-section">
                <p className="pr-section__label">
                  Step 2 - {type === 'Lab Partner' ? 'Primary contact' : 'Personal information'}
                </p>
                <div className="pr-form-row">
                  <div className="pr-form-group">
                    <label>{type === 'Lab Partner' ? 'Contact name' : 'Full name'} <span className="pr-required">Required</span></label>
                    <input
                      type="text"
                      placeholder={type === 'Doctor' || type === 'Pediatrician' ? 'Dr. Jane Mwangi' : 'Alex Kimani'}
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
                      placeholder={type === 'Lab Partner' ? 'lab@example.com' : 'doctor@example.com'}
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
                      className={errors.phone ? 'pr-input--error' : ''}
                    />
                    {errors.phone && <p className="pr-field-error">{errors.phone}</p>}
                  </div>
                  <div className="pr-form-group">
                    <label>{type === 'Lab Partner' ? 'Years in operation' : 'Years of experience'}</label>
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
                {type === 'Lab Partner' && (
                  <div className="pr-form-row">
                    <div className="pr-form-group">
                      <label>Lab name <span className="pr-required">Required</span></label>
                      <input
                        type="text"
                        placeholder="Ava Diagnostics"
                        value={form.labName}
                        onChange={(e) => set('labName', e.target.value)}
                        className={errors.labName ? 'pr-input--error' : ''}
                      />
                      {errors.labName && <p className="pr-field-error">{errors.labName}</p>}
                    </div>
                    <div className="pr-form-group">
                      <label>Lab location <span className="pr-required">Required</span></label>
                      <input
                        type="text"
                        placeholder="Westlands, Nairobi"
                        value={form.labLocation}
                        onChange={(e) => set('labLocation', e.target.value)}
                        className={errors.labLocation ? 'pr-input--error' : ''}
                      />
                      {errors.labLocation && <p className="pr-field-error">{errors.labLocation}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3 - Professional */}
              <div className="pr-section">
                <p className="pr-section__label">Step 3 - {type === 'Lab Partner' ? 'Lab credentials' : 'Professional credentials'}</p>

                {type === 'Lab Partner' ? (
                  <>
                    <div className="pr-form-row">
                      <div className="pr-form-group">
                        <label>Accreditation number <span className="pr-required">Required</span></label>
                        <input
                          type="text"
                          placeholder="KMLTTB-ACC-XXXX"
                          value={form.labAccreditation}
                          onChange={(e) => set('labAccreditation', e.target.value)}
                          className={errors.labAccreditation ? 'pr-input--error' : ''}
                        />
                        {errors.labAccreditation && <p className="pr-field-error">{errors.labAccreditation}</p>}
                      </div>
                      <div className="pr-form-group">
                        <label>Facility licence number <span className="pr-required">Required</span></label>
                        <input
                          type="text"
                          placeholder="LAB-LIC-XXXX"
                          value={form.license}
                          onChange={(e) => set('license', e.target.value)}
                          className={errors.license ? 'pr-input--error' : ''}
                        />
                        {errors.license && <p className="pr-field-error">{errors.license}</p>}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
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
                        <label>Licensing board <span className="pr-required">Required</span></label>
                        <input
                          type="text"
                          placeholder="KMPDC / KMLTTB"
                          value={form.licenseBoard}
                          onChange={(e) => set('licenseBoard', e.target.value)}
                          className={errors.licenseBoard ? 'pr-input--error' : ''}
                        />
                        {errors.licenseBoard && <p className="pr-field-error">{errors.licenseBoard}</p>}
                      </div>
                    </div>
                    <div className="pr-form-row">
                      <div className="pr-form-group">
                        <label>License country</label>
                        <input
                          type="text"
                          placeholder="Kenya"
                          value={form.licenseCountry}
                          onChange={(e) => set('licenseCountry', e.target.value)}
                        />
                      </div>
                      <div className="pr-form-group">
                        <label>License expiry <span className="pr-required">Required</span></label>
                        <input
                          type="date"
                          value={form.licenseExpiry}
                          onChange={(e) => set('licenseExpiry', e.target.value)}
                          className={errors.licenseExpiry ? 'pr-input--error' : ''}
                        />
                        {errors.licenseExpiry && <p className="pr-field-error">{errors.licenseExpiry}</p>}
                      </div>
                    </div>
                    <div className="pr-form-row">
                      <div className="pr-form-group">
                        <label>ID / Passport number <span className="pr-required">Required</span></label>
                        <input
                          type="text"
                          placeholder="ID / Passport"
                          value={form.idNumber}
                          onChange={(e) => set('idNumber', e.target.value)}
                          className={errors.idNumber ? 'pr-input--error' : ''}
                        />
                        {errors.idNumber && <p className="pr-field-error">{errors.idNumber}</p>}
                      </div>
                      <div className="pr-form-group">
                        <label>{type === 'Lab Technician' ? 'Lab specialty' : 'Specialty'} <span className="pr-required">Required</span></label>
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
                      {type === 'Lab Technician' ? (
                        <>
                          <div className="pr-form-group">
                            <label>Lab partner <span className="pr-required">Required</span></label>
                          <select
                            value={form.labPartnerId}
                            onChange={(e) => set('labPartnerId', e.target.value)}
                            className={errors.labPartnerId ? 'pr-input--error' : ''}
                          >
                            <option value="">Select lab partner</option>
                            {labPartners.map((partner) => (
                              <option key={partner.id} value={partner.id}>{partner.name}</option>
                            ))}
                          </select>
                          {errors.labPartnerId && <p className="pr-field-error">{errors.labPartnerId}</p>}
                          {labPartners.length === 0 && (
                            <p className="pr-hint">No lab partners yet. Register a lab partner first.</p>
                          )}
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
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                    {type !== 'Lab Technician' && (
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
                    )}
                  </>
                )}

                <div className="pr-form-group">
                  <label>About yourself <span className="pr-optional">Optional</span></label>
                  <textarea
                    rows={3}
                    placeholder={type === 'Lab Partner'
                      ? 'Brief description of your lab, quality standards, and turnaround time.'
                      : `Brief professional bio - your experience, approach to ${type === 'Doctor' ? 'patient care' : 'paediatric care'}, and what patients can expect.`
                    }
                    value={form.bio}
                    onChange={(e) => set('bio', e.target.value)}
                  />
                </div>
              </div>

              {/* Step 4 - Practice & payout */}
              <div className="pr-section">
                <p className="pr-section__label">Step 4 - Practice & payout</p>
                <div className="pr-form-row">
                  <div className="pr-form-group">
                    <label>County</label>
                    <input
                      type="text"
                      placeholder="Nairobi"
                      value={form.county}
                      onChange={(e) => set('county', e.target.value)}
                    />
                  </div>
                  <div className="pr-form-group">
                    <label>Primary address</label>
                    <input
                      type="text"
                      placeholder="Clinic address or lab location"
                      value={form.address}
                      onChange={(e) => set('address', e.target.value)}
                    />
                  </div>
                </div>

                {(type === 'Doctor' || type === 'Pediatrician') && (
                  <div className="pr-form-group">
                    <label>Consultation modes</label>
                    <div className="pr-mode-pills">
                      {CONSULT_MODES.map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          className={`pr-mode-pill ${form.consultModes.includes(mode) ? 'pr-mode-pill--active' : ''}`}
                          onClick={() => toggleConsultMode(mode)}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pr-form-row">
                  <div className="pr-form-group">
                    <label>Payout method <span className="pr-required">Required</span></label>
                    <select value={form.payoutMethod} onChange={(e) => set('payoutMethod', e.target.value)}>
                      {PAYOUT_METHODS.map((method) => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>
                  <div className="pr-form-group">
                    <label>Payout account <span className="pr-required">Required</span></label>
                    <input
                      type="text"
                      placeholder={form.payoutMethod === 'M-Pesa' ? 'M-Pesa number' : 'Bank account / Paybill'}
                      value={form.payoutAccount}
                      onChange={(e) => set('payoutAccount', e.target.value)}
                      className={errors.payoutAccount ? 'pr-input--error' : ''}
                    />
                    {errors.payoutAccount && <p className="pr-field-error">{errors.payoutAccount}</p>}
                  </div>
                </div>

                {(type === 'Doctor' || type === 'Pediatrician') && (
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
                )}
              </div>

              {/* Step 5 - References & compliance */}
              <div className="pr-section">
                <p className="pr-section__label">Step 5 - References & compliance</p>
                <div className="pr-ref-grid">
                  <div className="pr-ref-card">
                    <p className="pr-ref-title">Referee 1</p>
                    <div className="pr-form-group">
                      <label>Name</label>
                      <input
                        type="text"
                        placeholder="Referee name"
                        value={form.ref1Name}
                        onChange={(e) => set('ref1Name', e.target.value)}
                      />
                    </div>
                    <div className="pr-form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        placeholder="referee@example.com"
                        value={form.ref1Email}
                        onChange={(e) => set('ref1Email', e.target.value)}
                      />
                    </div>
                    <div className="pr-form-group">
                      <label>Phone</label>
                      <input
                        type="tel"
                        placeholder="+254 700 000 000"
                        value={form.ref1Phone}
                        onChange={(e) => set('ref1Phone', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="pr-ref-card">
                    <p className="pr-ref-title">Referee 2</p>
                    <div className="pr-form-group">
                      <label>Name</label>
                      <input
                        type="text"
                        placeholder="Referee name"
                        value={form.ref2Name}
                        onChange={(e) => set('ref2Name', e.target.value)}
                      />
                    </div>
                    <div className="pr-form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        placeholder="referee@example.com"
                        value={form.ref2Email}
                        onChange={(e) => set('ref2Email', e.target.value)}
                      />
                    </div>
                    <div className="pr-form-group">
                      <label>Phone</label>
                      <input
                        type="tel"
                        placeholder="+254 700 000 000"
                        value={form.ref2Phone}
                        onChange={(e) => set('ref2Phone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <label className="pr-agree-check">
                  <input
                    type="checkbox"
                    checked={form.backgroundConsent}
                    onChange={(e) => set('backgroundConsent', e.target.checked)}
                  />
                  <span>I consent to background and credential checks.</span>
                </label>
                {errors.backgroundConsent && <p className="pr-field-error">{errors.backgroundConsent}</p>}
                <label className="pr-agree-check">
                  <input
                    type="checkbox"
                    checked={form.complianceDeclaration}
                    onChange={(e) => set('complianceDeclaration', e.target.checked)}
                  />
                  <span>I confirm there are no ongoing disciplinary actions against me or my facility.</span>
                </label>
                {errors.complianceDeclaration && <p className="pr-field-error">{errors.complianceDeclaration}</p>}
              </div>

              {/* Step 6 - Documents */}
              <div className="pr-section">
                <p className="pr-section__label">Step 6 - Supporting documents</p>
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
                <div className="pr-form-group">
                  <label>Upload CV / profile</label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []).map((f) => f.name)
                      setCvUploads((prev) => Array.from(new Set([...prev, ...files])))
                      e.currentTarget.value = ''
                    }}
                  />
                  {cvUploads.length > 0 && (
                    <div className="pr-uploaded-list">
                      {cvUploads.map((name) => (
                        <div key={name} className="pr-uploaded-item">
                          <span>📎 {name}</span>
                          <button type="button" onClick={() => setCvUploads((prev) => prev.filter((n) => n !== name))}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 7 - Agreement */}
              <div className="pr-section">
                <p className="pr-section__label">Step 7 - Agreement</p>
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
