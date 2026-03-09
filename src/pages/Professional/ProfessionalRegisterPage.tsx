import { useEffect, useMemo, useRef, useState } from 'react'
import {
  professionalRegistrationService,
  ProfessionalRegistrationError,
  type LabPartnerOption,
  type ProfessionalRegistrationType,
} from '../../services/professionalRegistrationService'
import './ProfessionalRegisterPage.css'

type ProfType = 'Doctor' | 'Pediatrician' | 'Lab Partner' | 'Lab Technician'

const DOCTOR_SPECIALTIES = [
  'General Medicine', 'Family Medicine', 'Internal Medicine', 'Cardiology',
  'Dermatology', 'Gynaecology & Obstetrics', 'Orthopaedics', 'ENT (Ear, Nose & Throat)',
  'Neurology', 'Oncology', 'Psychiatry & Mental Health', 'Ophthalmology',
  'Gastroenterology', 'Nephrology', 'Endocrinology', 'Pulmonology',
  'Urology', 'Rheumatology', 'General Surgery', 'Anaesthesiology',
]

const PEDIATRICIAN_SPECIALTIES = [
  'General Paediatrics', 'Neonatology', 'Paediatric Cardiology', 'Paediatric Neurology',
  'Paediatric Oncology', 'Paediatric Surgery', 'Paediatric Pulmonology',
  'Paediatric Gastroenterology', 'Paediatric Endocrinology', 'Paediatric Nephrology',
  'Developmental Paediatrics', 'Paediatric Emergency Medicine', 'Paediatric Infectious Disease',
]

const DOCTOR_DOCS = [
  'Medical licence (KMB-issued)', 'National ID / Passport',
  'Professional indemnity insurance', 'Certificate of good standing',
  'Clinic / hospital affiliation letter',
]

const PEDIATRICIAN_DOCS = [
  'Paediatric specialist certificate', 'National ID / Passport',
  'Professional indemnity insurance', 'Certificate of good standing',
  'Hospital / NICU affiliation letter',
]

const LAB_PARTNER_DOCS = [
  'Lab facility licence', 'Accreditation certificate',
  'Company registration', 'Professional indemnity insurance',
  'Quality assurance policy',
]

const LAB_TECH_DOCS = [
  'Lab technician licence', 'National ID / Passport',
  'Professional indemnity insurance', 'Certificate of good standing',
]

const LAB_TECH_SPECIALTIES = [
  'Phlebotomy', 'Clinical Chemistry', 'Haematology',
  'Microbiology', 'Pathology', 'Radiology',
]

const LANGUAGES = [
  'Afrikaans', 'Akan', 'Albanian', 'Amharic', 'Arabic', 'Armenian', 'Assamese', 'Azerbaijani',
  'Bambara', 'Basque', 'Belarusian', 'Bengali', 'Berber', 'Bhojpuri', 'Bosnian', 'Bulgarian',
  'Burmese', 'Catalan', 'Cebuano', 'Chichewa', 'Chinese (Cantonese)', 'Chinese (Mandarin)',
  'Corsican', 'Croatian', 'Czech', 'Danish', 'Dholuo', 'Dutch', 'English', 'Esperanto',
  'Estonian', 'Ewe', 'Faroese', 'Filipino', 'Finnish', 'French', 'Frisian', 'Galician',
  'Georgian', 'German', 'Greek', 'Gujarati', 'Haitian Creole', 'Hausa', 'Hawaiian',
  'Hebrew', 'Hindi', 'Hmong', 'Hungarian', 'Icelandic', 'Igbo', 'Indonesian', 'Irish',
  'Italian', 'Japanese', 'Javanese', 'Kannada', 'Kazakh', 'Kikuyu', 'Kinyarwanda',
  'Kirghiz', 'Korean', 'Kurdish', 'Lao', 'Latin', 'Latvian', 'Lithuanian', 'Luganda',
  'Luhya', 'Luo', 'Luxembourgish', 'Macedonian', 'Maasai', 'Malagasy', 'Malay',
  'Malayalam', 'Maltese', 'Maori', 'Marathi', 'Mongolian', 'Nepali', 'Norwegian',
  'Odia', 'Pashto', 'Persian', 'Polish', 'Portuguese', 'Punjabi', 'Romanian', 'Russian',
  'Samoan', 'Sanskrit', 'Scots Gaelic', 'Serbian', 'Sesotho', 'Setswana', 'Shona',
  'Sindhi', 'Sinhala', 'Slovak', 'Slovenian', 'Somali', 'Spanish', 'Sundanese',
  'Swahili', 'Swedish', 'Tagalog', 'Tamil', 'Tatar', 'Telugu', 'Thai', 'Tigrinya',
  'Tongan', 'Turkish', 'Turkmen', 'Ukrainian', 'Urdu', 'Uzbek', 'Vietnamese', 'Welsh',
  'Wolof', 'Xhosa', 'Yiddish', 'Yoruba', 'Zulu',
  'Kamba', 'Giriama', 'Meru', 'Embu', 'Kalenjin', 'Taita', 'Turkana', 'Samburu',
]
const PAYOUT_METHODS = ['M-Pesa', 'Bank Transfer'] as const

const PROFESSIONAL_TYPE_MAP: Record<ProfType, string> = {
  Doctor: 'doctor',
  Pediatrician: 'pediatrician',
  'Lab Partner': 'lab_partner',
  'Lab Technician': 'lab_technician',
}

