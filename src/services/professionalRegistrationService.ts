const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/avapharmacy/api/v1').replace(/\/$/, '')

const REGISTRATION_ENDPOINT = `${API_BASE_URL}/professionals/register/`

export type ProfessionalRegistrationType = 'doctor' | 'pediatrician' | 'lab_partner'

export interface LabPartnerOption {
  id: number
  reference: string
  name: string
  location: string
  accreditation: string
}

export interface ProfessionalRegistrationResponse {
  detail: string
  registration_type: string
  registration_type_display: string
  application: {
    id: number
    reference?: string
    status: string
  }
  next_steps: string[]
}

export interface ProfessionalResubmissionApplication {
  id: number
  reference?: string
  name: string
  email: string
  type?: string
  provider_type?: string
  specialty?: string
  status: string
  status_note?: string
  documents?: Array<{
    id: number
    name: string
    file?: string
    status?: string
    note?: string
    uploaded_at?: string
  }>
}

export interface ProfessionalResubmissionDetail {
  detail: string
  requested_documents_note?: string
  application: ProfessionalResubmissionApplication
}

export interface ProfessionalResubmissionResponse extends ProfessionalResubmissionDetail {
  uploaded_count: number
}

export class ProfessionalRegistrationError extends Error {
  fieldErrors: Record<string, string>

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ProfessionalRegistrationError'
    this.fieldErrors = fieldErrors
  }
}

const extractFieldErrors = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') {
    return {}
  }

  const asRecord = payload as Record<string, unknown>
  const nestedError = asRecord.error
  const nestedErrors = asRecord.errors
  const details = nestedError && typeof nestedError === 'object'
    ? (nestedError as Record<string, unknown>).details
    : undefined
  const altDetails = nestedErrors && typeof nestedErrors === 'object'
    ? (nestedErrors as Record<string, unknown>).details
    : undefined
  const source = (details && typeof details === 'object')
    ? details as Record<string, unknown>
    : (altDetails && typeof altDetails === 'object')
        ? altDetails as Record<string, unknown>
        : asRecord

  const pickMessage = (value: unknown): string | undefined => {
    if (typeof value === 'string') return value
    if (Array.isArray(value)) {
      for (const item of value) {
        const msg = pickMessage(item)
        if (msg) return msg
      }
      return undefined
    }
    if (value && typeof value === 'object') {
      for (const item of Object.values(value as Record<string, unknown>)) {
        const msg = pickMessage(item)
        if (msg) return msg
      }
    }
    return undefined
  }

  return Object.entries(source).reduce<Record<string, string>>((acc, [key, value]) => {
    if (key === 'error' || key === 'detail') {
      return acc
    }
    const msg = pickMessage(value)
    if (msg) acc[key] = msg
    return acc
  }, {})
}

const compactText = (value: string) => value
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&quot;/g, '"')
  .replace(/&#x27;|&#39;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim()

const extractMessage = (payload: unknown, fallback: string) => {
  if (typeof payload === 'string') {
    const text = compactText(payload)
    return text ? text.slice(0, 1000) : fallback
  }

  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  const asRecord = payload as Record<string, unknown>
  if (typeof asRecord.detail === 'string') {
    return asRecord.detail
  }

  const nestedError = asRecord.error
  if (nestedError && typeof nestedError === 'object') {
    const message = (nestedError as Record<string, unknown>).message
    if (typeof message === 'string') {
      return message
    }
  }

  return fallback
}

const handleResponse = async <T,>(response: Response): Promise<T> => {
  const rawBody = await response.text().catch(() => '')
  const payload = rawBody
    ? (() => {
        try {
          return JSON.parse(rawBody)
        } catch {
          return rawBody
        }
      })()
    : null
  if (response.ok) {
    return payload as T
  }

  throw new ProfessionalRegistrationError(
    extractMessage(payload, `Request failed with status ${response.status}.`),
    extractFieldErrors(payload),
  )
}

export const professionalRegistrationService = {
  async listLabPartners() {
    const response = await fetch(`${API_BASE_URL}/professionals/lab-partners/`)
    return handleResponse<LabPartnerOption[]>(response)
  },

  async submit(type: ProfessionalRegistrationType, formData: FormData) {
    formData.set('type', type)
    const response = await fetch(REGISTRATION_ENDPOINT, {
      method: 'POST',
      body: formData,
    })
    return handleResponse<ProfessionalRegistrationResponse>(response)
  },

  async getResubmission(token: string) {
    const response = await fetch(`${API_BASE_URL}/professionals/applications/resubmissions/${encodeURIComponent(token)}/`)
    return handleResponse<ProfessionalResubmissionDetail>(response)
  },

  async submitResubmission(token: string, formData: FormData) {
    const response = await fetch(`${API_BASE_URL}/professionals/applications/resubmissions/${encodeURIComponent(token)}/`, {
      method: 'POST',
      body: formData,
    })
    return handleResponse<ProfessionalResubmissionResponse>(response)
  },
}
