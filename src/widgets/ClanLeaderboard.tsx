import { useState } from 'react'
import WidgetShell from '../components/WidgetShell'
import { useAllTrackedProfiles } from '../hooks/useAllTrackedProfiles'
import usePlayerStore from '../stores/usePlayerStore'

const SORT_OPTIONS = [
  { id: -1, name: 'Total Level' },
  { id: -2, name: 'Total XP' },
  { id:  0, name: 'Attack' },        { id:  1, name: 'Defence' },
  { id:  2, name: 'Strength' },      { id:  3, name: 'Constitution' },
  { id:  4, name: 'Ranged' },        { id:  5, name: 'Prayer' },
  { id:  6, name: 'Magic' },         { id:  7, name: 'Cooking' },
  { id:  8, name: 'Woodcutting' },   { id:  9, name: 'Fletching' },
  { id: 10, name: 'Fishing' },       { id: 11, name: 'Firemaking' },
  { id: 12, name: 'Crafting' },      { id: 13, name: 'Smithing' },
  { id: 14, name: 'Mining' },        { id: 15, name: 'Herblore' },
  { id: 16, name: 'Agility' },       { id: 17, name: 'Thieving' },
  { id: 18, name: 'Slayer' },        { id: 19, name: 'Farming' },
  { id: 20, name: 'Runecrafting' },  { id: 21, name: 'Hunter' },
  { id: 22, name: 'Construction' },  { id: 23, name: 'Summoning' },
  { id: 24, name: 'Dungeoneering' }, { id: 25, name: 'Divination' },
  { id: 26, name: 'Invention' },     { id: 27, name: 'Archaeology' },
  { id: 28, name: 'Necromancy' },
]

const RANK_COLORS = ['var(--gold)', '#a0a8b8', '#c87533']

function formatValue(value: number, sortId: number) {
  if (sortId !== -2) return value.toLocaleString()
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000)     return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)         return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

const emptyStyle: React.CSSProperties = {
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  height:         '100%',
  fontFamily:     'var(--font-body)',
  fontSize:       11,
  color:          'var(--text-muted)',
  textAlign:      'center',
  padding:        '0 16px',
}

export default function ClanLeaderboard() {
  const trackedRSNs = usePlayerStore(s => s.trackedRSNs)
  const results     = useAllTrackedProfiles()
  const [sortId, setSortId] = useState(-1)

  const isLoading    = results.some(r => r.isLoading)
  const isError      = results.some(r => r.isError)
  const error        = results.find(r => r.isError)?.error ?? null
  const dataUpdatedAt = results[0]?.dataUpdatedAt

  const rows = trackedRSNs
    .map((rsn, i) => {
      const profile = results[i]?.data
      if (!profile) return null
      let value: number
      if      (sortId === -1) value = profile.totalLevel
      else if (sortId === -2) value = profile.totalXP
      else                    value = profile.skills.find(s => s.id === sortId)?.level ?? 0
      return { rsn, value }
    })
    .filter((r): r is { rsn: string; value: number } => r !== null)
    .sort((a, b) => b.value - a.value)

  const maxValue = Math.max(...rows.map(r => r.value), 1)

  return (
    <WidgetShell
      title="Player Leaderboard"
      refreshKeys={trackedRSNs.map(rsn => ['player', 'profile', rsn])}
      isLoading={isLoading}
      isError={isError}
      error={error}
      dataUpdatedAt={dataUpdatedAt}
    >
      {trackedRSNs.length === 0 ? (
        <div style={emptyStyle}>Add players in Settings to build a leaderboard.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Sort selector */}
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          8,
            padding:      '8px 12px',
            borderBottom: '1px solid var(--border-dim)',
            flexShrink:   0,
          }}>
            <span style={{
              fontFamily:    'var(--font-body)',
              fontSize:      9,
              color:         'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
            }}>
              Rank by
            </span>
            <select
              value={sortId}
              onChange={e => setSortId(Number(e.target.value))}
              style={{
                background: 'var(--bg-raised)',
                border:     '1px solid var(--border)',
                color:      'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize:   10,
                padding:    '2px 6px',
              }}
            >
              {SORT_OPTIONS.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Rows */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {rows.length === 0 ? (
              <div style={{ ...emptyStyle, flex: 1 }}>Loading player data...</div>
            ) : (
              rows.map(({ rsn, value }, i) => {
                const isFirst   = i === 0
                const barPct    = (value / maxValue) * 100
                const rankColor = RANK_COLORS[i] ?? 'var(--text-primary)'

                return (
                  <div
                    key={rsn}
                    style={{
                      padding:      '7px 12px',
                      borderBottom: '1px solid var(--border-dim)',
                      background:   isFirst ? 'rgba(200, 146, 58, 0.04)' : 'transparent',
                    }}
                  >
                    {/* Name row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span style={{
                        fontFamily: 'var(--font-display)',
                        fontSize:   11,
                        fontWeight: 600,
                        color:      rankColor,
                        minWidth:   20,
                      }}>
                        #{i + 1}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-display)',
                        fontSize:   11,
                        color:      isFirst ? 'var(--gold)' : 'var(--text-primary)',
                        fontWeight: isFirst ? 600 : 400,
                        flex:       1,
                      }}>
                        {rsn}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize:   11,
                        fontWeight: 500,
                        color:      isFirst ? 'var(--gold)' : 'var(--text-primary)',
                      }}>
                        {formatValue(value, sortId)}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: 2, background: 'var(--bg-base)', border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
                      <div style={{
                        height:     '100%',
                        width:      `${barPct}%`,
                        background: isFirst ? 'var(--gold)' : 'var(--border-hi)',
                      }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </WidgetShell>
  )
}
