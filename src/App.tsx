import { useState } from 'react'
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout'
import type { LayoutItem, ResponsiveLayouts } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import useLayoutStore from './stores/useLayoutStore'
import type { WidgetLayout } from './stores/useLayoutStore'
import { widgetRegistry, getWidgetById } from './widgets/registry'
import SettingsDrawer from './components/SettingsDrawer'
import config from './config'

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }
const COLS        = { lg: 12,   md: 10,  sm: 6,   xs: 4,   xxs: 2 }

export default function App() {
  const { widgets, addWidget, removeWidget, updateLayout } = useLayoutStore()
  const [settingsOpen, setSettingsOpen]   = useState(false)
  const [addPanelOpen, setAddPanelOpen]   = useState(false)
  const { containerRef: gridRef, width: gridWidth } = useContainerWidth()

  const activeWidgets = widgets.filter(w => w.visible)

  function handleLayoutChange(_layout: readonly LayoutItem[], allLayouts: ResponsiveLayouts) {
    const lgLayout = allLayouts.lg ?? _layout
    const next: WidgetLayout[] = Array.from(lgLayout).map((l: LayoutItem) => {
      const existing = widgets.find(w => w.id === l.i)
      return { id: l.i, x: l.x, y: l.y, w: l.w, h: l.h, visible: existing?.visible ?? true }
    })
    updateLayout(next)
  }

  function handleAddWidget(id: string) {
    const def = getWidgetById(id)
    if (!def) return
    if (widgets.find(w => w.id === id)) return
    const nextY = activeWidgets.reduce((max, w) => Math.max(max, w.y + w.h), 0)
    addWidget({ id, x: 0, y: nextY, w: def.defaultSize.w, h: def.defaultSize.h, visible: true })
    setAddPanelOpen(false)
  }

  const lgLayouts: LayoutItem[] = activeWidgets.map(w => {
    const def = getWidgetById(w.id)
    return { i: w.id, x: w.x, y: w.y, w: w.w, h: w.h, minW: def?.minSize.w, minH: def?.minSize.h }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Top Bar ── */}
      <header style={{
        height: 'var(--topbar-h)', background: 'var(--bg-topbar)',
        borderBottom: '1px solid var(--border)', display: 'flex',
        alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
          <div style={{
            width: 28, height: 28, border: '1px solid var(--gold-line)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', flexShrink: 0,
          }}>
            <span style={{ position: 'absolute', bottom: -1, left: -1, width: 6, height: 6, borderBottom: '1px solid var(--gold)', borderLeft: '1px solid var(--gold)' }} />
            <span style={{ position: 'absolute', bottom: -1, right: -1, width: 6, height: 6, borderBottom: '1px solid var(--gold)', borderRight: '1px solid var(--gold)' }} />
            <span style={{ fontFamily: 'var(--font-logo)', color: 'var(--gold)', fontSize: 14, userSelect: 'none' }}>ᚱ</span>
          </div>
          <span style={{ fontFamily: 'var(--font-logo)', color: 'var(--text-primary)', fontSize: 13, letterSpacing: '0.06em' }}>
            RS3 Dashboard
          </span>
        </div>

        {config.useMockData && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--gold)', letterSpacing: '0.1em', background: 'var(--gold-glow)', padding: '2px 6px', border: '1px solid var(--gold-line)' }}>
            MOCK DATA
          </span>
        )}

        <button
          onClick={() => setAddPanelOpen(p => !p)}
          style={{
            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500,
            color: addPanelOpen ? 'var(--gold)' : 'var(--text-secondary)',
            background: 'none', border: '1px solid var(--border)', padding: '5px 12px', cursor: 'pointer',
          }}
        >
          + Add Widget
        </button>

        <button
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.22 3.22l1.41 1.41M13.36 13.36l1.42 1.42M14.78 3.22l-1.42 1.41M4.63 13.36l-1.41 1.42" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>
      </header>

      {/* ── Add Widget Panel ── */}
      {addPanelOpen && (
        <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          {widgetRegistry
            .filter(def => !widgets.find(w => w.id === def.id))
            .map(def => (
              <button
                key={def.id}
                onClick={() => handleAddWidget(def.id)}
                title={def.description}
                style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-raised)', border: '1px solid var(--border)', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>P{def.phase}</span>
                {def.name}
              </button>
            ))}
          {widgetRegistry.every(def => widgets.find(w => w.id === def.id)) && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>All widgets are on the dashboard.</span>
          )}
        </div>
      )}

      {/* ── Grid ── */}
      <main ref={gridRef} style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {activeWidgets.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16, color: 'var(--text-muted)', textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-logo)', fontSize: 48, color: 'var(--border-mid)' }}>ᚱ</span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14 }}>Your dashboard is empty.</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 12 }}>
              Click <strong style={{ color: 'var(--text-secondary)' }}>+ Add Widget</strong> to get started.
            </p>
          </div>
        ) : (
          <ResponsiveGridLayout
            width={gridWidth ?? window.innerWidth}
            breakpoints={BREAKPOINTS}
            cols={COLS}
            rowHeight={80}
            margin={[12, 12]}
            layouts={{ lg: lgLayouts }}
            onLayoutChange={handleLayoutChange}
            dragConfig={{ handle: '.widget-shell header' }}
          >
            {activeWidgets.map(w => {
              const def = getWidgetById(w.id)
              if (!def) return null
              const Component = def.component
              return (
                <div key={w.id} style={{ position: 'relative' }}>
                  <Component />
                  <button
                    onClick={() => removeWidget(w.id)}
                    title="Remove widget"
                    style={{ position: 'absolute', top: 4, right: 4, zIndex: 10, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0, transition: 'opacity 0.15s', lineHeight: 1 }}
                    className="widget-remove-btn"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              )
            })}
          </ResponsiveGridLayout>
        )}
      </main>

      {/* Footer */}
      <footer style={{ height: 28, borderTop: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          v{config.appVersion}
        </span>
      </footer>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
