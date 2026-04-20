import { useQuery } from '@tanstack/react-query'
import { fetchVoS } from '../api/gameState'
import { mockVoS } from '../api/mocks/gameState'
import { getHourlyResetMs } from '../utils/rs3Time'
import config from '../config'

export function useVoS() {
  return useQuery({
    queryKey:        ['gamestate', 'vos'],
    queryFn:         () => (config.useMockData ? mockVoS : fetchVoS()),
    staleTime:       60 * 60 * 1000,
    refetchInterval: getHourlyResetMs,
  })
}
