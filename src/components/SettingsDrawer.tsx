import { useState, useRef } from 'react'
import usePlayerStore from '../stores/usePlayerStore'
import useLayoutStore from '../stores/useLayoutStore'
import { fetchPlayerProfile } from '../api/players'
import type { ProfileStatus } from '../api/types'
import config from '../config'

interface SettingsDrawerProps {
  open:    boolean
  onClose: () => void
}

const STATUS_ICONS: Record<ProfileStatus, { icon: string; title: string; color: string }> = {
  ok:       { icon: '✓', title: 'Profile OK',            color: 'var(--teal)'      },
  private:  { icon: '🔒', title: 'Profile is private',    color: 'var(--gold)'      },
  notfound: { icon: '✗', title: 'Player not found',       color: 'var(--red)'       },
}

export default function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const {
    primaryRSN, trackedRSNs, profileStatus,
    addRSN, removeRSN, setPrimary, setStatus,
  } = usePlayerStore()
  const { theme, setTheme, uiScale, setUiScale, resetLayout } = useLayoutStore()

  const [rsnInput, setRsnInput]       = useState('')
  const [addState, setAddState]       = useState<'idle' | 'loading' | 'error'>('idle')
  const [addError, setAddError]       = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  async function handleAddRSN() {
    const rsn = rsnInput.trim()
    if (!rsn) return
    if (trackedRSNs.length >= 10) {
      setAddError('Maximum 10 players tracked.')
      return
    }
    if (trackedRSNs.includes(rsn)) {
      setAddError('This RSN is already tracked.')
      return
    }

    setAddState('loading')
    setAddError('')

    if (config.useMockData) {
      addRSN(rsn)
      setStatus(rsn, 'ok')
      setRsnInput('')
      setAddState('idle')
      return
    }

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000),
    )

    try {
      await Promise.race([fetchPlayerProfile(rsn), timeout])
      addRSN(rsn)
      setStatus(rsn, 'ok')
      setRsnInput('')
      setAddState('idle')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'timeout') {
        setAddError('Could not verify RSN — check your connection.')
      } else if (msg.includes('private')) {
        addRSN(rsn)
        setStatus(rsn, 'private')
        setRsnInput('')
        setAddState('idle')
      } else {
        setAddError('Player not found — check the RSN spelling.')
        setAddState('error')
      }
    }
  }

  function handleResetLayout() {
    resetLayout()
    setShowResetConfirm(false)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
      />

      {/* Drawer */}
      <aside style={{
        position:   'fixed',
        top:        0,
        right:      0,
        bottom:     0,
        width:      340,
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border)',
        zIndex:     50,
        display:    'flex',
        flexDirection: 'column',
        overflowY:  'auto',
      }}>
        {/* Header */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '0 16px',
          height:         54,
          borderBottom:   '1px solid var(--border)',
          flexShrink:     0,
        }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--gold)' }}>
            Settings
          </span>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* RSN Management */}
          <section>
            <SectionLabel>Players</SectionLabel>

            {/* Add RSN */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                ref={inputRef}
                value={rsnInput}
                onChange={e => { setRsnInput(e.target.value); setAddError('') }}
                onKeyDown={e => e.key === 'Enter' && handleAddRSN()}
                placeholder="Enter RSN…"
                disabled={addState === 'loading'}
                style={{
                  flex:        1,
                  background:  'var(--bg-raised)',
                  border:      '1px solid var(--border)',
                  color:       'var(--text-primary)',
                  fontFamily:  'var(--font-body)',
                  fontSize:    13,
                  padding:     '6px 10px',
                  outline:     'none',
                }}
              />
              <button
                onClick={handleAddRSN}
                disabled={addState === 'loading' || !rsnInput.trim()}
                style={{
                  background: 'var(--gold)',
                  color:      '#000',
                  border:     'none',
                  padding:    '6px 12px',
                  fontFamily: 'var(--font-body)',
                  fontSize:   12,
                  fontWeight: 600,
                  cursor:     addState === 'loading' ? 'wait' : 'pointer',
                  opacity:    !rsnInput.trim() ? 0.4 : 1,
                }}
              >
                {addState === 'loading' ? '…' : 'Add'}
              </button>
            </div>

            {addError && (
              <p style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8 }}>{addError}</p>
            )}

            {trackedRSNs.length >= 10 && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                Maximum 10 players tracked.
              </p>
            )}

            {/* RSN list */}
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {trackedRSNs.map(rsn => {
                const status = profileStatus[rsn] ?? 'ok'
                const statusInfo = STATUS_ICONS[status]
                const isPrimary = rsn === primaryRSN
                return (
                  <li key={rsn} style={{
                    display:     'flex',
                    alignItems:  'center',
                    gap:         8,
                    padding:     '6px 10px',
                    background:  isPrimary ? 'var(--bg-raised)' : 'transparent',
                    border:      `1px solid ${isPrimary ? 'var(--border-mid)' : 'var(--border-dim)'}`,
                  }}>
                    <span title={statusInfo.title} style={{ color: statusInfo.color, fontSize: 12, width: 14, textAlign: 'center' }}>
                      {statusInfo.icon}
                    </span>
                    <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-primary)' }}>
                      {rsn}
                    </span>
                    {isPrimary && (
                      <span style={{ fontSize: 9, color: 'var(--gold)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
                        PRIMARY
                      </span>
                    )}
                    {!isPrimary && (
                      <button
                        onClick={() => setPrimary(rsn)}
                        title="Set as primary"
                        style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Set primary
                      </button>
                    )}
                    <button
                      onClick={() => removeRSN(rsn)}
                      title="Remove player"
                      style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </li>
                )
              })}
              {trackedRSNs.length === 0 && (
                <li style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>
                  No players tracked yet.
                </li>
              )}
            </ul>
          </section>

          {/* Appearance */}
          <section>
            <SectionLabel>Appearance</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Dark mode</span>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                style={{
                  width:       40,
                  height:      22,
                  borderRadius: 11,
                  background:  theme === 'dark' ? 'var(--gold)' : 'var(--border-mid)',
                  border:      'none',
                  cursor:      'pointer',
                  position:    'relative',
                  transition:  'background 0.2s',
                }}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <span style={{
                  position:   'absolute',
                  top:        3,
                  left:       theme === 'dark' ? 21 : 3,
                  width:      16,
                  height:     16,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Text size</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {([1, 1.15, 1.3] as const).map((scale, i) => (
                  <button
                    key={scale}
                    onClick={() => setUiScale(scale)}
                    style={{
                      fontFamily:  'var(--font-body)',
                      fontSize:    10 + i * 3,
                      fontWeight:  600,
                      width:       32,
                      height:      28,
                      background:  uiScale === scale ? 'var(--bg-raised)' : 'none',
                      border:      `1px solid ${uiScale === scale ? 'var(--gold-line)' : 'var(--border-dim)'}`,
                      color:       uiScale === scale ? 'var(--gold)' : 'var(--text-muted)',
                      cursor:      'pointer',
                    }}
                  >
                    A
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Layout */}
          <section>
            <SectionLabel>Layout</SectionLabel>
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                style={{
                  background: 'none',
                  border:     '1px solid var(--border)',
                  color:      'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                  fontSize:   12,
                  padding:    '6px 12px',
                  cursor:     'pointer',
                  width:      '100%',
                }}
              >
                Reset layout
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  This will remove all widgets. Are you sure?
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={handleResetLayout}
                    style={{ flex: 1, background: 'var(--red)', border: 'none', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 12, padding: '6px 0', cursor: 'pointer' }}
                  >
                    Yes, reset
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    style={{ flex: 1, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 12, padding: '6px 0', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </aside>
    </>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily:    'var(--font-display)',
      fontWeight:    600,
      fontSize:      9,
      letterSpacing: '0.13em',
      textTransform: 'uppercase',
      color:         'var(--text-muted)',
      marginBottom:  10,
    }}>
      {children}
    </p>
  )
}
