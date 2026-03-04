import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './AdminShared.css'
import './JourneyChecklistPage.css'

type ChecklistStatus = 'Ready' | 'Mock Ready' | 'Needs Backend'

interface JourneyModule {
  id: string
  title: string
  owner: string
  status: ChecklistStatus
  description: string
  routes: string[]
  checklist: string[]
}

const STORAGE_KEY = 'ava_journey_checklist_state'

const journeyModules: JourneyModule[] = [
  {
    id: 'admin',
    title: 'Admin Operations',
    owner: 'Administrators',
    status: 'Ready',
    description: 'System oversight across products, users, orders, inventory, prescriptions, doctors, payouts, support, and settings.',
    routes: [
      '/admin',
      '/admin/products',
      '/admin/orders',
      '/admin/inventory',
      '/admin/prescriptions',
      '/admin/doctors',
      '/admin/users',
      '/admin/lab-tests',
      '/admin/support',
    ],
    checklist: [
      'Create or update a product and confirm visibility in catalog pages.',
      'Process an order state transition and open order details.',
      'Adjust inventory as admin and confirm role-based restrictions.',
      'Assign pharmacist / update prescription dispatch state.',
      'Handle one support ticket from Open to Resolved.',
    ],
  },
  {
    id: 'pediatric',
    title: 'Pediatrician Workflow',
    owner: 'Pediatricians',
    status: 'Ready',
    description: 'Consultation queue, guardian consents, pediatric prescriptions, child profiles, and earnings.',
    routes: ['/pediatrician/register', '/pediatrician/dashboard'],
    checklist: [
      'Switch doctor profile and confirm consultation queue loads.',
      'Mark at least one guardian consent as granted.',
      'Create pediatric prescription with child-safe dosage notes.',
      'Open child profiles and validate guardian linkage.',
    ],
  },
  {
    id: 'lab',
    title: 'Laboratory Workflow',
    owner: 'Lab Technicians / Customers',
    status: 'Ready',
    description: 'Lab test booking, request tracking, technician assignment, result upload, and completion acknowledgement.',
    routes: ['/labaratory', '/labaratory/dashboard'],
    checklist: [
      'Book a lab test from customer lab services page.',
      'Assign technician and move status in lab dashboard.',
      'Upload result summary and set request to result-ready/completed.',
      'Confirm test catalog changes from admin lab-tests reflect here.',
    ],
  },
  {
    id: 'pharmacy',
    title: 'Pharmacy Review Workflow',
    owner: 'Pharmacists',
    status: 'Mock Ready',
    description: 'Prescription queue review, safety checks, decisioning, batch actions, and audit export.',
    routes: ['/pharmacist', '/pharmacist/review/RX-2040', '/admin/prescriptions'],
    checklist: [
      'Review one prescription and set decision to Approved/Clarification/Rejected.',
      'Use batch approve from pharmacist dashboard.',
      'Export pharmacist audit log CSV.',
      'Verify dispatch progression from admin prescription page.',
    ],
  },
  {
    id: 'prescription',
    title: 'Prescription Upload & Fulfillment',
    owner: 'Customers + Pharmacy',
    status: 'Mock Ready',
    description: 'Upload one or more files, track review state, and add approved medication lines to cart.',
    routes: ['/prescriptions', '/prescriptions/history', '/cart'],
    checklist: [
      'Upload at least one new prescription file.',
      'Open prescription details and verify status metadata.',
      'Add approved medication items to cart via CTA.',
      'Proceed through checkout and order confirmation.',
    ],
  },
  {
    id: 'ecommerce',
    title: 'E-commerce Journey',
    owner: 'Customers',
    status: 'Mock Ready',
    description: 'Search, filter, browse product detail, stock source visibility, cart, and checkout.',
    routes: ['/', '/products', '/product/1', '/cart', '/checkout'],
    checklist: [
      'Use header search to land on filtered products list.',
      'Apply product filters and sorting in listing page.',
      'Add a branch-stock and warehouse-stock item to cart.',
      'Complete 3-step checkout to order confirmation.',
    ],
  },
]

const readState = () => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed ? parsed as Record<string, boolean> : {}
  } catch {
    return {}
  }
}

function JourneyChecklistPage() {
  const navigate = useNavigate()
  const [checks, setChecks] = useState<Record<string, boolean>>(() => readState())

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checks))
  }, [checks])

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

  const totals = useMemo(() => {
    const totalSteps = journeyModules.reduce((sum, module) => sum + module.checklist.length, 0)
    const completedSteps = Object.values(checks).filter(Boolean).length
    const percent = totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100)
    return { totalSteps, completedSteps, percent }
  }, [checks])

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/admin')
  }

  const toggleCheck = (key: string) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const markModuleComplete = (module: JourneyModule) => {
    setChecks((prev) => {
      const next = { ...prev }
      module.checklist.forEach((_, index) => {
        next[`${module.id}:${index}`] = true
      })
      return next
    })
  }

  return (
    <div className="admin-page journey-checklist">
      <div className="admin-page__header">
        <div>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>
            Back
          </button>
          <h1>Journey Checklist</h1>
          <p className="journey-checklist__subtitle">
            End-to-end validation board for Admin, Pediatrician, Laboratory, Pharmacy, Prescription, and E-commerce journeys.
          </p>
        </div>
      </div>

      <div className="journey-progress">
        <div className="journey-progress__header">
          <strong>QA Progress</strong>
          <span>{totals.completedSteps}/{totals.totalSteps} steps complete</span>
        </div>
        <div className="journey-progress__bar">
          <div className="journey-progress__fill" style={{ width: `${totals.percent}%` }} />
        </div>
      </div>

      <div className="journey-grid">
        {journeyModules.map((module) => (
          <article key={module.id} className="journey-card">
            <div className="journey-card__header">
              <div>
                <h2>{module.title}</h2>
                <p className="journey-card__owner">Owner: {module.owner}</p>
              </div>
              <span className={`journey-status journey-status--${module.status.toLowerCase().replace(' ', '-')}`}>
                {module.status}
              </span>
            </div>

            <p className="journey-card__description">{module.description}</p>

            <div className="journey-card__section">
              <strong>Entry URLs</strong>
              <ul>
                {module.routes.map((route) => (
                  <li key={route}>
                    <Link to={route}>{origin}{route}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="journey-card__section">
              <strong>Test Checklist</strong>
              <ul className="journey-steps">
                {module.checklist.map((step, index) => {
                  const key = `${module.id}:${index}`
                  return (
                    <li key={key}>
                      <label>
                        <input
                          type="checkbox"
                          checked={Boolean(checks[key])}
                          onChange={() => toggleCheck(key)}
                        />
                        <span>{step}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="journey-card__actions">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => markModuleComplete(module)}>
                Mark Module Tested
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default JourneyChecklistPage
