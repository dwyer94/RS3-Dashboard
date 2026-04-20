import { useQuery } from '@tanstack/react-query'
import { fetchGEHistory } from '../api/ge'
import { mockGEHistory } from '../api/mocks/geHistory'
import config from '../config'

const TEN_MIN = 10 * 60 * 1000

export function useGEHistory(itemId: number) {
  return useQuery({
    queryKey:  ['ge', 'history', itemId],
    queryFn:   () => (config.useMockData ? mockGEHistory : fetchGEHistory(itemId)),
    staleTime: TEN_MIN,
    enabled:   itemId > 0,
  })
}
