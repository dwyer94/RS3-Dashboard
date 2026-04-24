import WidgetShell from '../components/WidgetShell'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import usePlayerStore from '../stores/usePlayerStore'

export default function ActivityFeed() {
  const rsn = usePlayerStore(s => s.primaryRSN)
  const { data, isLoading, isFetching, isError, error, dataUpdatedAt } = usePlayerProfile(rsn)

  const activities = data?.activities ?? []

  return (
    <WidgetShell
      title="Activity Feed"
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
          Set a player in Settings to view activity.
        </div>
      ) : data && activities.length === 0 ? (
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          height:         '100%',
          fontFamily:     'var(--font-body)',
          fontSize:       11,
          color:          'var(--text-muted)',
        }}>
          No recent activities found.
        </div>
      ) : data ? (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 0' }}>
          {activities.map((activity, i) => (
            <div
              key={i}
              style={{
                display:      'flex',
                flexDirection:'column',
                gap:          2,
                padding:      '8px 14px',
                borderBottom: i < activities.length - 1 ? '1px solid var(--border-dim)' : 'none',
              }}
            >
              <div style={{
                fontFamily:  'var(--font-body)',
                fontSize:    11,
                color:       'var(--text-primary)',
                lineHeight:  1.4,
              }}>
                {activity.text}
              </div>
              <div style={{
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'center',
              }}>
                <span style={{
                  fontFamily: 'var(--font-body)',
                  fontSize:   10,
                  color:      'var(--text-secondary)',
                }}>
                  {activity.details}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize:   9,
                  color:      'var(--text-muted)',
                }}>
                  {activity.date}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </WidgetShell>
  )
}
