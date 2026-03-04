type MockApiOptions = {
  delayMs?: number
}

const DEFAULT_DELAY_MS = 120

const wait = (ms: number) => new Promise<void>((resolve) => {
  window.setTimeout(() => resolve(), ms)
})

export const withMockDelay = async <T,>(value: T, options?: MockApiOptions) => {
  const delay = options?.delayMs ?? DEFAULT_DELAY_MS
  if (typeof window !== 'undefined') {
    await wait(delay)
  }
  return value
}

export interface ApiResult<T> {
  data: T
  source: 'mock-local'
}

export const toApiResult = async <T,>(value: T, options?: MockApiOptions): Promise<ApiResult<T>> => {
  const delayed = await withMockDelay(value, options)
  return { data: delayed, source: 'mock-local' }
}
