import { useState, useEffect, useRef } from 'react'
import WidgetShell from '../components/WidgetShell'
import { formatCountdown, getDailyResetMs } from '../utils/rs3Time'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function formatOffset(offsetMin: number): string {
  const sign = offsetMin >= 0 ? '+' : '-'
  const abs  = Math.abs(offsetMin)
  const h    = Math.floor(abs / 60)
  const m    = abs % 60
  return m === 0 ? `${sign}${h}` : `${sign}${h}:${pad(m)}`
}

interface ClockState {
  localH: number; localM: number; localS: number
  utcH:   number; utcM:   number; utcS:   number
  offsetMin:    number
  tzName:       string
  dailyResetMs: number
}

function snapshot(): ClockState {
  const now = new Date()
  const offsetMin = -now.getTimezoneOffset()
  let tzName = ''
  try {
    tzName = Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
      .formatToParts(now)
      .find(p => p.type === 'timeZoneName')?.value ?? ''
  } catch { /* fallback to empty */ }
  return {
    localH: now.getHours(),    localM: now.getMinutes(),    localS: now.getSeconds(),
    utcH:   now.getUTCHours(), utcM:   now.getUTCMinutes(), utcS:   now.getUTCSeconds(),
    offsetMin,
    tzName,
    dailyResetMs: getDailyResetMs(),
  }
}

// ── Sub-component ─────────────────────────────────────────────────────────────

interface ClockColProps {
  label:       string
  time:        string
  badge:       string
  sub:         string
  narrow:      boolean
  badgeColor?: string
}

function ClockCol({ label, time, badge, sub, narrow, badgeColor = 'var(--teal)' }: ClockColProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: narrow ? 2 : 4, flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily:    'var(--font-display)',
          fontSize:      8,
          fontWeight:    600,
          letterSpacing: '0.13em',
          textTransform: 'uppercase',
          color:         'var(--gold)',
        }}>
          {label}
        </span>
        <span style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      9,
          fontWeight:    500,
          color:         badgeColor,
          background:    `${badgeColor}14`,
          border:        `1px solid ${badgeColor}44`,
          padding:       '0px 5px',
          letterSpacing: '0.04em',
        }}>
          {badge}
        </span>
      </div>

      <div style={{
        fontFamily:    'var(--font-mono)',
        fontSize:      narrow ? 16 : 20,
        fontWeight:    400,
        color:         'var(--text-primary)',
        letterSpacing: '-0.02em',
        lineHeight:    1,
      }}>
        {time}
      </div>

      {!narrow && (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-muted)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Widget ────────────────────────────────────────────────────────────────────

export default function WorldClock() {
  const [clock, setClock]   = useState<ClockState>(snapshot)
  const [width, setWidth]   = useState(0)
  const containerRef        = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => setClock(snapshot()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])

  const localTime = `${pad(clock.localH)}:${pad(clock.localM)}:${pad(clock.localS)}`
  const utcTime   = `${pad(clock.utcH)}:${pad(clock.utcM)}:${pad(clock.utcS)}`
  const offset    = formatOffset(clock.offsetMin)

  // Below ~220px, stack vertically; below ~160px, go narrow mode
  const stacked = width > 0 && width < 220
  const narrow  = width > 0 && width < 160

  return (
    <WidgetShell
      title="World Clock"
      refreshKeys={[]}
      isLoading={false}
      isError={false}
      isLive
    >
      <div
        ref={containerRef}
        style={{
          display:       'flex',
          flexDirection: 'column',
          height:        '100%',
          padding:       '10px 14px',
          gap:           8,
        }}
      >
        <div style={{
          display:       'flex',
          flexDirection: stacked ? 'column' : 'row',
          gap:           stacked ? 8 : 0,
          flex:          1,
        }}>
          <ClockCol
            label="Local"
            time={localTime}
            badge={offset}
            sub={clock.tzName || 'Local Time'}
            narrow={narrow}
          />

          <div style={stacked
            ? { height: 1, background: 'var(--border-dim)' }
            : { width: 1, background: 'var(--border-dim)', alignSelf: 'stretch', margin: '0 12px' }
          } />

          <ClockCol
            label="UTC"
            time={utcTime}
            badge="+0"
            sub="Universal Time"
            narrow={narrow}
            badgeColor="var(--text-secondary)"
          />
        </div>

        <div style={{
          borderTop:      '1px solid var(--border-dim)',
          paddingTop:     6,
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
        }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-muted)' }}>
            Daily reset
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--teal)', fontWeight: 500 }}>
            {formatCountdown(clock.dailyResetMs)}
          </span>
        </div>
      </div>
    </WidgetShell>
  )
}
