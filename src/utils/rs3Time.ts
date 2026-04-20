// All RS3 resets occur at 00:00 UTC. VoS rotates at the top of every UTC hour.
// Never use new Date() for reset calculations — always use UTC methods.

export function getDailyResetMs(): number {
  const now = new Date()
  const msIntoDayUTC =
    ((now.getUTCHours() * 60 + now.getUTCMinutes()) * 60 + now.getUTCSeconds()) * 1000 +
    now.getUTCMilliseconds()
  return 86_400_000 - msIntoDayUTC
}

export function getHourlyResetMs(): number {
  const now = new Date()
  const msIntoHour =
    (now.getUTCMinutes() * 60 + now.getUTCSeconds()) * 1000 + now.getUTCMilliseconds()
  return 3_600_000 - msIntoHour
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '0m'
  const totalSeconds = Math.floor(ms / 1000)
  const hours   = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export function getUTCDateString(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatRS3Timestamp(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return String(date)
  return d.toLocaleString(undefined, {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}
