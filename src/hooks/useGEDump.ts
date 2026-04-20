import { useQuery } from '@tanstack/react-query'
import { fetchGEDump } from '../api/ge'
import { mockGEDump } from '../api/mocks/geDump'
import config from '../config'

const TEN_MIN = 10 * 60 * 1000

export function useGEDump() {
  return useQuery({
    queryKey:       ['ge', 'dump'],
    queryFn:        () => (config.useMockData ? mockGEDump : fetchGEDump()),
    staleTime:      TEN_MIN,
    refetchInterval: TEN_MIN,
  })
}
