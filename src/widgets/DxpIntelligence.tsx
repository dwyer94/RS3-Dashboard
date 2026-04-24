import { useState, useEffect, useMemo } from 'react'
import WidgetShell from '../components/WidgetShell'
import { useDxpSummary } from '../hooks/useDxpSummary'
import { useGEDump } from '../hooks/useGEDump'
import type { DxpMover } from '../api/dxp'

type Tab = 'pre' | 'during' | 'post'

const TABS: { key: Tab; label: string; field: keyof DxpMover }[] = [
  { key: 'pre',    label: 'Pre-event',  field: 'pre_lift_pct'    },
  { key: 'during', label: 'During',     field: 'during_lift_pct' },
  { key: 'post',   label: 'Post-event', field: 'post_lift_pct'   },
]

// DXP events start and end at 12:00 UTC on the stored date.
const DXP_START_HOUR_UTC = 12

function dxpStartMs(isoDate: string): number {
  const d = new Date(`${isoDate}T${String(DXP_START_HOUR_UTC).padStart(2, '0')}:00:00Z`)
  return d.getTime()
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T${String(DXP_START_HOUR_UTC).padStart(2, '0')}:00:00Z`)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function fmtCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return 'ACTIVE'
  const s = Math.floor(msRemaining / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sc = s % 60
  if (d > 0) return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(sc).padStart(2, '0')}s`
}

function fmtRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffH  = Math.floor(diffMs / 3_600_000)
  if (diffH < 1) return 'just now'
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

