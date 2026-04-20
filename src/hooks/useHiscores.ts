import { useQuery } from '@tanstack/react-query'
import { fetchHiscores } from '../api/gameState'
import config from '../config'

interface HiscoreRow {
  name:  string
  rank:  number
  level: number
  xp:    number
}

const mockHiscores: HiscoreRow[] = Array.from({ length: 10 }, (_, i) => ({
  name:  `Player${i + 1}`,
  rank:  i + 1,
  level: 99,
  xp:    13_034_534 - i * 100_000,
}))

export function useHiscores(skill: string) {
  return useQuery({
    queryKey:  ['hiscores', skill],
    queryFn:   () => (config.useMockData ? mockHiscores : fetchHiscores(skill)),
    staleTime: 5 * 60 * 1000,
    enabled:   skill.length > 0,
  })
}
