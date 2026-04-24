import { useQuery } from '@tanstack/react-query'
import { fetchVoS } from '../api/gameState'
import { mockVoS } from '../api/mocks/gameState'
import { getHourlyResetMs } from '../utils/rs3Time'
import type { VoSData } from '../api/types'
import config from '../config'

export function useVoS() {
  return useQuery({
    queryKey:        ['gamestate', 'vos'],
    queryFn:         () => (config.useMockData ? mockVoS() : fetchVoS()),
    staleTime:       60 * 60 * 1000,
    refetchInterval: query => {
      const data = query.state.data as VoSData | undefined
      if (data && data.nextRotation.getTime() <= Date.now()) return 30_000
      return getHourlyResetMs()
    },
  })
}
