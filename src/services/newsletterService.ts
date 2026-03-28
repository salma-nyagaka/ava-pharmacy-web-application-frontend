import axios from 'axios'
import { apiClient } from '../lib/apiClient'

export class NewsletterSubscriptionError extends Error {}

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data
    const message =
      payload?.error?.message
      ?? payload?.message
      ?? payload?.detail
      ?? payload?.data?.message

    if (typeof message === 'string' && message.trim()) {
      return message.trim()
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Unable to subscribe to the newsletter right now.'
}

export async function subscribeToNewsletter(email: string, source = 'website'): Promise<void> {
  try {
    await apiClient.post('/newsletter/subscribe/', {
      email: email.trim(),
      source,
    })
  } catch (error) {
    throw new NewsletterSubscriptionError(extractErrorMessage(error))
  }
}
