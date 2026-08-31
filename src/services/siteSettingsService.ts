import axios from 'axios'
import { apiClient } from '../lib/apiClient'

const SITE_SETTINGS_STORAGE_KEY = 'ava_site_settings_cache'
const SITE_SETTINGS_ENDPOINT = '/site-settings/'

export interface SiteSettings {
  supportEmail: string
  supportPhone: string
  whatsappPhone: string
  supportAddress: string
  supportHours: string
  postalAddress: string
  healthSafetyCode: string
  premisesRegistrationNumber: string
  onlinePharmacyLicenseNumber: string
  superintendentName: string
  superintendentRegistrationNumber: string
  pharmacistConsultationHours: string
  ppbContactName: string
  ppbContactAddress: string
  ppbContactPhone: string
  ppbContactEmail: string
  ppbWebsite: string
  complaintPolicyUrl: string
  privacyPolicyUrl: string
  returnsPolicyUrl: string
  baseDeliveryFee: number
  freeDeliveryThreshold: number
  activeDeliveryZones: string[]
}

export interface SiteSettingsUpdatePayload extends SiteSettings {}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  supportEmail: 'support@avapharmacy.co.ke',
  supportPhone: '+254 700 000 000',
  whatsappPhone: '+254 700 000 000',
  supportAddress: 'Karen / The Hub, Karen, Nairobi, Kenya',
  supportHours: 'Mon – Sun: 09am – 5pm',
  postalAddress: '',
  healthSafetyCode: '',
  premisesRegistrationNumber: '',
  onlinePharmacyLicenseNumber: '',
  superintendentName: '',
  superintendentRegistrationNumber: '',
  pharmacistConsultationHours: 'Mon - Sun: 09am - 5pm',
  ppbContactName: 'The Pharmacy and Poisons Board',
  ppbContactAddress: 'Lenana Road Opposite Russian Embassy, P. O. Box 27663-00506, Nairobi, Kenya',
  ppbContactPhone: '+254 709 770 100',
  ppbContactEmail: 'info@pharmacyboardkenya.org.ke',
  ppbWebsite: 'https://www.pharmacyboardkenya.org.ke',
  complaintPolicyUrl: '/help',
  privacyPolicyUrl: '/privacy',
  returnsPolicyUrl: '/returns',
  baseDeliveryFee: 300,
  freeDeliveryThreshold: 3000,
  activeDeliveryZones: ['Nairobi', 'Kiambu', 'Mombasa'],
}

type SettingsRecord = Record<string, unknown>

function isSettingsRecord(value: unknown): value is SettingsRecord {
  return typeof value === 'object' && value !== null
}

function normalizeNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeZones(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }
  return [...DEFAULT_SITE_SETTINGS.activeDeliveryZones]
}

export function normalizeSiteSettings(value: unknown): SiteSettings {
  const payload = isSettingsRecord(value)
    ? (isSettingsRecord(value.data) ? value.data : value)
    : {}

  return {
    supportEmail: normalizeString(payload.support_email ?? payload.supportEmail, DEFAULT_SITE_SETTINGS.supportEmail),
    supportPhone: normalizeString(payload.support_phone ?? payload.supportPhone, DEFAULT_SITE_SETTINGS.supportPhone),
    whatsappPhone: normalizeString(payload.whatsapp_phone ?? payload.whatsappPhone, DEFAULT_SITE_SETTINGS.whatsappPhone),
    supportAddress: normalizeString(payload.support_address ?? payload.supportAddress, DEFAULT_SITE_SETTINGS.supportAddress),
    supportHours: normalizeString(payload.support_hours ?? payload.supportHours, DEFAULT_SITE_SETTINGS.supportHours),
    postalAddress: normalizeString(payload.postal_address ?? payload.postalAddress, DEFAULT_SITE_SETTINGS.postalAddress),
    healthSafetyCode: normalizeString(payload.health_safety_code ?? payload.healthSafetyCode, DEFAULT_SITE_SETTINGS.healthSafetyCode),
    premisesRegistrationNumber: normalizeString(payload.premises_registration_number ?? payload.premisesRegistrationNumber, DEFAULT_SITE_SETTINGS.premisesRegistrationNumber),
    onlinePharmacyLicenseNumber: normalizeString(payload.online_pharmacy_license_number ?? payload.onlinePharmacyLicenseNumber, DEFAULT_SITE_SETTINGS.onlinePharmacyLicenseNumber),
    superintendentName: normalizeString(payload.superintendent_name ?? payload.superintendentName, DEFAULT_SITE_SETTINGS.superintendentName),
    superintendentRegistrationNumber: normalizeString(payload.superintendent_registration_number ?? payload.superintendentRegistrationNumber, DEFAULT_SITE_SETTINGS.superintendentRegistrationNumber),
    pharmacistConsultationHours: normalizeString(payload.pharmacist_consultation_hours ?? payload.pharmacistConsultationHours, DEFAULT_SITE_SETTINGS.pharmacistConsultationHours),
    ppbContactName: normalizeString(payload.ppb_contact_name ?? payload.ppbContactName, DEFAULT_SITE_SETTINGS.ppbContactName),
    ppbContactAddress: normalizeString(payload.ppb_contact_address ?? payload.ppbContactAddress, DEFAULT_SITE_SETTINGS.ppbContactAddress),
    ppbContactPhone: normalizeString(payload.ppb_contact_phone ?? payload.ppbContactPhone, DEFAULT_SITE_SETTINGS.ppbContactPhone),
    ppbContactEmail: normalizeString(payload.ppb_contact_email ?? payload.ppbContactEmail, DEFAULT_SITE_SETTINGS.ppbContactEmail),
    ppbWebsite: normalizeString(payload.ppb_website ?? payload.ppbWebsite, DEFAULT_SITE_SETTINGS.ppbWebsite),
    complaintPolicyUrl: normalizeString(payload.complaint_policy_url ?? payload.complaintPolicyUrl, DEFAULT_SITE_SETTINGS.complaintPolicyUrl),
    privacyPolicyUrl: normalizeString(payload.privacy_policy_url ?? payload.privacyPolicyUrl, DEFAULT_SITE_SETTINGS.privacyPolicyUrl),
    returnsPolicyUrl: normalizeString(payload.returns_policy_url ?? payload.returnsPolicyUrl, DEFAULT_SITE_SETTINGS.returnsPolicyUrl),
    baseDeliveryFee: normalizeNumber(payload.base_delivery_fee ?? payload.baseDeliveryFee, DEFAULT_SITE_SETTINGS.baseDeliveryFee),
    freeDeliveryThreshold: normalizeNumber(
      payload.free_delivery_threshold ?? payload.freeDeliveryThreshold,
      DEFAULT_SITE_SETTINGS.freeDeliveryThreshold,
    ),
    activeDeliveryZones: normalizeZones(
      payload.active_delivery_zones_list
      ?? payload.active_delivery_zones
      ?? payload.activeDeliveryZones,
    ),
  }
}

