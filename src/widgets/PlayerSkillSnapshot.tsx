import WidgetShell from '../components/WidgetShell'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import usePlayerStore from '../stores/usePlayerStore'
import type { SkillData } from '../api/types'

function formatXP(xp: number): string {
  if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1)}M`
  if (xp >= 1_000)     return `${(xp / 1_000).toFixed(1)}K`
  return String(xp)
}

function SkillCell({ skill }: { skill: SkillData }) {
  const isMax120 = skill.level >= 120
  const isMax99  = skill.level === 99 && !isMax120

  return (
    <div style={{
      background:   'var(--bg-raised)',
      border:       '1px solid var(--border-dim)',
      padding:      '5px 6px',
      textAlign:    'center',
      display:      'flex',
      flexDirection:'column',
      gap:          1,
    }}>
      <div style={{
        fontFamily:    'var(--font-body)',
        fontSize:      8,
        color:         'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        lineHeight:    1.2,
      }}>
        {skill.name}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize:   17,
        fontWeight: 500,
        lineHeight: 1.1,
        color: isMax120 ? 'var(--teal)' : isMax99 ? 'var(--gold)' : 'var(--text-primary)',
      }}>
        {skill.level}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize:   8,
        color:      'var(--text-muted)',
      }}>
        {formatXP(skill.xp)}
      </div>
    </div>
  )
}

export default function PlayerSkillSnapshot() {
  const rsn = usePlayerStore(s => s.primaryRSN)
  const { data, isLoading, isFetching, isError, error, dataUpdatedAt } = usePlayerProfile(rsn)

  const sorted = data?.skills.slice().sort((a, b) => a.id - b.id) ?? []

  return (
    <WidgetShell
      title="Skill Snapshot"
      refreshKeys={[['player', 'profile', rsn]]}
      isLoading={isLoading}
      isFetching={isFetching}
      isError={isError}
      error={error}
      dataUpdatedAt={dataUpdatedAt}
    >
      {!rsn ? (
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          height:         '100%',
          fontFamily:     'var(--font-body)',
          fontSize:       11,
          color:          'var(--text-muted)',
        }}>
          Set a player in Settings to view skills.
        </div>
      ) : data ? (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Summary row */}
          <div style={{
            display:       'flex',
            gap:           20,
            paddingBottom: 8,
            borderBottom:  '1px solid var(--border-dim)',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Player</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>{data.rsn}</div>
            </div>
            {[
              { label: 'Total Level', value: data.totalLevel.toLocaleString() },
              { label: 'Combat',      value: String(data.combatLevel) },
              { label: 'Total XP',    value: formatXP(data.totalXP) },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Skills grid */}
          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
            gap:                 4,
          }}>
            {sorted.map(skill => <SkillCell key={skill.id} skill={skill} />)}
          </div>
        </div>
      ) : null}
    </WidgetShell>
  )
}
