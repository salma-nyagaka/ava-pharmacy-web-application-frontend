import { extractApiErrorMessage, extractApiFieldErrors } from '../lib/apiClient'

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

export class ProfessionalRegistrationError extends Error {
  fieldErrors: Record<string, string>

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ProfessionalRegistrationError'
    this.fieldErrors = fieldErrors
  }
}

const handleResponse = async <T,>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => null)
  if (response.ok) {
    return payload as T
  }

  throw new ProfessionalRegistrationError(
    extractApiErrorMessage(payload, 'Request failed.'),
    extractApiFieldErrors(payload),
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
}
