import { useQuery } from '@tanstack/react-query'
import { fetchPlayerQuests } from '../api/players'
import config from '../config'
import type { QuestEntry } from '../api/types'

const MOCK_QUESTS: QuestEntry[] = [
  { title: "Cook's Assistant",   status: 'COMPLETED',   difficulty: 0, members: false, questPoints: 1,  userEligible: true },
  { title: 'Dragon Slayer',       status: 'COMPLETED',   difficulty: 2, members: false, questPoints: 2,  userEligible: true },
  { title: 'Monkey Madness',      status: 'COMPLETED',   difficulty: 3, members: true,  questPoints: 3,  userEligible: true },
  { title: 'While Guthix Sleeps', status: 'STARTED',     difficulty: 4, members: true,  questPoints: 5,  userEligible: true },
  { title: 'Sliske\'s Endgame',   status: 'NOT_STARTED', difficulty: 4, members: true,  questPoints: 0,  userEligible: false },
]

export function usePlayerQuests(rsn: string) {
  return useQuery({
    queryKey:  ['player', 'quests', rsn],
    queryFn:   async () => {
      if (config.useMockData) return MOCK_QUESTS
      return fetchPlayerQuests(rsn)
    },
    enabled:         rsn.trim().length > 0,
    staleTime:       5 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  })
}
