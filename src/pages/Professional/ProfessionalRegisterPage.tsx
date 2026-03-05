import { useEffect, useState } from 'react'
import {
  professionalRegistrationService,
  ProfessionalRegistrationError,
  type LabPartnerOption,
} from '../../services/professionalRegistrationService'
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

const PROFESSIONAL_TYPE_MAP: Record<ProfType, string> = {
  Doctor: 'doctor',
  Pediatrician: 'pediatrician',
  'Lab Partner': 'lab_partner',
  'Lab Technician': 'lab_technician',
}

const API_TO_FORM_ERROR_MAP: Record<string, string> = {
  license_number: 'license',
  license_board: 'licenseBoard',
  license_country: 'licenseCountry',
  license_expiry: 'licenseExpiry',
  id_number: 'idNumber',
  partner_id: 'labPartnerId',
  payout_method: 'payoutMethod',
  payout_account: 'payoutAccount',
  years_experience: 'experience',
  background_consent: 'backgroundConsent',
  compliance_declaration: 'complianceDeclaration',
  agreed_to_terms: 'terms',
}

const mergeFiles = (current: File[], incoming: File[]) => {
  const seen = new Set(current.map((file) => `${file.name}:${file.size}`))
  const next = [...current]
  for (const file of incoming) {
    const key = `${file.name}:${file.size}`
    if (!seen.has(key)) {
      seen.add(key)
      next.push(file)
    }
  }
  return next
}

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
  const [uploadedDocs, setUploadedDocs] = useState<File[]>([])
  const [cvUploads, setCvUploads] = useState<File[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [successDetail, setSuccessDetail] = useState('')
  const [successSteps, setSuccessSteps] = useState<string[]>([])
  const [labPartners, setLabPartners] = useState<LabPartnerOption[]>([])
  const [labPartnerError, setLabPartnerError] = useState('')

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

  const set = (field: keyof ReturnType<typeof blank>, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  useEffect(() => {
    let cancelled = false

    const loadPartners = async () => {
      try {
        const data = await professionalRegistrationService.listLabPartners()
        if (!cancelled) {
          setLabPartners(data)
          setLabPartnerError('')
        }
      } catch (error) {
        if (!cancelled) {
          setLabPartners([])
          setLabPartnerError(
            error instanceof Error ? error.message : 'Unable to load lab partners right now.',
          )
        }
      }
    }

    loadPartners()
    return () => {
      cancelled = true
    }
  }, [])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    setErrors({})
    if (!validate() || !type) return

    const formData = new FormData()
    formData.append('type', PROFESSIONAL_TYPE_MAP[type])
    formData.append('name', form.name.trim())
    formData.append('email', form.email.trim())
    formData.append('phone', form.phone.trim())
    formData.append('license', form.license.trim())
    formData.append('licenseBoard', form.licenseBoard.trim())
    formData.append('licenseCountry', form.licenseCountry.trim())
    formData.append('licenseExpiry', form.licenseExpiry.trim())
    formData.append('idNumber', form.idNumber.trim())
    formData.append('specialty', form.specialty)
    formData.append('facility', form.facility.trim())
    formData.append('labName', form.labName.trim())
    formData.append('labLocation', form.labLocation.trim())
    formData.append('labAccreditation', form.labAccreditation.trim())
    formData.append('labPartnerId', form.labPartnerId)
    formData.append('experience', form.experience ? String(form.experience) : '')
    formData.append('availability', form.availability.trim())
    formData.append('fee', form.fee ? String(form.fee) : '')
    formData.append('county', form.county.trim())
    formData.append('address', form.address.trim())
    formData.append('bio', form.bio.trim())
    formData.append('payoutMethod', form.payoutMethod)
    formData.append('payoutAccount', form.payoutAccount.trim())
    formData.append('ref1Name', form.ref1Name.trim())
    formData.append('ref1Email', form.ref1Email.trim())
    formData.append('ref1Phone', form.ref1Phone.trim())
    formData.append('ref2Name', form.ref2Name.trim())
    formData.append('ref2Email', form.ref2Email.trim())
    formData.append('ref2Phone', form.ref2Phone.trim())
    formData.append('backgroundConsent', String(form.backgroundConsent))
    formData.append('complianceDeclaration', String(form.complianceDeclaration))
    formData.append('agreedToTerms', String(form.agreedToTerms))
    formData.append('languages', JSON.stringify(form.languages))
    formData.append('consultModes', JSON.stringify(form.consultModes))
    formData.append('docChecklist', JSON.stringify(form.docChecklist))

    for (const file of uploadedDocs) {
      formData.append('documents', file)
    }
    for (const file of cvUploads) {
      formData.append('cv_files', file)
    }

    setSubmitting(true)

    try {
      const response = await professionalRegistrationService.submit(formData)
      setSuccessDetail(response.detail)
      setSuccessSteps(response.next_steps)
      setSubmitted(true)
      setErrors({})
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      if (error instanceof ProfessionalRegistrationError) {
        const mappedErrors = Object.entries(error.fieldErrors).reduce<Record<string, string>>((acc, [key, value]) => {
          acc[API_TO_FORM_ERROR_MAP[key] ?? key] = value
          return acc
        }, {})
        setErrors((prev) => ({ ...prev, ...mappedErrors }))
        setSubmitError(error.message)
      } else {
        setSubmitError('Unable to submit your application right now. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="pr-page">
        <div className="pr-success">
          <div className="pr-success__icon">✓</div>
          <h1 className="pr-success__title">Application submitted!</h1>
          <p className="pr-success__sub">
            {successDetail || <>Thank you, <strong>{form.name}</strong>. Your {type?.toLowerCase()} application is now under review.</>}
          </p>
          <div className="pr-success__timeline">
            {(successSteps.length > 0 ? successSteps : [
              'Application received',
              'Document review',
              'Background & credentials check',
              'Onboarding call scheduled',
              'Go live on AVA Health',
            ]).map((label, index) => (
              <div key={label} className={`pr-timeline-step ${index === 0 ? 'pr-timeline-step--done' : ''}`}>
                <div className="pr-timeline-step__dot">{index === 0 ? '✓' : String(index + 1)}</div>
                <div>
                  <span className="pr-timeline-step__label">{label}</span>
                  {index === 1 && <span className="pr-timeline-step__note">24–48 hours</span>}
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
                          {labPartnerError && <p className="pr-field-error">{labPartnerError}</p>}
                          {labPartners.length === 0 && (
                            <p className="pr-hint">No verified lab partners are available yet.</p>
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
                      const files = Array.from(e.target.files ?? [])
                      setUploadedDocs((prev) => mergeFiles(prev, files))
                      e.currentTarget.value = ''
                    }}
                  />
                  {uploadedDocs.length > 0 && (
                    <div className="pr-uploaded-list">
                      {uploadedDocs.map((file) => (
                        <div key={`${file.name}:${file.size}`} className="pr-uploaded-item">
                          <span>📄 {file.name}</span>
                          <button type="button" onClick={() => setUploadedDocs((prev) => prev.filter((item) => item !== file))}>Remove</button>
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
                      const files = Array.from(e.target.files ?? [])
                      setCvUploads((prev) => mergeFiles(prev, files))
                      e.currentTarget.value = ''
                    }}
                  />
                  {cvUploads.length > 0 && (
                    <div className="pr-uploaded-list">
                      {cvUploads.map((file) => (
                        <div key={`${file.name}:${file.size}`} className="pr-uploaded-item">
                          <span>📎 {file.name}</span>
                          <button type="button" onClick={() => setCvUploads((prev) => prev.filter((item) => item !== file))}>Remove</button>
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
                {submitError && <p className="pr-field-error">{submitError}</p>}
                <button type="submit" className="pr-submit-btn" disabled={submitting}>
                  {submitting ? 'Submitting application...' : 'Submit application'}
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
