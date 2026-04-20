import { useEffect, useState } from 'react'
import usePlayerStore from '../stores/usePlayerStore'
import useMarketStore from '../stores/useMarketStore'
import useLayoutStore from '../stores/useLayoutStore'

interface HydrationGateProps {
  children: React.ReactNode
}

export default function HydrationGate({ children }: HydrationGateProps) {
  const playerHydrated = usePlayerStore(s => s._hasHydrated)
  const marketHydrated = useMarketStore(s => s._hasHydrated)
  const layoutHydrated = useLayoutStore(s => s._hasHydrated)

  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (playerHydrated && marketHydrated && layoutHydrated) {
      setReady(true)
    }
  }, [playerHydrated, marketHydrated, layoutHydrated])

  if (!ready) return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="live-dot" style={{ width: 12, height: 12 }} />
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 12 }}>
          Loading…
        </span>
      </div>
    </div>
  )

  return <>{children}</>
}
