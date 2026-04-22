import { useQueries } from '@tanstack/react-query'
import { useState } from 'react'
import WidgetShell from '../components/WidgetShell'
import { fetchXPMonthly } from '../api/players'
import { mockXPMonthlyBySkill, mockXPMonthly } from '../api/mocks/xpMonthly'
import usePlayerStore from '../stores/usePlayerStore'
import config from '../config'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const SKILLS = [
  { id: 0,  name: 'Attack' },
  { id: 1,  name: 'Defence' },
  { id: 2,  name: 'Strength' },
  { id: 3,  name: 'Constitution' },
  { id: 4,  name: 'Ranged' },
  { id: 5,  name: 'Prayer' },
  { id: 6,  name: 'Magic' },
  { id: 7,  name: 'Cooking' },
  { id: 8,  name: 'Woodcutting' },
  { id: 9,  name: 'Fletching' },
  { id: 10, name: 'Fishing' },
  { id: 11, name: 'Firemaking' },
  { id: 12, name: 'Crafting' },
  { id: 13, name: 'Smithing' },
  { id: 14, name: 'Mining' },
  { id: 15, name: 'Herblore' },
  { id: 16, name: 'Agility' },
  { id: 17, name: 'Thieving' },
  { id: 18, name: 'Slayer' },
  { id: 19, name: 'Farming' },
  { id: 20, name: 'Runecrafting' },
  { id: 21, name: 'Hunter' },
  { id: 22, name: 'Construction' },
  { id: 23, name: 'Summoning' },
  { id: 24, name: 'Dungeoneering' },
  { id: 25, name: 'Divination' },
  { id: 26, name: 'Invention' },
  { id: 27, name: 'Archaeology' },
  { id: 28, name: 'Necromancy' },
]

