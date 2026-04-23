import { useQuery } from '@tanstack/react-query'
import { fetchDxpSummary } from '../api/dxp'
import config from '../config'

const ONE_HOUR = 60 * 60 * 1000

export function useDxpSummary() {
  return useQuery({
    queryKey: ['dxp', 'summary'],
    queryFn:  fetchDxpSummary,
    staleTime: ONE_HOUR,
    enabled:  !!config.dxpScoresUrl,
  })
}
