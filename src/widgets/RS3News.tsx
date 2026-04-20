import WidgetShell from '../components/WidgetShell'
import { useRS3News } from '../hooks/useRS3News'
import type { NewsItem } from '../api/types'

const CATEGORY_COLOR: Record<string, string> = {
  'Game Update':   'var(--teal)',
  'Patch Notes':   'var(--text-secondary)',
  'Announcements': 'var(--gold)',
  'Promotions':    'var(--green)',
}

function NewsRow({ item }: { item: NewsItem }) {
  const catColor = CATEGORY_COLOR[item.category] ?? 'var(--text-muted)'
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display:        'block',
        padding:        '8px 0',
        borderBottom:   '1px solid var(--border-dim)',
        textDecoration: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
        <span style={{
          fontFamily:    'var(--font-body)',
          fontSize:      9,
          color:         catColor,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontWeight:    500,
        }}>
          {item.category}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {item.date}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4 }}>
        {item.title}
      </div>
    </a>
  )
}

export default function RS3News() {
  const { data, isLoading, isError, error, dataUpdatedAt } = useRS3News()

  return (
    <WidgetShell
      title="RS3 News"
      refreshKeys={[['gamestate', 'news']]}
      isLoading={isLoading}
      isError={isError}
      error={error}
      dataUpdatedAt={dataUpdatedAt}
    >
      {data && (
        <div style={{ padding: '4px 12px' }}>
          {data.map(item => (
            <NewsRow key={`${item.date}-${item.title}`} item={item} />
          ))}
        </div>
      )}
    </WidgetShell>
  )
}
