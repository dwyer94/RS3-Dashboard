import { useState, useEffect } from 'react'
import WidgetShell from '../components/WidgetShell'
import { useVoS } from '../hooks/useVoS'
import { formatCountdown } from '../utils/rs3Time'

const DISTRICT_SKILLS: Record<string, string> = {
  Amlodd:    'Divination · Summoning',
  Cadarn:    'Magic · Ranged',
  Crwys:     'Farming · Woodcutting',
  Hefin:     'Agility · Prayer',
  Iorwerth:  'Dungeoneering · Slayer',
  Ithell:    'Construction · Crafting',
  Meilyr:    'Herblore · Dungeoneering',
  Trahaearn: 'Mining · Smithing',
}

export default function VoiceOfSeren() {
  const { data, isLoading, isError, error, dataUpdatedAt } = useVoS()
  const [countdown, setCountdown] = useState('')

  const nextRotationMs = data?.nextRotation.getTime()

  useEffect(() => {
    if (nextRotationMs == null) return
    function tick() {
      setCountdown(formatCountdown(Math.max(0, nextRotationMs! - Date.now())))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [nextRotationMs])

  return (
    <WidgetShell
      title="Voice of Seren"
      refreshKeys={[['gamestate', 'vos']]}
      isLoading={isLoading}
      isError={isError}
      error={error}
      dataUpdatedAt={dataUpdatedAt}
      isLive
    >
      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px 12px', gap: 8 }}>
          {data.districts.map(district => (
            <div
              key={district}
              style={{
                flex: 1,
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div style={{
                fontFamily:    'var(--font-display)',
                fontSize:      13,
                fontWeight:    600,
                color:         'var(--gold)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                {district}
              </div>
              {DISTRICT_SKILLS[district] && (
                <div style={{
                  fontFamily: 'var(--font-body)',
                  fontSize:   10,
                  color:      'var(--text-secondary)',
                  marginTop:  3,
                }}>
                  {DISTRICT_SKILLS[district]}
                </div>
              )}
            </div>
          ))}

          <div style={{
            borderTop:      '1px solid var(--border-dim)',
            paddingTop:     8,
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
          }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-muted)' }}>
              Next rotation
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--teal)', fontWeight: 500 }}>
              {countdown}
            </span>
          </div>
        </div>
      )}
    </WidgetShell>
  )
}
