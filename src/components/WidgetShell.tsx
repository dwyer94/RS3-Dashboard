import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import type { QueryKey } from '@tanstack/react-query'
import queryClient from '../queryClient'
import WidgetSkeleton from './WidgetSkeleton'
import WidgetError from './WidgetError'
import { formatRS3Timestamp } from '../utils/rs3Time'

// ── Error Boundary ────────────────────────────────────────────────────────────

interface BoundaryState { hasError: boolean; errorMsg: string }

class WidgetErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { hasError: false, errorMsg: '' }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { hasError: true, errorMsg: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[WidgetShell] Uncaught widget error:', error, info)
  }

  render() {
    if (this.state.hasError) return <WidgetError message="Something went wrong in this widget." />
    return this.props.children
  }
}

// ── WidgetShell ───────────────────────────────────────────────────────────────

export interface WidgetShellProps {
  title:          string
  refreshKeys:    QueryKey[]
  isLoading:      boolean
  isError:        boolean
  error?:         Error | null
  dataUpdatedAt?: number
  isStale?:       boolean
  isLive?:        boolean     // show teal pulse dot
  children:       ReactNode
}

export default function WidgetShell({
  title,
  refreshKeys,
  isLoading,
  isError,
  error,
  dataUpdatedAt,
  isStale,
  isLive,
  children,
}: WidgetShellProps) {

  function handleRefresh() {
    refreshKeys.forEach(key => queryClient.invalidateQueries({ queryKey: key as readonly unknown[] }))
  }

  const errorMessage = (() => {
    if (!isError) return null
    const msg = error?.message ?? ''
    if (msg.includes('private')) return 'This profile is set to private in RuneMetrics.'
    if (msg.includes('not found') || msg.includes('404')) return 'Player not found. Check the RSN in Settings.'
    if (msg.includes('Connection refused')) return 'Connection error. Check that the proxy is running.'
    return 'Live data unavailable — showing last known data.'
  })()

  return (
    <div className="widget-shell flex flex-col h-full overflow-hidden">
      {/* Bottom-right corner mark */}
      <div className="widget-corner-br" />

      {/* Header */}
      <header
        className="flex items-center justify-between px-3 shrink-0"
        style={{ height: 36, borderBottom: '1px solid var(--border-dim)' }}
      >
        <div className="flex items-center gap-2">
          {isLive && <div className="live-dot" />}
          <span style={{
            fontFamily:    'var(--font-display)',
            fontWeight:    600,
            fontSize:      10,
            letterSpacing: '0.13em',
            textTransform: 'uppercase',
            color:         'var(--gold)',
          }}>
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {dataUpdatedAt != null && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
              {formatRS3Timestamp(new Date(dataUpdatedAt))}
            </span>
          )}
          <button
            onClick={handleRefresh}
            title="Refresh"
            style={{ color: 'var(--text-muted)', lineHeight: 1 }}
            className="hover:text-[var(--gold)] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M10.5 6A4.5 4.5 0 1 1 6 1.5c1.3 0 2.47.55 3.3 1.43L11 1.5v3h-3l1.14-1.14A3 3 0 1 0 9 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Stale / error banner */}
      {isStale && !isLoading && !isError && (
        <div style={{
          fontSize: 10, padding: '2px 8px',
          background: 'rgba(200,146,58,0.08)',
          borderBottom: '1px solid var(--border-dim)',
          color: 'var(--gold)',
          fontFamily: 'var(--font-body)',
        }}>
          Data may be outdated
        </div>
      )}
      {isError && errorMessage && (
        <div style={{
          fontSize: 10, padding: '2px 8px',
          background: 'var(--red-dim)',
          borderBottom: '1px solid var(--border-dim)',
          color: 'var(--red)',
          fontFamily: 'var(--font-body)',
        }}>
          {errorMessage}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-auto min-h-0">
        {isLoading ? (
          <WidgetSkeleton />
        ) : isError && !dataUpdatedAt ? (
          <WidgetError message={errorMessage ?? undefined} />
        ) : (
          <WidgetErrorBoundary>
            {children}
          </WidgetErrorBoundary>
        )}
      </div>
    </div>
  )
}
