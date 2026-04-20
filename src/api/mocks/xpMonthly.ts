import type { XPMonthlyData } from '../types'

// Necromancy (id 28) — 12 months of realistic XP gains
export const mockXPMonthly: XPMonthlyData[] = [
  {
    skill: 28,
    months: [
      { year: 2025, month:  5, xpGained:  820_000 },
      { year: 2025, month:  6, xpGained:  940_000 },
      { year: 2025, month:  7, xpGained: 1_200_000 },
      { year: 2025, month:  8, xpGained:  670_000 },
      { year: 2025, month:  9, xpGained: 1_450_000 },
      { year: 2025, month: 10, xpGained: 2_100_000 },
      { year: 2025, month: 11, xpGained: 1_800_000 },
      { year: 2025, month: 12, xpGained: 3_200_000 },
      { year: 2026, month:  1, xpGained: 2_400_000 },
      { year: 2026, month:  2, xpGained: 1_900_000 },
      { year: 2026, month:  3, xpGained: 2_750_000 },
      { year: 2026, month:  4, xpGained: 1_100_000 },
    ],
  },
]
