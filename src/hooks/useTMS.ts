import { useQuery } from '@tanstack/react-query'
import { fetchTMS } from '../api/gameState'
import { mockTMS } from '../api/mocks/gameState'
import { getDailyResetMs } from '../utils/rs3Time'
import config from '../config'

export function useTMS() {
  return useQuery({
    queryKey:        ['gamestate', 'tms'],
    queryFn:         () => (config.useMockData ? mockTMS : fetchTMS()),
    staleTime:       24 * 60 * 60 * 1000,
    refetchInterval: getDailyResetMs,
  })
}
