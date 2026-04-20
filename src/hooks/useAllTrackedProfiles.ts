import { useQueries } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import usePlayerStore from '../stores/usePlayerStore'
import { fetchPlayerProfile } from '../api/players'
import { mockPlayerProfile } from '../api/mocks/playerProfile'
import config from '../config'
import queryClient from '../queryClient'

const STAGGER_MS = 200

export function useAllTrackedProfiles() {
  const trackedRSNs = usePlayerStore(s => s.trackedRSNs)
  const prefetchedRef = useRef(false)

  useEffect(() => {
    if (prefetchedRef.current || trackedRSNs.length === 0) return
    prefetchedRef.current = true

    trackedRSNs.forEach((rsn, i) => {
      setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey:  ['player', 'profile', rsn],
          queryFn:   () => (config.useMockData ? mockPlayerProfile : fetchPlayerProfile(rsn)),
          staleTime: 5 * 60 * 1000,
        })
      }, i * STAGGER_MS)
    })
  }, [trackedRSNs])

  return useQueries({
    queries: trackedRSNs.map(rsn => ({
      queryKey:  ['player', 'profile', rsn] as const,
      queryFn:   () => (config.useMockData ? mockPlayerProfile : fetchPlayerProfile(rsn)),
      staleTime: 5 * 60 * 1000,
    })),
  })
}