function fmtPrice(n: number | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default function DxpIntelligence() {
  const { data, isLoading, isError, error, dataUpdatedAt } = useDxpSummary()
  const { data: geDump }        = useGEDump()
  const [tab, setTab]           = useState<Tab>('pre')
  const [now, setNow]           = useState(() => Date.now())

  const priceMap = useMemo(() => {
    if (!geDump) return new Map<number, number>()
    return new Map(geDump.map(item => [item.id, item.price]))
  }, [geDump])

  // Tick every second when an upcoming event exists, every minute otherwise
  useEffect(() => {
    const nextEvent = data?.next_event
    if (!nextEvent) return
    const startMs = dxpStartMs(nextEvent.start_date)
    const interval = startMs > Date.now() ? 1000 : 60_000
    const id = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(id)
  }, [data?.next_event])

  const activeField = TABS.find(t => t.key === tab)!.field

  const sorted = [...(data?.top_movers ?? [])].sort((a, b) => {
    const av = a[activeField] as number ?? 0
    const bv = b[activeField] as number ?? 0
    return tab === 'post' ? av - bv : bv - av
  })

  const nextEvent  = data?.next_event
  const syncStatus = data?.sync_status

  const startMs    = nextEvent ? dxpStartMs(nextEvent.start_date) : null
  const msLeft     = startMs != null ? Math.max(0, startMs - now) : null
  const isActive   = startMs != null && now >= startMs

  return (
    <WidgetShell
      title="DXP Intelligence"
      refreshKeys={[['dxp', 'summary']]}
      isLoading={isLoading}
      isError={isError}
      error={error as Error | null}
      dataUpdatedAt={dataUpdatedAt}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Header: event dates + live countdown */}
        <div style={{
          padding:      '8px 12px 6px',
          borderBottom: '1px solid var(--border-dim)',
          flexShrink:   0,
        }}>
          {nextEvent ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--gold)', letterSpacing: '0.08em' }}>
                DXP
              </span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-primary)' }}>
                {fmtDate(nextEvent.start_date)} – {fmtDate(nextEvent.end_date)}
              </span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-muted)' }}>
                12:00 UTC
              </span>
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      13,
                  fontWeight:    600,
                  color:         isActive ? 'var(--teal)' : 'var(--text-secondary)',
                  letterSpacing: '0.04em',
                }}>
                  {msLeft != null ? fmtCountdown(msLeft) : '—'}
                </span>
                {!isActive && (
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-muted)' }}>
                    until start
                  </span>
                )}
              </span>
            </div>
          ) : (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)' }}>
              No upcoming DXP events found
            </span>
          )}
        </div>

        {/* Avg lift stats */}
        {data && (
          <div style={{
            display:       'flex',
            gap:           16,
            padding:       '5px 12px',
            borderBottom:  '1px solid var(--border-dim)',
            flexShrink:    0,
          }}>
            {[
              { label: 'Avg pre-event',  value: data.avg_pre_lift_pct    },
              { label: 'Avg during',     value: data.avg_during_lift_pct },
              { label: 'Avg post-event', value: data.avg_post_lift_pct   },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {s.label}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize:   12,
                  color:      s.value == null ? 'var(--text-muted)'
                            : s.value >= 0    ? 'var(--teal)'
                            : 'var(--red)',
                }}>
                  {fmtPct(s.value)}
                </div>
              </div>
            ))}
            <div style={{ marginLeft: 'auto', alignSelf: 'center' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Items scored
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right' }}>
                {data.scored_items.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-dim)', flexShrink: 0 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex:          1,
                padding:       '6px 0',
                fontFamily:    'var(--font-display)',
                fontSize:      9,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color:         tab === t.key ? 'var(--gold)' : 'var(--text-muted)',
                borderBottom:  tab === t.key ? '2px solid var(--gold)' : '2px solid transparent',
                background:    'transparent',
                cursor:        'pointer',
                transition:    'color 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Column headers */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: '1fr 72px 72px 48px',
          padding:             '3px 12px',
          gap:                 8,
          borderBottom:        '1px solid var(--border-dim)',
          flexShrink:          0,
        }}>
          {['Item', 'Price', 'Lift %', 'Events'].map((h, i) => (
            <div key={h} style={{
              fontFamily:    'var(--font-body)',
              fontSize:      8,
              color:         'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              textAlign:     i === 0 ? 'left' : 'right',
            }}>
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {sorted.map(item => {
            const val   = item[activeField] as number | null
            const price = priceMap.get(item.item_id)
            return (
              <div key={item.item_id} style={{
                display:             'grid',
                gridTemplateColumns: '1fr 72px 72px 48px',
                alignItems:          'center',
                padding:             '4px 12px',
                gap:                 8,
                borderBottom:        '1px solid var(--border-dim)',
              }}>
                <div style={{
                  fontFamily:    'var(--font-body)',
                  fontSize:      11,
                  color:         'var(--text-primary)',
                  overflow:      'hidden',
                  textOverflow:  'ellipsis',
                  whiteSpace:    'nowrap',
                }}>
                  {item.item_name ?? `Item ${item.item_id}`}
                </div>
                <div style={{
                  textAlign:  'right',
                  fontFamily: 'var(--font-mono)',
                  fontSize:   11,
                  color:      'var(--text-secondary)',
                }}>
                  {fmtPrice(price)}
                </div>
                <div style={{
                  textAlign:  'right',
                  fontFamily: 'var(--font-mono)',
                  fontSize:   11,
                  color:      val == null ? 'var(--text-muted)'
                            : val >= 0   ? 'var(--teal)'
                            : 'var(--red)',
                }}>
                  {fmtPct(val)}
                </div>
                <div style={{
                  textAlign:  'right',
                  fontFamily: 'var(--font-mono)',
                  fontSize:   10,
                  color:      'var(--text-muted)',
                }}>
                  {item.events_observed}
                </div>
              </div>
            )
          })}

          {!isLoading && sorted.length === 0 && (
            <div style={{ padding: '16px 12px', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)' }}>
              No scored items yet — run the pipeline first.
            </div>
          )}
        </div>

        {/* Footer: sync status + generation time */}
        {syncStatus && (
          <div style={{
            padding:      '4px 12px',
            borderTop:    '1px solid var(--border-dim)',
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            flexShrink:   0,
          }}>
            <span style={{ fontSize: 9, color: syncStatus.ok ? 'var(--teal)' : 'var(--gold)' }}>
              {syncStatus.ok ? '●' : '⚠'}
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-muted)' }}>
              {syncStatus.ok
                ? syncStatus.last_sync ? `Wiki sync ${fmtRelative(syncStatus.last_sync)}` : 'Wiki sync OK'
                : `Wiki sync failed — ${syncStatus.error}`}
            </span>
            {data?.generated_at && (
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                Data {fmtRelative(data.generated_at)}
              </span>
            )}
          </div>
        )}
      </div>
    </WidgetShell>
  )
}
