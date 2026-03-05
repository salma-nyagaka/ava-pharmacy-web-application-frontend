const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/avapharmacy/api/v1').replace(/\/$/, '')

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
  const details = nestedError && typeof nestedError === 'object'
    ? (nestedError as Record<string, unknown>).details
    : undefined
  const source = details && typeof details === 'object' ? details as Record<string, unknown> : asRecord

  return Object.entries(source).reduce<Record<string, string>>((acc, [key, value]) => {
    if (key === 'error' || key === 'detail') {
      return acc
    }
    if (Array.isArray(value) && value.length > 0) {
      acc[key] = String(value[0])
      return acc
    }
    if (typeof value === 'string') {
      acc[key] = value
    }
    return acc
  }, {})
}

const extractMessage = (payload: unknown, fallback: string) => {
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
  const payload = await response.json().catch(() => null)
  if (response.ok) {
    return payload as T
  }

  throw new ProfessionalRegistrationError(
    extractMessage(payload, 'Request failed.'),
    extractFieldErrors(payload),
  )
}

export const professionalRegistrationService = {
  async listLabPartners() {
    const response = await fetch(`${API_BASE_URL}/professionals/lab-partners/`)
    return handleResponse<LabPartnerOption[]>(response)
  },

  async submit(formData: FormData) {
    const response = await fetch(`${API_BASE_URL}/professionals/register/`, {
      method: 'POST',
      body: formData,
    })
    return handleResponse<ProfessionalRegistrationResponse>(response)
  },
}
