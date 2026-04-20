import WidgetShell from '../components/WidgetShell'
import { useTMS } from '../hooks/useTMS'
import type { TMSItem } from '../api/types'

function ItemRow({ item }: { item: TMSItem }) {
  return (
    <a
      href={item.wikiUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:            6,
        padding:        '5px 0',
        textDecoration: 'none',
        color:          item.isHighValue ? 'var(--gold-bright)' : 'var(--text-primary)',
      }}
    >
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize:   10,
        color:      item.isHighValue ? 'var(--gold)' : 'var(--border-mid)',
        flexShrink: 0,
      }}>
        ★
      </span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.3 }}>
        {item.name}
      </span>
    </a>
  )
}

function Section({ label, items }: { label: string; items: TMSItem[] }) {
  return (
    <section>
      <div style={{
        fontFamily:    'var(--font-body)',
        fontSize:      9,
        fontWeight:    500,
        color:         'var(--text-muted)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom:  4,
      }}>
        {label}
      </div>
      {items.map(item => <ItemRow key={item.name} item={item} />)}
    </section>
  )
}

export default function TravellingMerchant() {
  const { data, isLoading, isError, error, dataUpdatedAt } = useTMS()

  return (
    <WidgetShell
      title="Travelling Merchant"
      refreshKeys={[['gamestate', 'tms']]}
      isLoading={isLoading}
      isError={isError}
      error={error}
      dataUpdatedAt={dataUpdatedAt}
    >
      {data && (
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Section label="Today" items={data.today} />
          {data.tomorrow.length > 0 && (
            <>
              <div style={{ borderTop: '1px solid var(--border-dim)' }} />
              <Section label="Tomorrow" items={data.tomorrow} />
            </>
          )}
        </div>
      )}
    </WidgetShell>
  )
}
