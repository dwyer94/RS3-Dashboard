import { useQuery } from '@tanstack/react-query'
import { fetchXPMonthly } from '../api/players'
import { mockXPMonthly, mockXPMonthlyBySkill } from '../api/mocks/xpMonthly'
import config from '../config'

export function useXPMonthly(rsn: string, skill?: number) {
  return useQuery({
    queryKey:  ['player', 'xpmonthly', rsn, skill],
    queryFn:   () => {
      if (config.useMockData) {
        return skill !== undefined
          ? (mockXPMonthlyBySkill[skill] ?? mockXPMonthly)
          : mockXPMonthly
      }
      return fetchXPMonthly(rsn, skill)
    },
    enabled:   rsn.trim().length > 0,
    staleTime: 60 * 60 * 1000,
  })
}
