import { apiClient, extractApiErrorMessage } from '../lib/apiClient'

export class NewsletterSubscriptionError extends Error {}

export async function subscribeToNewsletter(email: string, source = 'website'): Promise<void> {
  try {
    await apiClient.post('/newsletter/subscribe/', {
      email: email.trim(),
      source,
    })
  } catch (error) {
    throw new NewsletterSubscriptionError(extractApiErrorMessage(error, 'Unable to subscribe to the newsletter right now.'))
  }
}
