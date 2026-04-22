import { useState } from 'react'
import { Fragment } from 'react'
import WidgetShell from '../components/WidgetShell'
import { useAllTrackedProfiles } from '../hooks/useAllTrackedProfiles'
import usePlayerStore from '../stores/usePlayerStore'

function formatXP(xp: number) {
  if (xp >= 1_000_000_000) return `${(xp / 1_000_000_000).toFixed(2)}B`
  if (xp >= 1_000_000)     return `${(xp / 1_000_000).toFixed(1)}M`
  if (xp >= 1_000)         return `${(xp / 1_000).toFixed(1)}K`
  return String(xp)
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

export default function FriendComparison() {
  const trackedRSNs = usePlayerStore(s => s.trackedRSNs)
  const results     = useAllTrackedProfiles()

  const [playerAIdx, setPlayerAIdx] = useState(0)
  const [playerBIdx, setPlayerBIdx] = useState(Math.min(1, trackedRSNs.length - 1))

  const isLoading    = results.some(r => r.isLoading)
  const isError      = results.some(r => r.isError)
  const error        = results.find(r => r.isError)?.error ?? null
  const dataUpdatedAt = results[0]?.dataUpdatedAt

  if (trackedRSNs.length < 2) {
    return (
      <WidgetShell
        title="Friend Comparison"
        refreshKeys={[]}
        isLoading={false}
        isError={false}
        dataUpdatedAt={undefined}
      >
        <div style={emptyStyle}>Add at least 2 players in Settings to compare.</div>
      </WidgetShell>
    )
  }

  const safeAIdx = Math.min(playerAIdx, trackedRSNs.length - 1)
  const safeBIdx = Math.min(playerBIdx, trackedRSNs.length - 1)

  const profileA = results[safeAIdx]?.data
  const profileB = results[safeBIdx]?.data

  const skillsA = (profileA?.skills ?? []).slice().sort((a, b) => a.id - b.id)

  const summary = profileA && profileB ? [
    { label: 'Total Level', valA: profileA.totalLevel,   valB: profileB.totalLevel,   fmtA: profileA.totalLevel.toLocaleString(),  fmtB: profileB.totalLevel.toLocaleString() },
    { label: 'Combat',      valA: profileA.combatLevel,  valB: profileB.combatLevel,  fmtA: String(profileA.combatLevel),          fmtB: String(profileB.combatLevel) },
    { label: 'Total XP',   valA: profileA.totalXP,      valB: profileB.totalXP,      fmtA: formatXP(profileA.totalXP),            fmtB: formatXP(profileB.totalXP) },
  ] : []

  return (
    <WidgetShell
      title="Friend Comparison"
      refreshKeys={trackedRSNs.map(rsn => ['player', 'profile', rsn])}
      isLoading={isLoading}
      isError={isError}
      error={error}
      dataUpdatedAt={dataUpdatedAt}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Player selectors */}
        <div style={{
          display:      'flex',
          gap:          8,
          padding:      '8px 12px',
          borderBottom: '1px solid var(--border-dim)',
          flexShrink:   0,
          alignItems:   'center',
        }}>
          <select
            value={safeAIdx}
            onChange={e => setPlayerAIdx(Number(e.target.value))}
            style={{
              flex:       1,
              background: 'var(--bg-raised)',
              border:     '1px solid var(--gold-line)',
              color:      'var(--gold)',
              fontFamily: 'var(--font-display)',
              fontSize:   10,
              padding:    '3px 6px',
            }}
          >
            {trackedRSNs.map((rsn, i) => (
              <option key={rsn} value={i} disabled={i === safeBIdx}>{rsn}</option>
            ))}
          </select>

          <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>vs</span>

          <select
            value={safeBIdx}
            onChange={e => setPlayerBIdx(Number(e.target.value))}
            style={{
              flex:       1,
              background: 'var(--bg-raised)',
              border:     '1px solid var(--border)',
              color:      'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              fontSize:   10,
              padding:    '3px 6px',
            }}
          >
            {trackedRSNs.map((rsn, i) => (
              <option key={rsn} value={i} disabled={i === safeAIdx}>{rsn}</option>
            ))}
          </select>
        </div>

        {/* Summary */}
        {summary.length > 0 && (
          <div style={{
            display:      'flex',
            flexDirection:'column',
            gap:          2,
            padding:      '8px 12px',
            borderBottom: '1px solid var(--border-dim)',
            flexShrink:   0,
          }}>
            {summary.map(({ label, valA, valB, fmtA, fmtB }) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 72px 1fr', alignItems: 'center' }}>
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: valA >= valB ? 'var(--gold)' : 'var(--text-secondary)' }}>
                  {fmtA}
                </div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {label}
                </div>
                <div style={{ textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: valB >= valA ? 'var(--teal)' : 'var(--text-secondary)' }}>
                  {fmtB}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Per-skill comparison */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {skillsA.length === 0 ? (
            <div style={{ ...emptyStyle, flex: 1 }}>Loading skill data...</div>
          ) : (
            skillsA.map(skillA => {
              const skillB = profileB?.skills.find(s => s.id === skillA.id)
              const lvlA   = skillA.level
              const lvlB   = skillB?.level ?? 0

              return (
                <Fragment key={skillA.id}>
                  <div style={{
                    display:             'grid',
                    gridTemplateColumns: '1fr 80px 1fr',
                    alignItems:         'center',
                    padding:            '3px 12px',
                    borderBottom:       '1px solid var(--border-dim)',
                  }}>
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: lvlA > lvlB ? 'var(--gold)' : 'var(--text-secondary)' }}>
                      {lvlA}
                    </div>
                    <div style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {skillA.name}
                    </div>
                    <div style={{ textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: lvlB > lvlA ? 'var(--teal)' : 'var(--text-secondary)' }}>
                      {lvlB || '—'}
                    </div>
                  </div>
                </Fragment>
              )
            })
          )}
        </div>
      </div>
    </WidgetShell>
  )
}
