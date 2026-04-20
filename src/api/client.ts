import config from '../config'
import { ApiError } from './types'

const JAGEX_DOMAINS = [
  'apps.runescape.com',
  'secure.runescape.com',
  'services.runescape.com',
]

export function proxyUrl(url: string): string {
  return JAGEX_DOMAINS.some(d => url.includes(d))
    ? `${config.proxyUrl}?target=${encodeURIComponent(url)}`
    : url
}

export async function apiFetch<T>(url: string): Promise<T> {
  const response = await fetch(proxyUrl(url))

  if (!response.ok) {
    throw new ApiError(
      `HTTP ${response.status}: ${response.statusText}`,
      response.status,
    )
  }

  return response.json() as Promise<T>
}
