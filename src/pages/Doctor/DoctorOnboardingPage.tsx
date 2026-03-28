import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../lib/apiClient'
import '../../styles/pages/DoctorOnboardingPage.css'

type Step = 1 | 2 | 3 | 4
interface Step1Data { name: string; gender: string; dob: string; phone: string; bio: string }
interface Step2Data { license_number: string; specialty: string; years_experience: string; documents: File[] }
interface Step3Data { consult_fee: string; currency: string; availability: Array<{ day: string; start: string; end: string }> }
interface Step4Data { payout_method: string; payout_account: string }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SPECIALTIES = ['General Medicine', 'Pediatrics', 'Cardiology', 'Dermatology', 'Psychiatry', 'Obstetrics & Gynaecology', 'Orthopaedics', 'ENT', 'Ophthalmology', 'Other']
const STEP_LABELS = ['Personal info', 'Credentials', 'Availability & fees', 'Payout']

function DoctorOnboardingPage() {
  const navigate = useNavigate()
  const docInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [step1, setStep1] = useState<Step1Data>({ name: '', gender: '', dob: '', phone: '', bio: '' })
  const [step2, setStep2] = useState<Step2Data>({ license_number: '', specialty: '', years_experience: '', documents: [] })
  const [step3, setStep3] = useState<Step3Data>({ consult_fee: '', currency: 'KES', availability: [{ day: 'Monday', start: '08:00', end: '17:00' }] })
  const [step4, setStep4] = useState<Step4Data>({ payout_method: 'mpesa', payout_account: '' })

  const validate = (): boolean => {
    setError('')
    if (step === 1 && !step1.name.trim()) { setError('Full name is required.'); return false }
    if (step === 1 && !step1.phone.trim()) { setError('Phone number is required.'); return false }
    if (step === 2 && !step2.license_number.trim()) { setError('Medical license number is required.'); return false }
    if (step === 2 && !step2.specialty) { setError('Please select a specialty.'); return false }
    if (step === 3 && Number(step3.consult_fee) <= 0) { setError('Consult fee must be greater than 0.'); return false }
    if (step === 4 && !step4.payout_account.trim()) { setError('Payout account number is required.'); return false }
    return true
  }

  const next = () => { if (validate()) setStep((s) => Math.min(s + 1, 4) as Step) }
  const back = () => { setError(''); setStep((s) => Math.max(s - 1, 1) as Step) }

  const submitForm = async () => {
    if (!validate()) return
    setSubmitting(true)
    setError('')
    try {
      await apiClient.patch('/doctor/onboarding/profile/', {
        name: step1.name, gender: step1.gender, date_of_birth: step1.dob, phone: step1.phone, bio: step1.bio,
      })
      const fd = new FormData()
      fd.append('medical_license_number', step2.license_number)
      fd.append('specialty', step2.specialty)
      fd.append('years_of_experience', step2.years_experience)
      step2.documents.forEach((f) => fd.append('documents', f))
      await apiClient.post('/doctor/onboarding/documents/', fd)
      await apiClient.patch('/doctor/onboarding/availability/', {
        consult_fee: Number(step3.consult_fee), currency: step3.currency, availability_schedule: step3.availability,
      })
      await apiClient.patch('/doctor/onboarding/payout/', {
        payout_method: step4.payout_method, payout_account_number: step4.payout_account,
      })
      setSubmitted(true)
    } catch {
      setError('Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const addSlot = () => setStep3((s) => ({ ...s, availability: [...s.availability, { day: 'Monday', start: '08:00', end: '17:00' }] }))
  const removeSlot = (i: number) => setStep3((s) => ({ ...s, availability: s.availability.filter((_, idx) => idx !== i) }))
  const updateSlot = (i: number, f: 'day' | 'start' | 'end', v: string) =>
    setStep3((s) => ({ ...s, availability: s.availability.map((sl, idx) => idx === i ? { ...sl, [f]: v } : sl) }))

  if (submitted) {
    return (
      <div className="onboard-page">
        <div className="onboard-success">
          <div className="onboard-success__icon">✓</div>
          <h2>Application submitted!</h2>
          <p>Your profile is under review. You'll be notified once verified.</p>
          <button className="btn btn--primary" type="button" onClick={() => navigate('/doctor/dashboard')}>
            Go to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="onboard-page">
      <div className="onboard-card">
        <div className="onboard-card__header">
          <h1 className="onboard-card__title">Doctor onboarding</h1>
          <p className="onboard-card__sub">Complete all 4 steps to submit your profile for verification.</p>
        </div>

        <div className="onboard-stepper">
          {STEP_LABELS.map((label, i) => {
            const n = (i + 1) as Step
            const done = step > n
            const active = step === n
            return (
              <div key={label} className={`onboard-step ${active ? 'onboard-step--active' : ''} ${done ? 'onboard-step--done' : ''}`}>
                <div className="onboard-step__dot">{done ? '✓' : n}</div>
                <span className="onboard-step__label">{label}</span>
                {i < STEP_LABELS.length - 1 && <div className="onboard-step__line" />}
              </div>
            )
          })}
        </div>

        <div className="onboard-body">
          {step === 1 && (
            <div className="onboard-fields">
              <h2 className="onboard-section-title">Personal information</h2>
              <div className="onboard-field">
                <label>Full name *</label>
                <input type="text" value={step1.name} placeholder="Dr. Jane Doe"
                  onChange={(e) => setStep1((s) => ({ ...s, name: e.target.value }))} />
              </div>
              <div className="onboard-field-row">
                <div className="onboard-field">
                  <label>Gender</label>
                  <select value={step1.gender} onChange={(e) => setStep1((s) => ({ ...s, gender: e.target.value }))}>
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
                  </select>
                </div>
                <div className="onboard-field">
                  <label>Date of birth</label>
                  <input type="date" value={step1.dob}
                    onChange={(e) => setStep1((s) => ({ ...s, dob: e.target.value }))} />
                </div>
              </div>
              <div className="onboard-field">
                <label>Phone number *</label>
                <input type="tel" value={step1.phone} placeholder="+254 700 000 000"
                  onChange={(e) => setStep1((s) => ({ ...s, phone: e.target.value }))} />
              </div>
              <div className="onboard-field">
                <label>Bio</label>
                <textarea rows={4} value={step1.bio} placeholder="Brief professional summary…"
                  onChange={(e) => setStep1((s) => ({ ...s, bio: e.target.value }))} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onboard-fields">
              <h2 className="onboard-section-title">Credentials</h2>
              <div className="onboard-field">
                <label>Medical license number *</label>
                <input type="text" value={step2.license_number} placeholder="KE-MED-12345"
                  onChange={(e) => setStep2((s) => ({ ...s, license_number: e.target.value }))} />
              </div>
              <div className="onboard-field-row">
                <div className="onboard-field">
                  <label>Specialty *</label>
                  <select value={step2.specialty} onChange={(e) => setStep2((s) => ({ ...s, specialty: e.target.value }))}>
                    <option value="">Select specialty</option>
                    {SPECIALTIES.map((sp) => <option key={sp}>{sp}</option>)}
                  </select>
                </div>
                <div className="onboard-field">
                  <label>Years of experience</label>
                  <input type="number" min="0" value={step2.years_experience} placeholder="5"
                    onChange={(e) => setStep2((s) => ({ ...s, years_experience: e.target.value }))} />
                </div>
              </div>
              <div className="onboard-field">
                <label>Documents (license scan, degree)</label>
                <input ref={docInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple
                  className="onboard-file-input"
                  onChange={(e) => setStep2((s) => ({ ...s, documents: Array.from(e.target.files ?? []) }))} />
                <button className="btn btn--outline btn--sm" type="button"
                  onClick={() => docInputRef.current?.click()}>
                  Choose files {step2.documents.length > 0 && `(${step2.documents.length} selected)`}
                </button>
                {step2.documents.map((f) => <p key={f.name} className="onboard-file-name">{f.name}</p>)}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="onboard-fields">
              <h2 className="onboard-section-title">Availability &amp; fees</h2>
              <div className="onboard-field-row">
                <div className="onboard-field">
                  <label>Consult fee *</label>
                  <input type="number" min="0" value={step3.consult_fee} placeholder="500"
                    onChange={(e) => setStep3((s) => ({ ...s, consult_fee: e.target.value }))} />
                </div>
                <div className="onboard-field">
                  <label>Currency</label>
                  <select value={step3.currency} onChange={(e) => setStep3((s) => ({ ...s, currency: e.target.value }))}>
                    <option>KES</option><option>USD</option><option>UGX</option><option>TZS</option>
                  </select>
                </div>
              </div>
              <div className="onboard-field">
                <label>Weekly availability</label>
                {step3.availability.map((slot, i) => (
                  <div key={i} className="onboard-slot">
                    <select value={slot.day} onChange={(e) => updateSlot(i, 'day', e.target.value)}>
                      {DAYS.map((d) => <option key={d}>{d}</option>)}
                    </select>
                    <input type="time" value={slot.start} onChange={(e) => updateSlot(i, 'start', e.target.value)} />
                    <span>–</span>
                    <input type="time" value={slot.end} onChange={(e) => updateSlot(i, 'end', e.target.value)} />
                    <button className="onboard-slot__remove" type="button"
                      onClick={() => removeSlot(i)} aria-label="Remove">×</button>
                  </div>
                ))}
                <button className="btn btn--outline btn--sm" type="button" onClick={addSlot}>+ Add slot</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="onboard-fields">
              <h2 className="onboard-section-title">Payout details</h2>
              <div className="onboard-field">
                <label>Payout method</label>
                <div className="onboard-radio-group">
                  {['mpesa', 'bank'].map((m) => (
                    <label key={m} className="onboard-radio">
                      <input type="radio" name="payout_method" value={m}
                        checked={step4.payout_method === m}
                        onChange={() => setStep4((s) => ({ ...s, payout_method: m }))} />
                      {m === 'mpesa' ? 'M-Pesa' : 'Bank transfer'}
                    </label>
                  ))}
                </div>
              </div>
              <div className="onboard-field">
                <label>{step4.payout_method === 'mpesa' ? 'M-Pesa number *' : 'Bank account number *'}</label>
                <input type="text" value={step4.payout_account}
                  placeholder={step4.payout_method === 'mpesa' ? '+254 700 000 000' : 'Account number'}
                  onChange={(e) => setStep4((s) => ({ ...s, payout_account: e.target.value }))} />
              </div>
              <div className="onboard-summary">
                <p className="onboard-summary__title">Review your details</p>
                <div className="onboard-summary__grid">
                  <span>Name</span><span>{step1.name}</span>
                  <span>Specialty</span><span>{step2.specialty}</span>
                  <span>License</span><span>{step2.license_number}</span>
                  <span>Consult fee</span><span>{step3.currency} {step3.consult_fee}</span>
                  <span>Payout</span><span>{step4.payout_method === 'mpesa' ? 'M-Pesa' : 'Bank'} · {step4.payout_account}</span>
                </div>
              </div>
            </div>
          )}

          {error && <p className="onboard-error">{error}</p>}

          <div className="onboard-nav">
            {step > 1 && (
              <button className="btn btn--outline" type="button" onClick={back}>Back</button>
            )}
            {step < 4
              ? <button className="btn btn--primary" type="button" onClick={next}>Save &amp; Continue</button>
              : <button className="btn btn--primary" type="button"
                  onClick={() => void submitForm()} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit for verification'}
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default DoctorOnboardingPage