function formatXP(xp: number) {
  if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1)}M`
  if (xp >= 1_000)     return `${(xp / 1_000).toFixed(1)}K`
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
}

interface TooltipState {
  x: number
  y: number
  skillName: string
  monthLabel: string
  xp: number
}

export default function XPHeatmap() {
  const rsn = usePlayerStore(s => s.primaryRSN)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const results = useQueries({
    queries: SKILLS.map(skill => ({
      queryKey: ['player', 'xpmonthly', rsn, skill.id],
      queryFn: () => {
        if (config.useMockData) {
          return mockXPMonthlyBySkill[skill.id] ?? mockXPMonthly
        }
        return fetchXPMonthly(rsn, skill.id)
      },
      enabled:   rsn.trim().length > 0,
      staleTime: 60 * 60 * 1000,
    })),
  })

  const anyLoading    = results.some(r => r.isLoading)
  const anyError      = results.some(r => r.isError)
  const firstError    = results.find(r => r.isError)?.error ?? null
  const dataUpdatedAt = Math.max(...results.map(r => r.dataUpdatedAt ?? 0)) || undefined

  // Collect the last 12 calendar months across all resolved data
  const allMonthKeys = new Set<string>()
  for (const r of results) {
    for (const entry of r.data ?? []) {
      for (const m of entry.months) {
        allMonthKeys.add(`${m.year}-${String(m.month).padStart(2, '0')}`)
      }
    }
  }
  const monthColumns = Array.from(allMonthKeys).sort().slice(-12)

  // Build per-skill rows — only skills with at least 1 XP gained are shown
  const skillRows = SKILLS.map((skill, i) => {
    const entries   = results[i].data ?? []
    const entry     = entries[0]
    const monthMap  = new Map<string, number>()

    if (entry) {
      for (const m of entry.months) {
        const key = `${m.year}-${String(m.month).padStart(2, '0')}`
        monthMap.set(key, m.xpGained)
      }
    }

    const values   = Array.from(monthMap.values())
    const totalXP  = values.reduce((a, b) => a + b, 0)
    const peakXP   = Math.max(...values, 1)

    return { skill, monthMap, totalXP, peakXP, isLoading: results[i].isLoading }
  })

  const refreshKeys = SKILLS.map(s => ['player', 'xpmonthly', rsn, s.id])

  return (
    <WidgetShell
      title="XP Heatmap"
      refreshKeys={refreshKeys}
      isLoading={anyLoading && skillRows.length === 0}
      isError={anyError && skillRows.length === 0}
      error={firstError}
      dataUpdatedAt={dataUpdatedAt}
    >
      {!rsn ? (
        <div style={emptyStyle}>Set a player in Settings to view XP history.</div>
      ) : monthColumns.length === 0 ? (
        <div style={emptyStyle}>
          {anyLoading ? 'Loading XP data…' : 'No XP data available.'}
        </div>
      ) : (
        <div style={{ padding: '8px 12px 10px', height: '100%', overflow: 'auto' }}>
          {/* Month header */}
          <div style={{
            display:             'grid',
            gridTemplateColumns: `74px repeat(${monthColumns.length}, 1fr)`,
            gap:                 2,
            marginBottom:        4,
          }}>
            <div />
            {monthColumns.map(key => {
              const [yearStr, monthStr] = key.split('-')
              return (
                <div key={key} style={{
                  fontFamily:    'var(--font-body)',
                  fontSize:      8,
                  color:         'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign:     'center',
                  paddingBottom: 2,
                }}>
                  {MONTHS[parseInt(monthStr) - 1]}
                  <br />
                  <span style={{ opacity: 0.6 }}>'{yearStr.slice(2)}</span>
                </div>
              )
            })}
          </div>

          {/* Skill rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {skillRows.map(({ skill, monthMap, peakXP }) => (
              <div key={skill.id} style={{
                display:             'grid',
                gridTemplateColumns: `74px repeat(${monthColumns.length}, 1fr)`,
                gap:                 2,
                alignItems:          'center',
              }}>
                <div style={{
                  fontFamily:   'var(--font-body)',
                  fontSize:     9,
                  color:        'var(--text-secondary)',
                  paddingRight: 6,
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace:   'nowrap',
                }}>
                  {skill.name}
                </div>
                {monthColumns.map(key => {
                  const xp        = monthMap.get(key) ?? 0
                  const intensity = xp / peakXP
                  return (
                    <div
                      key={key}
                      onMouseEnter={xp > 0 ? e => {
                        const rect = (e.target as HTMLElement).getBoundingClientRect()
                        setTooltip({
                          x:          rect.left + rect.width / 2,
                          y:          rect.top,
                          skillName:  skill.name,
                          monthLabel: `${MONTHS[parseInt(key.split('-')[1]) - 1]} '${key.split('-')[0].slice(2)}`,
                          xp,
                        })
                      } : undefined}
                      onMouseLeave={xp > 0 ? () => setTooltip(null) : undefined}
                      style={{
                        height:       18,
                        background:   xp > 0
                          ? `rgba(61, 184, 160, ${(0.1 + intensity * 0.7).toFixed(2)})`
                          : 'rgba(255,255,255,0.03)',
                        border:       `1px solid rgba(61, 184, 160, ${xp > 0 ? '0.20' : '0.06'})`,
                        borderRadius: 1,
                        cursor:       xp > 0 ? 'default' : undefined,
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {tooltip && (
        <div style={{
          position:      'fixed',
          left:          tooltip.x,
          top:           tooltip.y - 8,
          transform:     'translate(-50%, -100%)',
          background:    'var(--bg-raised)',
          border:        '1px solid var(--border)',
          borderRadius:  4,
          padding:       '5px 9px',
          pointerEvents: 'none',
          zIndex:        9999,
          whiteSpace:    'nowrap',
          boxShadow:     '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize:   9,
            color:      'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 2,
          }}>
            {tooltip.skillName} · {tooltip.monthLabel}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize:   13,
            fontWeight: 600,
            color:      'var(--teal)',
          }}>
            {tooltip.xp.toLocaleString()} XP
          </div>
        </div>
      )}
    </WidgetShell>
  )
}
