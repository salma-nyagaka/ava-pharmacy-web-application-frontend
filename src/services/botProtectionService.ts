const DEVICE_ID_KEY = 'ava_device_id'
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? ''

export type BotProtectionPayload = {
  device_id: string
  website: string
  bot_challenge_token: string
}

function randomDeviceId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `ava-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY)
  if (!deviceId) {
    deviceId = randomDeviceId()
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }
  return deviceId
}

export function buildBotPayload(website = '', challengeToken = ''): BotProtectionPayload {
  return {
    device_id: getDeviceId(),
    website,
    bot_challenge_token: challengeToken,
  }
}

export function appendBotPayload(formData: FormData, website = '', challengeToken = '') {
  const payload = buildBotPayload(website, challengeToken)
  Object.entries(payload).forEach(([key, value]) => formData.set(key, value))
}

export function isBotChallengeEnabled() {
  return TURNSTILE_SITE_KEY.trim().length > 0
}
