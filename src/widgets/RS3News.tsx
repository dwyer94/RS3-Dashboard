import WidgetShell from '../components/WidgetShell'
import { useRS3News } from '../hooks/useRS3News'
import type { NewsItem } from '../api/types'

function NewsRow({ item }: { item: NewsItem }) {
  const date = new Date(item.date).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  })

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4, paddingRight: 12 }}>
          {item.title}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>
          {date}
        </span>
      </div>
      {item.excerpt && (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          {item.excerpt}
        </div>
      )}
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
