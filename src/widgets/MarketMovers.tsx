import { useState } from 'react'
import WidgetShell from '../components/WidgetShell'
import { useGEDump } from '../hooks/useGEDump'
import useMarketStore from '../stores/useMarketStore'
import type { GEItem } from '../api/types'

function formatGP(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function pctChange(item: GEItem): number {
  if (item.last === 0) return 0
  return ((item.price - item.last) / item.last) * 100
}

function classifyVolume(volume: number): 'high' | 'medium' | 'low' {
  if (volume >= 10_000) return 'high'
  if (volume >= 1_000)  return 'medium'
  return 'low'
}

const tierColor = { high: 'var(--teal)', medium: 'var(--gold)', low: 'var(--text-muted)' }
const tierLabel = { high: 'HI', medium: 'MED', low: 'LO' }

type Tab = 'gainers' | 'losers' | 'volume'

const TABS: { key: Tab; label: string }[] = [
  { key: 'gainers', label: 'Gainers' },
  { key: 'losers',  label: 'Losers'  },
  { key: 'volume',  label: 'Volume'  },
]

export default function MarketMovers() {
  const { data: dump, isLoading, isError, error, dataUpdatedAt } = useGEDump()
  const [tab, setTab] = useState<Tab>('gainers')
  const addItem   = useMarketStore(s => s.addItem)
  const watchlist = useMarketStore(s => s.watchlist)

  // Exclude untradeable/junk: no volume, trivial price, or no last-trade data
  const tradeable = (dump ?? []).filter(i => i.volume > 0 && i.price > 10 && i.last > 0)

  const rows = (() => {
    if (tab === 'gainers') {
      return tradeable
        .filter(i => i.price > i.last)
        .sort((a, b) => pctChange(b) - pctChange(a))
        .slice(0, 25)
    }
    if (tab === 'losers') {
      return tradeable
        .filter(i => i.price < i.last)
        .sort((a, b) => pctChange(a) - pctChange(b))
        .slice(0, 25)
    }
    return tradeable
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 25)
  })()

  return (
    <WidgetShell
      title="Market Movers"
      refreshKeys={[['ge', 'dump']]}
      isLoading={isLoading}
      isError={isError}
      error={error as Error | null}
      dataUpdatedAt={dataUpdatedAt}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
          gridTemplateColumns: '1fr 72px 64px 36px 24px',
          padding:             '3px 12px',
          gap:                 8,
          borderBottom:        '1px solid var(--border-dim)',
          flexShrink:          0,
        }}>
          {['Item', 'Price', tab === 'volume' ? 'Volume' : 'Chg %', 'Vol', ''].map((h, i) => (
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
          {rows.map(item => {
            const change      = pctChange(item)
            const tier        = classifyVolume(item.volume)
            const inWatchlist = watchlist.includes(item.id)

            return (
              <div key={item.id} style={{
                display:             'grid',
                gridTemplateColumns: '1fr 72px 64px 36px 24px',
                alignItems:          'center',
                padding:             '4px 12px',
                gap:                 8,
                borderBottom:        '1px solid var(--border-dim)',
              }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)' }}>
                  {formatGP(item.price)}
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: tab === 'volume' ? 'var(--text-secondary)' : change >= 0 ? 'var(--teal)' : 'var(--red)' }}>
                  {tab === 'volume'
                    ? formatVol(item.volume)
                    : `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`}
                </div>
                <div style={{ textAlign: 'right', fontSize: 9, fontFamily: 'var(--font-mono)', color: tierColor[tier] }}>
                  {tierLabel[tier]}
                </div>
                <button
                  onClick={() => !inWatchlist && addItem(item.id)}
                  title={inWatchlist ? 'In watchlist' : 'Add to watchlist'}
                  disabled={inWatchlist}
                  style={{
                    color:   inWatchlist ? 'var(--gold)' : 'var(--text-muted)',
                    fontSize: 14,
                    lineHeight: 1,
                    cursor:  inWatchlist ? 'default' : 'pointer',
                    textAlign: 'right',
                  }}
                  className={inWatchlist ? '' : 'hover:text-[var(--gold)] transition-colors'}
                >
                  {inWatchlist ? '★' : '☆'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </WidgetShell>
  )
}
