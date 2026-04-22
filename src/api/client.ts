import config from '../config'
import { ApiError } from './types'
import { logRequest } from './requestLog'

const PROXY_DOMAINS = [
  'apps.runescape.com',
  'secure.runescape.com',
  'services.runescape.com',
  'www.reddit.com',
]

export function proxyUrl(url: string): string {
  return PROXY_DOMAINS.some(d => url.includes(d))
    ? `${config.proxyUrl}?target=${encodeURIComponent(url)}`
    : url
}

export async function apiFetch<T>(url: string): Promise<T> {
  const complete = logRequest(url)
  let response: Response

  try {
    response = await fetch(proxyUrl(url))
  } catch (err) {
    complete('error')
    throw err
  }

  if (!response.ok) {
    complete('error', response.status)
    throw new ApiError(
      `HTTP ${response.status}: ${response.statusText}`,
      response.status,
    )
  }

  complete('ok', response.status)
  return response.json() as Promise<T>
}
