import { useQuery } from '@tanstack/react-query'
import { fetchRS3News } from '../api/gameState'
import { mockNews } from '../api/mocks/gameState'
import config from '../config'

export function useRS3News() {
  return useQuery({
    queryKey:  ['gamestate', 'news'],
    queryFn:   () => (config.useMockData ? mockNews : fetchRS3News()),
    staleTime: 60 * 60 * 1000,
  })
}