const API_TO_FORM_ERROR_MAP: Record<string, string> = {
  type: 'type',
  name: 'name',
  email: 'email',
  phone: 'phone',
  license: 'license',
  license_number: 'license',
  licenseBoard: 'licenseBoard',
  license_board: 'licenseBoard',
  licenseCountry: 'licenseCountry',
  license_country: 'licenseCountry',
  licenseExpiry: 'licenseExpiry',
  license_expiry: 'licenseExpiry',
  idNumber: 'idNumber',
  id_number: 'idNumber',
  specialty: 'specialty',
  facility: 'facility',
  labName: 'labName',
  labLocation: 'labLocation',
  labAccreditation: 'labAccreditation',
  labPartnerId: 'labPartnerId',
  partner_id: 'labPartnerId',
  payoutMethod: 'payoutMethod',
  payout_method: 'payoutMethod',
  payoutAccount: 'payoutAccount',
  payout_account: 'payoutAccount',
  experience: 'experience',
  years_experience: 'experience',
  languages: 'languages',
  availability: 'availability',
  availability_hours: 'availability',
  backgroundConsent: 'backgroundConsent',
  background_consent: 'backgroundConsent',
  complianceDeclaration: 'complianceDeclaration',
  compliance_declaration: 'complianceDeclaration',
  agreedToTerms: 'terms',
  agreed_to_terms: 'terms',
  documentNames: 'docChecklist',
  document_names: 'docChecklist',
  cvNames: 'docChecklist',
  cv_names: 'docChecklist',
}

const mergeFiles = (current: File[], incoming: File[]) => {
  const seen = new Set(current.map((f) => `${f.name}:${f.size}`))
  return [...current, ...incoming.filter((f) => !seen.has(`${f.name}:${f.size}`))]
}

const blank = () => ({
  name: '', email: '', phone: '',
  license: '', licenseBoard: '', licenseCountry: 'Kenya', licenseExpiry: '', idNumber: '',
  specialty: '', facility: '', labName: '', labLocation: '', labAccreditation: '',
  labPartnerId: '', experience: '', availability: '', fee: '',
  county: '', address: '', bio: '',
  languages: ['English', 'Swahili'] as string[],
  payoutMethod: 'M-Pesa' as (typeof PAYOUT_METHODS)[number],
  payoutAccount: '',
  ref1Name: '', ref1Email: '', ref1Phone: '',
  ref2Name: '', ref2Email: '', ref2Phone: '',
  docChecklist: [] as string[],
  backgroundConsent: false, complianceDeclaration: false, agreedToTerms: false,
})

const STEPS = ['Role', 'Personal', 'Credentials', 'Practice', 'References', 'Documents', 'Confirm']
const TOTAL_STEPS = STEPS.length
const UI_TEST_MODE = true

