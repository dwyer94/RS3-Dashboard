import { useState, useEffect, useSyncExternalStore } from 'react'
import { getRequestLog, subscribeRequestLog, clearRequestLog } from '../api/requestLog'
import type { RequestEntry } from '../api/requestLog'

function fmt(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`
}

// entryStartedAt is performance.now() — directly the ms offset from page load
function startLabel(entryStartedAt: number): string {
  return `T+${fmt(entryStartedAt)}`
}

function statusColor(e: RequestEntry): string {
  if (e.status === 'pending') return 'var(--text-muted)'
  if (e.status === 'error')   return 'var(--red)'
  return 'var(--green)'
}

function statusText(e: RequestEntry): string {
  if (e.status === 'pending') return '…'
  if (e.status === 'error')   return e.httpCode ? `${e.httpCode}` : 'ERR'
  return e.httpCode ? `${e.httpCode}` : 'OK'
}

export default function PerfOverlay({ onClose }: { onClose: () => void }) {
  const entries = useSyncExternalStore(subscribeRequestLog, getRequestLog)
  const [tick, setTick] = useState(0)

  // Re-render every second so "pending" durations tick
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  void tick

  const displayed = [...entries].reverse()
  const pending   = entries.filter(e => e.status === 'pending').length
  const errors    = entries.filter(e => e.status === 'error').length

  return (
    <div style={{
      position:   'fixed',
      bottom:     36,
      right:      16,
      width:      480,
      maxHeight:  520,
      display:    'flex',
      flexDirection: 'column',
      background: 'var(--bg-surface)',
      border:     '1px solid var(--border)',
      zIndex:     100,
      fontFamily: 'var(--font-mono)',
      fontSize:   10,
    }}>
      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:            10,
        padding:        '6px 12px',
        borderBottom:   '1px solid var(--border-dim)',
        flexShrink:     0,
      }}>
        <span style={{ color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: 9 }}>
          API Requests
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>
          {entries.length} total
        </span>
        {pending > 0 && (
          <span style={{ color: 'var(--teal)', fontSize: 9 }}>{pending} in-flight</span>
        )}
        {errors > 0 && (
          <span style={{ color: 'var(--red)', fontSize: 9 }}>{errors} errors</span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={clearRequestLog}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 9, letterSpacing: '0.06em' }}
        >
          CLEAR
        </button>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1 }}
        >
          ✕
        </button>
      </div>

      {/* Column headers */}
      <div style={{
        display:      'grid',
        gridTemplateColumns: '1fr 56px 48px 36px',
        gap:          8,
        padding:      '4px 12px',
        borderBottom: '1px solid var(--border-dim)',
        color:        'var(--text-muted)',
        fontSize:     8,
        letterSpacing:'0.08em',
        textTransform:'uppercase',
        flexShrink:   0,
      }}>
        <span>Endpoint</span>
        <span style={{ textAlign: 'right' }}>Start</span>
        <span style={{ textAlign: 'right' }}>Duration</span>
        <span style={{ textAlign: 'right' }}>Status</span>
      </div>

      {/* Rows */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {displayed.length === 0 ? (
          <div style={{ padding: '16px 12px', color: 'var(--text-muted)', fontSize: 10 }}>
            No requests yet. Refresh a widget or reload the page.
          </div>
        ) : (
          displayed.map(e => {
            const live = e.status === 'pending'
              ? Math.round(performance.now() - e.startedAt)
              : e.duration

            return (
              <div
                key={e.id}
                style={{
                  display:      'grid',
                  gridTemplateColumns: '1fr 56px 48px 36px',
                  gap:          8,
                  padding:      '4px 12px',
                  borderBottom: '1px solid var(--border-dim)',
                  alignItems:   'baseline',
                  background:   e.status === 'error' ? 'rgba(208,88,88,0.04)' : 'transparent',
                }}
              >
                <span style={{
                  color:        e.status === 'pending' ? 'var(--text-muted)' : 'var(--text-secondary)',
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace:   'nowrap',
                  fontSize:     9,
                }}>
                  {e.label}
                </span>
                <span style={{ color: 'var(--text-muted)', textAlign: 'right', fontSize: 9 }}>
                  {startLabel(e.startedAt)}
                </span>
                <span style={{
                  textAlign: 'right',
                  color: live !== null && live > 3000
                    ? 'var(--red)'
                    : live !== null && live > 1000
                    ? 'var(--gold)'
                    : 'var(--text-secondary)',
                }}>
                  {live !== null ? fmt(live) : '—'}
                  {e.status === 'pending' && <span style={{ color: 'var(--teal)' }}>…</span>}
                </span>
                <span style={{ color: statusColor(e), textAlign: 'right', fontSize: 9 }}>
                  {statusText(e)}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