function toApiPayload(settings: SiteSettingsUpdatePayload) {
  return {
    support_email: settings.supportEmail.trim(),
    support_phone: settings.supportPhone.trim(),
    whatsapp_phone: settings.whatsappPhone.trim(),
    support_address: settings.supportAddress.trim(),
    support_hours: settings.supportHours.trim(),
    postal_address: settings.postalAddress.trim(),
    health_safety_code: settings.healthSafetyCode.trim(),
    premises_registration_number: settings.premisesRegistrationNumber.trim(),
    online_pharmacy_license_number: settings.onlinePharmacyLicenseNumber.trim(),
    superintendent_name: settings.superintendentName.trim(),
    superintendent_registration_number: settings.superintendentRegistrationNumber.trim(),
    pharmacist_consultation_hours: settings.pharmacistConsultationHours.trim(),
    ppb_contact_name: settings.ppbContactName.trim(),
    ppb_contact_address: settings.ppbContactAddress.trim(),
    ppb_contact_phone: settings.ppbContactPhone.trim(),
    ppb_contact_email: settings.ppbContactEmail.trim(),
    ppb_website: settings.ppbWebsite.trim(),
    complaint_policy_url: settings.complaintPolicyUrl.trim(),
    privacy_policy_url: settings.privacyPolicyUrl.trim(),
    returns_policy_url: settings.returnsPolicyUrl.trim(),
    base_delivery_fee: settings.baseDeliveryFee,
    free_delivery_threshold: settings.freeDeliveryThreshold,
    active_delivery_zones: settings.activeDeliveryZones.join(', '),
  }
}

export function cacheSiteSettings(settings: SiteSettings) {
  window.localStorage.setItem(SITE_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

export function loadCachedSiteSettings(): SiteSettings {
  try {
    const raw = window.localStorage.getItem(SITE_SETTINGS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SITE_SETTINGS }
    return normalizeSiteSettings(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_SITE_SETTINGS }
  }
}

async function requestSiteSettings(method: 'get'): Promise<{ data: unknown }>
async function requestSiteSettings(method: 'put', payload: SiteSettingsUpdatePayload): Promise<{ data: unknown }>
async function requestSiteSettings(method: 'get' | 'put', payload?: SiteSettingsUpdatePayload) {
  try {
    if (method === 'get') {
      return await apiClient.get(SITE_SETTINGS_ENDPOINT)
    }
    return await apiClient.put(SITE_SETTINGS_ENDPOINT, toApiPayload(payload as SiteSettingsUpdatePayload))
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new Error('Site settings endpoint is not available.')
    }
    throw error
  }
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const res = await requestSiteSettings('get')
  const settings = normalizeSiteSettings(res.data)
  cacheSiteSettings(settings)
  return settings
}

export async function updateSiteSettings(payload: SiteSettingsUpdatePayload): Promise<SiteSettings> {
  const res = await requestSiteSettings('put', payload)
  const settings = normalizeSiteSettings(res.data)
  cacheSiteSettings(settings)
  return settings
}

export function formatWhatsAppHref(phone: string): string {
  const normalized = phone.replace(/[^\d]/g, '')
  return normalized || '254700000000'
}

export function formatPhoneHref(phone: string): string {
  const normalized = phone.replace(/[^\d+]/g, '')
  return normalized || '+254700000000'
}
