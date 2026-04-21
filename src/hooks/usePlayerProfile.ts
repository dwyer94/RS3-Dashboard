import { useQuery } from '@tanstack/react-query'
import { fetchPlayerProfile } from '../api/players'
import { mockPlayerProfile } from '../api/mocks/playerProfile'
import { ApiError } from '../api/types'
import usePlayerStore from '../stores/usePlayerStore'
import config from '../config'

export function usePlayerProfile(rsn: string) {
  const setStatus    = usePlayerStore(s => s.setStatus)
  const profileStatus = usePlayerStore(s => s.profileStatus[rsn])

  return useQuery({
    queryKey:  ['player', 'profile', rsn],
    queryFn:   async () => {
      if (config.useMockData) return mockPlayerProfile
      try {
        const profile = await fetchPlayerProfile(rsn)
        setStatus(rsn, 'ok')
        return profile
      } catch (err) {
        if (err instanceof ApiError && err.profileStatus) {
          setStatus(rsn, err.profileStatus)
        }
        throw err
      }
    },
    enabled:         rsn.trim().length > 0 && profileStatus !== 'private' && profileStatus !== 'notfound',
    staleTime:       2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  })
}
