export interface RequestEntry {
  id:        number
  url:       string
  label:     string
  startedAt: number
  duration:  number | null  // null = in-flight
  status:    'pending' | 'ok' | 'error'
  httpCode:  number | null
}

const MAX_ENTRIES = 150
let nextId = 0
const entries: RequestEntry[] = []
const listeners = new Set<() => void>()

const PAGE_START = performance.now() - (Date.now() - performance.timeOrigin)

function notify() {
  listeners.forEach(l => l())
}

export function subscribeRequestLog(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function getRequestLog(): readonly RequestEntry[] {
  return entries
}

export function clearRequestLog() {
  entries.length = 0
  notify()
}

export function pageAgeMs(): number {
  return performance.now() - PAGE_START
}

function makeLabel(url: string): string {
  try {
    const u    = new URL(url)
    const host = u.hostname.replace(/^www\./, '').replace(/^api\./, '')
    // Last 2 meaningful path segments
    const path = u.pathname.split('/').filter(Boolean).slice(-2).join('/')
    // Highlight the RSN/player param when present
    const rsn  = u.searchParams.get('user')
              ?? u.searchParams.get('searchName')
              ?? u.searchParams.get('player')
    return rsn ? `${host} · ${path} · ${rsn}` : `${host} · ${path}`
  } catch {
    return url.slice(0, 80)
  }
}

// Returns a completion callback. Call it when the request finishes.
export function logRequest(url: string): (status: 'ok' | 'error', httpCode?: number) => void {
  const id = nextId++
  const entry: RequestEntry = {
    id,
    url,
    label:     makeLabel(url),
    startedAt: performance.now(),
    duration:  null,
    status:    'pending',
    httpCode:  null,
  }
  entries.push(entry)
  if (entries.length > MAX_ENTRIES) entries.shift()
  notify()

  return (status, httpCode) => {
    entry.duration = Math.round(performance.now() - entry.startedAt)
    entry.status   = status
    entry.httpCode = httpCode ?? null
    notify()
  }
}
