import { useQuery } from '@tanstack/react-query'
import { fetchPlayerProfile } from '../api/players'
import { mockPlayerProfile } from '../api/mocks/playerProfile'
import config from '../config'

export function usePlayerProfile(rsn: string) {
  return useQuery({
    queryKey:  ['player', 'profile', rsn],
    queryFn:   () => (config.useMockData ? mockPlayerProfile : fetchPlayerProfile(rsn)),
    enabled:   rsn.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  })
}
