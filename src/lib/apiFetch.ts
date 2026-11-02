import axios from 'axios'
import { apiClient } from './apiClient'

function jsonResponse(response: { data: unknown; status: number }): Response {
  return new Response(response.status === 204 || response.status === 205 ? null : JSON.stringify(response.data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Preserve the service-specific response/error handling while sharing token
// refresh, session invalidation and multipart handling with the rest of the app.
export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  try {
    const response = await apiClient.request({
      url,
      method: init.method ?? 'GET',
      headers: Object.fromEntries(new Headers(init.headers).entries()),
      data: init.body,
    })
    return jsonResponse(response)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) return jsonResponse(error.response)
    throw error
  }
}
