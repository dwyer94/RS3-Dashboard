import { useQuery } from '@tanstack/react-query'
import { fetchVoSHistory } from '../api/gameState'
import { mockVoSHistory } from '../api/mocks/gameState'
import config from '../config'

export function useVoSHistory() {
  return useQuery({
    queryKey:  ['gamestate', 'vos-history'],
    queryFn:   () => (config.useMockData ? mockVoSHistory : fetchVoSHistory()),
    staleTime: 60 * 60 * 1000,
  })
}
