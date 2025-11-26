/**
 * API Client with retry logic
 */

interface FetchOptions extends RequestInit {
  retries?: number
  retryDelay?: number
  timeout?: number
}

const DEFAULT_RETRIES = 3
const DEFAULT_RETRY_DELAY = 1000 // 1 second
const DEFAULT_TIMEOUT = 30000 // 30 seconds

/**
 * Fetch wrapper with retry logic and timeout
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    timeout = DEFAULT_TIMEOUT,
    ...fetchOptions
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // If response is ok, return it
      if (response.ok) {
        return response
      }

      // If it's a client error (4xx), don't retry
      if (response.status >= 400 && response.status < 500) {
        return response
      }

      // For server errors (5xx) or network errors, throw to trigger retry
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    } catch (error: any) {
      lastError = error

      // Don't retry on AbortError (timeout) or if it's the last attempt
      if (error.name === 'AbortError' || attempt === retries) {
        throw error
      }

      // Wait before retrying (exponential backoff)
      const delay = retryDelay * Math.pow(2, attempt)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Unknown error')
}

/**
 * Fetch JSON with retry logic
 */
export async function fetchJSON<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`)
  }

  return response.json()
}



