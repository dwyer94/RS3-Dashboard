import { useState, useRef, useEffect } from 'react'
import WidgetShell from '../components/WidgetShell'
import { useGEDump } from '../hooks/useGEDump'
import { useGEItem } from '../hooks/useGEItem'
import { useGESignals } from '../hooks/useGESignals'
import useMarketStore from '../stores/useMarketStore'
import type { GEItem } from '../api/types'

function formatGP(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function pctChange(price: number, last: number): number {
  if (last === 0) return 0
  return ((price - last) / last) * 100
}

const tierColor = {
  high:   'var(--teal)',
  medium: 'var(--gold)',
  low:    'var(--text-muted)',
}

// Per-row component so each can call hooks independently
function WatchlistRow({ itemId, onRemove }: { itemId: number; onRemove: () => void }) {
  const { data: item }                        = useGEItem(itemId)
  const { data: signals, isLoading: sigLoad } = useGESignals(itemId)

  if (!item) return null

  const change      = pctChange(item.price, item.last)
  const changeColor = change > 0 ? 'var(--teal)' : change < 0 ? 'var(--red)' : 'var(--text-muted)'

  const streakStr = signals
    ? `${signals.streak > 0 ? '▲' : signals.streak < 0 ? '▼' : '—'}${Math.abs(signals.streak)}d`
    : '—'

  const zStr = sigLoad
    ? '…'
    : signals
    ? `${signals.zScore >= 0 ? '+' : ''}${signals.zScore.toFixed(1)}σ`
    : '—'

  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: '1fr 72px 56px 56px 36px 20px',
      alignItems:          'center',
      padding:             '5px 12px',
      gap:                 8,
      borderBottom:        '1px solid var(--border-dim)',
    }}>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.name}
      </div>
      <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)' }}>
        {formatGP(item.price)}
      </div>
      <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: changeColor }}>
        {change >= 0 ? '+' : ''}{change.toFixed(1)}%
      </div>
      <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 10, color: signals ? tierColor[signals.volumeTier] : 'var(--text-muted)' }}>
        {zStr}
      </div>
      <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>
        {streakStr}
      </div>
      <button
        onClick={onRemove}
        title="Remove from watchlist"
        style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1, cursor: 'pointer', textAlign: 'right' }}
        className="hover:text-[var(--red)] transition-colors"
      >
        ×
      </button>
    </div>
  )
}

function ItemSearch({ dump, watchlist, onAdd }: {
  dump:      GEItem[]
  watchlist: number[]
  onAdd:     (id: number) => void
}) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const results = query.length >= 2
    ? dump
        .filter(i => i.name?.toLowerCase().includes(query.toLowerCase()) && !watchlist.includes(i.id))
        .slice(0, 8)
    : []

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search items to add…"
        style={{
          width:      '100%',
          background: 'var(--bg-raised)',
          border:     '1px solid var(--border)',
          color:      'var(--text-primary)',
          fontFamily: 'var(--font-body)',
          fontSize:   11,
          padding:    '4px 8px',
          outline:    'none',
          boxSizing:  'border-box',
        }}
      />
      {open && results.length > 0 && (
        <div style={{
          position:  'absolute',
          top:       '100%',
          left:      0,
          right:     0,
          background:'var(--bg-panel)',
          border:    '1px solid var(--border)',
          borderTop: 'none',
          zIndex:    50,
          maxHeight: 200,
          overflowY: 'auto',
        }}>
          {results.map(item => (
            <button
              key={item.id}
              onClick={() => { onAdd(item.id); setQuery(''); setOpen(false) }}
              style={{
                display:     'flex',
                width:       '100%',
                textAlign:   'left',
                padding:     '5px 10px',
                fontFamily:  'var(--font-body)',
                fontSize:    11,
                color:       'var(--text-primary)',
                background:  'transparent',
                cursor:      'pointer',
                borderBottom:'1px solid var(--border-dim)',
                gap:         8,
                alignItems:  'center',
              }}
              className="hover:bg-[var(--bg-raised)]"
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </span>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10, flexShrink: 0 }}>
                {formatGP(item.price)} gp
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const COL_HEADERS = ['Item', 'Price', 'Chg %', 'Z-Score', 'Streak', '']

export default function MarketWatchlist() {
  const { data: dump, isLoading, isError, error, dataUpdatedAt } = useGEDump()
  const watchlist  = useMarketStore(s => s.watchlist)
  const addItem    = useMarketStore(s => s.addItem)
  const removeItem = useMarketStore(s => s.removeItem)

  return (
    <WidgetShell
      title="Market Watchlist"
      refreshKeys={[['ge', 'dump'], ...watchlist.map(id => ['ge', 'history', id])]}
      isLoading={isLoading}
      isError={isError}
      error={error as Error | null}
      dataUpdatedAt={dataUpdatedAt}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Search bar */}
        <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border-dim)', flexShrink: 0 }}>
          {dump && <ItemSearch dump={dump} watchlist={watchlist} onAdd={addItem} />}
        </div>

        {/* Column headers */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: '1fr 72px 56px 56px 36px 20px',
          padding:             '3px 12px',
          gap:                 8,
          borderBottom:        '1px solid var(--border-dim)',
          flexShrink:          0,
        }}>
          {COL_HEADERS.map((h, i) => (
            <div key={i} style={{
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
          {watchlist.length === 0 ? (
            <div style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              height:         '100%',
              fontFamily:     'var(--font-body)',
              fontSize:       11,
              color:          'var(--text-muted)',
              textAlign:      'center',
              padding:        '0 24px',
            }}>
              Search for items above to start tracking prices.
            </div>
          ) : (
            watchlist.map(id => (
              <WatchlistRow key={id} itemId={id} onRemove={() => removeItem(id)} />
            ))
          )}
        </div>
      </div>
    </WidgetShell>
  )
}