const ROLE_CARDS: Array<{ type: ProfType; icon: React.ReactNode; tagline: string; perks: string[] }> = [
  {
    type: 'Doctor',
    tagline: 'General practitioners & specialists',
    perks: ['Video & chat consultations', 'Electronic prescription tools', 'Same-day M-Pesa payouts'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="7.5" r="3.5"/>
        <path d="M5 19.5c1.6-3.5 11.4-3.5 14 0"/>
        <path d="M16.5 12.5v4M14.5 14.5h4"/>
      </svg>
    ),
  },
  {
    type: 'Pediatrician',
    tagline: 'Infant, child & adolescent health',
    perks: ['Child-focused patient pool', 'Specialised consultation flows', 'Flexible scheduling'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="7" r="3"/>
        <path d="M7 19c1-3 9-3 10 0"/>
        <path d="M9.5 11.5c.6 1.4 4.4 1.4 5 0"/>
      </svg>
    ),
  },
  {
    type: 'Lab Partner',
    tagline: 'Diagnostic labs & sample collection',
    perks: ['Connect with 12,000+ patients', 'Integrated results delivery', 'Verified partner badge'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 3v8l-5 8h16l-5-8V3"/>
        <path d="M7 8h10"/>
        <circle cx="14.5" cy="17" r="1"/>
      </svg>
    ),
  },
  {
    type: 'Lab Technician',
    tagline: 'Sample collection & analysis',
    perks: ['Work with verified lab partners', 'Digital workflow tools', 'On-demand patient requests'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2"/>
        <path d="M3 10h18"/>
        <path d="M8 6v-2h8v2"/>
        <circle cx="12" cy="14" r="1"/>
      </svg>
    ),
  },
]

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" width="13" height="13">
      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function Field({ label, required, optional, error, hint, children }: {
  label: string; required?: boolean; optional?: boolean; error?: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div className={`pr-field ${error ? 'pr-field--error' : ''}`}>
      <label className="pr-field__label">
        {label}
        {!UI_TEST_MODE && required && <span className="pr-field__req">Required</span>}
        {optional && <span className="pr-field__opt">Optional</span>}
      </label>
      {children}
      {hint && !error && <p className="pr-field__hint">{hint}</p>}
      {error && <p className="pr-field__err">{error}</p>}
    </div>
  )
}

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
  const [currentStep, setCurrentStep] = useState(1)
  const [langOpen, setLangOpen] = useState(false)
  const [langQuery, setLangQuery] = useState('')
  const [langActiveIndex, setLangActiveIndex] = useState(-1)
  const langRef = useRef<HTMLDivElement | null>(null)
  const langTriggerRef = useRef<HTMLButtonElement | null>(null)
  const langSearchRef = useRef<HTMLInputElement | null>(null)

  const filteredLanguages = useMemo(() => {
    const query = langQuery.trim().toLowerCase()
    if (!query) return LANGUAGES
    return LANGUAGES.filter((lang) => lang.toLowerCase().includes(query))
  }, [langQuery])

  useEffect(() => {
    if (!langOpen) return
    const handleClick = (event: MouseEvent) => {
      if (!langRef.current) return
      if (!langRef.current.contains(event.target as Node)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [langOpen])

  useEffect(() => {
    if (!langOpen) {
      setLangQuery('')
      setLangActiveIndex(-1)
      return
    }
    setTimeout(() => langSearchRef.current?.focus(), 0)
  }, [langOpen])

  useEffect(() => {
    if (!langOpen) return
    setLangActiveIndex(filteredLanguages.length > 0 ? 0 : -1)
  }, [filteredLanguages, langOpen])

  const specialties = type === 'Doctor' ? DOCTOR_SPECIALTIES
    : type === 'Pediatrician' ? PEDIATRICIAN_SPECIALTIES
    : type === 'Lab Technician' ? LAB_TECH_SPECIALTIES
    : []

  const requiredDocs = type === 'Doctor' ? DOCTOR_DOCS
    : type === 'Pediatrician' ? PEDIATRICIAN_DOCS
    : type === 'Lab Partner' ? LAB_PARTNER_DOCS
    : LAB_TECH_DOCS

  const set = <K extends keyof ReturnType<typeof blank>>(key: K, value: ReturnType<typeof blank>[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const toggleLanguage = (lang: string) =>
    set('languages', form.languages.includes(lang)
      ? form.languages.filter((l) => l !== lang)
      : [...form.languages, lang])

  const clearLanguages = () => set('languages', [])

  const handleLangKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!langOpen) return
    if (event.key === 'Escape') {
      event.preventDefault()
      setLangOpen(false)
      langTriggerRef.current?.focus()
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (filteredLanguages.length === 0) return
      setLangActiveIndex((prev) => {
        const next = event.key === 'ArrowDown' ? prev + 1 : prev - 1
        if (next < 0) return filteredLanguages.length - 1
        if (next >= filteredLanguages.length) return 0
        return next
      })
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      if (langActiveIndex < 0 || langActiveIndex >= filteredLanguages.length) return
      event.preventDefault()
      const selected = filteredLanguages[langActiveIndex]
      toggleLanguage(selected)
    }
  }

  const toggleDoc = (doc: string) =>
    set('docChecklist', form.docChecklist.includes(doc)
      ? form.docChecklist.filter((d) => d !== doc)
      : [...form.docChecklist, doc])

  const toPayoutMethod = (value: (typeof PAYOUT_METHODS)[number]) =>
    value === 'M-Pesa' ? 'mpesa' : 'bank_transfer'

  useEffect(() => {
    professionalRegistrationService.listLabPartners()
      .then(setLabPartners)
      .catch(() => setLabPartnerError('Unable to load lab partners.'))
  }, [])

  const validateStep = (step: number): boolean => {
    if (UI_TEST_MODE) return true
    const e: Record<string, string> = {}
    if (step === 1) {
      if (!type) e.type = 'Please select your professional type.'
    } else if (step === 2) {
      if (!form.name.trim()) e.name = type === 'Lab Partner' ? 'Primary contact name is required.' : 'Full name is required.'
      if (!form.email.trim()) e.email = 'Email address is required.'
      if (!form.phone.trim()) e.phone = 'Phone number is required.'
      if (type === 'Lab Partner') {
        if (!form.labName.trim()) e.labName = 'Lab name is required.'
        if (!form.labLocation.trim()) e.labLocation = 'Lab location is required.'
      }
    } else if (step === 3) {
      if (type === 'Lab Partner') {
        if (!form.labAccreditation.trim()) e.labAccreditation = 'Accreditation number is required.'
        if (!form.license.trim()) e.license = 'Facility licence number is required.'
      } else {
        if (!form.license.trim()) e.license = 'License number is required.'
        if (!form.licenseBoard.trim()) e.licenseBoard = 'Licensing board is required.'
        if (!form.licenseExpiry.trim()) e.licenseExpiry = 'License expiry date is required.'
        if (!form.idNumber.trim()) e.idNumber = 'ID / Passport number is required.'
        if (!form.specialty) e.specialty = 'Please select a specialty.'
        if (type === 'Lab Technician' && !form.labPartnerId) e.labPartnerId = 'Select a lab partner.'
      }
    } else if (step === 4) {
      if (!form.payoutAccount.trim()) e.payoutAccount = 'Payout account is required.'
    } else if (step === 5) {
      if (!form.backgroundConsent) e.backgroundConsent = 'Background check consent is required.'
      if (!form.complianceDeclaration) e.complianceDeclaration = 'Compliance declaration is required.'
    } else if (step === 7) {
      if (!form.agreedToTerms) e.terms = 'You must agree to the terms to proceed.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const stepForErrors = (fieldErrors: Record<string, string>) => {
    const keys = new Set(Object.keys(fieldErrors))
    if (keys.has('type')) return 1
    if (['name', 'email', 'phone', 'labName', 'labLocation'].some((k) => keys.has(k))) return 2
    if (['license', 'licenseBoard', 'licenseExpiry', 'idNumber', 'specialty', 'labAccreditation', 'labPartnerId'].some((k) => keys.has(k))) return 3
    if (['payoutAccount', 'payoutMethod'].some((k) => keys.has(k))) return 4
    if (['backgroundConsent', 'complianceDeclaration'].some((k) => keys.has(k))) return 5
    if (['docChecklist'].some((k) => keys.has(k))) return 6
    if (keys.has('terms')) return 7
    return currentStep
  }

  const errorSummary = (() => {
    if (UI_TEST_MODE) return []
    const items = new Set<string>()
    if (submitError) items.add(submitError)
    Object.values(errors).forEach((message) => {
      if (message) items.add(message)
    })
    return Array.from(items)
  })()

  const goNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => Math.min(TOTAL_STEPS, s + 1))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const goBack = () => {
    setErrors({})
    setCurrentStep((s) => Math.max(1, s - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    if (!validateStep(7) || !type) return

    const formData = new FormData()
    const registrationType = PROFESSIONAL_TYPE_MAP[type] as ProfessionalRegistrationType
    formData.append('name', form.name.trim())
    formData.append('email', form.email.trim())
    formData.append('phone', form.phone.trim())
    formData.append('license_number', form.license.trim())
    formData.append('license_board', form.licenseBoard.trim())
    formData.append('license_country', form.licenseCountry.trim())
    formData.append('license_expiry', form.licenseExpiry.trim())
    formData.append('id_number', form.idNumber.trim())
    formData.append('specialty', form.specialty)
    if (form.facility.trim()) formData.append('facility', form.facility.trim())
    if (form.labName.trim()) formData.append('lab_name', form.labName.trim())
    if (form.labLocation.trim()) formData.append('lab_location', form.labLocation.trim())
    if (form.labAccreditation.trim()) formData.append('lab_accreditation', form.labAccreditation.trim())
    if (form.labPartnerId) formData.append('partner_id', form.labPartnerId)
    if (form.experience) formData.append('years_experience', String(form.experience))
    if (form.availability.trim()) formData.append('availability', form.availability.trim())
    if (form.fee) formData.append('fee', String(form.fee))
    if (form.county.trim()) formData.append('county', form.county.trim())
    if (form.address.trim()) formData.append('address', form.address.trim())
    if (form.bio.trim()) formData.append('bio', form.bio.trim())
    formData.append('payout_method', toPayoutMethod(form.payoutMethod))
    formData.append('payout_account', form.payoutAccount.trim())
    if (form.ref1Name.trim()) formData.append('ref1_name', form.ref1Name.trim())
    if (form.ref1Email.trim()) formData.append('ref1_email', form.ref1Email.trim())
    if (form.ref1Phone.trim()) formData.append('ref1_phone', form.ref1Phone.trim())
    if (form.ref2Name.trim()) formData.append('ref2_name', form.ref2Name.trim())
    if (form.ref2Email.trim()) formData.append('ref2_email', form.ref2Email.trim())
    if (form.ref2Phone.trim()) formData.append('ref2_phone', form.ref2Phone.trim())
    formData.append('background_consent', String(form.backgroundConsent))
    formData.append('compliance_declaration', String(form.complianceDeclaration))
    formData.append('agreed_to_terms', String(form.agreedToTerms))
    formData.append('languages', JSON.stringify(form.languages))
    formData.append('doc_checklist', JSON.stringify(form.docChecklist))
    uploadedDocs.forEach((file) => formData.append('documents', file))
    cvUploads.forEach((file) => formData.append('cv_files', file))

    setSubmitting(true)
    try {
      const response = await professionalRegistrationService.submit(registrationType, formData)
      setSuccessDetail(response.detail ?? '')
      setSuccessSteps(Array.isArray(response.next_steps) ? response.next_steps : [])
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      if (error instanceof ProfessionalRegistrationError) {
        const mapped = Object.entries(error.fieldErrors).reduce<Record<string, string>>((acc, [k, v]) => {
          acc[API_TO_FORM_ERROR_MAP[k] ?? k] = v
          return acc
        }, {})
        setErrors((prev) => ({ ...prev, ...mapped }))
        setSubmitError(error.message)
        setCurrentStep(stepForErrors(mapped))
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        setSubmitError('Unable to submit your application right now. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="pr-page pr-page--success">
        <div className="pr-success">
          <div className="pr-success__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <h1 className="pr-success__title">Application submitted!</h1>
          <p className="pr-success__sub">
            {successDetail || <>Thank you, <strong>{form.name}</strong>. Your {type?.toLowerCase()} application is under review.</>}
          </p>
          <div className="pr-success__timeline">
            {((successSteps?.length ?? 0) > 0 ? successSteps : [
              'Application received', 'Document review (24–48 hrs)',
              'Background & credentials check', 'Onboarding call scheduled', 'Go live on AVA Health',
            ]).map((label, i) => (
              <div key={label} className={`pr-tl-step ${i === 0 ? 'pr-tl-step--done' : ''}`}>
                <div className="pr-tl-dot">{i === 0 ? <CheckIcon /> : i + 1}</div>
                <span className="pr-tl-label">{label}</span>
              </div>
            ))}
          </div>
          <p className="pr-success__contact">
            Questions? <a href="mailto:professionals@avahealth.co.ke">professionals@avahealth.co.ke</a>
          </p>
        </div>
      </div>
    )
  }

  const progress = Math.round((currentStep / TOTAL_STEPS) * 100)

  return (
    <div className="pr-page">
      {/* ── Header ──────────────────────────────── */}
      <div className="pr-header">
        <div className="pr-header__inner">
          <div className="pr-header__brand">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2a8 8 0 1 0 0 16A8 8 0 0 0 10 2z"/><path d="M10 6v4l3 3"/>
            </svg>
            <span>Join AVA Health</span>
          </div>
          <div className="pr-header__progress">
            <span>{currentStep} of {TOTAL_STEPS}</span>
            <div className="pr-header__bar">
              <div className="pr-header__fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Stepper ──────────────────────────────── */}
      <div className="pr-stepper">
        <div className="pr-stepper__track">
          {STEPS.map((label, i) => {
            const step = i + 1
            const done = step < currentStep
            const active = step === currentStep
            return (
              <div key={step} className={`pr-step-node ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                {i > 0 && <div className={`pr-step-line ${done ? 'done' : ''}`} />}
                <div className="pr-step-circle">
                  {done ? <CheckIcon /> : <span>{step}</span>}
                </div>
                <span className="pr-step-name">{label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Step Content ─────────────────────────── */}
      <div className="pr-content">
        {errorSummary.length > 0 && (
          <div className="pr-error-summary" role="alert" aria-live="polite">
            <p className="pr-error-summary__title">Please fix the following before submitting:</p>
            <ul className="pr-error-summary__list">
              {errorSummary.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Step 1 — Role */}
        {currentStep === 1 && (
          <div className="pr-step">
            <div className="pr-step__head">
              <h2 className="pr-step__title">What best describes you?</h2>
              <p className="pr-step__sub">Choose your role to tailor the registration experience.</p>
            </div>
            <div className="pr-role-grid">
              {ROLE_CARDS.map((card) => (
                <button
                  key={card.type}
                  type="button"
                  className={`pr-role-card ${type === card.type ? 'pr-role-card--selected' : ''}`}
                  onClick={() => { setType(card.type); set('specialty', ''); set('labPartnerId', '') }}
                >
                  {type === card.type && (
                    <span className="pr-role-card__check"><CheckIcon /></span>
                  )}
                  <div className="pr-role-card__icon">{card.icon}</div>
                  <div className="pr-role-card__body">
                    <p className="pr-role-card__title">{card.type}</p>
                    <p className="pr-role-card__tag">{card.tagline}</p>
                    <ul className="pr-role-card__perks">
                      {card.perks.map((perk) => (
                        <li key={perk}>
                          <svg viewBox="0 0 12 12" fill="none" width="11" height="11">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </div>
                </button>
              ))}
            </div>
            {errors.type && <p className="pr-field__err" style={{ marginTop: '0.75rem' }}>{errors.type}</p>}
          </div>
        )}

        {/* Step 2 — Personal */}
        {currentStep === 2 && type && (
          <div className="pr-step">
            <div className="pr-step__head">
              <h2 className="pr-step__title">
                {type === 'Lab Partner' ? 'Primary contact details' : 'Personal information'}
              </h2>
              <p className="pr-step__sub">This is how we'll contact you during the review process.</p>
            </div>
            <div className="pr-fields">
              <Field label={type === 'Lab Partner' ? 'Contact name' : 'Full name'} required error={errors.name}>
                <input
                  type="text"
                  placeholder={type === 'Doctor' || type === 'Pediatrician' ? 'Dr. Jane Mwangi' : 'Alex Kimani'}
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className={errors.name ? 'err' : ''}
                />
              </Field>
              <div className="pr-row">
                <Field label="Email address" required error={errors.email}>
                  <input
                    type="email"
                    placeholder={type === 'Lab Partner' ? 'lab@example.com' : 'doctor@example.com'}
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    className={errors.email ? 'err' : ''}
                  />
                </Field>
                <Field label="Phone number" required error={errors.phone}>
                  <input
                    type="tel"
                    placeholder="+254 700 000 000"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    className={errors.phone ? 'err' : ''}
                  />
                </Field>
              </div>
              {type === 'Lab Partner' && (
                <div className="pr-row">
                  <Field label="Lab name" required error={errors.labName}>
                    <input
                      type="text"
                      placeholder="Ava Diagnostics Ltd"
                      value={form.labName}
                      onChange={(e) => set('labName', e.target.value)}
                      className={errors.labName ? 'err' : ''}
                    />
                  </Field>
                  <Field label="Lab location" required error={errors.labLocation}>
                    <input
                      type="text"
                      placeholder="Westlands, Nairobi"
                      value={form.labLocation}
                      onChange={(e) => set('labLocation', e.target.value)}
                      className={errors.labLocation ? 'err' : ''}
                    />
                  </Field>
                </div>
              )}
              <div className="pr-row">
                <Field label={type === 'Lab Partner' ? 'Years in operation' : 'Years of experience'} optional>
                  <input
                    type="number"
                    min="0" max="60"
                    placeholder="5"
                    value={form.experience}
                    onChange={(e) => set('experience', e.target.value)}
                  />
                </Field>
                <Field label="County / Region" optional>
                  <input
                    type="text"
                    placeholder="Nairobi"
                    value={form.county}
                    onChange={(e) => set('county', e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Brief bio" optional hint={type === 'Lab Partner'
                ? 'Describe your lab, quality standards, and turnaround time.'
                : `Your experience, approach to ${type === 'Doctor' ? 'patient' : 'paediatric'} care, and what patients can expect.`}>
                <textarea
                  rows={3}
                  placeholder="Tell us about yourself..."
                  value={form.bio}
                  onChange={(e) => set('bio', e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {/* Step 3 — Credentials */}
        {currentStep === 3 && type && (
          <div className="pr-step">
            <div className="pr-step__head">
              <h2 className="pr-step__title">
                {type === 'Lab Partner' ? 'Lab credentials' : 'Professional credentials'}
              </h2>
              <p className="pr-step__sub">
                {type === 'Lab Partner'
                  ? 'Provide your lab accreditation and facility details.'
                  : 'Your licence and regulatory details for verification.'}
              </p>
            </div>
            <div className="pr-fields">
              {type === 'Lab Partner' ? (
                <div className="pr-row">
                  <Field label="Accreditation number" required error={errors.labAccreditation}>
                    <input
                      type="text"
                      placeholder="KENAS-ACC-XXXX"
                      value={form.labAccreditation}
                      onChange={(e) => set('labAccreditation', e.target.value)}
                      className={errors.labAccreditation ? 'err' : ''}
                    />
                  </Field>
                  <Field label="Facility licence number" required error={errors.license}>
                    <input
                      type="text"
                      placeholder="LAB-LIC-XXXX"
                      value={form.license}
                      onChange={(e) => set('license', e.target.value)}
                      className={errors.license ? 'err' : ''}
                    />
                  </Field>
                </div>
              ) : (
                <>
                  <div className="pr-row">
                    <Field label="License number" required error={errors.license}>
                      <input
                        type="text"
                        placeholder="KMB-XXXXX"
                        value={form.license}
                        onChange={(e) => set('license', e.target.value)}
                        className={errors.license ? 'err' : ''}
                      />
                    </Field>
                    <Field label="Licensing board" required error={errors.licenseBoard}>
                      <input
                        type="text"
                        placeholder="KMPDC / KMLTTB"
                        value={form.licenseBoard}
                        onChange={(e) => set('licenseBoard', e.target.value)}
                        className={errors.licenseBoard ? 'err' : ''}
                      />
                    </Field>
                  </div>
                  <div className="pr-row">
                    <Field label="License expiry" required error={errors.licenseExpiry}>
                      <input
                        type="date"
                        value={form.licenseExpiry}
                        onChange={(e) => set('licenseExpiry', e.target.value)}
                        className={errors.licenseExpiry ? 'err' : ''}
                      />
                    </Field>
                    <Field label="License country" optional>
                      <input
                        type="text"
                        placeholder="Kenya"
                        value={form.licenseCountry}
                        onChange={(e) => set('licenseCountry', e.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="pr-row">
                    <Field label="ID / Passport number" required error={errors.idNumber}>
                      <input
                        type="text"
                        placeholder="ID or Passport"
                        value={form.idNumber}
                        onChange={(e) => set('idNumber', e.target.value)}
                        className={errors.idNumber ? 'err' : ''}
                      />
                    </Field>
                    <Field label={type === 'Lab Technician' ? 'Lab specialty' : 'Specialty'} required error={errors.specialty}>
                      <select
                        value={form.specialty}
                        onChange={(e) => set('specialty', e.target.value)}
                        className={errors.specialty ? 'err' : ''}
                      >
                        <option value="">Select specialty</option>
                        {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                  </div>
                  {type === 'Lab Technician' && (
                    <div className="pr-row">
                      <Field label="Lab partner" required error={errors.labPartnerId}>
                        <select
                          value={form.labPartnerId}
                          onChange={(e) => set('labPartnerId', e.target.value)}
                          className={errors.labPartnerId ? 'err' : ''}
                        >
                          <option value="">Select lab partner</option>
                          {labPartners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        {labPartnerError && <p className="pr-field__err">{labPartnerError}</p>}
                        {!labPartnerError && labPartners.length === 0 && (
                          <p className="pr-field__hint">No verified lab partners yet.</p>
                        )}
                      </Field>
                      <Field label="Availability hours" optional error={errors.availability}>
                        <input
                          type="text"
                          placeholder="Mon–Fri, 9am–5pm"
                          value={form.availability}
                          onChange={(e) => set('availability', e.target.value)}
                          className={errors.availability ? 'err' : ''}
                        />
                      </Field>
                    </div>
                  )}
                  {(type === 'Doctor' || type === 'Pediatrician') && (
                    <div className="pr-row">
                      <Field label="Affiliated facility" optional>
                        <input
                          type="text"
                          placeholder="Nairobi Hospital / Independent Practice"
                          value={form.facility}
                          onChange={(e) => set('facility', e.target.value)}
                        />
                      </Field>
                      <Field label="Availability hours" optional error={errors.availability}>
                        <input
                          type="text"
                          placeholder="Mon–Fri, 9am–5pm"
                          value={form.availability}
                          onChange={(e) => set('availability', e.target.value)}
                          className={errors.availability ? 'err' : ''}
                        />
                      </Field>
                    </div>
                  )}
                  {type !== 'Lab Technician' && (
                    <Field label="Languages spoken" optional error={errors.languages}>
                      <div className="pr-lang-select" ref={langRef}>
                        <button
                          type="button"
                          className="pr-lang-trigger"
                          ref={langTriggerRef}
                          aria-haspopup="listbox"
                          aria-expanded={langOpen}
                          onClick={() => setLangOpen((prev) => !prev)}
                        >
                          <span>
                            {form.languages.length === 0
                              ? 'Select languages'
                              : `${form.languages.slice(0, 3).join(', ')}${form.languages.length > 3 ? ` +${form.languages.length - 3} more` : ''}`}
                          </span>
                          <span className={`pr-lang-caret ${langOpen ? 'open' : ''}`}>▾</span>
                        </button>
                        {langOpen && (
                          <div className="pr-lang-menu">
                            <div className="pr-lang-menu__top">
                              <span>{form.languages.length} selected</span>
                              {form.languages.length > 0 && (
                                <button type="button" className="pr-lang-clear" onClick={clearLanguages}>
                                  Clear all
                                </button>
                              )}
                            </div>
                            <div className="pr-lang-search">
                              <input
                                type="text"
                                placeholder="Search languages"
                                value={langQuery}
                                onChange={(e) => setLangQuery(e.target.value)}
                                onKeyDown={handleLangKeyDown}
                                ref={langSearchRef}
                              />
                            </div>
                            <div className="pr-lang-options">
                              {filteredLanguages.length === 0 ? (
                                <p className="pr-lang-empty">No matches found.</p>
                              ) : (
                                filteredLanguages.map((lang, index) => (
                                  <label key={lang} className={`pr-lang-option ${form.languages.includes(lang) ? 'on' : ''} ${index === langActiveIndex ? 'active' : ''}`}>
                                    <input
                                      type="checkbox"
                                      checked={form.languages.includes(lang)}
                                      onChange={() => toggleLanguage(lang)}
                                    />
                                    <span>{lang}</span>
                                  </label>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {form.languages.length > 0 && (
                        <div className="pr-lang-chips">
                          {form.languages.map((lang) => (
                            <button
                              key={lang}
                              type="button"
                              className="pr-pill pr-pill--on"
                              onClick={() => toggleLanguage(lang)}
                            >
                              <CheckIcon />
                              {lang}
                            </button>
                          ))}
                        </div>
                      )}
                    </Field>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 4 — Practice & Payout */}
        {currentStep === 4 && type && (
          <div className="pr-step">
            <div className="pr-step__head">
              <h2 className="pr-step__title">Practice &amp; payout</h2>
              <p className="pr-step__sub">Where you practice and how you'd like to receive earnings.</p>
            </div>
            <div className="pr-fields">
              <Field label="Primary address" optional>
                <input
                  type="text"
                  placeholder="Clinic address or lab location"
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                />
              </Field>
              <div className="pr-row">
                <Field label="Payout method" required error={errors.payoutMethod}>
                  <div className="pr-payout-toggle">
                    {PAYOUT_METHODS.map((method) => (
                      <button
                        key={method}
                        type="button"
                        className={`pr-payout-btn ${form.payoutMethod === method ? 'pr-payout-btn--on' : ''}`}
                        onClick={() => set('payoutMethod', method)}
                      >
                        {method === 'M-Pesa'
                          ? <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="16" height="16"><rect x="4" y="3" width="12" height="14" rx="2"/><path d="M8 7h4M8 10h4M8 13h2"/></svg>
                          : <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="16" height="16"><rect x="2" y="5" width="16" height="10" rx="1.5"/><path d="M2 9h16"/></svg>
                        }
                        {method}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label={form.payoutMethod === 'M-Pesa' ? 'M-Pesa number' : 'Bank account / Paybill'} required error={errors.payoutAccount}>
                  <input
                    type="text"
                    placeholder={form.payoutMethod === 'M-Pesa' ? '0700 000 000' : 'Account number'}
                    value={form.payoutAccount}
                    onChange={(e) => set('payoutAccount', e.target.value)}
                    className={errors.payoutAccount ? 'err' : ''}
                  />
                </Field>
              </div>
              {(type === 'Doctor' || type === 'Pediatrician') && (
                <div className="pr-row">
                  <Field label="Consultation fee" optional hint="Typical range: KSh 1,000 – 5,000">
                    <div className="pr-prefix-wrap">
                      <span className="pr-prefix">KSh</span>
                      <input
                        type="number"
                        min="0"
                        placeholder={type === 'Doctor' ? '1500' : '1200'}
                        value={form.fee}
                        onChange={(e) => set('fee', e.target.value)}
                        className="pr-prefix-input"
                      />
                    </div>
                  </Field>
                  <Field label="Platform commission" optional>
                    <div className="pr-commission-badge">
                      <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
                        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4zm0 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                      </svg>
                      15% per consultation retained by AVA Health to cover platform & support costs.
                    </div>
                  </Field>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5 — References & Compliance */}
        {currentStep === 5 && (
          <div className="pr-step">
            <div className="pr-step__head">
              <h2 className="pr-step__title">References &amp; compliance</h2>
              <p className="pr-step__sub">Provide two professional referees and confirm compliance.</p>
            </div>
            <div className="pr-fields">
              <div className="pr-ref-pair">
                <div className="pr-ref-block">
                  <p className="pr-ref-block__title">Referee 1</p>
                  <Field label="Name">
                    <input type="text" placeholder="Full name" value={form.ref1Name} onChange={(e) => set('ref1Name', e.target.value)} />
                  </Field>
                  <Field label="Email">
                    <input type="email" placeholder="referee@example.com" value={form.ref1Email} onChange={(e) => set('ref1Email', e.target.value)} />
                  </Field>
                  <Field label="Phone">
                    <input type="tel" placeholder="+254 700 000 000" value={form.ref1Phone} onChange={(e) => set('ref1Phone', e.target.value)} />
                  </Field>
                </div>
                <div className="pr-ref-block">
                  <p className="pr-ref-block__title">Referee 2</p>
                  <Field label="Name">
                    <input type="text" placeholder="Full name" value={form.ref2Name} onChange={(e) => set('ref2Name', e.target.value)} />
                  </Field>
                  <Field label="Email">
                    <input type="email" placeholder="referee@example.com" value={form.ref2Email} onChange={(e) => set('ref2Email', e.target.value)} />
                  </Field>
                  <Field label="Phone">
                    <input type="tel" placeholder="+254 700 000 000" value={form.ref2Phone} onChange={(e) => set('ref2Phone', e.target.value)} />
                  </Field>
                </div>
              </div>

              <div className="pr-consent-list">
                <label className={`pr-consent ${errors.backgroundConsent ? 'pr-consent--err' : ''}`}>
                  <input
                    type="checkbox"
                    checked={form.backgroundConsent}
                    onChange={(e) => { set('backgroundConsent', e.target.checked); setErrors((prev) => ({ ...prev, backgroundConsent: '' })) }}
                  />
                  <span>
                    <strong>Background check consent</strong>
                    <em>I consent to background and credential verification checks by AVA Health.</em>
                  </span>
                </label>
                {errors.backgroundConsent && <p className="pr-field__err">{errors.backgroundConsent}</p>}

                <label className={`pr-consent ${errors.complianceDeclaration ? 'pr-consent--err' : ''}`}>
                  <input
                    type="checkbox"
                    checked={form.complianceDeclaration}
                    onChange={(e) => { set('complianceDeclaration', e.target.checked); setErrors((prev) => ({ ...prev, complianceDeclaration: '' })) }}
                  />
                  <span>
                    <strong>Compliance declaration</strong>
                    <em>I confirm there are no ongoing disciplinary actions against me or my facility.</em>
                  </span>
                </label>
                {errors.complianceDeclaration && <p className="pr-field__err">{errors.complianceDeclaration}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Step 6 — Documents */}
        {currentStep === 6 && (
          <div className="pr-step">
            <div className="pr-step__head">
              <h2 className="pr-step__title">Supporting documents</h2>
              <p className="pr-step__sub">Check off what you're submitting and upload your files.</p>
            </div>
            <div className="pr-fields">
              <p className="pr-doc-section-label">Documents included in this application</p>
              <div className="pr-doc-grid">
                {requiredDocs.map((doc) => (
                  <label key={doc} className={`pr-doc-check ${form.docChecklist.includes(doc) ? 'pr-doc-check--on' : ''}`}>
                    <input type="checkbox" checked={form.docChecklist.includes(doc)} onChange={() => toggleDoc(doc)} />
                    <span className="pr-doc-check__box">{form.docChecklist.includes(doc) && <CheckIcon />}</span>
                    <span>{doc}</span>
                  </label>
                ))}
              </div>

              <div className="pr-upload-section">
                <p className="pr-doc-section-label">Upload credentials &amp; certificates</p>
                <label className="pr-file-zone">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="28" height="28" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <span className="pr-file-zone__text">Click to upload or drag &amp; drop</span>
                  <span className="pr-file-zone__hint">PDF, JPG, PNG — max 10 MB each</span>
                  <input
                    type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="pr-file-zone__input"
                    onChange={(e) => {
                      setUploadedDocs((prev) => mergeFiles(prev, Array.from(e.target.files ?? [])))
                      e.currentTarget.value = ''
                    }}
                  />
                </label>
                {uploadedDocs.length > 0 && (
                  <div className="pr-file-list">
                    {uploadedDocs.map((file) => (
                      <div key={`${file.name}:${file.size}`} className="pr-file-item">
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15">
                          <path d="M13 2H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5l-2-3z"/>
                          <path d="M13 2v3h2"/>
                        </svg>
                        <span>{file.name}</span>
                        <button type="button" onClick={() => setUploadedDocs((prev) => prev.filter((f) => f !== file))}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pr-upload-section">
                <p className="pr-doc-section-label">Upload CV / profile <span className="pr-field__opt">Optional</span></p>
                <label className="pr-file-zone pr-file-zone--sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="22" height="22" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="9" y1="13" x2="15" y2="13"/>
                    <line x1="9" y1="17" x2="13" y2="17"/>
                  </svg>
                  <span className="pr-file-zone__text">Upload CV or profile</span>
                  <span className="pr-file-zone__hint">PDF, DOC, DOCX</span>
                  <input
                    type="file" multiple accept=".pdf,.doc,.docx" className="pr-file-zone__input"
                    onChange={(e) => {
                      setCvUploads((prev) => mergeFiles(prev, Array.from(e.target.files ?? [])))
                      e.currentTarget.value = ''
                    }}
                  />
                </label>
                {cvUploads.length > 0 && (
                  <div className="pr-file-list">
                    {cvUploads.map((file) => (
                      <div key={`${file.name}:${file.size}`} className="pr-file-item">
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15">
                          <path d="M13 2H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5l-2-3z"/>
                          <path d="M13 2v3h2"/>
                        </svg>
                        <span>{file.name}</span>
                        <button type="button" onClick={() => setCvUploads((prev) => prev.filter((f) => f !== file))}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 7 — Agreement & Submit */}
        {currentStep === 7 && (
          <div className="pr-step">
            <div className="pr-step__head">
              <h2 className="pr-step__title">Review &amp; submit</h2>
              <p className="pr-step__sub">Almost done — agree to our terms and submit your application.</p>
            </div>
            <div className="pr-fields">
              <div className="pr-summary-card">
                <div className="pr-summary-row">
                  <span>Role</span><strong>{type}</strong>
                </div>
                <div className="pr-summary-row">
                  <span>Name</span><strong>{form.name || '—'}</strong>
                </div>
                <div className="pr-summary-row">
                  <span>Email</span><strong>{form.email || '—'}</strong>
                </div>
                {form.specialty && (
                  <div className="pr-summary-row">
                    <span>Specialty</span><strong>{form.specialty}</strong>
                  </div>
                )}
                <div className="pr-summary-row">
                  <span>Payout</span><strong>{form.payoutMethod} · {form.payoutAccount || '—'}</strong>
                </div>
                <div className="pr-summary-row">
                  <span>Documents</span><strong>{uploadedDocs.length + cvUploads.length} file{uploadedDocs.length + cvUploads.length !== 1 ? 's' : ''} uploaded</strong>
                </div>
              </div>

              <div className="pr-what-next">
                <p className="pr-what-next__title">What happens next?</p>
                <div className="pr-what-next__steps">
                  {['Application received & logged', 'Team reviews your documents (24–48 hrs)', 'Background & credentials check', 'Onboarding call scheduled', 'Profile goes live on AVA Health'].map((s, i) => (
                    <div key={s} className="pr-what-next__step">
                      <span className="pr-what-next__num">{i + 1}</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <label className={`pr-consent pr-consent--terms ${errors.terms ? 'pr-consent--err' : ''}`}>
                  <input
                    type="checkbox"
                    checked={form.agreedToTerms}
                    onChange={(e) => { set('agreedToTerms', e.target.checked); setErrors((prev) => ({ ...prev, terms: '' })) }}
                  />
                  <span>
                    <strong>Terms &amp; conditions</strong>
                    <em>I confirm all information is accurate and agree to AVA Health's{' '}
                      <a href="/terms" target="_blank">Terms of Service</a> and{' '}
                      <a href="/privacy" target="_blank">Privacy Policy</a>.
                    </em>
                  </span>
                </label>
                {errors.terms && <p className="pr-field__err">{errors.terms}</p>}
                {submitError && <p className="pr-submit-error">{submitError}</p>}
                <button type="submit" className="pr-submit-btn" disabled={submitting}>
                  {submitting
                    ? <><span className="pr-spinner" />Submitting application…</>
                    : <>Submit application<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg></>
                  }
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Navigation ────────────────────── */}
      <div className="pr-bottom-nav">
        <div className="pr-bottom-nav__inner">
          <button
            type="button"
            className="pr-nav-back"
            onClick={goBack}
            disabled={currentStep === 1}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15">
              <path d="M13 8H3M7 4l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>

          <span className="pr-nav-step-label">
            <span className="pr-nav-step-label__num">{currentStep}</span>
            <span>/ {TOTAL_STEPS}</span>
            <span className="pr-nav-step-label__name">{STEPS[currentStep - 1]}</span>
          </span>

          {currentStep < TOTAL_STEPS ? (
            <button type="button" className="pr-nav-next" onClick={goNext}>
              Continue
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15">
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <span className="pr-nav-next pr-nav-next--ghost" aria-hidden />
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfessionalRegisterPage
