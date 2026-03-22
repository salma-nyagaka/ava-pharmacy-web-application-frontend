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
