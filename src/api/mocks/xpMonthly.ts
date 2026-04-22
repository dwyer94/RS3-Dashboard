import type { XPMonthlyData } from '../types'

// Mirrors real API behaviour: omitting skillid returns skillId=-1 (total), with-skillid returns that skill.
// Months with no activity have xpGained: 0, matching the real endpoint.

const MONTHS_ALL: XPMonthlyData['months'] = [
  { year: 2025, month:  5, xpGained:        0 },
  { year: 2025, month:  6, xpGained:        0 },
  { year: 2025, month:  7, xpGained:        0 },
  { year: 2025, month:  8, xpGained:        0 },
  { year: 2025, month:  9, xpGained:  820_000 },
  { year: 2025, month: 10, xpGained: 2_100_000 },
  { year: 2025, month: 11, xpGained: 1_800_000 },
  { year: 2025, month: 12, xpGained: 3_200_000 },
  { year: 2026, month:  1, xpGained: 7_300_000 },
  { year: 2026, month:  2, xpGained: 19_300_000 },
  { year: 2026, month:  3, xpGained:   853_700 },
  { year: 2026, month:  4, xpGained: 9_100_000 },
]

// skill=-1 → all skills total (returned when no skillid param sent)
// skill=28 → Necromancy
export const mockXPMonthly: XPMonthlyData[] = [
  { skill: -1, months: MONTHS_ALL },
]

export const mockXPMonthlyBySkill: Record<number, XPMonthlyData[]> = {
  28: [{ skill: 28, months: MONTHS_ALL.map(m => ({ ...m, xpGained: Math.round(m.xpGained * 0.3) })) }],
}
